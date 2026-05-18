/**
 * search.js — Recherche globale (barre du topbar).
 *
 * Indexe à la volée toutes les entités principales (employés, fournisseurs,
 * clients/crédits, articles stock, dépenses, recettes/journées, mouvements
 * banque/mobile, chèques, associés/prélèvements, catégories) et propose un
 * menu déroulant de résultats. Cliquer un résultat ouvre la page concernée
 * et, quand c'est possible, applique un filtre local.
 *
 * Conçu pour rester rapide même avec plusieurs milliers d'entrées :
 *  - Débounce 120 ms sur la frappe.
 *  - Normalisation Unicode (NFD + suppression diacritiques) en cache.
 *  - Scoring simple : match au début > match partiel > champ secondaire.
 *  - Max 30 résultats affichés, groupés par catégorie.
 */
const Search = {
  MAX_RESULTS: 30,
  DEBOUNCE_MS: 120,
  _timer: null,
  _activeIdx: -1,
  _lastResults: [],

  init() {
    const input = document.getElementById('tb-search-input');
    if (!input) return;

    // Crée le dropdown s'il n'existe pas
    let menu = document.getElementById('tb-search-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'tb-search-menu';
      menu.className = 'tb-search-menu';
      menu.style.display = 'none';
      input.parentElement.appendChild(menu);
    }

    input.addEventListener('input', () => {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._run(input.value), this.DEBOUNCE_MS);
    });
    input.addEventListener('keydown', (e) => this._onKey(e));
    input.addEventListener('focus', () => { if (input.value.trim()) this._run(input.value); });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== input) this._hide();
    });
  },

  // ===== Normalisation =====
  _norm(s) {
    if (s == null) return '';
    return String(s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim();
  },

  // Score d'un match : 0 = pas de match. Plus haut = meilleur.
  // Pondère le rang (champ principal vs secondaire) et la position (match au début > au milieu).
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
    const menu = document.getElementById('tb-search-menu');
    if (!menu) return;
    const q = this._norm(raw);
    if (!q || q.length < 1) { this._hide(); return; }

    const results = this._collect(q);
    this._lastResults = results;
    this._activeIdx = results.length ? 0 : -1;
    this._renderMenu(results, raw);
  },

  // ===== Collecte sur toutes les sources =====
  _collect(q) {
    const hits = [];
    const push = (h) => { if (h.score > 0) hits.push(h); };

    // ---- Employés ----
    (Data.employes || []).forEach((e, idx) => {
      const nom = this._norm(e.nom);
      const poste = this._norm(e.poste);
      const dept = this._norm(e.dept);
      const score = Math.max(
        this._score(nom, q, 1000),
        this._score(poste, q, 400),
        this._score(dept, q, 200),
      );
      push({
        score, cat: 'Employés', icon: 'ti-user',
        title: e.nom, sub: `${e.poste || '—'} · ${e.dept || ''}`,
        action: () => { App.nav('employes'); setTimeout(() => Employes.openModal(idx), 50); },
      });
    });

    // ---- Fournisseurs ----
    (Data.fournisseursListe || []).concat(Data.fournisseurs || []).forEach(f => {
      const nom = this._norm(f.nom || f.name);
      const score = this._score(nom, q, 900);
      push({
        score, cat: 'Fournisseurs', icon: 'ti-truck',
        title: f.nom || f.name || '—', sub: f.tel || f.adresse || '',
        action: () => App.nav('fournisseurs'),
      });
    });

    // ---- Crédits clients ----
    (Data.credits || []).forEach(c => {
      const client = this._norm(c.client);
      const ticket = this._norm(c.ticket);
      const score = Math.max(
        this._score(client, q, 850),
        this._score(ticket, q, 600),
      );
      push({
        score, cat: 'Crédits clients', icon: 'ti-cash',
        title: c.client || '—',
        sub: `Ticket #${c.ticket || ''} · ${c.dept || ''} · ${Data.fmt(c.montant || 0)} · ${c.statut || ''}`,
        action: () => App.nav('credits'),
      });
    });

    // ---- Stock ----
    (Data.stockArticles || []).forEach(a => {
      const nom = this._norm(a.nom);
      const ref = this._norm(a.ref);
      const cat = this._norm(a.categorie);
      const fou = this._norm(a.fournisseur);
      const score = Math.max(
        this._score(nom, q, 800),
        this._score(ref, q, 700),
        this._score(cat, q, 300),
        this._score(fou, q, 300),
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
          }, 50);
        },
      });
    });

    // ---- Dépenses (label / observation / fournisseur) ----
    (Data.getAllDeps ? Data.getAllDeps() : []).forEach(d => {
      const label = this._norm(d.label);
      const obs = this._norm(d.observation);
      const fou = this._norm(d.fournisseur);
      const score = Math.max(
        this._score(label, q, 600),
        this._score(obs, q, 350),
        this._score(fou, q, 400),
      );
      push({
        score, cat: 'Dépenses', icon: 'ti-receipt',
        title: d.label || '—',
        sub: `${d.date || ''} · ${d.dept || ''} · ${Data.fmt(d.montant || 0)}${d.fournisseur ? ' · ' + d.fournisseur : ''}`,
        action: () => App.nav('depenses'),
      });
    });

    // ---- Journées (par date) ----
    (Data.journees || []).forEach(j => {
      const date = this._norm(j.date);
      const score = this._score(date, q, 500);
      push({
        score, cat: 'Journées', icon: 'ti-calendar',
        title: j.date || '—',
        sub: `CA total : ${Data.fmt(Data.caTotal(j) || 0)}`,
        action: () => App.nav('recettes'),
      });
    });

    // ---- Banque ----
    (Data.mvtsBanque || []).forEach(m => {
      const lib = this._norm(m.lib);
      const op = this._norm(m.op);
      const ref = this._norm(m.ref);
      const score = Math.max(
        this._score(lib, q, 600),
        this._score(op, q, 400),
        this._score(ref, q, 350),
      );
      push({
        score, cat: 'Banque', icon: 'ti-building-bank',
        title: m.lib || '—',
        sub: `${m.date || ''} · ${m.op || ''} · ${m.type === 'out' ? '−' : '+'}${Data.fmt(m.mnt || 0)}`,
        action: () => App.nav('banque'),
      });
    });

    // ---- Mobile Money ----
    (Data.mvtsMobile || []).forEach(m => {
      const lib = this._norm(m.lib);
      const op = this._norm(m.op);
      const ref = this._norm(m.ref);
      const score = Math.max(
        this._score(lib, q, 600),
        this._score(op, q, 400),
        this._score(ref, q, 350),
      );
      push({
        score, cat: 'Mobile', icon: 'ti-device-mobile',
        title: m.lib || '—',
        sub: `${m.date || ''} · ${m.op || ''} · ${m.type === 'out' ? '−' : '+'}${Data.fmt(m.mnt || 0)}`,
        action: () => App.nav('mobile'),
      });
    });

    // ---- Chèques ----
    (Data.cheques || []).forEach(c => {
      const num = this._norm(c.numero || c.num);
      const ben = this._norm(c.beneficiaire || c.benef);
      const score = Math.max(
        this._score(num, q, 700),
        this._score(ben, q, 600),
      );
      push({
        score, cat: 'Chèques', icon: 'ti-receipt-2',
        title: `Chèque ${c.numero || c.num || ''}`,
        sub: `${c.beneficiaire || c.benef || ''} · ${Data.fmt(c.montant || 0)} · ${c.statut || ''}`,
        action: () => App.nav('suivi'),
      });
    });

    // ---- Associés / Prélèvements ----
    (Data.associes || []).forEach(a => {
      const nom = this._norm(a.nom);
      const score = this._score(nom, q, 700);
      push({
        score, cat: 'Associés', icon: 'ti-users',
        title: a.nom || '—', sub: `Part ${a.part || 0}%`,
        action: () => App.nav('associes'),
      });
    });
    (Data.prelevements || []).forEach(p => {
      const a = (Data.associes || []).find(x => x.id === p.associeId);
      const aNom = this._norm(a?.nom);
      const obs = this._norm(p.observation);
      const score = Math.max(
        this._score(aNom, q, 450),
        this._score(obs, q, 300),
      );
      push({
        score, cat: 'Prélèvements', icon: 'ti-cash',
        title: `Prélèvement ${a?.nom || ''}`,
        sub: `${p.date || ''} · ${Data.fmt(p.montant || 0)} · ${p.paiement || ''}`,
        action: () => App.nav('associes'),
      });
    });

    // ---- Catégories ----
    (Data.categories || []).forEach(c => {
      const nom = this._norm(c.nom);
      const score = this._score(nom, q, 500);
      push({
        score, cat: 'Catégories', icon: 'ti-tag',
        title: c.nom || '—', sub: `${c.type || ''} · ${c.dept || ''}`,
        action: () => App.nav('categories'),
      });
    });

    // Trie par score décroissant et garde le top N
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, this.MAX_RESULTS);
  },

  // ===== Rendu du menu =====
  _renderMenu(results, raw) {
    const menu = document.getElementById('tb-search-menu');
    if (!menu) return;
    if (!results.length) {
      menu.innerHTML = `<div class="tb-search-empty">Aucun résultat pour « ${this._esc(raw)} »</div>`;
      menu.style.display = '';
      return;
    }
    // Groupe par catégorie en conservant l'ordre du tri global
    const byCat = {};
    const catOrder = [];
    results.forEach((r, i) => {
      if (!byCat[r.cat]) { byCat[r.cat] = []; catOrder.push(r.cat); }
      r._idx = i;
      byCat[r.cat].push(r);
    });

    menu.innerHTML = catOrder.map(cat => `
      <div class="tb-search-cat">${this._esc(cat)} <span class="tb-search-cat-n">${byCat[cat].length}</span></div>
      ${byCat[cat].map(r => `
        <div class="tb-search-item ${r._idx === this._activeIdx ? 'active' : ''}" data-idx="${r._idx}">
          <i class="ti ${r.icon}"></i>
          <div class="tb-search-text">
            <div class="tb-search-title">${this._esc(r.title)}</div>
            ${r.sub ? `<div class="tb-search-sub">${this._esc(r.sub)}</div>` : ''}
          </div>
        </div>`).join('')}
    `).join('');
    menu.style.display = '';
    menu.querySelectorAll('.tb-search-item').forEach(el => {
      el.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        const i = parseInt(el.dataset.idx, 10);
        this._activate(i);
      });
    });
  },

  _onKey(e) {
    const menu = document.getElementById('tb-search-menu');
    if (!menu || menu.style.display === 'none') return;
    if (e.key === 'Escape') { this._hide(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this._activeIdx >= 0) this._activate(this._activeIdx);
    }
  },

  _move(delta) {
    if (!this._lastResults.length) return;
    this._activeIdx = (this._activeIdx + delta + this._lastResults.length) % this._lastResults.length;
    const menu = document.getElementById('tb-search-menu');
    menu.querySelectorAll('.tb-search-item').forEach(el => {
      const idx = parseInt(el.dataset.idx, 10);
      el.classList.toggle('active', idx === this._activeIdx);
      if (idx === this._activeIdx) el.scrollIntoView({ block: 'nearest' });
    });
  },

  _activate(i) {
    const r = this._lastResults[i];
    if (!r) return;
    this._hide();
    const input = document.getElementById('tb-search-input');
    if (input) input.blur();
    try { r.action(); } catch (e) { console.warn('Search action', e); }
  },

  _hide() {
    const menu = document.getElementById('tb-search-menu');
    if (menu) menu.style.display = 'none';
    this._activeIdx = -1;
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
};
