/**
 * analyse.js — Analyse charges groupées par nature.
 */

const Analyse = {
  render() {
    const filter = App.filters.an;
    const all = App.filterByDate(Data.getAllDeps());
    const fil = filter === 'all' ? all : all.filter(d => d.dept === filter);
    const tot = fil.reduce((s,d) => s + d.montant, 0);
    const catColors = Data.getCatColors();

    // Métriques
    const groups = {};
    fil.forEach(d => { groups[d.groupe] = (groups[d.groupe] || 0) + d.montant; });
    const dominant = Object.entries(groups).sort((a,b) => b[1]-a[1])[0]?.[0] || '-';
    const distinctLabels = [...new Set(fil.map(d => d.label))].length;

    const metricsEl = document.getElementById('an-metrics');
    if (metricsEl) metricsEl.innerHTML = `
      <div class="mc red"><div class="mc-label red">Total charges</div><div class="mc-val red">${Data.fmt(tot)}</div></div>
      <div class="mc blue"><div class="mc-label blue">Postes distincts</div><div class="mc-val blue">${distinctLabels}</div></div>
      <div class="mc"><div class="mc-label">Groupe dominant</div><div class="mc-val" style="font-size:14px">${dominant}</div></div>`;

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
              ${grp}
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
};
