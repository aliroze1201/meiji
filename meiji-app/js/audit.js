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
      return `<tr>
        <td class="nowrap" style="font-size:12px">${this._esc(this._fmtTs(e.ts))}</td>
        <td>${userCell}</td>
        <td>${this._actionBadge(e.action)}</td>
        <td>${this._moduleBadge(e.module)}</td>
        <td class="fw-bold">${this._esc(e.entity || '')}</td>
        <td class="text-muted" style="font-size:12.5px">${this._esc(e.details || '')}</td>
      </tr>`;
    }).join('');
  },
};
