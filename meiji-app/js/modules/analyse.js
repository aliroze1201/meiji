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

  render() {
    const filter = App.filters.an;
    if (this.COMPTES[filter]) { this._renderCompte(this.COMPTES[filter]); return; }
    const all = App.filterByDate(Data.getAllDeps());
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
      <div class="mc red"><div class="mc-label red">Total charges</div><div class="mc-val red">${Data.fmt(tot)}</div></div>
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
      const byLabel = {};
      info.items.forEach(d => {
        if (!byLabel[d.label]) byLabel[d.label] = { total: 0, dept: d.dept, count: 0 };
        byLabel[d.label].total += d.montant;
        byLabel[d.label].count++;
      });
      const subRows = Object.entries(byLabel).sort((a,b) => b[1].total - a[1].total).map(([lbl, li]) => `
        <tr>
          <td style="padding-left:1.5rem">${lbl}</td>
          <td><span class="badge ${li.dept==='SUSHI'?'b-blue':li.dept==='BAR'?'b-green':'b-amber'}">${li.dept}</span></td>
          <td class="text-right" style="color:#aaa">${li.count}x</td>
          <td class="text-right fw-bold text-red">${Data.fmts(li.total)} FCFA</td>
          <td class="text-right" style="color:#aaa;font-size:11px">${info.total ? Math.round((li.total/info.total)*100) : 0}%</td>
        </tr>`).join('');

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
              <span class="fw-bold text-red" style="font-size:13px">${Data.fmt(info.total)}</span>
              <span style="color:#aaa">▼</span>
            </div>
          </div>
          <div class="progress-bg" style="margin:.5rem 0">
            <div class="progress-fill" style="background:${col};width:${pct}%"></div>
          </div>
          <div class="an-sub" style="display:none">
            <table>
              <thead><tr><th>Désignation</th><th>Dept</th><th>Nb fois</th><th class="text-right">Total</th><th class="text-right">%</th></tr></thead>
              <tbody>${subRows}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');
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
    const list = App.filterByDate(Data.getAllDeps())
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
        <td><span class="badge ${d.dept === 'SUSHI' ? 'b-blue' : d.dept === 'BAR' ? 'b-green' : 'b-amber'}">${d.dept}</span></td>
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
