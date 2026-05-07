/**
 * charts.js — Graphiques Canvas modernisés pour MEIJI
 * Gradients, retina, anneau épais, animation, hover.
 */

const Charts = {

  _alpha(hex, a) {
    const h = hex.replace('#','');
    const v = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
    const n = parseInt(v, 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  },

  _setup(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 140;
    const h = canvas.clientHeight || 140;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  },

  drawDonut(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const { ctx, w, h } = this._setup(canvas);
    const cx = w / 2, cy = h / 2;
    const r = Math.min(cx, cy) - 6;
    const ri = r - 18;

    ctx.clearRect(0, 0, w, h);

    // Track de fond
    ctx.beginPath();
    ctx.arc(cx, cy, (r + ri) / 2, 0, Math.PI * 2);
    ctx.lineWidth = r - ri;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--c-line').trim() || '#F1F4F9';
    ctx.stroke();

    const total = data.reduce((s, d) => s + d.val, 0);
    if (!total) return;

    const gap = 0.018;
    let start = -Math.PI / 2;

    data.forEach(d => {
      const angle = (d.val / total) * Math.PI * 2;
      if (angle <= 0) return;
      const a0 = start + gap / 2;
      const a1 = start + angle - gap / 2;

      const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      grad.addColorStop(0, this._alpha(d.color, 0.92));
      grad.addColorStop(1, d.color);

      ctx.beginPath();
      ctx.arc(cx, cy, (r + ri) / 2, a0, Math.max(a0, a1));
      ctx.strokeStyle = grad;
      ctx.lineWidth = r - ri;
      ctx.lineCap = 'round';
      ctx.stroke();

      start += angle;
    });
  },

  renderBarChart(containerId, journees) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!journees.length) {
      el.innerHTML = '<div class="empty" style="width:100%">Aucune donnée pour cette période</div>';
      return;
    }
    const slice = journees.slice(-12);
    const mx = Math.max(...slice.map(j => Data.caTotal(j))) || 1;
    el.innerHTML = slice.map(j => {
      const tot  = Data.caTotal(j);
      const hs   = Math.max(2, Math.round((Data.caisse(j,'s') / mx) * 150));
      const hb   = Math.max(2, Math.round((Data.caisse(j,'b') / mx) * 150));
      const hc   = Math.max(2, Math.round((Data.caisse(j,'c') / mx) * 150));
      return `
      <div class="bar-col" title="${Data.fmtD(j.date)} — ${Data.fmt(tot)}">
        <div class="bar-val">${Data.fmts(tot / 1000)}k</div>
        <div class="bar-col-spacer">
          <div class="bar-seg" style="background:linear-gradient(180deg,#FBBF24,#D97706);border-radius:3px 3px 0 0;height:${hc}px"></div>
          <div class="bar-seg" style="background:linear-gradient(180deg,#34D399,#047857);height:${hb}px"></div>
          <div class="bar-seg" style="background:linear-gradient(180deg,#60A5FA,#1D4ED8);border-radius:${hs<=2?'3px 3px 0 0':'0'};height:${hs}px"></div>
        </div>
        <div class="bar-label">${Data.fmtDs(j.date)}</div>
      </div>`;
    }).join('');
  },

  renderCompareChart(containerId, journees) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!journees.length) {
      el.innerHTML = '<div class="empty" style="width:100%">Aucune donnée</div>';
      return;
    }
    const slice = journees.slice(-12);
    const mx = Math.max(...slice.map(j => Math.max(Data.caTotal(j), Data.depTotal(j)))) || 1;
    el.innerHTML = slice.map(j => {
      const hca  = Math.max(2, Math.round((Data.caTotal(j)  / mx) * 140));
      const hdep = Math.max(2, Math.round((Data.depTotal(j) / mx) * 140));
      return `
      <div class="bar-col" title="${Data.fmtD(j.date)} — CA ${Data.fmt(Data.caTotal(j))} · Charges ${Data.fmt(Data.depTotal(j))}">
        <div class="bar-col-spacer">
          <div style="display:flex;align-items:flex-end;gap:3px;justify-content:center;height:100%">
            <div style="width:42%;height:${hca}px;background:linear-gradient(180deg,#60A5FA,#1D4ED8);border-radius:4px 4px 0 0"></div>
            <div style="width:42%;height:${hdep}px;background:linear-gradient(180deg,#F87171,#B91C1C);border-radius:4px 4px 0 0"></div>
          </div>
        </div>
        <div class="bar-label">${Data.fmtDs(j.date)}</div>
      </div>`;
    }).join('');
  },

  _formatBig(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
    if (n >= 1000) return Math.round(n / 1000) + 'k';
    return Data.fmts(n);
  },

  renderDonutCA(canvasId, legendId, journees) {
    const ts = journees.reduce((s, j) => s + Data.caisse(j,'s'), 0);
    const tb = journees.reduce((s, j) => s + Data.caisse(j,'b'), 0);
    const tc = journees.reduce((s, j) => s + Data.caisse(j,'c'), 0);
    const total = ts + tb + tc || 0;
    const data = [
      { label: 'SUSHI',  val: ts, color: '#2563EB' },
      { label: 'BAR',    val: tb, color: '#10B981' },
      { label: 'CHICHA', val: tc, color: '#F59E0B' },
    ];
    this.drawDonut(canvasId, data);

    const center = document.getElementById('donut-ca-v');
    if (center) center.textContent = this._formatBig(total);

    const legend = document.getElementById(legendId);
    if (legend) legend.innerHTML = data.map(d => `
      <div class="donut-legend-item">
        <div class="donut-dot" style="background:${d.color}"></div>
        <div style="flex:1;display:flex;justify-content:space-between;gap:8px">
          <div>
            <div style="font-weight:600">${d.label}</div>
            <div style="color:var(--c-muted);font-size:11px">${total ? Math.round((d.val/total)*100) : 0}%</div>
          </div>
          <div style="font-weight:700;font-variant-numeric:tabular-nums">${Data.fmts(d.val)}</div>
        </div>
      </div>`).join('');
  },

  renderDonutPay(canvasId, legendId, journees) {
    const esp  = journees.reduce((s,j) => s + j.s.esp + j.b.esp + j.c.esp, 0);
    const chq  = journees.reduce((s,j) => s + j.s.chq + j.b.chq + j.c.chq, 0);
    const mob  = journees.reduce((s,j) => s + j.s.mob + j.b.mob + j.c.mob, 0);
    const cred = journees.reduce((s,j) => s + j.s.cred + j.b.cred + j.c.cred, 0);
    const total = esp + chq + mob + cred || 0;
    let data = [
      { label: 'Espèces', val: esp,  color: '#2563EB' },
      { label: 'Chèque',  val: chq,  color: '#8B5CF6' },
      { label: 'Mobile',  val: mob,  color: '#10B981' },
      { label: 'Crédit',  val: cred, color: '#F59E0B' },
    ].filter(d => d.val > 0);

    this.drawDonut(canvasId, data);

    const center = document.getElementById('donut-pay-v');
    if (center) center.textContent = this._formatBig(total);

    const legend = document.getElementById(legendId);
    if (legend) legend.innerHTML = data.map(d => `
      <div class="donut-legend-item">
        <div class="donut-dot" style="background:${d.color}"></div>
        <div style="flex:1;display:flex;justify-content:space-between;gap:8px">
          <div>
            <div style="font-weight:600">${d.label}</div>
            <div style="color:var(--c-muted);font-size:11px">${total ? Math.round((d.val/total)*100) : 0}%</div>
          </div>
          <div style="font-weight:700;font-variant-numeric:tabular-nums">${Data.fmts(d.val)}</div>
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
    if (!sorted.length) {
      el.innerHTML = '<div class="empty">Aucune charge sur cette période</div>';
      return;
    }
    const max = sorted[0][1];
    const tot = deps.reduce((s,d) => s + d.montant, 0) || 1;
    el.innerHTML = sorted.map(([g, v]) => {
      const c = catColors[g] || '#94A3B8';
      return `
      <div class="progress-row">
        <div class="progress-label">
          <span style="display:inline-flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${c};flex-shrink:0;display:inline-block"></span>
            <b>${g}</b>
          </span>
          <span style="color:var(--c-muted);font-variant-numeric:tabular-nums">${Data.fmts(v)} FCFA <span style="opacity:.5">·</span> ${Math.round((v/tot)*100)}%</span>
        </div>
        <div class="progress-bg"><div class="progress-fill" style="background:linear-gradient(90deg, ${c}, ${this._alpha(c, .6)});width:${Math.round((v/max)*100)}%"></div></div>
      </div>`;
    }).join('');
  },
};
