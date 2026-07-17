/**
 * charts.js — Graphiques avec Chart.js
 * Garde la même API que l'ancienne implémentation Canvas.
 */

const Charts = {
  _instances: {},

  _getCtx(containerId, isCanvas) {
    const el = document.getElementById(containerId);
    if (!el) return null;
    let canvas;
    if (isCanvas) {
      canvas = el;
    } else {
      canvas = el.querySelector('canvas');
      if (!canvas) {
        el.innerHTML = '<canvas></canvas>';
        canvas = el.querySelector('canvas');
      }
    }
    return canvas;
  },

  _destroy(id) {
    if (this._instances[id]) {
      this._instances[id].destroy();
      delete this._instances[id];
    }
  },

  _alpha(hex, a) {
    const h = hex.replace('#','');
    const v = h.length === 3 ? h.split('').map(c => c+c).join('') : h;
    const r = parseInt(v.substr(0,2), 16);
    const g = parseInt(v.substr(2,2), 16);
    const b = parseInt(v.substr(4,2), 16);
    return `rgba(${r},${g},${b},${a})`;
  },

  _formatBig(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
    if (n >= 1000) return Math.round(n / 1000) + 'k';
    return Data.fmts(n);
  },

  _commonOpts() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const text = dark ? '#cbd5e1' : '#475569';
    return { grid, text };
  },

  // Granularité adaptative : au-delà de 16 jours distincts, on agrège par
  // MOIS pour que TOUTE la période soit visible (l'ancien slice(-12)
  // tronquait silencieusement les premiers jours — données invisibles).
  _bucket(dates) {
    const uniq = [...new Set(dates.filter(Boolean))].sort();
    const parMois = uniq.length > 16;
    const keyOf = d => (parMois ? d.slice(0, 7) : d);
    const keys = [...new Set(uniq.map(keyOf))];
    const MOIS = ['','janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
    const labelOf = k => parMois
      ? `${MOIS[parseInt(k.slice(5), 10)]} ${k.slice(0, 4)}`
      : Data.fmtDs(k);
    return { keys, keyOf, labelOf, parMois };
  },

  renderBarChart(containerId, journees) {
    const canvas = this._getCtx(containerId, false);
    if (!canvas) return;
    this._destroy(containerId);

    if (!journees.length) {
      canvas.parentElement.innerHTML = '<div class="empty" style="width:100%">Aucune donnée pour cette période</div>';
      return;
    }
    // Toutes les journées de la période sont représentées : par jour si la
    // période est courte, agrégées par mois sinon (aucune troncature).
    const B = this._bucket(journees.map(j => j.date));
    const sums = {};
    B.keys.forEach(k => { sums[k] = { s: 0, b: 0, c: 0 }; });
    journees.forEach(j => {
      const k = B.keyOf(j.date);
      sums[k].s += Data.caisse(j, 's');
      sums[k].b += Data.caisse(j, 'b');
      sums[k].c += Data.caisse(j, 'c');
    });
    const { grid, text } = this._commonOpts();

    this._instances[containerId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: B.keys.map(B.labelOf),
        datasets: [
          { label: 'SUSHI',  data: B.keys.map(k => sums[k].s), backgroundColor: '#2563EB', borderRadius: 4 },
          { label: 'BAR',    data: B.keys.map(k => sums[k].b), backgroundColor: '#10B981', borderRadius: 4 },
          { label: 'CHICHA', data: B.keys.map(k => sums[k].c), backgroundColor: '#F59E0B', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: text, font: { weight: 600 } } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${Data.fmt(c.raw)}` } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: text } },
          y: { stacked: true, grid: { color: grid }, ticks: { color: text, callback: v => Charts._formatBig(v) } },
        },
      },
    });
  },

  // CA vs Charges par jour + résultat net.
  // Charges du jour = totaux de la journée (ds/db/dc) + dépenses hors-journée
  // + sorties directes banque/mobile (toutes modalités, cf. getAllCharges).
  // Les jours à charges SANS journée de CA (ex. paie des salaires) sont
  // inclus dans l'axe — avant ils disparaissaient du graphique.
  renderCompareChart(containerId, journees) {
    const canvas = this._getCtx(containerId, false);
    if (!canvas) return;
    this._destroy(containerId);

    // Source UNIQUE : Data.getAllCharges() — la même que le KPI « Charges »
    // et la page Analyse (dépenses toutes modalités + détail journées +
    // part non détaillée des journées + sorties directes banque/mobile).
    // Les totaux du graphique collent donc exactement aux KPI.
    const chargesByDate = {};
    Data.getAllCharges().forEach(d => {
      if (!d.date) return;
      if (typeof App !== 'undefined' && App.inPeriod && !App.inPeriod(d.date)) return;
      chargesByDate[d.date] = (chargesByDate[d.date] || 0) + (d.montant || 0);
    });
    const jByDate = {};
    journees.forEach(j => { jByDate[j.date] = j; });
    const dates = [...new Set([...Object.keys(jByDate), ...Object.keys(chargesByDate)])].sort();

    if (!dates.length) {
      canvas.parentElement.innerHTML = '<div class="empty" style="width:100%">Aucune donnée</div>';
      return;
    }
    // Granularité adaptative (jour ou mois) : toute la période est visible.
    const B = this._bucket(dates);
    const caB = {}, chB = {};
    B.keys.forEach(k => { caB[k] = 0; chB[k] = 0; });
    dates.forEach(dt => {
      const k = B.keyOf(dt);
      if (jByDate[dt]) caB[k] += Data.caTotal(jByDate[dt]);
      chB[k] += chargesByDate[dt] || 0;
    });
    const ca      = B.keys.map(k => caB[k]);
    const charges = B.keys.map(k => chB[k]);
    const net     = B.keys.map((k, i) => ca[i] - charges[i]);
    const { grid, text } = this._commonOpts();

    this._instances[containerId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: B.keys.map(B.labelOf),
        datasets: [
          { label: 'CA',      data: ca,      backgroundColor: '#2563EB', borderRadius: 4, order: 2 },
          { label: 'Charges', data: charges, backgroundColor: '#EF4444', borderRadius: 4, order: 2 },
          { label: 'Résultat', data: net, type: 'line', borderColor: '#10B981',
            backgroundColor: '#10B981', tension: .3, pointRadius: 3, pointHoverRadius: 5,
            borderWidth: 2, order: 1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: text, font: { weight: 600 } } },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ${Data.fmt(c.raw)}` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: text } },
          y: { grid: { color: grid }, ticks: { color: text, callback: v => Charts._formatBig(v) } },
        },
      },
    });
  },

  _renderDonut(canvasId, dataItems, totalLabelId) {
    const canvas = this._getCtx(canvasId, true);
    if (!canvas) return;
    this._destroy(canvasId);

    const total = dataItems.reduce((s, d) => s + d.val, 0);
    const center = document.getElementById(totalLabelId);
    if (center) center.textContent = this._formatBig(total);

    if (total === 0) {
      // Anneau vide, adapté au thème clair/sombre
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      this._instances[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: { labels: ['—'], datasets: [{ data: [1], backgroundColor: [dark ? '#26282D' : '#e2e8f0'], borderWidth: 0 }] },
        options: { cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } },
      });
      return;
    }

    const { text } = this._commonOpts();
    this._instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: dataItems.map(d => d.label),
        datasets: [{
          data: dataItems.map(d => d.val),
          backgroundColor: dataItems.map(d => d.color),
          borderColor: 'transparent',
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                const pct = total ? Math.round((c.raw / total) * 100) : 0;
                return `${c.label}: ${Data.fmt(c.raw)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
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
    this._renderDonut(canvasId, data, 'donut-ca-v');

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
    const sum = (j, f) => (j.s?.[f] || 0) + (j.b?.[f] || 0) + (j.c?.[f] || 0);
    const esp  = journees.reduce((s,j) => s + sum(j, 'esp'),  0);
    const chq  = journees.reduce((s,j) => s + sum(j, 'chq'),  0);
    const mob  = journees.reduce((s,j) => s + sum(j, 'mob'),  0);
    const cred = journees.reduce((s,j) => s + sum(j, 'cred'), 0);
    const total = esp + chq + mob + cred || 0;
    let data = [
      { label: 'Espèces', val: esp,  color: '#2563EB' },
      { label: 'Chèque',  val: chq,  color: '#8B5CF6' },
      { label: 'Mobile',  val: mob,  color: '#10B981' },
      { label: 'Crédit',  val: cred, color: '#F59E0B' },
    ].filter(d => d.val > 0);

    this._renderDonut(canvasId, data, 'donut-pay-v');

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
    const all = Object.entries(byG).sort((a,b) => b[1] - a[1]);
    if (!all.length) {
      el.innerHTML = '<div class="empty">Aucune charge sur cette période</div>';
      return;
    }
    // Top 7 + une ligne agrégée pour le reste : rien n'est invisible.
    const sorted = all.slice(0, 7);
    const reste = all.slice(7);
    if (reste.length) {
      sorted.push([`… ${reste.length} autre${reste.length > 1 ? 's' : ''} catégorie${reste.length > 1 ? 's' : ''}`,
        reste.reduce((s, [, v]) => s + v, 0)]);
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
            <b>${Data.esc(g)}</b>
          </span>
          <span style="color:var(--c-muted);font-variant-numeric:tabular-nums">${Data.fmts(v)} FCFA <span style="opacity:.5">·</span> ${Math.round((v/tot)*100)}%</span>
        </div>
        <div class="progress-bg"><div class="progress-fill" style="background:linear-gradient(90deg, ${c}, ${this._alpha(c, .6)});width:${Math.round((v/max)*100)}%"></div></div>
      </div>`;
    }).join('');
  },
};
