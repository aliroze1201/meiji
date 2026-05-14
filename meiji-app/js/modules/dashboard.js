/**
 * modules/dashboard.js — Tableau de bord (refonte v20260513dash)
 *
 * Vue 360° du business avec :
 *  - 8 KPIs (2 lignes) : CA, charges, charges cash, net, salaires, crédits, chèques attente, stock
 *  - Cartes caisses enrichies (% espèces, % crédit)
 *  - Soldes banque / mobile + valeur "théorique" recalculée et delta
 *  - Vue d'ensemble cash (mini-bilan vertical)
 *  - Top catégories charges scindé cash vs banque/mobile
 *  - Récap journée + solde fin de jour par caisse
 */

const Dashboard = {
  render() {
    const jj = App.filterJournees();
    const label = App.getPeriodLabel();
    const pl = document.getElementById('period-label');
    if (pl) pl.textContent = label;

    // ============== SOURCES ==============
    const allDeps = Data.getAllDeps();
    const depsPeriode = App.filterByDate(allDeps);            // dépenses dans la période
    const credits = Array.isArray(Data.credits) ? Data.credits : [];
    const cheques = Array.isArray(Data.cheques) ? Data.cheques : [];
    const mvtsBk = Array.isArray(Data.mvtsBanque) ? Data.mvtsBanque : [];
    const mvtsMb = Array.isArray(Data.mvtsMobile) ? Data.mvtsMobile : [];
    const employes = Array.isArray(Data.employes) ? Data.employes : [];

    // ============== KPIs LIGNE 1 ==============
    const totCA = jj.reduce((s,j) => s + Data.caTotal(j), 0);
    const totDep = depsPeriode.reduce((s,d) => s + (d.montant || 0), 0);
    const totDepCash = depsPeriode.filter(d => Data.isCashDep(d))
      .reduce((s,d) => s + (d.montant || 0), 0);
    const net = totCA - totDep;

    this._set('d-ca', Data.fmt(totCA));
    this._set('d-ca-nb', jj.length + ' journée' + (jj.length > 1 ? 's' : ''));
    this._set('d-charges', Data.fmt(totDep));
    this._set('d-charges-cash', Data.fmt(totDepCash));
    const nel = document.getElementById('d-net');
    if (nel) {
      nel.textContent = Data.fmt(net);
      nel.style.color = net >= 0 ? 'var(--c-bar)' : 'var(--c-red)';
    }

    // ============== KPIs LIGNE 2 ==============
    // Masse salariale (statique, ne dépend pas de la période)
    const masseSal = employes.reduce((s,e) => s + (Number(e.net) || 0), 0);
    this._set('d-salaires', Data.fmt(masseSal));
    this._set('d-salaires-sub', employes.length + ' employé' + (employes.length > 1 ? 's' : ''));

    // Crédits ouverts : en cours vs en retard (>14j)
    const credO = credits.filter(c => c.statut === 'ouvert');
    const credMnt = credO.reduce((s,c) => s + (c.montant || 0), 0);
    const today = Data.today();
    const dayMs = 86400000;
    const credRetard = credO.filter(c => {
      if (!c.date) return false;
      const diff = (new Date(today) - new Date(c.date)) / dayMs;
      return diff > 14;
    });
    const credRetardMnt = credRetard.reduce((s,c) => s + (c.montant || 0), 0);
    this._set('d-cred', Data.fmt(credMnt));
    this._set('d-cred-nb', credO.length + ' client' + (credO.length > 1 ? 's' : '') +
      (credRetard.length ? ' · ' + (credO.length - credRetard.length) + ' en cours' : ''));
    const retEl = document.getElementById('d-cred-retard');
    if (retEl) {
      if (credRetard.length) {
        retEl.textContent = '⚠ ' + credRetard.length + ' en retard (' + Data.fmt(credRetardMnt) + ')';
        retEl.style.display = '';
      } else {
        retEl.textContent = '';
      }
    }

    // Chèques en attente (statut attente + depose)
    const chqAtt = cheques.filter(c => c.statut === 'attente' || c.statut === 'depose');
    const chqAttMnt = chqAtt.reduce((s,c) => s + (Number(c.montant) || 0), 0);
    this._set('d-chq-attente', Data.fmt(chqAttMnt));
    const nbAttente = chqAtt.filter(c => c.statut === 'attente').length;
    const nbDepose = chqAtt.filter(c => c.statut === 'depose').length;
    this._set('d-chq-attente-nb', chqAtt.length
      ? (nbAttente + ' à déposer · ' + nbDepose + ' déposé' + (nbDepose > 1 ? 's' : ''))
      : 'Aucun chèque en attente');

    // Stock valorisé — uniquement si Stock chargé + articles présents
    const stkTile = document.getElementById('d-stock-tile');
    const stockArts = Array.isArray(Data.stockArticles) ? Data.stockArticles : [];
    if (stkTile) {
      if (typeof Stock !== 'undefined' && stockArts.length) {
        let valeur = 0;
        stockArts.forEach(a => {
          const s = (typeof Stock.stockCourant === 'function') ? Stock.stockCourant(a.id) : 0;
          valeur += Math.max(0, s) * (Number(a.prix_unitaire) || 0);
        });
        stkTile.style.display = '';
        this._set('d-stock-val', Data.fmt(valeur));
        this._set('d-stock-nb', stockArts.length + ' article' + (stockArts.length > 1 ? 's' : ''));
      } else {
        stkTile.style.display = 'none';
      }
    }

    // ============== CAISSES ==============
    const caisseTotaux = {
      s: this._setCaisse('cs', 's', jj),
      b: this._setCaisse('cb', 'b', jj),
      c: this._setCaisse('cc', 'c', jj),
    };

    // ============== VUE D'ENSEMBLE CASH ==============
    // Solde début = Σ fondInit (point d'ouverture absolu)
    const fondDeb = (Data.fondInit?.s || 0) + (Data.fondInit?.b || 0) + (Data.fondInit?.c || 0);
    const cashIn = jj.reduce((s,j) =>
      s + (j.s?.esp || 0) + (j.b?.esp || 0) + (j.c?.esp || 0), 0);
    const cashOut = depsPeriode
      .filter(d => Data.isCashDep(d))
      .reduce((s,d) => s + (d.montant || 0), 0);
    const cashFin = fondDeb + cashIn - cashOut;
    this._set('d-cash-debut', Data.fmt(fondDeb));
    this._set('d-cash-in', Data.fmt(cashIn));
    this._set('d-cash-out', Data.fmt(cashOut));
    const cfEl = document.getElementById('d-cash-fin');
    if (cfEl) {
      cfEl.textContent = Data.fmt(cashFin);
      cfEl.style.color = cashFin >= 0 ? 'var(--c-purple)' : 'var(--c-red)';
    }

    // ============== SOLDES BANQUE & MOBILE ==============
    this._set('d-banque', Data.fmt(Data.soldes.banque.montant));
    this._set('d-banque-date', Data.soldes.banque.date
      ? 'Mis à jour le ' + Data.fmtD(Data.soldes.banque.date)
      : 'Non renseigné');
    this._set('d-mobile', Data.fmt(Data.soldes.mobile.montant));
    this._set('d-mobile-date', Data.soldes.mobile.date
      ? 'Mis à jour le ' + Data.fmtD(Data.soldes.mobile.date)
      : 'Non renseigné');

    // BANQUE THÉORIQUE
    // base saisie + chèques encaissés sur période + recettes chèque période
    //   + mvts banque in - mvts banque out - dépenses banque
    const baseBk = Number(Data.soldes.banque.montant) || 0;
    const chqEnc = cheques
      .filter(c => c.statut === 'encaisse' && c.dateEncaissement && App.inPeriod(c.dateEncaissement))
      .reduce((s,c) => s + (Number(c.montant) || 0), 0);
    const recChq = jj.reduce((s,j) =>
      s + (j.s?.chq || 0) + (j.b?.chq || 0) + (j.c?.chq || 0), 0);
    const mvtBkIn = App.filterByDate(mvtsBk).filter(m => m.type === 'in')
      .reduce((s,m) => s + (Number(m.mnt) || 0), 0);
    const mvtBkOut = App.filterByDate(mvtsBk).filter(m => m.type === 'out')
      .reduce((s,m) => s + (Number(m.mnt) || 0), 0);
    const depBk = depsPeriode.filter(d => d.paiement === 'banque')
      .reduce((s,d) => s + (d.montant || 0), 0);
    const bkTheo = baseBk + chqEnc + recChq + mvtBkIn - mvtBkOut - depBk;
    this._set('d-bk-theo', Data.fmt(bkTheo));
    this._setDelta('d-bk-delta', baseBk, bkTheo);

    // MOBILE THÉORIQUE
    const baseMb = Number(Data.soldes.mobile.montant) || 0;
    const recMob = jj.reduce((s,j) =>
      s + (j.s?.mob || 0) + (j.b?.mob || 0) + (j.c?.mob || 0), 0);
    const mvtMbIn = App.filterByDate(mvtsMb).filter(m => m.type === 'in')
      .reduce((s,m) => s + (Number(m.mnt) || 0), 0);
    const mvtMbOut = App.filterByDate(mvtsMb).filter(m => m.type === 'out')
      .reduce((s,m) => s + (Number(m.mnt) || 0), 0);
    const depMb = depsPeriode.filter(d => d.paiement === 'mobile')
      .reduce((s,d) => s + (d.montant || 0), 0);
    const mbTheo = baseMb + recMob + mvtMbIn - mvtMbOut - depMb;
    this._set('d-mb-theo', Data.fmt(mbTheo));
    this._setDelta('d-mb-delta', baseMb, mbTheo);

    // ============== GRAPHIQUES ==============
    Charts.renderBarChart('bar-chart', jj);
    Charts.renderDonutCA('donut-ca', 'donut-ca-legend', jj);
    Charts.renderCompareChart('compare-chart', jj);
    Charts.renderDonutPay('donut-pay', 'donut-pay-legend', jj);

    // Top catégories : cash vs banque/mobile + global
    const depsCash = depsPeriode.filter(d => Data.isCashDep(d));
    const depsBkMb = depsPeriode.filter(d => !Data.isCashDep(d));
    Charts.renderProgressBars('charges-bars-cash', depsCash);
    Charts.renderProgressBars('charges-bars-bkmb', depsBkMb);
    Charts.renderProgressBars('charges-bars', depsPeriode);

    // ============== RÉCAP JOURNÉE ==============
    this._renderRecap(jj);
  },

  _renderRecap(jj) {
    const ids = ['rj-s','rj-b','rj-c','rj-esp','rj-dep','rj-solde','rj-end-s','rj-end-b','rj-end-c'];
    if (!jj || jj.length === 0) {
      this._set('rj-date', '— aucune journée —');
      ids.forEach(id => this._set(id, '0 FCFA'));
      const tbody = document.getElementById('rj-deps');
      if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align:center;padding:16px">Aucune donnée</td></tr>';
      return;
    }
    const last = [...jj].sort((a,b) => b.date.localeCompare(a.date))[0];
    this._set('rj-date', Data.fmtD(last.date));
    this._set('rj-s', Data.fmt(Data.caisse(last, 's')));
    this._set('rj-b', Data.fmt(Data.caisse(last, 'b')));
    this._set('rj-c', Data.fmt(Data.caisse(last, 'c')));

    const totEsp = (last.s?.esp || 0) + (last.b?.esp || 0) + (last.c?.esp || 0);
    const totDep = (last.ds || 0) + (last.db || 0) + (last.dc || 0);
    const solde = totEsp - totDep;
    this._set('rj-esp', Data.fmt(totEsp));
    this._set('rj-dep', Data.fmt(totDep));
    const sel = document.getElementById('rj-solde');
    if (sel) {
      sel.textContent = Data.fmt(solde);
      sel.style.color = solde >= 0 ? 'var(--c-bar)' : 'var(--c-red)';
    }

    // Solde espèces fin de journée par caisse
    this._set('rj-end-s', Data.fmt(Data.cashEndOfDay(last.date, 's')));
    this._set('rj-end-b', Data.fmt(Data.cashEndOfDay(last.date, 'b')));
    this._set('rj-end-c', Data.fmt(Data.cashEndOfDay(last.date, 'c')));

    const tbody = document.getElementById('rj-deps');
    if (tbody) {
      const all = [];
      ['s','b','c'].forEach(k => {
        const dept = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' }[k];
        ((last.deps && last.deps[k]) || []).forEach(d => all.push({ dept, label: d.label, montant: d.montant }));
      });
      if (Data.histDep) {
        Data.histDep.filter(d => d.date === last.date).forEach(d => all.push(d));
      }
      if (all.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align:center;padding:16px">Aucune dépense saisie ce jour</td></tr>';
      } else {
        tbody.innerHTML = all.map(d =>
          `<tr><td>${d.dept}</td><td>${d.label}</td><td style="text-align:right;font-weight:600">${Data.fmt(d.montant)}</td></tr>`
        ).join('');
      }
    }
  },

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  // Affiche le delta entre montant saisi et théorique
  // Vert si écart ≤ 5%, orange si > 5%
  _setDelta(id, saisi, theo) {
    const el = document.getElementById(id);
    if (!el) return;
    const delta = theo - saisi;
    if (!saisi && !theo) {
      el.textContent = '';
      el.className = 'badge';
      el.style.background = '';
      el.style.color = '';
      return;
    }
    const pct = saisi ? Math.abs(delta / saisi) * 100 : (theo ? 100 : 0);
    const sign = delta >= 0 ? '+' : '−';
    const big = pct > 5;
    el.textContent = sign + Data.fmts(Math.abs(delta)) + ' FCFA (' + pct.toFixed(1) + '%)';
    el.className = 'badge';
    el.style.background = big ? 'var(--c-amber-soft, #FEF3C7)' : 'var(--c-green-soft, #DCFCE7)';
    el.style.color = big ? 'var(--c-amber, #D97706)' : 'var(--c-bar, #16A34A)';
    el.style.fontSize = '11px';
    el.style.padding = '2px 6px';
    el.style.borderRadius = '6px';
    el.style.fontWeight = '700';
  },

  _setCaisse(pfx, k, jj) {
    const total = jj.reduce((s,j) => s + Data.caisse(j, k), 0);
    const totEsp = jj.reduce((s,j) => s + (j[k]?.esp || 0), 0);
    const totChq = jj.reduce((s,j) => s + (j[k]?.chq || 0), 0);
    const totMob = jj.reduce((s,j) => s + (j[k]?.mob || 0), 0);
    const totCred = jj.reduce((s,j) => s + (j[k]?.cred || 0), 0);

    this._set('dash-' + pfx, Data.fmt(total));
    this._set('dash-' + pfx + '-esp', Data.fmts(totEsp) + ' FCFA');
    this._set('dash-' + pfx + '-chq', Data.fmts(totChq) + ' FCFA');
    this._set('dash-' + pfx + '-mob', Data.fmts(totMob) + ' FCFA');
    this._set('dash-' + pfx + '-cred', Data.fmts(totCred) + ' FCFA');

    // Caisse restante = cumul espèces en fin de période filtrée
    const lastDate = jj.length
      ? jj.map(j => j.date).sort().slice(-1)[0]
      : null;
    const reste = lastDate ? Data.cashEndOfDay(lastDate, k) : 0;
    this._set('dash-' + pfx + '-reste', Data.fmts(reste) + ' FCFA');

    // % CA Espèces et % CA Crédit
    const pctEsp = total ? (totEsp / total * 100) : 0;
    const pctCred = total ? (totCred / total * 100) : 0;
    this._set('dash-' + pfx + '-pct-esp', pctEsp.toFixed(1) + '%');
    const credEl = document.getElementById('dash-' + pfx + '-pct-cred');
    if (credEl) {
      credEl.textContent = pctCred.toFixed(1) + '%';
      // Alerte si >10%
      credEl.style.color = pctCred > 10 ? 'var(--c-red)' : '';
      credEl.style.fontWeight = pctCred > 10 ? '700' : '';
    }
    return total;
  },
};
