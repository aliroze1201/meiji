/**
 * search.js — Recherche globale (barre du topbar).
 *
 * Indexe à la volée toutes les entités principales et propose un menu
 * déroulant de résultats. Cliquer un résultat ouvre la page concernée
 * et, quand c'est possible, applique un filtre local.
 */
const Search = {
  MAX_RESULTS: 30,
  DEBOUNCE_MS: 100,
  _timer: null,
  _activeIdx: -1,
  _lastResults: [],
  _wired: false,
  _menuEl: null,
  _inputEl: null,

  init() {
    if (this._wired) return;
    const input = document.getElementById('tb-search-input');
    if (!input) {
      setTimeout(() => this.init(), 200);
      return;
    }
    this._inputEl = input;

    // Crée le dropdown directement dans <body> pour éviter toute
    // contrainte d'overflow ou de stacking context parent.
    let menu = document.getElementById('tb-search-menu');
    if (menu && menu.parentElement !== document.body) menu.remove();
    menu = document.getElementById('tb-search-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'tb-search-menu';
      menu.className = 'tb-search-menu';
      menu.setAttribute('role', 'listbox');
      document.body.appendChild(menu);
    }
    this._menuEl = menu;
    this._hide();

    // Délégation : un SEUL handler sur le menu, qui dispatche selon data-idx.
    // Mousedown + click pour couvrir tous les cas (souris, touch, etc.).
    const onPick = (ev) => {
      const item = ev.target.closest && ev.target.closest('.tb-search-item');
      if (!item || !this._menuEl.contains(item)) return;
      ev.preventDefault();
      ev.stopPropagation();
      const idx = parseInt(item.dataset.idx, 10);
      console.log('🔍 Search clic item idx=', idx, item);
      this._activate(idx);
    };
    menu.addEventListener('mousedown', onPick);
    menu.addEventListener('click', onPick);
    menu.addEventListener('touchend', onPick);

    input.addEventListener('input', () => {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._run(input.value), this.DEBOUNCE_MS);
    });
    input.addEventListener('keydown', (e) => this._onKey(e));
    input.addEventListener('focus', () => {
      if (input.value.trim()) this._run(input.value);
    });
    window.addEventListener('resize', () => { if (this._isOpen()) this._positionMenu(); });
    window.addEventListener('scroll', () => { if (this._isOpen()) this._positionMenu(); }, true);
    document.addEventListener('click', (e) => {
      if (!this._menuEl) return;
      if (!this._menuEl.contains(e.target) && e.target !== this._inputEl) this._hide();
    });

    this._wired = true;
    console.log('🔍 Search initialisée (input=' + !!input + ', menu=' + !!menu + ')');
  },

  // ===== Normalisation =====
  _norm(s) {
    if (s == null) return '';
    return String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
  },

  // Navigue vers une page, puis cherche la 1\u00e8re ligne <tr> qui contient
  // TOUS les fragments fournis (case/accents insensibles) et la met en
  // surbrillance + scroll. R\u00e9essaie pendant ~2 s pour laisser au render
  // asynchrone le temps de produire le tableau.
  // Navigue vers une page puis cible la ligne exacte. Trois stratégies en
  // cascade, de la plus fiable à la plus permissive :
  //  1. options.id  → cherche tr[data-search-id="..."] (le plus précis)
  //  2. fragments   → trouve la ligne avec le plus de fragments matchés
  //  3. partial     → fallback ≥ 70 % de fragments après 1,5 s
  _gotoRow(pageId, options, ...fragments) {
    // Si options n'est pas un objet (ancienne signature), on traite tous
    // les paramètres comme des fragments.
    if (typeof options !== 'object' || options === null || Array.isArray(options)) {
      fragments = [options, ...fragments].filter(Boolean);
      options = {};
    }
    // 1) Bascule période globale + filtres dept en "Tout/all" pour garantir
    //    que la ligne ciblée est rendue dans la table.
    try {
      if (typeof App !== 'undefined') {
        App.period = 'tout';
        document.querySelectorAll('#period-seg .seg-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.period === 'tout');
        });
        if (App.filters) {
          Object.keys(App.filters).forEach(k => { App.filters[k] = 'all'; });
        }
      }
    } catch (e) {}
    if (typeof App !== 'undefined' && App.nav) App.nav(pageId);

    const norm = (s) => this._norm(s);
    const frags = fragments.filter(Boolean).map(norm).filter(f => f.length > 0);
    const wantedId = options.id || null;
    console.log('🔍 _gotoRow page=' + pageId + ' id=' + wantedId + ' fragments=', frags);

    const start = Date.now();
    let scrolled = false;
    let bestRow = null;
    let bestScore = 0;
    const minPartial = Math.max(1, Math.ceil(frags.length * 0.7));

    const tryFind = (acceptPartial) => {
      const page = document.getElementById('page-' + pageId);
      if (!page) return null;
      // a) Recherche directe par data-search-id (le plus fiable)
      if (wantedId) {
        const exact = page.querySelector(
          'tbody tr[data-search-id="' + wantedId.replace(/"/g, '\\"') + '"]'
        );
        if (exact) return { row: exact, score: 99 };
      }
      // b) Fallback par texte
      if (!frags.length) return null;
      const rows = page.querySelectorAll('tbody tr');
      let topRow = null, topScore = 0;
      for (const tr of rows) {
        const txt = norm(tr.textContent);
        let s = 0;
        for (const f of frags) if (txt.includes(f)) s++;
        if (s > topScore) { topScore = s; topRow = tr; if (s === frags.length) break; }
      }
      if (topRow && (topScore === frags.length || (acceptPartial && topScore >= minPartial))) {
        return { row: topRow, score: topScore };
      }
      return null;
    };

    const deadline = start + 5000;
    const loop = () => {
      const elapsed = Date.now() - start;
      const acceptPartial = elapsed > 1500;
      const hit = tryFind(acceptPartial);
      if (hit && (hit.row !== bestRow || hit.score > bestScore)) {
        bestRow = hit.row; bestScore = hit.score;
        this._highlight(hit.row, !scrolled);
        scrolled = true;
      }
      if (Date.now() > deadline) {
        if (!bestRow) console.warn('🔍 Aucune ligne trouvée. id=' + wantedId + ' frags=', frags);
        else console.log('🔍 Ligne trouvée (score ' + bestScore + ')');
        return;
      }
      setTimeout(loop, hit ? 600 : 120);
    };
    setTimeout(loop, 80);
  },

  _highlight(el, doScroll) {
    if (!el) return;
    if (el.classList.contains('search-highlight')) return; // déjà highlighté
    el.classList.add('search-highlight');
    if (doScroll) {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
    setTimeout(() => el.classList.remove('search-highlight'), 3600);
  },

  _score(text, q, fieldWeight) {
    if (!text) return 0;
    const idx = text.indexOf(q);
    if (idx < 0) return 0;
    const positionBonus = idx === 0 ? 100 : (idx < 5 ? 50 : 10);
    const lengthPenalty = Math.min(50, Math.floor(text.length / 4));
    return fieldWeight + positionBonus - lengthPenalty;
  },

  // ===== Run =====
  _run(raw) {
    if (!this._menuEl) return;
    const q = this._norm(raw);
    if (!q) { this._hide(); return; }

    let results = [];
    try {
      results = this._collect(q);
    } catch (e) {
      console.error('[Search] collect error', e);
    }
    this._lastResults = results;
    this._activeIdx = results.length ? 0 : -1;
    this._renderMenu(results, raw);
  },

  // ===== Collecte sur toutes les sources =====
  _collect(q) {
    const hits = [];
    const push = (h) => { if (h && h.score > 0) hits.push(h); };
    const safe = (label, fn) => {
      try { fn(); } catch (e) { console.warn('[Search] ' + label + ':', e); }
    };
    const fmt = (n) => (typeof Data !== 'undefined' && Data.fmt) ? Data.fmt(n || 0) : String(n || 0);
    const fmts = (n) => (typeof Data !== 'undefined' && Data.fmts) ? Data.fmts(n || 0) : String(n || 0);
    const fmtDs = (d) => (typeof Data !== 'undefined' && Data.fmtDs) ? Data.fmtDs(d) : (d || '');
    const fmtD = (d) => (typeof Data !== 'undefined' && Data.fmtD) ? Data.fmtD(d) : (d || '');
    const go = (page) => () => { if (typeof App !== 'undefined' && App.nav) App.nav(page); };
    // gotoById : passe directement l'ID unique de la ligne (tr[data-search-id])
    const gotoById = (page, id, ...fr) => () => this._gotoRow(page, { id }, ...fr);
    // goto : fallback texte uniquement
    const goto = (page, ...fr) => () => this._gotoRow(page, {}, ...fr);

    // ---- Pages (raccourci) ----
    safe('pages', () => {
      const pages = [
        ['dashboard', 'Tableau de bord', 'ti-layout-dashboard'],
        ['pointage', 'Pointage', 'ti-calendar-event'],
        ['recettes', 'Recettes', 'ti-cash'],
        ['depenses', 'Dépenses', 'ti-receipt'],
        ['analyse', 'Analyse', 'ti-chart-pie'],
        ['banque', 'Banque', 'ti-building-bank'],
        ['mobile', 'Mobile', 'ti-device-mobile'],
        ['categories', 'Catégories', 'ti-tag'],
        ['employes', 'Employés', 'ti-users'],
        ['comptes-emp', 'Comptes employés', 'ti-user-dollar'],
        ['credits', 'Crédits clients', 'ti-credit-card'],
        ['fournisseurs', 'Fournisseurs', 'ti-truck'],
        ['stock', 'Stock', 'ti-package'],
        ['associes', 'Associés', 'ti-users-group'],
        ['bilan', 'Bilan', 'ti-report'],
        ['clotures', 'Clôtures', 'ti-lock'],
        ['suivi', 'Chèques', 'ti-receipt-2'],
        ['historique', 'Historique', 'ti-history'],
      ];
      pages.forEach(([id, label, icon]) => {
        const score = this._score(this._norm(label), q, 1500);
        if (score > 0) push({ score, cat: 'Pages', icon, title: label, sub: 'Aller à la page', action: go(id) });
      });
    });

    // ---- Employés ----
    safe('employes', () => {
      (Data.employes || []).forEach((e) => {
        const score = Math.max(
          this._score(this._norm(e.nom), q, 1000),
          this._score(this._norm(e.poste), q, 400),
          this._score(this._norm(e.dept), q, 200),
        );
        push({
          score, cat: 'Employés', icon: 'ti-user',
          title: e.nom || '—', sub: `${e.poste || '—'} · ${e.dept || ''}`,
          action: gotoById('employes', 'emp:' + (e.nom || ''), e.nom, e.poste),
        });
      });
    });

    // ---- Fournisseurs ----
    safe('fournisseurs', () => {
      const list = (Data.fournisseursListe || []).concat(Data.fournisseurs || []);
      list.forEach(f => {
        const score = this._score(this._norm(f.nom || f.name), q, 900);
        push({
          score, cat: 'Fournisseurs', icon: 'ti-truck',
          title: f.nom || f.name || '—',
          sub: [f.tel, f.adresse].filter(Boolean).join(' · '),
          action: gotoById('fournisseurs', 'four:' + (f.nom || f.name || ''), f.nom || f.name),
        });
      });
    });

    // ---- Crédits clients ----
    safe('credits', () => {
      (Data.credits || []).forEach(c => {
        const score = Math.max(
          this._score(this._norm(c.client), q, 850),
          this._score(this._norm(c.ticket), q, 600),
        );
        push({
          score, cat: 'Crédits clients', icon: 'ti-credit-card',
          title: c.client || '—',
          sub: `Ticket #${c.ticket || ''} · ${c.dept || ''} · ${fmt(c.montant)} · ${c.statut || ''}`,
          action: gotoById('credits', 'cre:' + c.id, c.client, c.ticket ? String(c.ticket) : null),
        });
      });
    });

    // ---- Stock ----
    safe('stock', () => {
      (Data.stockArticles || []).forEach(a => {
        const score = Math.max(
          this._score(this._norm(a.nom), q, 800),
          this._score(this._norm(a.ref), q, 700),
          this._score(this._norm(a.categorie), q, 300),
          this._score(this._norm(a.fournisseur), q, 300),
        );
        push({
          score, cat: 'Stock', icon: 'ti-package',
          title: a.nom || '—',
          sub: [a.ref, a.categorie, a.fournisseur].filter(Boolean).join(' · '),
          action: gotoById('stock', 'stk:' + a.id, a.nom, a.ref),
        });
      });
    });

    // ---- Dépenses ----
    safe('depenses', () => {
      const all = (typeof Data !== 'undefined' && Data.getAllDeps) ? Data.getAllDeps() : [];
      all.forEach(d => {
        const score = Math.max(
          this._score(this._norm(d.label), q, 600),
          this._score(this._norm(d.observation), q, 350),
          this._score(this._norm(d.fournisseur), q, 400),
          this._score(this._norm(d.groupe), q, 300),
        );
        push({
          score, cat: 'Dépenses', icon: 'ti-receipt',
          title: d.label || '—',
          sub: `${d.date || ''} · ${d.dept || ''} · ${fmt(d.montant)}${d.fournisseur ? ' · ' + d.fournisseur : ''}`,
          action: (() => {
            const sid = 'dep:' + (d.userId || `${d.date}|${(d.label||'').replace(/[|"]/g,'_')}|${d.montant}|${d.dept}`);
            return gotoById('depenses', sid, d.label, fmtDs(d.date), fmts(d.montant));
          })(),
        });
      });
    });

    // ---- Journées ----
    safe('journees', () => {
      (Data.journees || []).forEach(j => {
        const score = this._score(this._norm(j.date), q, 500);
        push({
          score, cat: 'Journées', icon: 'ti-calendar',
          title: j.date || '—',
          sub: `CA total : ${fmt(Data.caTotal ? Data.caTotal(j) : 0)}`,
          action: gotoById('recettes', 'jrn:' + j.date, fmtD(j.date)),
        });
      });
    });

    // ---- Banque / Mobile ----
    const mvt = (arr, page, cat, icon) => {
      arr.forEach(m => {
        const score = Math.max(
          this._score(this._norm(m.lib), q, 600),
          this._score(this._norm(m.op), q, 400),
          this._score(this._norm(m.ref), q, 350),
        );
        push({
          score, cat, icon,
          title: m.lib || '—',
          sub: `${m.date || ''} · ${m.op || ''} · ${m.type === 'out' ? '−' : '+'}${fmt(m.mnt)}`,
          action: gotoById(page, (page === 'banque' ? 'bnk:' : 'mob:') + m.id, m.lib, fmtDs(m.date), fmts(m.mnt)),
        });
      });
    };
    safe('banque', () => mvt(Data.mvtsBanque || [], 'banque', 'Banque', 'ti-building-bank'));
    safe('mobile', () => mvt(Data.mvtsMobile || [], 'mobile', 'Mobile', 'ti-device-mobile'));

    // ---- Chèques ----
    safe('cheques', () => {
      (Data.cheques || []).forEach(c => {
        const score = Math.max(
          this._score(this._norm(c.numero || c.num), q, 700),
          this._score(this._norm(c.beneficiaire || c.benef), q, 600),
        );
        push({
          score, cat: 'Chèques', icon: 'ti-receipt-2',
          title: `Chèque ${c.numero || c.num || ''}`,
          sub: `${c.beneficiaire || c.benef || ''} · ${fmt(c.montant)} · ${c.statut || ''}`,
          action: gotoById('suivi', 'chq:' + c.id, c.numero || c.num, c.beneficiaire || c.benef),
        });
      });
    });

    // ---- Associés / Prélèvements ----
    safe('associes', () => {
      (Data.associes || []).forEach(a => {
        const score = this._score(this._norm(a.nom), q, 700);
        push({
          score, cat: 'Associés', icon: 'ti-users',
          title: a.nom || '—', sub: `Part ${a.part || 0}%`,
          action: gotoById('associes', 'ass:' + a.id, a.nom),
        });
      });
      (Data.prelevements || []).forEach(p => {
        const a = (Data.associes || []).find(x => x.id === p.associeId);
        const score = Math.max(
          this._score(this._norm(a?.nom), q, 450),
          this._score(this._norm(p.observation), q, 300),
        );
        push({
          score, cat: 'Prélèvements', icon: 'ti-cash',
          title: `Prélèvement ${a?.nom || ''}`,
          sub: `${p.date || ''} · ${fmt(p.montant)} · ${p.paiement || ''}`,
          action: gotoById('associes', 'prl:' + p.id, a?.nom, fmtDs(p.date)),
        });
      });
    });

    // ---- Catégories ----
    safe('categories', () => {
      (Data.categories || []).forEach(c => {
        const score = this._score(this._norm(c.nom), q, 500);
        push({
          score, cat: 'Catégories', icon: 'ti-tag',
          title: c.nom || '—', sub: `${c.type || ''} · ${c.dept || ''}`,
          action: gotoById('categories', 'cat:' + c.id, c.nom),
        });
      });
    });

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, this.MAX_RESULTS);
  },

  // ===== Positionnement =====
  _positionMenu() {
    if (!this._inputEl || !this._menuEl) return;
    const r = this._inputEl.getBoundingClientRect();
    Object.assign(this._menuEl.style, {
      position: 'fixed',
      top: (r.bottom + 6) + 'px',
      left: r.left + 'px',
      width: Math.max(320, r.width) + 'px',
      right: 'auto',
      maxHeight: (window.innerHeight - r.bottom - 24) + 'px',
      zIndex: '99999',
    });
  },

  // ===== Rendu du menu =====
  _renderMenu(results, raw) {
    if (!this._menuEl) return;
    if (!results.length) {
      this._menuEl.innerHTML =
        `<div class="tb-search-empty">Aucun résultat pour « ${this._esc(raw)} »</div>`;
      this._show();
      return;
    }
    const byCat = {};
    const catOrder = [];
    results.forEach((r, i) => {
      if (!byCat[r.cat]) { byCat[r.cat] = []; catOrder.push(r.cat); }
      r._idx = i;
      byCat[r.cat].push(r);
    });
    this._menuEl.innerHTML = catOrder.map(cat => `
      <div class="tb-search-cat">${this._esc(cat)}<span class="tb-search-cat-n">${byCat[cat].length}</span></div>
      ${byCat[cat].map(r => `
        <div class="tb-search-item ${r._idx === this._activeIdx ? 'active' : ''}" data-idx="${r._idx}">
          <i class="ti ${r.icon || 'ti-search'}"></i>
          <div class="tb-search-text">
            <div class="tb-search-title">${this._esc(r.title)}</div>
            ${r.sub ? `<div class="tb-search-sub">${this._esc(r.sub)}</div>` : ''}
          </div>
        </div>`).join('')}
    `).join('');
    this._show();
    // Pas de handlers par item : la délégation sur this._menuEl (cf. init) suffit.
  },

  _onKey(e) {
    if (!this._isOpen()) return;
    if (e.key === 'Escape') { this._hide(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this._move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (this._activeIdx >= 0) this._activate(this._activeIdx);
    }
  },

  _move(delta) {
    if (!this._lastResults.length) return;
    this._activeIdx = (this._activeIdx + delta + this._lastResults.length) % this._lastResults.length;
    this._menuEl.querySelectorAll('.tb-search-item').forEach(el => {
      const idx = parseInt(el.dataset.idx, 10);
      el.classList.toggle('active', idx === this._activeIdx);
      if (idx === this._activeIdx) el.scrollIntoView({ block: 'nearest' });
    });
  },

  _activate(i) {
    const r = this._lastResults[i];
    console.log('🔍 Search._activate idx=', i, 'result=', r);
    if (!r) { console.warn('🔍 Pas de résultat à l\'index', i); return; }
    this._hide();
    if (this._inputEl) {
      this._inputEl.value = '';
      this._inputEl.blur();
    }
    try {
      if (typeof r.action === 'function') {
        r.action();
        console.log('🔍 Action exécutée pour', r.title);
      } else {
        console.warn('🔍 r.action n\'est pas une fonction:', r);
      }
    } catch (e) { console.error('🔍 Search action error:', e); }
  },

  _isOpen() { return this._menuEl && this._menuEl.style.display !== 'none'; },
  _show() { if (this._menuEl) { this._positionMenu(); this._menuEl.style.display = 'block'; } },
  _hide() { if (this._menuEl) this._menuEl.style.display = 'none'; this._activeIdx = -1; },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
};

// Auto-init dès que possible (idempotent).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Search.init());
} else {
  Search.init();
}
