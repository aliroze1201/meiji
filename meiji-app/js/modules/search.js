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
    const go = (page) => () => { if (typeof App !== 'undefined' && App.nav) App.nav(page); };

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
      (Data.employes || []).forEach((e, idx) => {
        const score = Math.max(
          this._score(this._norm(e.nom), q, 1000),
          this._score(this._norm(e.poste), q, 400),
          this._score(this._norm(e.dept), q, 200),
        );
        push({
          score, cat: 'Employés', icon: 'ti-user',
          title: e.nom || '—', sub: `${e.poste || '—'} · ${e.dept || ''}`,
          action: () => { App.nav('employes'); setTimeout(() => Employes.openModal(idx), 80); },
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
          action: go('fournisseurs'),
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
          action: go('credits'),
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
          action: () => {
            App.nav('stock');
            setTimeout(() => {
              const i = document.getElementById('stk-search');
              if (i) { i.value = a.nom || ''; i.dispatchEvent(new Event('input')); }
            }, 80);
          },
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
          action: go('depenses'),
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
          action: go('recettes'),
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
          action: go(page),
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
          action: go('suivi'),
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
          action: go('associes'),
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
          action: go('associes'),
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
          action: go('categories'),
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
    this._menuEl.querySelectorAll('.tb-search-item').forEach(el => {
      el.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        this._activate(parseInt(el.dataset.idx, 10));
      });
    });
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
    if (!r) return;
    this._hide();
    if (this._inputEl) this._inputEl.blur();
    try { r.action(); } catch (e) { console.warn('Search action', e); }
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
