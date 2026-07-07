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
  _prevYm: null,   // mois affiché dans la carte prévisions (défaut : mois courant)

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

  setPrev(ym, nom, val) {
    if (!Data.previsions) Data.previsions = {};
    if (!Data.previsions[ym]) Data.previsions[ym] = {};
    const before = Data.previsions[ym][nom] || 0;
    const n = parseFloat(val);
    if (!isFinite(n) || n <= 0) delete Data.previsions[ym][nom];
    else Data.previsions[ym][nom] = Math.round(n);
    const after = Data.previsions[ym][nom] || 0;
    if (after !== before) {
      try {
        if (typeof Audit !== 'undefined') Audit.log('update', 'analyse',
          `Prévision ${nom} (${ym})`,
          `${Data.fmt(before)} → ${Data.fmt(after)}`,
          { ym, nom, before: { montant: before }, after: { montant: after } });
      } catch (e) {}
      this.persistPrev();
    }
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

  // Carte « Prévisions du mois » : budget par catégorie ET sous-catégorie,
  // comparé au réalisé du mois (toutes caisses), avec totaux fixes/variables.
  _renderPrevisions() {
    const box = document.getElementById('an-previsions');
    if (!box) return;
    const ym = this._prevYm || Data.today().slice(0, 7);
    const prevs = (Data.previsions && Data.previsions[ym]) || {};

    // Réalisé du mois par groupe (dépenses + dépenses de journées, toutes caisses)
    const realByG = {};
    Data.getAllDeps().forEach(d => {
      if ((d.date || '').slice(0, 7) !== ym) return;
      const g = d.groupe || 'Autres';
      realByG[g] = (realByG[g] || 0) + (d.montant || 0);
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

    // Sépare les lignes en DEUX tableaux : charges fixes et charges variables.
    // Une sous-catégorie peut être d'une autre nature que son parent : elle
    // apparaît alors dans l'autre tableau sous la forme « Parent › Nom ».
    const fixes = [], variables = [];
    rows.forEach(row => (natureOf(row) === 'fixe' ? fixes : variables).push(row));

    const mkRows = (list) => {
      let tPrev = 0, tReal = 0;
      const sameTable = new Set(list.map(r => r.c.nom));
      const html = list.map(row => {
        const { c, depth, parent } = row;
        const prev = Number(prevs[c.nom]) || 0;
        const real = realByG[c.nom] || 0;
        tPrev += prev; tReal += real;
        const ecart = real - prev;
        const ecartCell = prev
          ? `<span style="font-weight:700;color:${ecart > 0 ? 'var(--c-red)' : 'var(--c-bar)'}">${ecart > 0 ? '+' : ''}${Data.fmts(ecart)}</span>`
          : '<span class="text-muted">—</span>';
        const pctCell = prev
          ? `${Math.round((real / prev) * 100)}%`
          : '<span class="text-muted">—</span>';
        const indented = depth && parent && sameTable.has(parent.nom);
        const nomCell = indented
          ? `<span style="color:var(--c-muted)">└</span> <span style="font-weight:500">${Data.esc(c.nom)}</span>`
          : depth && parent
            ? `<span style="font-weight:500"><span style="color:var(--c-muted)">${Data.esc(parent.nom)} ›</span> ${Data.esc(c.nom)}</span>`
            : `<span style="font-weight:600">${Data.esc(c.nom)}</span>`;
        return `<tr${(!prev && !real) ? ' style="opacity:.65"' : ''}>
          <td>
            <div style="display:flex;align-items:center;gap:7px;${indented ? 'padding-left:22px' : ''}">
              <span style="width:9px;height:9px;border-radius:2px;background:${c.color || '#888'};display:inline-block;flex-shrink:0"></span>
              ${nomCell}
            </div>
          </td>
          <td style="text-align:right">
            <input type="number" min="0" step="1000" value="${prev || ''}" placeholder="0"
                   style="width:130px;text-align:right;font-weight:600"
                   onchange="Analyse.setPrev('${ym}', ${Data.esc(JSON.stringify(c.nom))}, this.value)">
          </td>
          <td class="text-right fw-bold">${real ? Data.fmts(real) : '<span class="text-muted">0</span>'}</td>
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
              <th class="text-right">Prévision (FCFA)</th>
              <th class="text-right">Réalisé</th>
              <th class="text-right">Écart</th>
              <th class="text-right">%</th>
            </tr></thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="5" class="empty">Aucune catégorie ${titre.toLowerCase()} — clique le badge 📌/📈 d'une catégorie ci-dessous pour la classer.</td></tr>`}
              <tr class="total-row"><td>${emoji} Total ${titre.toLowerCase()}</td><td class="text-right fw-bold">${Data.fmts(res.tPrev)}</td><td class="text-right fw-bold">${Data.fmts(res.tReal)}</td><td class="text-right fw-bold" style="color:${ecartTot > 0 ? 'var(--c-red)' : 'var(--c-bar)'}">${ecartTot > 0 ? '+' : ''}${Data.fmts(ecartTot)}</td><td></td></tr>
            </tbody>
          </table>
        </div>`;
    };

    box.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="ti ti-target-arrow"></i> Prévisions de charges · ${moisLbl}</span>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="month" value="${ym}" onchange="Analyse.setPrevYm(this.value)">
            <button class="btn btn-sm" onclick="Analyse.copyPrevMonth('${ym}')" title="Reprendre les prévisions du mois précédent"><i class="ti ti-copy"></i> Copier mois précédent</button>
          </div>
        </div>

        ${bloc('Charges fixes', '📌', F, F.html, 'var(--c-purple)')}
        ${bloc('Charges variables', '📈', V, V.html, 'var(--c-warning)')}

        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-top:14px;padding:12px 14px;border-top:2px solid var(--c-border);font-size:13.5px">
          <span style="font-weight:800">Total général : ${Data.fmt(totReal)} réalisé / ${Data.fmt(totPrev)} prévu</span>
          <span style="font-weight:800;color:${totReal > totPrev && totPrev ? 'var(--c-red)' : 'var(--c-bar)'}">
            ${totPrev ? (totReal > totPrev ? `dépassement de ${Data.fmt(totReal - totPrev)}` : `reste ${Data.fmt(totPrev - totReal)}`) : ''}
          </span>
        </div>
        <div style="font-size:11.5px;color:var(--c-muted)">
          Le « Réalisé » couvre toutes les caisses du mois choisi (indépendant du filtre de période).
          Une catégorie change de tableau via son badge 📌/📈 (liste des charges ci-dessous) ou la page Catégories.
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
