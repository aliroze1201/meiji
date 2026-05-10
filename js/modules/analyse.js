/**
 * modules/analyse.js — Analyse des charges par groupe
 */

const Analyse = {
  render() {
    const filter = App.filters.an;
    let deps = Data.getAllDeps();
    if (filter !== 'all') deps = deps.filter(d => d.dept === filter);

    const total = deps.reduce((s, d) => s + d.montant, 0);
    const byGroup = {};
    deps.forEach(d => {
      const g = d.groupe || Data.getGroupe(d.label);
      if (!byGroup[g]) byGroup[g] = { total: 0, items: [] };
      byGroup[g].total += d.montant;
      byGroup[g].items.push(d);
    });

    const metrics = document.getElementById('an-metrics');
    if (metrics) {
      const nbGroups = Object.keys(byGroup).length;
      metrics.innerHTML = `
        <div class="mc red"><div class="mc-label red">Total charges</div><div class="mc-val red">${Data.fmt(total)}</div></div>
        <div class="mc blue"><div class="mc-label blue">Groupes</div><div class="mc-val blue">${nbGroups}</div></div>
        <div class="mc"><div class="mc-label">Lignes</div><div class="mc-val">${deps.length}</div></div>
      `;
    }

    const groups = document.getElementById('an-groups');
    if (!groups) return;
    const colors = Data.getCatColors();
    const sorted = Object.entries(byGroup).sort((a, b) => b[1].total - a[1].total);
    if (!sorted.length) { groups.innerHTML = '<div class="card"><div class="empty" style="padding:30px;text-align:center;color:#888">Aucune charge</div></div>'; return; }
    groups.innerHTML = sorted.map(([g, info]) => {
      const pct = total ? ((info.total / total) * 100).toFixed(1) : 0;
      const color = colors[g] || '#888';
      return `
        <div class="card" style="margin-bottom:16px">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
            <span class="card-title" style="color:${color}">${g}</span>
            <span style="font-weight:700;color:${color}">${Data.fmt(info.total)} (${pct}%)</span>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Désignation</th><th>Département</th><th style="text-align:right">Montant</th></tr></thead>
            <tbody>
              ${info.items.map(d => `<tr><td>${Data.fmtDs(d.date)}</td><td>${d.label}</td><td>${d.dept}</td><td style="text-align:right;font-weight:600">${Data.fmt(d.montant)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }).join('');
  },
};
