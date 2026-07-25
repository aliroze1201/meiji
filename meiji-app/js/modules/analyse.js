/**
 * analyse.js — Analyse charges groupées par nature.
 */

const Analyse = {
  // Comptes suivis par mot-clé : onglets dédiés qui regroupent TOUTES les
  // charges (dépenses + dépenses de journées) dont le libellé ou
  // l'observation mentionne la personne, quelle que soit la catégorie.
  // Pour suivre quelqu'un d'autre, ajouter une entrée ici + un onglet
  // data-filter correspondant dans index.html (an-tabs).
  COMPTES: {
    moustapha: { label: 'Moustapha', re: /MOUSTAPHA/i },
  },

  // ===================== PRÉVISIONS MENSUELLES =====================
  PREV_KEY: 'meiji-previsions',
  _prevYm: null,     // mois affiché dans la carte prévisions (défaut : mois courant)
  _prevTab: 'fixe',  // sous-onglet actif : 'fixe' | 'variable'

  setPrevTab(t) {
    this._prevTab = t === 'variable' ? 'variable' : 'fixe';
    this._renderPrevisions();
  },

  persistPrev() {
    if (typeof AppDB !== 'undefined') AppDB.save(this.PREV_KEY, Data.previsions || {});
  },

  async restorePrev() {
    if (typeof AppDB === 'undefined') return;
    const obj = await AppDB.load(this.PREV_KEY);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) Data.previsions = obj;
  },

  setPrevYm(v) {
    if (/^\d{4}-\d{2}$/.test(v || '')) this._prevYm = v;
    this._renderPrevisions();
  },

  // Une prévision = { m: montant FCFA, q: quantité achetée }.
  // Rétro-compat : les anciennes valeurs stockées comme simple nombre
  // sont lues comme un montant (q = 0).
  _prevVal(prevs, nom) {
    const v = prevs ? prevs[nom] : null;
    if (v == null) return { m: 0, q: 0 };
    if (typeof v === 'object') return { m: Number(v.m) || 0, q: Number(v.q) || 0 };
    return { m: Number(v) || 0, q: 0 };
  },

  setPrev(ym, nom, field, val) {
    if (!Data.previsions) Data.previsions = {};
    if (!Data.previsions[ym]) Data.previsions[ym] = {};
    const cur = this._prevVal(Data.previsions[ym], nom);
    const n = parseFloat(val);
    const clean = (!isFinite(n) || n <= 0) ? 0
      : (field === 'q' ? Math.round(n * 100) / 100 : Math.round(n));
    const next = { ...cur, [field]: clean };
    if (!next.m && !next.q) delete Data.previsions[ym][nom];
    else Data.previsions[ym][nom] = next;
    if (next[field] !== cur[field]) {
      try {
        if (typeof Audit !== 'undefined') Audit.log('update', 'analyse',
          `Prévision ${nom} (${ym})`,
          field === 'q'
            ? `Quantité : ${cur.q} → ${next.q}`
            : `${Data.fmt(cur.m)} → ${Data.fmt(next.m)}`,
          { ym, nom, before: cur, after: next });
      } catch (e) {}
      this.persistPrev();
    }
    this._renderPrevisions();
  },

  // CA total (toutes caisses) d'un mois donné.
  _caOfMonth(ym) {
    return (Data.journees || [])
      .filter(j => (j.date || '').slice(0, 7) === ym)
      .reduce((s, j) => s + Data.caTotal(j), 0);
  },

  // Nature d'une catégorie par son nom, avec héritage du parent.
  _natureOfNom(nom) {
    const c = (Data.categories || []).find(x => x.nom === nom);
    if (c && (c.nature === 'fixe' || c.nature === 'variable')) return c.nature;
    if (c && c.parentId) {
      const p = (Data.categories || []).find(x => String(x.id) === String(c.parentId));
      if (p) return Data.natureOfGroupe(p.nom);
    }
    return Data.natureOfGroupe(nom);
  },

  // Suggestions analytiques sur les N mois précédant `ym` :
  //  - moyennes mensuelles du réalisé par catégorie (montant + quantité) ;
  //  - CA total et CA moyen de la fenêtre → ratios charge/CA par catégorie.
  // Seuls les mois ayant de l'activité comptent dans les moyennes.
  _prevSuggestions(ym, nMois = 3) {
    const fenetre = [];
    let [y, m] = ym.split('-').map(Number);
    for (let i = 0; i < nMois; i++) {
      m--; if (m === 0) { m = 12; y--; }
      fenetre.push(`${y}-${String(m).padStart(2, '0')}`);
    }
    const set = new Set(fenetre);
    const nomsCat = new Set((Data.categories || [])
      .filter(c => c.type === 'dep' || c.type === 'both').map(c => c.nom));
    const totauxG = {}, totauxQG = {};
    const moisActifs = new Set();
    Data.getAllCharges().forEach(d => {
      const dm = (d.date || '').slice(0, 7);
      if (!set.has(dm)) return;
      moisActifs.add(dm);
      const g = d.groupe || 'Autres';
      if (!nomsCat.has(g)) return; // seules les catégories déclarées sont budgétées
      totauxG[g] = (totauxG[g] || 0) + (d.montant || 0);
      const q = Number(d.qte);
      if (isFinite(q) && q > 0) totauxQG[g] = (totauxQG[g] || 0) + q;
    });
    // CA de la fenêtre (même diviseur que les charges pour rester cohérent)
    const totalCA = fenetre.reduce((s, f) => s + this._caOfMonth(f), 0);
    const div = Math.max(1, moisActifs.size);
    const caMoyen = totalCA / div;
    const sugg = {}, suggQ = {};
    Object.entries(totauxG).forEach(([g, t]) => {
      const avg = t / div;
      sugg[g] = avg >= 1000 ? Math.round(avg / 1000) * 1000 : Math.round(avg);
    });
    Object.entries(totauxQG).forEach(([g, t]) => { suggQ[g] = Math.round(t / div); });
    return { sugg, suggQ, totauxG, totauxQG, totalCA, caMoyen, moisActifs: [...moisActifs].sort(), fenetre };
  },

  // Prévision proposée pour une catégorie, avec le FACTEUR CA :
  //  - charge FIXE     → moyenne historique simple (indépendante du CA) ;
  //  - charge VARIABLE → % du CA historique (charge/CA de la fenêtre)
  //                      appliqué au CA de référence du mois (caBase).
  _suggestedFor(nom, S, caBase) {
    const base = S.sugg[nom] || 0;
    if (this._natureOfNom(nom) === 'fixe') return base;
    if (!S.totalCA || !caBase) return base;
    const v = ((S.totauxG[nom] || 0) / S.totalCA) * caBase;
    return v >= 1000 ? Math.round(v / 1000) * 1000 : Math.round(v);
  },
  _suggestedQFor(nom, S, caBase) {
    const base = S.suggQ[nom] || 0;
    if (this._natureOfNom(nom) === 'fixe') return base;
    if (!S.totalCA || !caBase) return base;
    return Math.round(((S.totauxQG[nom] || 0) / S.totalCA) * caBase);
  },

  // Estimation du CA réalisable pour un mois, basée sur les mois précédents :
  // rythme journalier historique (CA / jour d'ouverture) × nombre de jours
  // d'ouverture habituel. Si le mois est déjà entamé, l'estimation part du
  // CA déjà réalisé et projette les jours d'ouverture restants.
  _estimateCA(ym, nMois = 3) {
    const fenetre = [];
    let [y, m] = ym.split('-').map(Number);
    for (let i = 0; i < nMois; i++) {
      m--; if (m === 0) { m = 12; y--; }
      fenetre.push(`${y}-${String(m).padStart(2, '0')}`);
    }
    let totalCA = 0, totalJours = 0, moisActifs = 0;
    fenetre.forEach(f => {
      const js = (Data.journees || []).filter(j => (j.date || '').slice(0, 7) === f);
      if (!js.length) return;
      moisActifs++;
      totalJours += js.length;
      totalCA += js.reduce((s, j) => s + Data.caTotal(j), 0);
    });
    if (!moisActifs || !totalJours || !totalCA) return null;
    const caJour = totalCA / totalJours;              // rythme par jour d'ouverture
    const joursMoyens = Math.round(totalJours / moisActifs); // jours d'ouverture / mois
    const jsCur = (Data.journees || []).filter(j => (j.date || '').slice(0, 7) === ym);
    const dejaCA = jsCur.reduce((s, j) => s + Data.caTotal(j), 0);
    const dejaJours = jsCur.length;
    const joursRestants = Math.max(0, joursMoyens - dejaJours);
    const brut = dejaCA + caJour * joursRestants;
    const estimation = brut >= 1e6
      ? Math.round(brut / 100000) * 100000
      : Math.round(brut / 10000) * 10000;
    return { estimation, caJour, joursMoyens, dejaCA, dejaJours, joursRestants, moisActifs };
  },

  // Bouton « Estimer le CA » : calcule et propose l'estimation comme CA prévu.
  estimateCA(ym) {
    if (typeof Auth !== 'undefined' && !Auth.canEdit('analyse')) { alert('Accès refusé.'); return; }
    const E = this._estimateCA(ym, 3);
    if (!E) {
      alert('Pas assez d\'historique : aucune journée de CA trouvée sur les 3 mois précédents.');
      return;
    }
    const lignes = [
      `Estimation du CA réalisable : ${Data.fmt(E.estimation)}`,
      '',
      'Méthode (basée sur les ' + E.moisActifs + ' derniers mois d\'activité) :',
      `· rythme historique : ${Data.fmt(Math.round(E.caJour))} par jour d'ouverture`,
      `· jours d'ouverture habituels : ${E.joursMoyens} / mois`,
    ];
    if (E.dejaJours > 0) {
      lignes.push(
        `· déjà réalisé ce mois : ${Data.fmt(E.dejaCA)} en ${E.dejaJours} jour(s)`,
        `· projection restante : ${E.joursRestants} jour(s) × ${Data.fmt(Math.round(E.caJour))}`);
    }
    lignes.push('', 'Utiliser cette estimation comme CA prévu du mois ?');
    if (!confirm(lignes.join('\n'))) return;
    this.setPrevCA(ym, String(E.estimation));
  },

  // CA prévu du mois (clé réservée __ca dans les prévisions du mois).
  setPrevCA(ym, val) {
    if (!Data.previsions) Data.previsions = {};
    if (!Data.previsions[ym]) Data.previsions[ym] = {};
    const before = Number(Data.previsions[ym].__ca) || 0;
    const n = parseFloat(val);
    if (!isFinite(n) || n <= 0) delete Data.previsions[ym].__ca;
    else Data.previsions[ym].__ca = Math.round(n);
    const after = Number(Data.previsions[ym].__ca) || 0;
    if (after !== before) {
      try {
        if (typeof Audit !== 'undefined') Audit.log('update', 'analyse',
          `CA prévu (${ym})`, `${Data.fmt(before)} → ${Data.fmt(after)}`,
          { ym, before: { ca: before }, after: { ca: after } });
      } catch (e) {}
      this.persistPrev();
    }
    this._renderPrevisions();
  },

  // Remplit les prévisions du mois avec les suggestions analytiques.
  // Facteur CA : les charges VARIABLES sont indexées sur le CA (ratio
  // charge/CA des mois précédents × CA prévu du mois — ou CA moyen si
  // aucun CA prévu n'est saisi) ; les charges FIXES restent à leur
  // moyenne historique.
  autoFillPrev(ym) {
    if (typeof Auth !== 'undefined' && !Auth.canEdit('analyse')) { alert('Accès refusé.'); return; }
    const S = this._prevSuggestions(ym, 3);
    const caPrev = Number((Data.previsions?.[ym] || {}).__ca) || 0;
    const caBase = caPrev || Math.round(S.caMoyen);
    const noms = [...new Set([...Object.keys(S.sugg), ...Object.keys(S.suggQ)])];
    const entries = noms
      .map(g => [g, { m: this._suggestedFor(g, S, caBase), q: this._suggestedQFor(g, S, caBase) }])
      .filter(([, v]) => v.m > 0 || v.q > 0);
    if (!S.moisActifs.length || !entries.length) {
      alert('Pas assez d\'historique : aucune dépense trouvée sur les 3 mois précédents.');
      return;
    }
    const tot = entries.reduce((s, [, v]) => s + v.m, 0);
    const moisLbl = S.moisActifs.map(x => x.split('-').reverse().join('/')).join(' + ');
    const caTxt = S.totalCA && caBase
      ? `CA de référence : ${Data.fmt(caBase)} ${caPrev ? '(CA prévu saisi)' : '(CA moyen des mois précédents)'}\n` +
        `→ charges variables indexées sur le CA (ratio charge/CA historique), charges fixes = moyenne simple.\n`
      : `Aucun CA trouvé sur la fenêtre : toutes les catégories à la moyenne simple.\n`;
    if (!confirm(
      `Calculer les prévisions de ${ym} automatiquement ?\n\n` +
      `Base : ${S.moisActifs.length} mois d'historique (${moisLbl}).\n` + caTxt +
      `${entries.length} catégorie(s) · total prévu ${Data.fmt(tot)}` +
      `${caBase ? ` · taux de charges prévu ${Math.round((tot / caBase) * 100)}% du CA` : ''}\n\n` +
      `⚠️ Les prévisions déjà saisies pour ce mois seront remplacées (le CA prévu est conservé).\n` +
      `Tu peux ensuite ajuster chaque montant à la main.`)) return;
    if (!Data.previsions) Data.previsions = {};
    Data.previsions[ym] = Object.fromEntries(entries);
    if (caPrev) Data.previsions[ym].__ca = caPrev;
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'analyse',
        `Prévisions auto ${ym}`,
        `${entries.length} catégorie(s) · ${Data.fmt(tot)} · base ${S.moisActifs.length} mois · CA réf ${Data.fmt(caBase)}`,
        { ym, after: Data.previsions[ym] });
    } catch (e) {}
    this.persistPrev();
    this._renderPrevisions();
  },

  copyPrevMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const src = Data.previsions?.[prev];
    if (!src || !Object.keys(src).length) {
      alert(`Aucune prévision enregistrée pour ${prev}.`);
      return;
    }
    if (!confirm(`Copier les prévisions de ${prev} vers ${ym} ?\n\nLes valeurs déjà saisies pour ${ym} seront remplacées.`)) return;
    Data.previsions[ym] = { ...src };
    this.persistPrev();
    this._renderPrevisions();
  },

  render() {
    const filter = App.filters.an;
    if (this.COMPTES[filter]) {
      const pb = document.getElementById('an-previsions');
      if (pb) pb.innerHTML = '';
      this._renderCompte(this.COMPTES[filter]);
      return;
    }
    this._renderPrevisions();
    const all = App.filterByDate(Data.getAllCharges());
    const fil = filter === 'all' ? all : all.filter(d => d.dept === filter);
    const tot = fil.reduce((s,d) => s + d.montant, 0);
    const catColors = Data.getCatColors();

    // Métriques + répartition fixe / variable (nature portée par la catégorie)
    const groups = {};
    fil.forEach(d => { groups[d.groupe] = (groups[d.groupe] || 0) + d.montant; });
    const dominant = Object.entries(groups).sort((a,b) => b[1]-a[1])[0]?.[0] || '-';
    const totFixe = fil.filter(d => Data.natureOfGroupe(d.groupe) === 'fixe')
                       .reduce((s,d) => s + d.montant, 0);
    const totVar  = tot - totFixe;
    const pctFixe = tot ? Math.round((totFixe / tot) * 100) : 0;

    const metricsEl = document.getElementById('an-metrics');
    if (metricsEl) metricsEl.innerHTML = `
      <div class="mc red"><div class="mc-label red">Total charges</div><div class="mc-val red">${Data.fmt(tot)}</div><div class="mc-sub">tous modes : espèces, banque, mobile</div></div>
      <div class="mc purple"><div class="mc-label purple">📌 Charges fixes</div><div class="mc-val purple">${Data.fmt(totFixe)}</div><div class="mc-sub">${pctFixe}% du total</div></div>
      <div class="mc amber"><div class="mc-label amber">📈 Charges variables</div><div class="mc-val amber">${Data.fmt(totVar)}</div><div class="mc-sub">${tot ? 100 - pctFixe : 0}% du total</div></div>
      <div class="mc"><div class="mc-label">Groupe dominant</div><div class="mc-val" style="font-size:14px">${Data.esc(dominant)}</div></div>`;

    // Groupes avec détail
    const byG = {};
    fil.forEach(d => {
      if (!byG[d.groupe]) byG[d.groupe] = { total: 0, items: [], byDept: { SUSHI: 0, BAR: 0, CHICHA: 0 } };
      byG[d.groupe].total += d.montant;
      byG[d.groupe].items.push(d);
      byG[d.groupe].byDept[d.dept] = (byG[d.groupe].byDept[d.dept] || 0) + d.montant;
    });
    const sorted = Object.entries(byG).sort((a,b) => b[1].total - a[1].total);

    const container = document.getElementById('an-groups');
    if (!container) return;
    container.innerHTML = sorted.map(([grp, info]) => {
      const pct = tot ? Math.round((info.total / tot) * 100) : 0;
      const col = catColors[grp] || '#888';
      // Badge fixe/variable cliquable : bascule la nature de la catégorie
      const nature = Data.natureOfGroupe(grp);
      const natureBadge = `
        <span class="badge ${nature === 'fixe' ? 'b-purple' : 'b-amber'}"
              onclick="event.stopPropagation();Analyse.toggleNature(${Data.esc(JSON.stringify(grp))})"
              title="Clique pour basculer entre charge fixe et charge variable"
              style="cursor:pointer">${nature === 'fixe' ? '📌 Fixe' : '📈 Variable'}</span>`;
      const deptBadge = (dept) =>
        dept === 'SUSHI'  ? '<span class="badge b-blue">SUSHI</span>'
      : dept === 'BAR'    ? '<span class="badge b-green">BAR</span>'
      : dept === 'CHICHA' ? '<span class="badge b-amber">CHICHA</span>'
      : dept === 'BANQUE' ? '<span class="badge b-purple" title="Sortie directe du compte bancaire">🏦 Banque</span>'
      : dept === 'MOBILE' ? '<span class="badge b-purple" title="Sortie directe du mobile money">📱 Mobile</span>'
      : `<span class="badge">${Data.esc(dept || '—')}</span>`;
      // Détail COMPLET : chaque dépense de la catégorie, ligne par ligne
      // (date, libellé, observation, caisse, mode de paiement, montant),
      // triée du plus récent au plus ancien.
      const modeIcon = (d) => {
        const p = d.paiement || 'esp';
        return p === 'banque' ? '<span title="Banque">🏦</span>'
          : p === 'mobile'    ? '<span title="Mobile money">📱</span>'
          : '<span title="Espèces">💵</span>';
      };
      const subRows = info.items.slice()
        .sort((a,b) => (b.date || '').localeCompare(a.date || '') || (b.montant - a.montant))
        .map(d => {
          const obs = d.observation && d.observation !== d.label
            ? `<div style="font-size:11px;color:var(--c-muted)">${Data.esc(d.observation)}</div>` : '';
          return `
        <tr>
          <td class="nowrap" style="padding-left:1.5rem;color:#aaa">${Data.fmtDs(d.date)}</td>
          <td>${Data.esc(d.label || '')}${obs}</td>
          <td>${deptBadge(d.dept)}</td>
          <td style="text-align:center">${modeIcon(d)}</td>
          <td class="text-right fw-bold text-red">${Data.fmts(d.montant)} FCFA</td>
          <td class="text-right" style="color:#aaa;font-size:11px">${info.total ? Math.round((d.montant/info.total)*100) : 0}%</td>
        </tr>`;
        }).join('');

      return `
        <div class="card" style="padding:14px 18px">
          <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer"
            onclick="const sub=this.parentElement.querySelector('.an-sub');sub.style.display=sub.style.display==='none'?'block':'none'">
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700">
              <span style="width:10px;height:10px;border-radius:2px;background:${col};display:inline-block"></span>
              ${Data.esc(grp)}
              ${natureBadge}
              <span style="font-size:11px;color:#aaa;font-weight:400">${pct}%</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge b-blue">S: ${Data.fmts(info.byDept.SUSHI)}</span>
              <span class="badge b-green">B: ${Data.fmts(info.byDept.BAR)}</span>
              <span class="badge b-amber">C: ${Data.fmts(info.byDept.CHICHA)}</span>
              ${info.byDept.BANQUE ? `<span class="badge b-purple" title="Sorties directes banque">🏦 ${Data.fmts(info.byDept.BANQUE)}</span>` : ''}
              ${info.byDept.MOBILE ? `<span class="badge b-purple" title="Sorties directes mobile money">📱 ${Data.fmts(info.byDept.MOBILE)}</span>` : ''}
              <span class="fw-bold text-red" style="font-size:13px">${Data.fmt(info.total)}</span>
              <span style="color:#aaa">▼</span>
            </div>
          </div>
          <div class="progress-bg" style="margin:.5rem 0">
            <div class="progress-fill" style="background:${col};width:${pct}%"></div>
          </div>
          <div class="an-sub" style="display:none">
            <div style="font-size:11px;color:#aaa;margin:.25rem 0 .35rem;padding-left:1.5rem">
              Détail complet
            </div>
            <div style="overflow-x:auto">
              <table>
                <thead><tr><th>Date</th><th>Désignation</th><th>Caisse</th><th style="text-align:center">Mode</th><th class="text-right">Montant</th><th class="text-right">%</th></tr></thead>
                <tbody>${subRows}</tbody>
              </table>
            </div>
          </div>
        </div>`;
    }).join('');
  },

  // Carte « Prévisions du mois » : budget par catégorie ET sous-catégorie,
  // comparé au réalisé du mois (toutes caisses), avec totaux fixes/variables.
  _renderPrevisions() {
    const box = document.getElementById('an-previsions');
    if (!box) return;
    const ym = this._prevYm || Data.today().slice(0, 7);
    const prevs = (Data.previsions && Data.previsions[ym]) || {};

    // Réalisé du mois par groupe (dépenses + dépenses de journées, toutes
    // caisses) : montant ET quantité achetée (champ Qté des dépenses).
    const realByG = {}, realQByG = {};
    Data.getAllCharges().forEach(d => {
      if ((d.date || '').slice(0, 7) !== ym) return;
      const g = d.groupe || 'Autres';
      realByG[g] = (realByG[g] || 0) + (d.montant || 0);
      const q = Number(d.qte);
      if (isFinite(q) && q > 0) realQByG[g] = (realQByG[g] || 0) + q;
    });

    // Hiérarchie des catégories de dépense : racines puis sous-catégories.
    // Une sous-catégorie sans nature propre hérite de celle de son parent.
    const rows = [];
    const roots = (Data.categories || [])
      .filter(c => !c.parentId && (c.type === 'dep' || c.type === 'both'))
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    roots.forEach(r => {
      rows.push({ c: r, depth: 0 });
      (Data.categories || [])
        .filter(x => x.parentId != null && String(x.parentId) === String(r.id))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        .forEach(ch => rows.push({ c: ch, depth: 1, parent: r }));
    });
    const natureOf = ({ c, parent }) => {
      if (c.nature === 'fixe' || c.nature === 'variable') return c.nature;
      if (parent) return Data.natureOfGroupe(parent.nom);
      return Data.natureOfGroupe(c.nom);
    };

    // Suggestions analytiques (moyenne des mois précédents + facteur CA) :
    // affichées en filigrane dans les champs vides, applicables via
    // « Calculer auto ». caBase = CA prévu saisi, sinon CA moyen historique.
    const S = this._prevSuggestions(ym, 3);
    const caPrev = Number(prevs.__ca) || 0;
    const caReal = this._caOfMonth(ym);
    const caEst = this._estimateCA(ym, 3);           // CA réalisable estimé
    const caBase = caPrev || caEst?.estimation || Math.round(S.caMoyen);

    // Sépare les lignes en DEUX tableaux : charges fixes et charges variables.
    // Une sous-catégorie peut être d'une autre nature que son parent : elle
    // apparaît alors dans l'autre tableau sous la forme « Parent › Nom ».
    const fixes = [], variables = [];
    rows.forEach(row => (natureOf(row) === 'fixe' ? fixes : variables).push(row));

    const fmtQ = (q) => (Math.round(q * 100) / 100).toLocaleString('fr-FR');
    const mkRows = (list) => {
      let tPrev = 0, tReal = 0;
      const sameTable = new Set(list.map(r => r.c.nom));
      const html = list.map(row => {
        const { c, depth, parent } = row;
        const { m: prev, q: prevQ } = this._prevVal(prevs, c.nom);
        const real = realByG[c.nom] || 0;
        const realQ = realQByG[c.nom] || 0;
        tPrev += prev; tReal += real;
        const ecart = real - prev;
        const ecartCell = prev
          ? `<span style="font-weight:700;color:${ecart > 0 ? 'var(--c-red)' : 'var(--c-bar)'}">${ecart > 0 ? '+' : ''}${Data.fmts(ecart)}</span>`
          : '<span class="text-muted">—</span>';
        const pctCell = prev
          ? `${Math.round((real / prev) * 100)}%`
          : '<span class="text-muted">—</span>';
        // Quantité réalisée colorée selon la prévision quantité
        const qCell = prevQ
          ? `<span style="font-weight:700;color:${realQ > prevQ ? 'var(--c-red)' : 'var(--c-bar)'}">${fmtQ(realQ)}</span> <span style="font-size:11px;color:var(--c-muted)">/ ${fmtQ(prevQ)}</span>`
          : (realQ ? fmtQ(realQ) : '<span class="text-muted">—</span>');
        const indented = depth && parent && sameTable.has(parent.nom);
        const nomCell = indented
          ? `<span style="color:var(--c-muted)">└</span> <span style="font-weight:500">${Data.esc(c.nom)}</span>`
          : depth && parent
            ? `<span style="font-weight:500"><span style="color:var(--c-muted)">${Data.esc(parent.nom)} ›</span> ${Data.esc(c.nom)}</span>`
            : `<span style="font-weight:600">${Data.esc(c.nom)}</span>`;
        return `<tr${(!prev && !real && !prevQ && !realQ) ? ' style="opacity:.65"' : ''}>
          <td>
            <div style="display:flex;align-items:center;gap:7px;${indented ? 'padding-left:22px' : ''}">
              <span style="width:9px;height:9px;border-radius:2px;background:${c.color || '#888'};display:inline-block;flex-shrink:0"></span>
              ${nomCell}
            </div>
          </td>
          <td style="text-align:right">
            <input type="number" min="0" step="1" value="${prevQ || ''}"
                   placeholder="${this._suggestedQFor(c.nom, S, caBase) || 0}"
                   title="${this._suggestedQFor(c.nom, S, caBase) ? 'Suggestion (historique' + (this._natureOfNom(c.nom) === 'variable' ? ' indexé sur le CA' : '') + ') : ' + fmtQ(this._suggestedQFor(c.nom, S, caBase)) : 'Renseigne le champ Qté lors de la saisie des dépenses pour suivre les quantités'}"
                   style="width:80px;text-align:right;font-weight:600"
                   onchange="Analyse.setPrev('${ym}', ${Data.esc(JSON.stringify(c.nom))}, 'q', this.value)">
          </td>
          <td class="text-right">${qCell}</td>
          <td style="text-align:right">
            <input type="number" min="0" step="1000" value="${prev || ''}"
                   placeholder="${this._suggestedFor(c.nom, S, caBase) || 0}"
                   title="${this._suggestedFor(c.nom, S, caBase) ? 'Suggestion (historique' + (this._natureOfNom(c.nom) === 'variable' ? ' indexé sur le CA' : '') + ') : ' + Data.fmt(this._suggestedFor(c.nom, S, caBase)) : 'Aucun historique récent pour cette catégorie'}"
                   style="width:130px;text-align:right;font-weight:600"
                   onchange="Analyse.setPrev('${ym}', ${Data.esc(JSON.stringify(c.nom))}, 'm', this.value)">
          </td>
          <td class="text-right fw-bold">${real ? Data.fmts(real) : '<span class="text-muted">0</span>'}</td>
          <td class="text-right" style="font-size:12px;color:var(--c-muted)" title="Part du CA réalisé du mois">${caReal && real ? (Math.round((real / caReal) * 1000) / 10) + '%' : '<span class="text-muted">—</span>'}</td>
          <td class="text-right">${ecartCell}</td>
          <td class="text-right" style="font-size:12px;color:var(--c-muted)">${pctCell}</td>
        </tr>`;
      }).join('');
      return { html, tPrev, tReal };
    };

    const F = mkRows(fixes);
    const V = mkRows(variables);
    const totPrev = F.tPrev + V.tPrev, totReal = F.tReal + V.tReal;
    const moisLbl = (() => {
      const mois = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      const [y, m] = ym.split('-');
      return `${mois[parseInt(m, 10)]} ${y}`;
    })();

    // Un bloc = bandeau prévu/réalisé + tableau + ligne de total.
    const bloc = (titre, emoji, res, rowsHtml, accent) => {
      const over = res.tPrev && res.tReal > res.tPrev;
      const pct = res.tPrev ? Math.min(100, Math.round((res.tReal / res.tPrev) * 100)) : 0;
      const ecartTot = res.tReal - res.tPrev;
      return `
        <div style="background:var(--c-bg-2);border-radius:var(--r-md);padding:12px 14px;margin:14px 0 10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;font-size:13px">
            <span style="font-weight:700">${emoji} ${titre} : ${Data.fmt(res.tReal)} réalisé / ${Data.fmt(res.tPrev)} prévu</span>
            <span style="font-weight:700;color:${over ? 'var(--c-red)' : 'var(--c-bar)'}">
              ${res.tPrev ? (over ? `dépassement de ${Data.fmt(res.tReal - res.tPrev)}` : `reste ${Data.fmt(res.tPrev - res.tReal)}`) : 'aucune prévision saisie'}
            </span>
          </div>
          <div class="progress-bg" style="margin-top:8px">
            <div class="progress-fill" style="width:${pct}%;background:${over ? 'var(--c-red)' : accent}"></div>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr>
              <th>Catégorie</th>
              <th class="text-right" title="Quantité à acheter prévue pour le mois">Qté prévue</th>
              <th class="text-right" title="Quantité réellement achetée (champ Qté des dépenses)">Qté réalisée</th>
              <th class="text-right">Prévision (FCFA)</th>
              <th class="text-right">Réalisé</th>
              <th class="text-right" title="Part du chiffre d'affaires réalisé du mois">% du CA</th>
              <th class="text-right">Écart</th>
              <th class="text-right">%</th>
            </tr></thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="8" class="empty">Aucune catégorie ${titre.toLowerCase()} — clique le badge 📌/📈 d'une catégorie ci-dessous pour la classer.</td></tr>`}
              <tr class="total-row"><td>${emoji} Total ${titre.toLowerCase()}</td><td></td><td></td><td class="text-right fw-bold">${Data.fmts(res.tPrev)}</td><td class="text-right fw-bold">${Data.fmts(res.tReal)}</td><td class="text-right fw-bold" style="font-size:12px">${caReal && res.tReal ? (Math.round((res.tReal / caReal) * 1000) / 10) + '%' : '—'}</td><td class="text-right fw-bold" style="color:${ecartTot > 0 ? 'var(--c-red)' : 'var(--c-bar)'}">${ecartTot > 0 ? '+' : ''}${Data.fmts(ecartTot)}</td><td></td></tr>
            </tbody>
          </table>
        </div>`;
    };

    const tab = this._prevTab;
    box.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="ti ti-target-arrow"></i> Prévisions de charges · ${moisLbl}</span>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="month" value="${ym}" onchange="Analyse.setPrevYm(this.value)">
            <button class="btn btn-sm btn-primary" onclick="Analyse.autoFillPrev('${ym}')" title="Charges fixes = moyenne des 3 derniers mois · Charges variables = % du CA historique appliqué au CA prévu"><i class="ti ti-wand"></i> Calculer auto</button>
            <button class="btn btn-sm" onclick="Analyse.copyPrevMonth('${ym}')" title="Reprendre les prévisions du mois précédent"><i class="ti ti-copy"></i> Copier mois précédent</button>
          </div>
        </div>

        <!-- Facteur CA : base du calcul des charges variables + taux de charges -->
        <div style="background:var(--c-bg-2);border-radius:var(--r-md);padding:10px 14px;margin-bottom:10px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;font-size:13px">
          <span style="display:inline-flex;align-items:center;gap:8px">
            <span style="font-weight:700">💰 CA prévu :</span>
            <input type="number" min="0" step="100000" value="${caPrev || ''}"
                   placeholder="${caEst?.estimation || Math.round(S.caMoyen) || 0}"
                   title="Chiffre d'affaires attendu pour ${moisLbl}. Sert de base aux prévisions de charges variables. Suggestion en grisé : CA réalisable estimé d'après le rythme des mois précédents."
                   style="width:150px;text-align:right;font-weight:700"
                   onchange="Analyse.setPrevCA('${ym}', this.value)">
            <button class="btn btn-sm" onclick="Analyse.estimateCA('${ym}')"
                    title="Estime le CA réalisable : rythme journalier des mois précédents × jours d'ouverture habituels, en partant du CA déjà encaissé si le mois est entamé">
              <i class="ti ti-chart-line"></i> Estimer le CA
            </button>
          </span>
          <span>CA réalisé : <b>${Data.fmt(caReal)}</b>${caEst && caReal && caEst.estimation > caReal ? ` <span style="font-size:11.5px;color:var(--c-muted)">· réalisable ≈ ${Data.fmt(caEst.estimation)}</span>` : ''}</span>
          <span title="Taux de charges = total des charges / chiffre d'affaires">Taux de charges :
            <b style="color:${caReal && totReal / caReal > 0.7 ? 'var(--c-red)' : 'var(--c-bar)'}">${caReal ? Math.round((totReal / caReal) * 100) + '%' : '—'} réalisé</b>
            · <b>${caBase && totPrev ? Math.round((totPrev / caBase) * 100) + '%' : '—'} prévu</b>
          </span>
        </div>

        <div class="tabs" style="margin-bottom:2px">
          <button class="tab ${tab === 'fixe' ? 'active' : ''}" onclick="Analyse.setPrevTab('fixe')">
            📌 Charges fixes${F.tPrev ? ' · ' + Data.fmts(F.tPrev) : ''}
          </button>
          <button class="tab ${tab === 'variable' ? 'active' : ''}" onclick="Analyse.setPrevTab('variable')">
            📈 Charges variables${V.tPrev ? ' · ' + Data.fmts(V.tPrev) : ''}
          </button>
        </div>

        ${tab === 'fixe'
          ? bloc('Charges fixes', '📌', F, F.html, 'var(--c-purple)')
          : bloc('Charges variables', '📈', V, V.html, 'var(--c-warning)')}

        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-top:14px;padding:12px 14px;border-top:2px solid var(--c-border);font-size:13.5px">
          <span style="font-weight:800">Total général (fixes + variables) : ${Data.fmt(totReal)} réalisé / ${Data.fmt(totPrev)} prévu</span>
          <span style="font-weight:800;color:${totReal > totPrev && totPrev ? 'var(--c-red)' : 'var(--c-bar)'}">
            ${totPrev ? (totReal > totPrev ? `dépassement de ${Data.fmt(totReal - totPrev)}` : `reste ${Data.fmt(totPrev - totReal)}`) : ''}
          </span>
        </div>
        <div style="font-size:11.5px;color:var(--c-muted)">
          Le « Réalisé » couvre toutes les caisses et TOUS les modes de paiement du mois choisi
          (dépenses espèces/banque/mobile + sorties directes banque et mobile money, hors transferts internes).
          Une catégorie change de sous-onglet via son badge 📌/📈 (liste des charges ci-dessous) ou la page Catégories.
        </div>
      </div>`;
  },

  // Bascule la nature (fixe ↔ variable) de la catégorie portant ce nom.
  // La nature est stockée sur la catégorie (page Catégories) et persiste
  // dans le cloud comme le reste.
  toggleNature(nom) {
    if (typeof Auth !== 'undefined' && !Auth.canEdit('categories') && !Auth.canEdit('analyse')) {
      alert('Accès refusé.'); return;
    }
    let c = (Data.categories || []).find(x => x.nom === nom);
    if (!c) {
      // Groupe sans catégorie déclarée (ancien mot-clé) : on la crée pour
      // pouvoir porter la nature, invisible ailleurs sinon.
      c = { id: Data.newId(), nom, type: 'dep', color: '#5F5E5A', dept: 'all', desc: '' };
      Data.categories.push(c);
    }
    const before = Data.natureOfGroupe(nom);
    c.nature = before === 'fixe' ? 'variable' : 'fixe';
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'categories',
        `Catégorie ${nom}`,
        `Nature : ${before} → ${c.nature}`,
        { id: c.id, before: { nature: before }, after: { nature: c.nature } });
    } catch (e) {}
    if (typeof Categories !== 'undefined' && Categories.persist) Categories.persist();
    this.render();
    if (typeof Categories !== 'undefined' && Categories.render) Categories.render();
  },

  // Vue « compte suivi » : total, répartition par caisse et détail
  // chronologique de toutes les charges liées à la personne.
  _renderCompte(cfg) {
    const list = App.filterByDate(Data.getAllCharges())
      .filter(d => cfg.re.test(`${d.label || ''} ${d.observation || ''}`))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const tot = list.reduce((s, d) => s + (d.montant || 0), 0);
    const byDept = { SUSHI: 0, BAR: 0, CHICHA: 0 };
    list.forEach(d => { byDept[d.dept] = (byDept[d.dept] || 0) + (d.montant || 0); });

    const metricsEl = document.getElementById('an-metrics');
    if (metricsEl) metricsEl.innerHTML = `
      <div class="mc red"><div class="mc-label red">Total ${Data.esc(cfg.label)}</div><div class="mc-val red">${Data.fmt(tot)}</div><div class="mc-sub">sur la période affichée</div></div>
      <div class="mc blue"><div class="mc-label blue">Opérations</div><div class="mc-val blue">${list.length}</div><div class="mc-sub">${list.length ? 'du ' + Data.fmtDs(list[list.length - 1].date) + ' au ' + Data.fmtDs(list[0].date) : '—'}</div></div>
      <div class="mc"><div class="mc-label">Répartition caisses</div><div class="mc-val" style="font-size:14px">S ${Data.fmts(byDept.SUSHI)} · B ${Data.fmts(byDept.BAR)} · C ${Data.fmts(byDept.CHICHA)}</div></div>`;

    const container = document.getElementById('an-groups');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `
        <div class="card">
          <div class="empty">Aucune charge « ${Data.esc(cfg.label)} » sur la période affichée.<br>
          <span style="font-size:12px">Sont comptées les dépenses dont le libellé ou l'observation contient « ${Data.esc(cfg.label)} ». Pense au filtre de période (« Tout » en haut).</span></div>
        </div>`;
      return;
    }

    const rows = list.map(d => {
      const src = d._jSrc
        ? `<span class="badge b-amber" title="Saisie dans la journée du ${Data.fmtD(d._jSrc.jDate)}">journée</span>`
        : `<span class="badge b-blue">dépense</span>`;
      const obs = d.observation && d.observation !== d.label
        ? `<div style="font-size:11px;color:var(--c-muted)">${Data.esc(d.observation)}</div>` : '';
      const mode = !d.paiement || d.paiement === 'esp' ? '💵' : d.paiement === 'banque' ? '🏦' : '📱';
      return `<tr>
        <td class="nowrap">${Data.fmtDs(d.date)}</td>
        <td><span class="badge ${d.dept === 'SUSHI' ? 'b-blue' : d.dept === 'BAR' ? 'b-green' : d.dept === 'BANQUE' || d.dept === 'MOBILE' ? 'b-purple' : 'b-amber'}">${d.dept === 'BANQUE' ? '🏦 Banque' : d.dept === 'MOBILE' ? '📱 Mobile' : d.dept}</span></td>
        <td>${Data.esc(d.label || '')}${obs}</td>
        <td>${Data.esc(d.groupe || '')}</td>
        <td>${src}</td>
        <td style="text-align:center">${mode}</td>
        <td class="text-right fw-bold text-red">${Data.fmts(d.montant)} FCFA</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <span style="font-weight:700;display:inline-flex;align-items:center;gap:8px">
            <i class="ti ti-user-search"></i> Détail des charges « ${Data.esc(cfg.label)} »
          </span>
          <span class="badge b-red" style="font-size:13px">${Data.fmt(tot)}</span>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Date</th><th>Caisse</th><th>Libellé</th><th>Catégorie</th><th>Source</th><th style="text-align:center">Mode</th><th class="text-right">Montant</th></tr></thead>
            <tbody>
              ${rows}
              <tr class="total-row"><td colspan="6">Total ${Data.esc(cfg.label)}</td><td class="text-right fw-bold text-red">${Data.fmts(tot)} FCFA</td></tr>
            </tbody>
          </table>
        </div>
      </div>`;
  },
};
