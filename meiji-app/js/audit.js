/**
 * audit.js — Journal d'activités (audit log).
 *
 * Trace toutes les actions métier qui modifient la base : créations,
 * modifications, suppressions. Stockage via AppDB (clé STORAGE_KEY) +
 * miroir localStorage (backup, mode public). Persistance asynchrone et
 * silencieuse : un échec côté Audit ne doit JAMAIS empêcher la sauvegarde
 * principale d'un module — tout est wrap dans try/catch.
 */

const Audit = {
  STORAGE_KEY: 'meiji-activity-log',
  MAX_ENTRIES: 2000,

  _seq: 1,
  _saveTimer: null,
  filter: 'all',
  moduleFilter: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',

  // ---------- Helpers ----------
  _now() {
    try { return new Date().toISOString(); }
    catch { return ''; }
  },

  _nextId() {
    return Date.now() * 1000 + (this._seq++ % 1000);
  },

  _safeArr() {
    if (!Array.isArray(Data.activityLog)) Data.activityLog = [];
    return Data.activityLog;
  },

  // ---------- API publique ----------
  log(action, module, entity, details, meta) {
    try {
      const arr = this._safeArr();
      const profile = (typeof Auth !== 'undefined' && Auth.profile) ? Auth.profile : null;
      const user    = (typeof Auth !== 'undefined' && Auth.user)    ? Auth.user    : null;
      const entry = {
        id: this._nextId(),
        ts: this._now(),
        userId:   user?.id || null,
        userName: profile?.nom || (profile?.email ? (typeof Auth !== 'undefined' && Auth.toUsername ? Auth.toUsername(profile.email) : profile.email) : 'Anonyme'),
        userRole: profile?.role || null,
        action:   action || 'update',
        module:   module || 'autre',
        entity:   entity || '',
        details:  details || null,
        meta:     meta || null,
      };
      arr.unshift(entry);
      // Garde-fou taille
      if (arr.length > this.MAX_ENTRIES) {
        arr.length = this.MAX_ENTRIES;
      }
      // Persistance asynchrone, debounced
      this._scheduleSave();
      // Refresh UI si on est sur la page Historique
      if (typeof App !== 'undefined' && App.currentPage === 'historique') {
        try { this.render(); } catch (e) { /* noop */ }
      }
    } catch (e) {
      // Ne JAMAIS throw — Audit doit être silencieux
      try { console.warn('[Audit.log]', e); } catch {}
    }
  },

  _scheduleSave() {
    try {
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => { this.save(); }, 600);
    } catch {}
  },

  async save() {
    try {
      if (typeof AppDB !== 'undefined' && AppDB.save) {
        await AppDB.save(this.STORAGE_KEY, this._safeArr());
      } else {
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._safeArr())); } catch {}
      }
    } catch (e) {
      try { console.warn('[Audit.save]', e); } catch {}
    }
  },

  async restore() {
    try {
      let arr;
      if (typeof AppDB !== 'undefined' && AppDB.load) {
        arr = await AppDB.load(this.STORAGE_KEY);
      } else {
        try { arr = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null'); } catch { arr = null; }
      }
      if (Array.isArray(arr)) {
        if (arr.length > this.MAX_ENTRIES) arr.length = this.MAX_ENTRIES;
        Data.activityLog = arr;
      } else if (!Array.isArray(Data.activityLog)) {
        Data.activityLog = [];
      }
    } catch (e) {
      if (!Array.isArray(Data.activityLog)) Data.activityLog = [];
    }
  },

  // Insertion directe d'une entrée d'audit avec un timestamp custom
  // (utilisé pour le backfill rétroactif depuis les données existantes)
  _pushBackfillEntry(action, module, entity, details, meta, ts) {
    try {
      const arr = this._safeArr();
      const profile = (typeof Auth !== 'undefined' && Auth.profile) ? Auth.profile : null;
      arr.unshift({
        id: this._nextId(),
        ts: ts || this._now(),
        userId:   null,
        userName: '(historique pré-existant)',
        userRole: profile?.role || null,
        action:   action || 'create',
        module:   module || 'autre',
        entity:   entity || '',
        details:  details || null,
        meta:     Object.assign({ backfilled: true }, meta || {}),
      });
    } catch (e) { /* noop */ }
  },

  // Génère des entrées d'audit pour toutes les données déjà présentes dans l'app
  // au moment où l'audit log a été activé. À exécuter une seule fois.
  async backfillFromData() {
    if (!(typeof Auth === 'undefined' || Auth.profile?.role === 'admin')) {
      alert('🔒 Seul un administrateur peut importer l\'historique.');
      return;
    }
    // Anti double-import
    const already = (Data.activityLog || []).some(e => e?.meta?.backfilled);
    if (already && !confirm('Des entrées rétroactives existent déjà dans l\'historique.\n\nRecréer le backfill quand même ?\n(les anciennes entrées seront conservées, des doublons apparaîtront)')) return;

    const fmtMnt = (n) => (typeof Data !== 'undefined' && Data.fmt) ? Data.fmt(n) : String(n);
    const tsOf = (date) => {
      if (!date) return this._now();
      // YYYY-MM-DD → YYYY-MM-DDT12:00:00
      return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date + 'T12:00:00' : date;
    };
    let count = 0;
    const push = (action, module, entity, details, meta, ts) => {
      this._pushBackfillEntry(action, module, entity, details, meta, ts);
      count++;
    };

    // --- Journées ---
    (Data.journees || []).forEach(j => {
      if (!j.userRec) return; // on ne reimporte que les journées saisies utilisateur
      const ca = Data.caTotal ? Data.caTotal(j) : 0;
      push('create', 'recettes', `Journée ${j.date}`, `CA total ${fmtMnt(ca)}`, { id: j.id, date: j.date }, tsOf(j.date));
    });

    // --- Dépenses utilisateur ---
    (Data.histDep || []).filter(d => d.userId).forEach(d => {
      push('create', 'depenses',
        `Dépense ${d.dept || ''} · ${fmtMnt(d.montant)}`,
        `${d.label || d.groupe || ''}${d.paiement ? ' · ' + d.paiement : ''}`,
        { id: d.userId, date: d.date }, tsOf(d.date));
    });

    // --- Mouvements banque ---
    (Data.mvtsBanque || []).forEach(m => {
      const sign = m.type === 'in' ? '+' : '−';
      push('create', 'banque',
        `Mvt ${sign} ${m.op || ''}`,
        `${m.lib || ''} · ${fmtMnt(m.mnt)}${m.pending ? ' · pending' : ''}`,
        { id: m.id, date: m.date }, tsOf(m.date));
    });

    // --- Mouvements mobile ---
    (Data.mvtsMobile || []).forEach(m => {
      const sign = m.type === 'in' ? '+' : '−';
      push('create', 'mobile',
        `Mvt ${sign} ${m.op || ''}`,
        `${m.lib || ''} · ${fmtMnt(m.mnt)}`,
        { id: m.id, date: m.date }, tsOf(m.date));
    });

    // --- Chèques ---
    (Data.cheques || []).forEach(c => {
      push('create', 'suivi',
        `Chèque ${c.numero || ''} · ${c.tireur || ''}`,
        `${fmtMnt(c.montant)} · statut ${c.statut || 'attente'}${c.sens === 'emis' ? ' (émis)' : ''}`,
        { id: c.id, date: c.date }, tsOf(c.date));
    });

    // --- Crédits ---
    (Data.credits || []).forEach(c => {
      push('create', 'credits',
        `Crédit ${c.client || ''}`,
        `${fmtMnt(c.montant)} · ${c.statut || 'ouvert'}`,
        { id: c.id, date: c.date }, tsOf(c.date));
    });

    // --- Employés ---
    (Data.employes || []).forEach(e => {
      push('create', 'employes', `Employé ${e.nom || ''}`, `${e.poste || ''} · ${e.dept || ''} · net ${fmtMnt(e.net || 0)}`, { id: e.id });
    });

    // --- Catégories ---
    (Data.categories || []).forEach(c => {
      push('create', 'categories', `Catégorie ${c.nom || ''}`, `${c.type || ''} · ${c.dept || ''}`, { id: c.id });
    });

    // --- Factures fournisseurs ---
    (Data.fournisseurs || []).forEach(f => {
      push('create', 'fournisseurs',
        `Facture ${f.four || ''} ${f.num || ''}`,
        `débit ${fmtMnt(f.deb || 0)} · crédit ${fmtMnt(f.cred || 0)} · solde ${fmtMnt(f.solde || 0)}`,
        { id: f.id, date: f.date }, tsOf(f.date));
    });
    (Data.fournisseursListe || []).forEach(f => {
      push('create', 'fournisseurs', `Fournisseur ${f.nom || ''}`, f.contact || f.telephone || (f.actif ? 'actif' : 'inactif'), { id: f.id });
    });

    // --- Stock ---
    (Data.stockArticles || []).forEach(a => {
      push('create', 'stock', `Article ${a.nom || ''}`, `${a.dept || ''} · ${a.categorie || ''} · ${a.unite || ''}`, { id: a.id });
    });
    (Data.stockMouvements || []).forEach(m => {
      push('create', 'stock', `Mvt ${m.type || ''} article #${m.articleId}`, `qté ${m.quantite || 0}`, { id: m.id, date: m.date }, tsOf(m.date));
    });

    // --- Associés et prélèvements ---
    (Data.associes || []).forEach(a => {
      push('create', 'associes', `Associé ${a.nom || ''}`, `part ${a.part || 0}%`, { id: a.id });
    });
    (Data.prelevements || []).forEach(p => {
      push('create', 'associes',
        `Prélèvement associé #${p.associeId}`,
        `${fmtMnt(p.montant)} · ${p.paiement || ''}${p.banque ? ' · ' + p.banque : ''}${p.operateur ? ' · ' + p.operateur : ''}`,
        { id: p.id, date: p.date }, tsOf(p.date));
    });

    // --- Banques & opérateurs gérés ---
    (Data.banques || []).forEach(b => {
      push('create', 'banque', `Banque ${b.nom || ''}`, b.observation || (b.solde != null ? 'solde réf ' + fmtMnt(b.solde) : ''), { id: b.id });
    });
    (Data.operateursMobile || []).forEach(o => {
      push('create', 'mobile', `Opérateur ${o.nom || ''}`, o.observation || (o.solde != null ? 'solde réf ' + fmtMnt(o.solde) : ''), { id: o.id });
    });

    // --- Clôtures ---
    if (typeof Clotures !== 'undefined' && Array.isArray(Clotures.items)) {
      Clotures.items.forEach(it => {
        push('create', 'clotures', `Clôture ${it.ym}`, `résultat net ${fmtMnt(it.snapshot?.resultatNet || 0)}`, { ym: it.ym }, tsOf(it.closedAt));
      });
    }

    // --- Tri final par ts décroissant ---
    Data.activityLog.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    if (Data.activityLog.length > this.MAX_ENTRIES) Data.activityLog.length = this.MAX_ENTRIES;

    await this.save();
    this.render();
    alert(`✅ Backfill terminé : ${count} entrée(s) importée(s) dans l'historique.`);
  },

  async clear() {
    try {
      if (!(typeof Auth === 'undefined' || Auth.profile?.role === 'admin')) {
        alert('🔒 Seul un administrateur peut vider l\'historique.');
        return;
      }
      if (!confirm('Vider TOUT l\'historique des activités ?\n\nCette action est irréversible et supprimera toutes les entrées du journal.')) return;
      Data.activityLog = [];
      await this.save();
      this.render();
      alert('✅ Historique vidé.');
    } catch (e) {
      try { console.warn('[Audit.clear]', e); } catch {}
    }
  },

  exportExcel() {
    try {
      if (typeof XLSX === 'undefined') { alert('Bibliothèque Excel non chargée'); return; }
      const arr = this._safeArr();
      const rows = arr.map(e => ({
        'Date/Heure': e.ts || '',
        'Utilisateur': e.userName || '',
        'Rôle': e.userRole || '',
        'Action': e.action || '',
        'Module': e.module || '',
        'Entité': e.entity || '',
        'Détails': e.details || '',
      }));
      if (!rows.length) {
        rows.push({ 'Date/Heure': '', 'Utilisateur': '', 'Rôle': '', 'Action': '', 'Module': '', 'Entité': '(historique vide)', 'Détails': '' });
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historique');
      XLSX.writeFile(wb, `meiji-historique-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
      try { console.error('[Audit.exportExcel]', e); } catch {}
      alert('Erreur lors de l\'export.');
    }
  },

  // ---------- UI ----------
  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },

  _fmtTs(ts) {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      const date = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
      const time = d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
      return `${date} · ${time}`;
    } catch { return ts; }
  },

  _actionBadge(a) {
    const map = {
      create: ['b-green', 'Création'],
      update: ['b-amber', 'Modification'],
      delete: ['b-red',   'Suppression'],
    };
    const [cls, lbl] = map[a] || ['', a || ''];
    return `<span class="badge ${cls}">${this._esc(lbl)}</span>`;
  },

  _moduleBadge(m) {
    return `<span class="badge b-blue">${this._esc(m || '—')}</span>`;
  },

  _applyFilter(list) {
    let out = list.slice();
    if (this.filter && this.filter !== 'all') {
      out = out.filter(e => e.action === this.filter);
    }
    if (this.moduleFilter && this.moduleFilter !== 'all') {
      out = out.filter(e => e.module === this.moduleFilter);
    }
    if (this.search) {
      const q = this.search.toLowerCase();
      out = out.filter(e =>
        (e.entity || '').toLowerCase().includes(q)
        || (e.details || '').toLowerCase().includes(q)
        || (e.userName || '').toLowerCase().includes(q)
        || (e.module || '').toLowerCase().includes(q)
      );
    }
    if (this.dateFrom) {
      out = out.filter(e => (e.ts || '').slice(0, 10) >= this.dateFrom);
    }
    if (this.dateTo) {
      out = out.filter(e => (e.ts || '').slice(0, 10) <= this.dateTo);
    }
    return out;
  },

  render() {
    const page = document.getElementById('page-historique');
    if (!page) return;

    const all = this._safeArr();
    const filtered = this._applyFilter(all);

    // KPI
    const nbCreate = all.filter(e => e.action === 'create').length;
    const nbUpdate = all.filter(e => e.action === 'update').length;
    const nbDelete = all.filter(e => e.action === 'delete').length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('au-total',  all.length);
    set('au-create', nbCreate);
    set('au-update', nbUpdate);
    set('au-delete', nbDelete);

    // Module filter dropdown : reconstruit dynamiquement la liste des modules distincts
    const modSel = document.getElementById('au-module');
    if (modSel) {
      const mods = [...new Set(all.map(e => e.module).filter(Boolean))].sort();
      const current = this.moduleFilter;
      const opts = ['<option value="all">Tous les modules</option>']
        .concat(mods.map(m => `<option value="${this._esc(m)}" ${m === current ? 'selected' : ''}>${this._esc(m)}</option>`));
      // Reconstruit uniquement si la liste a changé pour préserver le focus
      const desired = opts.join('');
      if (modSel.innerHTML !== desired) modSel.innerHTML = desired;
    }

    // Tabs : applique l'état actif
    const tabs = document.getElementById('au-tabs');
    if (tabs) {
      tabs.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', (t.dataset.filter || 'all') === this.filter);
      });
    }

    // Table
    const tb = document.getElementById('au-table');
    if (!tb) return;
    if (!filtered.length) {
      tb.innerHTML = '<tr><td colspan="6" class="empty">Aucune activité ne correspond aux filtres.</td></tr>';
      return;
    }
    tb.innerHTML = filtered.map(e => {
      const userCell = `<div style="font-weight:600">${this._esc(e.userName || '—')}</div>`
        + (e.userRole ? `<div style="font-size:11px;color:var(--c-muted)">${this._esc(e.userRole)}</div>` : '');
      const hasDetail = !!(e.meta && (e.meta.before || e.meta.after));
      const detailIcon = hasDetail
        ? `<button class="btn btn-sm" title="Voir le détail avant/après" onclick="Audit.showDetail(${e.id})"><i class="ti ti-eye"></i></button>`
        : '';
      return `<tr>
        <td class="nowrap" style="font-size:12px">${this._esc(this._fmtTs(e.ts))}</td>
        <td>${userCell}</td>
        <td>${this._actionBadge(e.action)}</td>
        <td>${this._moduleBadge(e.module)}</td>
        <td class="fw-bold">${this._esc(e.entity || '')}</td>
        <td class="text-muted" style="font-size:12.5px">${this._esc(e.details || '')} ${detailIcon}</td>
      </tr>`;
    }).join('');
  },

  // Affiche un modal détaillé pour une entrée d'historique : avant / après
  showDetail(id) {
    const e = (Data.activityLog || []).find(x => x.id === id);
    if (!e) return;
    const fmtBlock = (obj) => {
      if (obj == null) return '<span class="text-muted">—</span>';
      try {
        return '<pre style="font-size:12px;background:var(--c-bg-2);padding:10px;border-radius:6px;overflow:auto;max-height:300px">'
          + this._esc(JSON.stringify(obj, null, 2))
          + '</pre>';
      } catch { return '<span class="text-muted">(non sérialisable)</span>'; }
    };
    const before = e.meta?.before;
    const after  = e.meta?.after;
    const onlyDeleted = e.action === 'delete' && before && !after;
    const onlyCreated = e.action === 'create' && after  && !before;
    const ts = this._fmtTs(e.ts);
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:760px">
          <div class="modal-title">${this._actionBadge(e.action)} ${this._esc(e.entity || '')}</div>
          <div style="font-size:12px;color:var(--c-muted);margin-bottom:12px">
            ${this._esc(ts)} · ${this._esc(e.userName || '')}${e.userRole ? ' (' + this._esc(e.userRole) + ')' : ''}
            ${e.details ? ' · ' + this._esc(e.details) : ''}
          </div>
          ${onlyCreated ? `
            <div style="font-weight:600;margin-bottom:6px">Valeurs créées</div>
            ${fmtBlock(after)}
          ` : onlyDeleted ? `
            <div style="font-weight:600;margin-bottom:6px">Valeurs supprimées (avant)</div>
            ${fmtBlock(before)}
          ` : `
            <div class="fr">
              <div class="fg">
                <label class="fl" style="color:var(--c-warning)"><b>Avant la modification</b></label>
                ${fmtBlock(before)}
              </div>
              <div class="fg">
                <label class="fl" style="color:var(--c-bar)"><b>Après la modification</b></label>
                ${fmtBlock(after)}
              </div>
            </div>
          `}
          <div class="modal-actions">
            <button class="btn btn-primary" onclick="App.closeModal()">Fermer</button>
          </div>
        </div>
      </div>`);
  },
};
