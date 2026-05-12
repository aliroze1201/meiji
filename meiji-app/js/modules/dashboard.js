/**
 * modules/dashboard.js — Tableau de bord
 */

const Dashboard = {
  render() {
    const jj = App.filterJournees();
    const label = App.getPeriodLabel();
    const pl = document.getElementById('period-label');
    if (pl) pl.textContent = label;

    const allDeps = Data.getAllDeps();
    const totCA = jj.reduce((s,j) => s + Data.caTotal(j), 0);
    const totDep = allDeps.reduce((s,d) => s + d.montant, 0);
    const net = totCA - totDep;
    const credO = Data.credits.filter(c => c.statut === 'ouvert');
    const credMnt = credO.reduce((s,c) => s + c.montant, 0);

    // KPIs
    this._set('d-ca', Data.fmt(totCA));
    this._set('d-ca-nb', jj.length + ' journée' + (jj.length > 1 ? 's' : ''));
    this._set('d-charges', Data.fmt(totDep));
    const nel = document.getElementById('d-net');
    if (nel) {
      nel.textContent = Data.fmt(net);
      nel.style.color = net >= 0 ? 'var(--c-bar)' : 'var(--c-red)';
    }
    this._set('d-cred', Data.fmt(credMnt));
    this._set('d-cred-nb', credO.length + ' client' + (credO.length > 1 ? 's' : ''));

    // Caisses
    this._setCaisse('cs', 's', jj);
    this._setCaisse('cb', 'b', jj);
    this._setCaisse('cc', 'c', jj);

    // Soldes
    this._set('d-banque', Data.fmt(Data.soldes.banque.montant));
    this._set('d-banque-date', Data.soldes.banque.date ? 'Mis à jour le ' + Data.soldes.banque.date : 'Non renseigné');
    this._set('d-mobile', Data.fmt(Data.soldes.mobile.montant));
    this._set('d-mobile-date', Data.soldes.mobile.date ? 'Mis à jour le ' + Data.soldes.mobile.date : 'Non renseigné');

    // Graphiques
    Charts.renderBarChart('bar-chart', jj);
    Charts.renderDonutCA('donut-ca', 'donut-ca-legend', jj);
    Charts.renderCompareChart('compare-chart', jj);
    Charts.renderDonutPay('donut-pay', 'donut-pay-legend', jj);
    Charts.renderProgressBars('charges-bars', allDeps);

    // Récap journée
    this._renderRecap(jj);
  },

  _renderRecap(jj) {
    const ids = ['rj-s','rj-b','rj-c','rj-esp','rj-dep','rj-solde'];
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

    const totEsp = (last.s.esp || 0) + (last.b.esp || 0) + (last.c.esp || 0);
    const totDep = (last.ds || 0) + (last.db || 0) + (last.dc || 0);
    const solde = totEsp - totDep;
    this._set('rj-esp', Data.fmt(totEsp));
    this._set('rj-dep', Data.fmt(totDep));
    const sel = document.getElementById('rj-solde');
    if (sel) {
      sel.textContent = Data.fmt(solde);
      sel.style.color = solde >= 0 ? 'var(--c-bar)' : 'var(--c-red)';
    }

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

  _setCaisse(pfx, k, jj) {
    const total = jj.reduce((s,j) => s + Data.caisse(j, k), 0);
    this._set('dash-' + pfx, Data.fmt(total));
    this._set('dash-' + pfx + '-esp', Data.fmts(jj.reduce((s,j) => s + j[k].esp, 0)) + ' FCFA');
    this._set('dash-' + pfx + '-chq', Data.fmts(jj.reduce((s,j) => s + j[k].chq, 0)) + ' FCFA');
    this._set('dash-' + pfx + '-mob', Data.fmts(jj.reduce((s,j) => s + j[k].mob, 0)) + ' FCFA');
    this._set('dash-' + pfx + '-cred', Data.fmts(jj.reduce((s,j) => s + j[k].cred, 0)) + ' FCFA');
    // Caisse restante = solde espèces cumulé en fin de période filtrée
    const lastDate = jj.length
      ? jj.map(j => j.date).sort().slice(-1)[0]
      : null;
    const reste = lastDate ? Data.cashEndOfDay(lastDate, k) : 0;
    this._set('dash-' + pfx + '-reste', Data.fmts(reste) + ' FCFA');
  },
};
