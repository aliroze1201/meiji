/**
 * prix.js — Analyse des prix unitaires d'achat.
 *
 * Source : Data.getAllDeps() — seules les dépenses avec un prix unitaire
 * renseigné (champ P.U., saisi ou déduit de Qté + Montant) sont analysées.
 * Les achats sont regroupés par produit (libellé normalisé) pour suivre
 * l'évolution du prix unitaire dans le temps : hausses, baisses, indice
 * global du marché. Page en lecture seule : aucune écriture de données.
 */

const Prix = {
  // Filtres locaux de la page (la caisse est portée par App.filters.prix)
  filters: { trend: 'all', sort: 'var-desc', q: '' },

  // Seuil (en %) sous lequel une variation est considérée comme stable
  SEUIL_STABLE: 1,

  _chart: null,   // instance Chart.js de l'indice du marché
  _cache: [],     // produits calculés au dernier render (pour les filtres)

  render() {
    const products = this._collect();
    this._cache = products;
    this._renderMetrics(products);
    this._renderChart(products);
    this._renderTable(products);
  },

  setTrend(v) { this.filters.trend = v; this._renderTable(this._cache); },
  setSort(v)  { this.filters.sort  = v; this._renderTable(this._cache); },
  setSearch(v){ this.filters.q     = v; this._renderTable(this._cache); },

  // ===================== COLLECTE ET CALCULS =====================
  // Regroupe les achats par produit et calcule les indicateurs d'évolution.
  _collect() {
    const filter = App.filters.prix || 'all';
    let deps = App.filterByDate(Data.getAllDeps())
      .filter(d => { const p = Number(d.prix); return isFinite(p) && p > 0; });
    if (filter !== 'all') deps = deps.filter(d => d.dept === filter);

    const map = {};
    deps.forEach(d => {
      const key = String(d.label || d.groupe || '').toUpperCase().replace(/\s+/g, ' ').trim();
      if (!key) return;
      if (!map[key]) map[key] = { key, label: d.label || key, groupe: d.groupe || 'Autres', achats: [], depts: new Set() };
      const P = map[key];
      P.achats.push({
        date: d.date || '',
        dept: d.dept,
        prix: Number(d.prix),
        qte:  isFinite(Number(d.qte)) && Number(d.qte) > 0 ? Number(d.qte) : null,
        montant: Number(d.montant) || 0,
      });
      P.depts.add(d.dept);
    });

    return Object.values(map).map(P => {
      P.achats.sort((a, b) => a.date.localeCompare(b.date));
      const prices = P.achats.map(a => a.prix);
      P.first = P.achats[0];
      P.last  = P.achats[P.achats.length - 1];
      P.prev  = P.achats.length > 1 ? P.achats[P.achats.length - 2] : null;
      P.min = Math.min(...prices);
      P.max = Math.max(...prices);
      // Poids du produit dans l'indice global = total dépensé sur la période
      P.poids = P.achats.reduce((s, a) => s + (a.montant || 0), 0) || 1;
      P.varTot  = P.achats.length > 1 && P.first.prix
        ? ((P.last.prix - P.first.prix) / P.first.prix) * 100 : null;
      P.varLast = P.prev && P.prev.prix
        ? ((P.last.prix - P.prev.prix) / P.prev.prix) * 100 : null;
      P.trend = P.varTot == null ? 'unique'
        : P.varTot >  this.SEUIL_STABLE ? 'hausse'
        : P.varTot < -this.SEUIL_STABLE ? 'baisse'
        : 'stable';
      return P;
    });
  },

  // Variation en % formatée avec signe (fr-FR, 1 décimale max)
  _pct(v) {
    if (v == null || !isFinite(v)) return '—';
    const r = Math.round(v * 10) / 10;
    return (r > 0 ? '+' : '') + r.toLocaleString('fr-FR') + '%';
  },

  _trendMeta(trend) {
    return {
      hausse: { emoji: '📈', label: 'En hausse', color: 'var(--c-red)' },
      baisse: { emoji: '📉', label: 'En baisse', color: 'var(--c-bar)' },
      stable: { emoji: '➖', label: 'Stable',    color: 'var(--c-muted)' },
      unique: { emoji: '',   label: '1 seul achat', color: 'var(--c-muted)' },
    }[trend] || { emoji: '', label: trend, color: 'var(--c-muted)' };
  },

  // Mini-courbe SVG de l'historique des prix d'un produit
  _sparkline(prices, color) {
    if (prices.length < 2) return '<span style="color:var(--c-muted)">—</span>';
    const w = 96, h = 26, pad = 3;
    const min = Math.min(...prices), max = Math.max(...prices);
    const span = (max - min) || 1;
    const pt = (p, i) => {
      const x = pad + (i * (w - 2 * pad)) / (prices.length - 1);
      const y = h - pad - ((p - min) / span) * (h - 2 * pad);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    };
    const pts = prices.map(pt);
    const [lx, ly] = pts[pts.length - 1];
    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="display:block">
        <polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none"
          stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${lx}" cy="${ly}" r="2.5" fill="${color}"/>
      </svg>`;
  },

  // ===================== CARTES MÉTRIQUES =====================
  _renderMetrics(products) {
    const el = document.getElementById('prix-metrics');
    if (!el) return;
    const nbAchats = products.reduce((s, p) => s + p.achats.length, 0);
    const suivis  = products.filter(p => p.varTot != null);
    const hausses = suivis.filter(p => p.trend === 'hausse');
    const baisses = suivis.filter(p => p.trend === 'baisse');
    const avgOf = (list) => list.length
      ? list.reduce((s, p) => s + p.varTot, 0) / list.length : null;

    // « Évolution du marché » = moyenne des variations (dernier prix vs
    // premier prix), pondérée par le montant total acheté de chaque produit.
    let marche = null;
    if (suivis.length) {
      const den = suivis.reduce((s, p) => s + p.poids, 0);
      marche = den ? suivis.reduce((s, p) => s + p.varTot * p.poids, 0) / den : null;
    }
    const mCls = marche == null || Math.abs(marche) <= this.SEUIL_STABLE ? ''
      : marche > 0 ? 'red' : 'green';

    el.innerHTML = `
      <div class="mc blue"><div class="mc-label blue">🏷️ Produits suivis</div>
        <div class="mc-val blue">${products.length}</div>
        <div class="mc-sub">${nbAchats} achat(s) avec prix unitaire · ${suivis.length} avec historique comparable</div></div>
      <div class="mc red"><div class="mc-label red">📈 Prix en hausse</div>
        <div class="mc-val red">${hausses.length}</div>
        <div class="mc-sub">${hausses.length ? 'hausse moyenne ' + this._pct(avgOf(hausses)) : 'aucune hausse détectée'}</div></div>
      <div class="mc green"><div class="mc-label green">📉 Prix en baisse</div>
        <div class="mc-val green">${baisses.length}</div>
        <div class="mc-sub">${baisses.length ? 'baisse moyenne ' + this._pct(avgOf(baisses)) : 'aucune baisse détectée'}</div></div>
      <div class="mc ${mCls}"><div class="mc-label ${mCls}">🌍 Évolution du marché</div>
        <div class="mc-val ${mCls}">${this._pct(marche)}</div>
        <div class="mc-sub">variation moyenne pondérée par les montants achetés</div></div>`;
  },

  // ===================== INDICE DU MARCHÉ (GRAPHIQUE) =====================
  // Indice mensuel base 100 : pour chaque mois, moyenne des ratios
  // (prix moyen du mois / premier prix connu du produit), pondérée par le
  // montant total acheté de chaque produit présent ce mois-là.
  _renderChart(products) {
    const box = document.getElementById('prix-chart');
    if (!box) return;
    if (this._chart) { this._chart.destroy(); this._chart = null; }

    const multi = products.filter(p => p.achats.length >= 2);
    const months = [...new Set(multi.flatMap(p => p.achats.map(a => a.date.slice(0, 7))))]
      .filter(Boolean).sort();

    if (typeof Chart === 'undefined' || months.length < 2 || !multi.length) {
      box.innerHTML = `<div class="empty" style="width:100%">
        Pas encore assez d'historique pour tracer l'indice du marché :<br>
        <span style="font-size:12px">il faut au moins 2 mois d'achats avec prix unitaire pour un même produit.</span>
      </div>`;
      return;
    }

    const pointsN = [];
    const serie = months.map(m => {
      let num = 0, den = 0, n = 0;
      multi.forEach(p => {
        const inMonth = p.achats.filter(a => a.date.slice(0, 7) === m);
        if (!inMonth.length) return;
        const avg = inMonth.reduce((s, a) => s + a.prix, 0) / inMonth.length;
        num += (avg / p.first.prix) * p.poids;
        den += p.poids;
        n++;
      });
      pointsN.push(n);
      return den ? Math.round((num / den) * 1000) / 10 : null;
    });

    const MOIS = ['', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const labels = months.map(m => `${MOIS[parseInt(m.slice(5), 10)]} ${m.slice(0, 4)}`);
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridCol = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textCol = dark ? '#cbd5e1' : '#475569';
    const accent = (getComputedStyle(document.documentElement)
      .getPropertyValue('--c-primary') || '#F97316').trim() || '#F97316';

    box.innerHTML = '<canvas></canvas>';
    const canvas = box.querySelector('canvas');
    this._chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Indice des prix d\'achat (base 100 = premier prix)',
            data: serie,
            spanGaps: true,
            borderColor: accent,
            backgroundColor: typeof Charts !== 'undefined' ? Charts._alpha(accent, 0.12) : 'transparent',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          },
          {
            label: 'Base 100',
            data: months.map(() => 100),
            borderColor: gridCol,
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textCol, filter: (it) => it.text !== 'Base 100' } },
          tooltip: {
            filter: (it) => it.dataset.label !== 'Base 100',
            callbacks: {
              label: (ctx) => ` Indice : ${ctx.parsed.y} · ${pointsN[ctx.dataIndex]} produit(s) acheté(s) ce mois`,
            },
          },
        },
        scales: {
          x: { grid: { color: gridCol }, ticks: { color: textCol } },
          y: { grid: { color: gridCol }, ticks: { color: textCol } },
        },
      },
    });
  },

  // ===================== TABLEAU PAR PRODUIT =====================
  _renderTable(products) {
    const tb = document.getElementById('prix-table');
    if (!tb) return;

    const q = (this.filters.q || '').toUpperCase().replace(/\s+/g, ' ').trim();
    let list = products.slice();
    if (q) list = list.filter(p => p.key.includes(q));
    if (this.filters.trend !== 'all') list = list.filter(p => p.trend === this.filters.trend);

    const varOf = (p) => p.varTot == null ? null : p.varTot;
    const sorters = {
      // Les produits sans historique comparable (1 seul achat) passent en fin
      'var-desc': (a, b) => (varOf(b) ?? -Infinity) - (varOf(a) ?? -Infinity),
      'var-asc':  (a, b) => (varOf(a) ?? Infinity) - (varOf(b) ?? Infinity),
      'recent':   (a, b) => b.last.date.localeCompare(a.last.date),
      'nb':       (a, b) => b.achats.length - a.achats.length,
      'nom':      (a, b) => a.key.localeCompare(b.key),
    };
    list.sort(sorters[this.filters.sort] || sorters['var-desc']);

    if (!list.length) {
      tb.innerHTML = `<tr><td colspan="8" class="empty">
        Aucun produit à afficher.<br>
        <span style="font-size:12px">L'analyse porte sur les dépenses dont le <b>prix unitaire</b> est renseigné
        (saisis Qté + Montant dans l'onglet Dépenses : le P.U. est calculé automatiquement).
        Pense aussi au filtre de période (« Tout » en haut) et aux filtres de cette page.</span>
      </td></tr>`;
      return;
    }

    const dash = '<span style="color:var(--c-muted)">—</span>';
    const deptBadge = (dept) =>
        dept === 'SUSHI'  ? '<span class="badge b-blue">SUSHI</span>'
      : dept === 'BAR'    ? '<span class="badge b-green">BAR</span>'
      : dept === 'CHICHA' ? '<span class="badge b-amber">CHICHA</span>'
      : `<span class="badge">${Data.esc(dept || '—')}</span>`;

    tb.innerHTML = list.map(p => {
      const T = this._trendMeta(p.trend);
      const varCell = p.varTot == null
        ? `<span style="color:var(--c-muted)" title="Un seul achat avec prix : pas encore de comparaison possible">—</span>`
        : `<span style="font-weight:800;color:${T.color}">${this._pct(p.varTot)}</span>
           ${p.varLast != null && Math.round(p.varLast * 10) !== Math.round(p.varTot * 10)
             ? `<div style="font-size:10.5px;color:var(--c-muted)" title="Variation entre les deux derniers achats">dernier achat : ${this._pct(p.varLast)}</div>` : ''}`;

      // Détail chronologique (du plus récent au plus ancien) avec variation
      // de chaque achat par rapport à l'achat précédent.
      const detailRows = p.achats.map((a, i) => {
        const prev = i > 0 ? p.achats[i - 1] : null;
        const v = prev && prev.prix ? ((a.prix - prev.prix) / prev.prix) * 100 : null;
        const vCell = v == null ? dash
          : `<span style="font-weight:700;color:${v > this.SEUIL_STABLE ? 'var(--c-red)' : v < -this.SEUIL_STABLE ? 'var(--c-bar)' : 'var(--c-muted)'}">${this._pct(v)}</span>`;
        return { a, vCell };
      }).reverse().map(({ a, vCell }) => `
        <tr>
          <td class="nowrap">${Data.fmtDs(a.date)}</td>
          <td>${deptBadge(a.dept)}</td>
          <td class="text-right">${a.qte != null ? a.qte.toLocaleString('fr-FR') : dash}</td>
          <td class="text-right fw-bold">${Data.fmts(a.prix)} FCFA</td>
          <td class="text-right">${Data.fmts(a.montant)} FCFA</td>
          <td class="text-right">${vCell}</td>
        </tr>`).join('');

      return `
      <tr style="cursor:pointer" title="Clique pour voir l'historique des achats"
          onclick="const n=this.nextElementSibling;if(n)n.style.display=n.style.display==='none'?'':'none'">
        <td>
          <div style="font-weight:700">${Data.esc(p.label)}</div>
          <div style="font-size:11px;color:var(--c-muted)">${Data.esc(p.groupe)} · total acheté ${Data.fmt(p.poids)}</div>
        </td>
        <td>${[...p.depts].map(deptBadge).join(' ')}</td>
        <td class="text-right">${p.achats.length}</td>
        <td class="text-right">
          ${Data.fmts(p.first.prix)}
          <div style="font-size:10.5px;color:var(--c-muted)">${Data.fmtDs(p.first.date)}</div>
        </td>
        <td class="text-right fw-bold">
          ${Data.fmts(p.last.prix)}
          <div style="font-size:10.5px;color:var(--c-muted)">${Data.fmtDs(p.last.date)}</div>
        </td>
        <td class="text-right" style="font-size:12px;color:var(--c-muted)">${Data.fmts(p.min)} – ${Data.fmts(p.max)}</td>
        <td>${this._sparkline(p.achats.map(a => a.prix), T.color)}</td>
        <td class="text-right nowrap">${T.emoji} ${varCell}</td>
      </tr>
      <tr style="display:none">
        <td colspan="8" style="background:var(--c-bg-2);padding:10px 16px">
          <div style="font-size:11px;color:var(--c-muted);margin-bottom:6px">
            Historique des achats · variation calculée par rapport à l'achat précédent
          </div>
          <div style="overflow-x:auto">
            <table>
              <thead><tr><th>Date</th><th>Caisse</th><th class="text-right">Qté</th>
                <th class="text-right">Prix unitaire</th><th class="text-right">Montant</th>
                <th class="text-right">Variation</th></tr></thead>
              <tbody>${detailRows}</tbody>
            </table>
          </div>
        </td>
      </tr>`;
    }).join('');
  },
};
