/**
 * charts.js — Graphiques Canvas pour MEIJI
 */

const Charts = {

  drawDonut(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const [W, H, cx, cy, r, ri] = [120, 120, 60, 60, 52, 34];
    ctx.clearRect(0, 0, W, H);
    const total = data.reduce((s, d) => s + d.val, 0);
    if (!total) {
      ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.fill();
      return;
    }
    let start = -Math.PI / 2;
    data.forEach(d => {
      const angle = (d.val / total) * Math.PI * 2;
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + angle); ctx.closePath(); ctx.fill();
      start += angle;
    });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, ri, 0, Math.PI * 2); ctx.fill();
  },

  renderBarChart(containerId, journees) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!journees.length) { el.innerHTML = '<div style="width:100%;text-align:center;color:#aaa;font-size:11px;padding:20px">Aucune donnée pour cette période</div>'; return; }
    const mx = Math.max(...journees.map(j => Math.max(Data.caisse(j,'s'), Data.caisse(j,'b'), Data.caisse(j,'c')))) || 1;
    el.innerHTML = journees.slice(-10).map(j => `
      <div class="bar-col" title="${Data.fmtD(j.date)}">
        <div class="bar-val">${Data.fmts(Data.caTotal(j) / 1000)}k</div>
        <div class="bar-col-spacer">
          <div class="bar-seg" style="background:#BA7517;border-radius:2px 2px 0 0;height:${Math.max(2, Math.round((Data.caisse(j,'c') / mx) * 110))}px"></div>
          <div class="bar-seg" style="background:#0F6E56;height:${Math.max(2, Math.round((Data.caisse(j,'b') / mx) * 110))}px"></div>
          <div class="bar-seg" style="background:#185FA5;height:${Math.max(2, Math.round((Data.caisse(j,'s') / mx) * 110))}px"></div>
        </div>
        <div class="bar-label">${Data.fmtDs(j.date)}</div>
      </div>`).join('');
  },

  renderCompareChart(containerId, journees) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!journees.length) { el.innerHTML = '<div style="width:100%;text-align:center;color:#aaa;font-size:11px;padding:20px">Aucune donnée</div>'; return; }
    const mx = Math.max(...journees.map(j => Math.max(Data.caTotal(j), Data.depTotal(j)))) || 1;
    el.innerHTML = journees.slice(-10).map(j => `
      <div class="bar-col">
        <div class="bar-col-spacer">
          <div style="display:flex;align-items:flex-end;gap:2px;justify-content:center;height:100%">
            <div style="width:44%;height:${Math.max(2,Math.round((Data.caTotal(j)/mx)*100))}px;background:#185FA5;border-radius:3px 3px 0 0"></div>
            <div style="width:44%;height:${Math.max(2,Math.round((Data.depTotal(j)/mx)*100))}px;background:#E24B4A;border-radius:3px 3px 0 0"></div>
          </div>
        </div>
        <div class="bar-label">${Data.fmtDs(j.date)}</div>
      </div>`).join('');
  },

  renderDonutCA(canvasId, legendId, journees) {
    const ts = journees.reduce((s, j) => s + Data.caisse(j,'s'), 0);
    const tb = journees.reduce((s, j) => s + Data.caisse(j,'b'), 0);
    const tc = journees.reduce((s, j) => s + Data.caisse(j,'c'), 0);
    const total = ts + tb + tc || 1;
    const data = [
      { label: 'SUSHI', val: ts, color: '#185FA5' },
      { label: 'BAR', val: tb, color: '#0F6E56' },
      { label: 'CHICHA', val: tc, color: '#BA7517' },
    ];
    this.drawDonut(canvasId, data);
    const legend = document.getElementById(legendId);
    if (legend) legend.innerHTML = data.map(d => `
      <div class="donut-legend-item">
        <div class="donut-dot" style="background:${d.color}"></div>
        <div>
          <div style="font-weight:600">${d.label}</div>
          <div style="color:#aaa;font-size:10px">${Data.fmts(d.val)} FCFA (${Math.round((d.val/total)*100)}%)</div>
        </div>
      </div>`).join('');
  },

  renderDonutPay(canvasId, legendId, journees) {
    const esp = journees.reduce((s,j) => s + j.s.esp + j.b.esp + j.c.esp, 0);
    const chq = journees.reduce((s,j) => s + j.s.chq + j.b.chq + j.c.chq, 0);
    const mob = journees.reduce((s,j) => s + j.s.mob + j.b.mob + j.c.mob, 0);
    const cred = journees.reduce((s,j) => s + j.s.cred + j.b.cred + j.c.cred, 0);
    const total = esp + chq + mob + cred || 1;
    let data = [
      { label: 'Espèces', val: esp, color: '#185FA5' },
      { label: 'Chèque', val: chq, color: '#3C3489' },
      { label: 'Mobile', val: mob, color: '#0F6E56' },
      { label: 'Crédit', val: cred, color: '#BA7517' },
    ].filter(d => d.val > 0);
    if (!data.length) data = [{ label: '-', val: 1, color: '#f0f0f0' }];
    this.drawDonut(canvasId, data);
    const legend = document.getElementById(legendId);
    if (legend) legend.innerHTML = data.filter(d => d.label !== '-').map(d => `
      <div class="donut-legend-item">
        <div class="donut-dot" style="background:${d.color}"></div>
        <div>
          <div style="font-weight:600">${d.label}</div>
          <div style="color:#aaa;font-size:10px">${Data.fmts(d.val)} FCFA (${Math.round((d.val/total)*100)}%)</div>
        </div>
      </div>`).join('');
  },

  renderProgressBars(containerId, deps) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const catColors = Data.getCatColors();
    const byG = {};
    deps.forEach(d => { byG[d.groupe] = (byG[d.groupe] || 0) + d.montant; });
    const sorted = Object.entries(byG).sort((a,b) => b[1] - a[1]).slice(0, 7);
    const max = sorted[0] ? sorted[0][1] : 1;
    const tot = deps.reduce((s,d) => s + d.montant, 0) || 1;
    el.innerHTML = sorted.map(([g, v]) => `
      <div class="progress-row">
        <div class="progress-label">
          <span style="display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${catColors[g]||'#888'};flex-shrink:0;display:inline-block"></span>
            <b>${g}</b>
          </span>
          <span style="color:#888">${Data.fmts(v)} FCFA &nbsp;<span style="color:#bbb">${Math.round((v/tot)*100)}%</span></span>
        </div>
        <div class="progress-bg"><div class="progress-fill" style="background:${catColors[g]||'#888'};width:${Math.round((v/max)*100)}%"></div></div>
      </div>`).join('');
  },
};
