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

  // Rapprochement entre l'historique audit (module 'depenses') et la base
  // réelle Data.histDep pour identifier les divergences sur une plage de
  // dates choisie par l'utilisateur (par défaut hier + aujourd'hui).
  reconcileDepenses(fromDate, toDate) {
    const today = new Date().toISOString().slice(0, 10);
    const ydate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const from = fromDate || ydate;
    const to   = toDate   || today;
    // Plage limitée à 31 jours pour ne pas figer le navigateur
    const start = new Date(from + 'T00:00:00');
    const end   = new Date(to   + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      alert('Plage de dates invalide.');
      return;
    }
    const diffDays = Math.round((end - start) / 86400000) + 1;
    if (diffDays > 31) {
      alert('Plage trop large (max 31 jours).');
      return;
    }
    const dates = [];
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      dates.push(d.toISOString().slice(0, 10));
    }
    // Affichage : du plus récent au plus ancien
    dates.reverse();
    const labels = {};
    dates.forEach(d => {
      let lbl = d;
      if (d === today) lbl = 'Aujourd\'hui · ' + d;
      else if (d === ydate) lbl = 'Hier · ' + d;
      else lbl = (typeof Data !== 'undefined' && Data.fmtD) ? Data.fmtD(d) : d;
      labels[d] = lbl;
    });

    const log = (Data.activityLog || []).filter(e => e.module === 'depenses');
    const deps = (Data.histDep || []).filter(d => d.userId);

    // Saisies soumises mais pas encore validées par la direction : elles ont
    // une trace « create » dans l'audit sans être en base — c'est le
    // fonctionnement normal, PAS une divergence.
    const attente = Data.depAttente || [];
    const attenteIds = new Set(attente.map(d => String(d.id)));
    // Trace de validation DG : depuis la conservation de l'id, la dépense en
    // base porte le même id que le « create » ; pour l'ancien historique
    // (nouvel id à la validation), on rapproche par contenu (meta.after).
    const validations = log.filter(e => e.action === 'update'
      && (e.meta?.validation || /\(validée par /.test(e.entity || '')));
    const validatedIds = new Set(validations.map(e => e.meta?.id).filter(v => v != null).map(String));
    // Lignes d'attente renvoyées en saisie pour correction : leur « create »
    // d'origine n'aboutira jamais en base (une nouvelle soumission le remplace).
    const renvoyeIds = new Set(log
      .filter(e => e.action === 'update' && (e.meta?.renvoyee || /\(renvoyée en saisie/.test(e.entity || '')))
      .map(e => e.meta?.id).filter(v => v != null).map(String));
    // Ids connus de l'audit toutes actions confondues : une dépense extraite
    // d'une journée ou validée n'a qu'une trace « update » portant son id.
    const auditAnyIds = new Set(log.map(e => e.meta?.id).filter(v => v != null).map(String));

    // Date métier d'une entrée d'audit : les créations/modifs portent la
    // dépense complète dans meta.after, les suppressions dans meta.before.
    // (l'ancien filtre sur meta.date seul ne trouvait jamais rien)
    const depDateOf = e => e.meta?.date || e.meta?.after?.date || e.meta?.before?.date;

    const sections = dates.map(date => {
      const auditCreate = log.filter(e => e.action === 'create' && depDateOf(e) === date);
      const auditDelete = log.filter(e => e.action === 'delete' && depDateOf(e) === date);
      const auditUpdate = log.filter(e => e.action === 'update' && depDateOf(e) === date);
      const current     = deps.filter(d => d.date === date);

      const auditCreateIds = new Set(auditCreate.map(e => e.meta?.id).filter(v => v != null).map(String));
      const deletedIds     = new Set(auditDelete.map(e => e.meta?.id).filter(v => v != null).map(String));
      const currentIds     = new Set(current.map(d => String(d.userId)));
      const pending        = attente.filter(d => d.date === date);
      // Manquantes = créées d'après l'audit, absentes de la base, SANS trace
      // de suppression (rejet compris), de validation ni de renvoi en saisie,
      // et pas encore en attente de validation → dépenses perdues, restaurables.
      const inAuditNotCurrent = [...auditCreateIds].filter(id => !currentIds.has(id)
        && !deletedIds.has(id) && !attenteIds.has(id)
        && !validatedIds.has(id) && !renvoyeIds.has(id));
      // En trop = en base sans AUCUNE trace audit portant leur id, ni
      // validation ancienne rapprochable par contenu (date/montant/dept/label).
      const usedVal = new Set();
      const hasValidationTrace = d => {
        const i = validations.findIndex((e, ix) => !usedVal.has(ix)
          && e.meta?.after
          && e.meta.after.date === d.date
          && Number(e.meta.after.montant || 0) === Number(d.montant || 0)
          && (e.meta.after.dept || '') === (d.dept || '')
          && (e.meta.after.label || e.meta.after.groupe || '') === (d.label || d.groupe || ''));
        if (i < 0) return false;
        usedVal.add(i);
        return true;
      };
      const inCurrentNotAudit = [...currentIds].filter(id => {
        if (auditAnyIds.has(id)) return false;
        const d = current.find(x => String(x.userId) === id);
        return !(d && hasValidationTrace(d));
      });

      const totalCurrent = current.reduce((s,d) => s + (d.montant || 0), 0);
      const totalPending = pending.reduce((s,d) => s + (d.montant || 0), 0);

      const rowsPending = pending.length
        ? pending.map(d => `<tr><td>${this._esc(d.dept || '')}</td><td>${this._esc(d.label || d.groupe || '')}</td><td class="text-right fw-bold" style="color:var(--c-warning)">${Data.fmt(d.montant)}</td><td>${this._esc(d.soumisPar || '—')}</td><td style="font-size:11px;color:var(--c-muted)">#${d.id}</td></tr>`).join('')
        : '';

      const rowsCurrent = current.length
        ? current.map(d => `<tr><td>${this._esc(d.dept || '')}</td><td>${this._esc(d.label || d.groupe || '')}</td><td class="text-right fw-bold">${Data.fmt(d.montant)}</td><td>${this._esc(d.paiement || 'esp')}</td><td style="font-size:11px;color:var(--c-muted)">#${d.userId}</td></tr>`).join('')
        : '<tr><td colspan="5" class="empty">Aucune dépense</td></tr>';

      const rowsAuditDelete = auditDelete.length
        ? auditDelete.map(e => `<tr><td>${this._esc(e.entity || '')}</td><td>${this._esc(e.details || '')}</td><td style="font-size:11px;color:var(--c-muted)">${this._esc(this._fmtTs(e.ts))}</td><td>${this._esc(e.userName || '')}</td></tr>`).join('')
        : '<tr><td colspan="4" class="empty">Aucune suppression historisée</td></tr>';

      const rowsAuditUpdate = auditUpdate.length
        ? auditUpdate.map(e => `<tr><td>${this._esc(e.entity || '')}</td><td>${this._esc(e.details || '')}</td><td style="font-size:11px;color:var(--c-muted)">${this._esc(this._fmtTs(e.ts))}</td><td>${this._esc(e.userName || '')}</td></tr>`).join('')
        : '<tr><td colspan="4" class="empty">Aucune modification historisée</td></tr>';

      // Montants des divergences (depuis meta.after/before pour l'audit, depuis la base pour l'extra)
      const missingEntries = inAuditNotCurrent.map(id => auditCreate.find(x => String(x.meta?.id) === id));
      const missingAmounts = missingEntries.map(e =>
        Number(e?.meta?.after?.montant ?? e?.meta?.before?.montant ?? 0) || 0);
      const extraAmounts = inCurrentNotAudit.map(id => {
        const d = current.find(x => String(x.userId) === id);
        return Number(d?.montant ?? 0) || 0;
      });
      const totalMissing = missingAmounts.reduce((s, m) => s + m, 0);
      const totalExtra   = extraAmounts.reduce((s, m) => s + m, 0);
      const totalDivergence = totalMissing + totalExtra;

      // Entrées restaurables : l'audit porte la dépense complète (meta.after)
      const restorableIds = missingEntries
        .filter(e => e && (e.meta?.after || e.meta?.before))
        .map(e => e.id);

      const rowsDiffMissing = inAuditNotCurrent.length
        ? inAuditNotCurrent.map((id, i) => {
            const e = missingEntries[i];
            const m = missingAmounts[i];
            const canRestore = !!(e && (e.meta?.after || e.meta?.before));
            const restoreBtn = canRestore
              ? `<button class="btn btn-sm btn-primary" onclick="Audit.restoreDeps('${e.id}')" title="Recréer cette dépense à partir de sa copie dans l'historique"><i class="ti ti-restore"></i> Restaurer</button>`
              : '<span class="text-muted" style="font-size:11px">copie indisponible</span>';
            return `<tr style="background:var(--c-danger-soft)"><td>${this._esc(e?.entity || '?')}</td><td>${this._esc(e?.details || '')}</td><td class="text-right fw-bold" style="color:var(--c-danger)">${m ? Data.fmt(m) : '—'}</td><td style="font-size:11px;color:var(--c-muted)">#${id}</td><td>${restoreBtn}</td></tr>`;
          }).join('')
        : '<tr><td colspan="5" class="empty" style="color:var(--c-bar)">Aucune divergence — toutes les créations de l\'audit sont présentes en base ✓</td></tr>';

      const rowsDiffExtra = inCurrentNotAudit.length
        ? inCurrentNotAudit.map(id => {
            const d = current.find(x => String(x.userId) === id);
            return `<tr style="background:var(--c-danger-soft)"><td>${this._esc(d?.dept || '?')}</td><td>${this._esc(d?.label || d?.groupe || '')}</td><td class="text-right fw-bold" style="color:var(--c-danger)">${Data.fmt(d?.montant)}</td><td style="font-size:11px;color:var(--c-muted)">#${id}</td></tr>`;
          }).join('')
        : '<tr><td colspan="4" class="empty" style="color:var(--c-bar)">Aucune divergence — toutes les dépenses présentes ont une trace audit ✓</td></tr>';

      const okDiff = inAuditNotCurrent.length === 0 && inCurrentNotAudit.length === 0;
      const statusBadge = okDiff
        ? '<span class="badge b-green">✓ Tout est cohérent</span>'
        : `<span class="badge b-red">⚠ Divergence · ${Data.fmt(totalDivergence)}</span>`;

      return `
        <div class="card" style="margin-bottom:16px${okDiff ? '' : ';border:2px solid var(--c-danger);box-shadow:0 0 0 3px var(--c-danger-soft)'}">
          <div class="card-header"${okDiff ? '' : ' style="background:var(--c-danger-soft)"'}>
            <span class="card-title"><i class="ti ti-calendar"></i> ${labels[date]}</span>
            ${statusBadge}
          </div>
          ${!okDiff ? `
            <div style="background:var(--c-danger-soft);border-left:4px solid var(--c-danger);padding:10px 12px;margin-bottom:12px;border-radius:4px">
              <div style="font-weight:700;color:var(--c-danger);font-size:14px;margin-bottom:4px">
                ⚠ ${inAuditNotCurrent.length + inCurrentNotAudit.length} divergence(s) détectée(s)
              </div>
              <div style="font-size:13px;color:var(--c-text)">
                Montant total des divergences : <b style="color:var(--c-danger);font-size:15px">${Data.fmt(totalDivergence)}</b>
                ${totalMissing > 0 ? ` · <span style="color:var(--c-muted)">audit sans base : <b>${Data.fmt(totalMissing)}</b></span>` : ''}
                ${totalExtra   > 0 ? ` · <span style="color:var(--c-muted)">base sans audit : <b>${Data.fmt(totalExtra)}</b></span>` : ''}
              </div>
              ${restorableIds.length ? `
              <button class="btn btn-primary" style="margin-top:8px" onclick="Audit.restoreDeps('${restorableIds.join(',')}')">
                <i class="ti ti-restore"></i> Restaurer les ${restorableIds.length} dépense(s) perdue(s) du ${Data.fmtDs(date)}
              </button>` : ''}
            </div>` : ''}
          <div class="g4" style="margin-bottom:12px">
            <div class="mc"><div class="mc-label">Dépenses en base</div><div class="mc-val">${current.length}</div><div class="mc-sub">${Data.fmt(totalCurrent)}</div></div>
            <div class="mc green"><div class="mc-label green">Audit · création</div><div class="mc-val green">${auditCreate.length}</div></div>
            <div class="mc amber"><div class="mc-label amber">Audit · modif</div><div class="mc-val amber">${auditUpdate.length}</div></div>
            <div class="mc red"><div class="mc-label red">Audit · suppr</div><div class="mc-val red">${auditDelete.length}</div></div>
          </div>

          ${pending.length ? `
          <details open>
            <summary style="cursor:pointer;font-weight:600;margin:8px 0 6px;color:var(--c-warning)">⏳ En attente de validation (${pending.length}) · ${Data.fmt(totalPending)}</summary>
            <div style="font-size:12px;color:var(--c-muted);margin:4px 0 6px">
              Saisies soumises mais pas encore validées par la direction : elles ne comptent pas encore
              dans les dépenses et ne sont <b>pas</b> des divergences.
            </div>
            <table style="margin-bottom:12px"><thead><tr><th>Dept</th><th>Catégorie</th><th class="text-right">Montant</th><th>Soumise par</th><th>ID</th></tr></thead><tbody>${rowsPending}</tbody></table>
          </details>` : ''}

          <details ${current.length ? 'open' : ''}>
            <summary style="cursor:pointer;font-weight:600;margin-bottom:6px">Dépenses actuellement en base (${current.length})</summary>
            <table style="margin-bottom:12px"><thead><tr><th>Dept</th><th>Catégorie</th><th class="text-right">Montant</th><th>Mode</th><th>ID</th></tr></thead><tbody>${rowsCurrent}</tbody></table>
          </details>

          <details ${auditUpdate.length ? 'open' : ''}>
            <summary style="cursor:pointer;font-weight:600;margin:8px 0 6px;color:var(--c-warning)">⚙️ Modifications historisées (${auditUpdate.length})</summary>
            <table style="margin-bottom:12px"><thead><tr><th>Entité</th><th>Détails</th><th>Date</th><th>Par</th></tr></thead><tbody>${rowsAuditUpdate}</tbody></table>
          </details>

          <details ${auditDelete.length ? 'open' : ''}>
            <summary style="cursor:pointer;font-weight:600;margin:8px 0 6px;color:var(--c-danger)">🗑 Suppressions historisées (${auditDelete.length})</summary>
            <table style="margin-bottom:12px"><thead><tr><th>Entité</th><th>Détails</th><th>Date</th><th>Par</th></tr></thead><tbody>${rowsAuditDelete}</tbody></table>
          </details>

          ${!okDiff ? `
            <div style="border-top:2px dashed var(--c-danger);padding-top:10px;margin-top:6px;background:var(--c-danger-soft);padding:12px;border-radius:6px">
              <details open>
                <summary style="cursor:pointer;font-weight:700;color:var(--c-danger);font-size:14px">⚠ Détail des divergences (${inAuditNotCurrent.length + inCurrentNotAudit.length}) · Montant total : ${Data.fmt(totalDivergence)}</summary>
                <div style="font-size:13px;color:var(--c-text);margin:10px 0 6px"><b>Audit sans base</b> — lignes audit dont la dépense a disparu (sans trace de suppression) · <span style="color:var(--c-danger);font-weight:700">${Data.fmt(totalMissing)}</span> :</div>
                <table style="margin-bottom:12px"><thead><tr><th>Entité</th><th>Détails</th><th class="text-right">Montant</th><th>ID</th><th></th></tr></thead><tbody>${rowsDiffMissing}</tbody></table>
                <div style="font-size:13px;color:var(--c-text);margin:10px 0 6px"><b>Base sans audit</b> — dépenses présentes sans aucune trace dans l'audit · <span style="color:var(--c-danger);font-weight:700">${Data.fmt(totalExtra)}</span> :</div>
                <table><thead><tr><th>Dept</th><th>Catégorie</th><th class="text-right">Montant</th><th>ID</th></tr></thead><tbody>${rowsDiffExtra}</tbody></table>
              </details>
            </div>` : ''}
        </div>`;
    });

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:1000px;max-height:90vh;overflow-y:auto">
          <div class="modal-title">⚖️ Rapprochement Dépenses · Historique ↔ Base</div>

          <div class="card" style="background:var(--c-bg-2);padding:12px;margin-bottom:14px">
            <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
              <div class="fg" style="margin:0;flex:1;min-width:140px">
                <label class="fl">Du</label>
                <input type="date" id="reco-from" value="${from}">
              </div>
              <div class="fg" style="margin:0;flex:1;min-width:140px">
                <label class="fl">Au</label>
                <input type="date" id="reco-to" value="${to}">
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-sm" onclick="Audit._recoPreset('today')" title="Aujourd'hui">Aujourd'hui</button>
                <button class="btn btn-sm" onclick="Audit._recoPreset('yest')"  title="Hier">Hier</button>
                <button class="btn btn-sm" onclick="Audit._recoPreset('7d')"    title="7 derniers jours">7 jours</button>
                <button class="btn btn-sm" onclick="Audit._recoPreset('30d')"   title="30 derniers jours">30 jours</button>
                <button class="btn btn-primary btn-sm" onclick="Audit._recoApply()"><i class="ti ti-refresh"></i> Appliquer</button>
              </div>
            </div>
            <div style="font-size:12px;color:var(--c-muted);margin-top:8px">
              Plage analysée : <b>${diffDays} jour${diffDays > 1 ? 's' : ''}</b> · maximum autorisé 31 jours.
            </div>
          </div>

          ${sections.join('')}
          <div class="modal-actions" style="margin-top:12px">
            <button class="btn btn-primary" onclick="App.closeModal()">Fermer</button>
          </div>
        </div>
      </div>`);
  },

  // ---------- Restauration de dépenses perdues depuis l'audit ----------
  // Chaque création de dépense est historisée avec sa copie complète
  // (meta.after) : on peut donc recréer à l'identique une dépense disparue.
  // `csv` = ids d'entrées d'audit séparés par des virgules.
  restoreDeps(csv) {
    const ids = String(csv).split(',').filter(Boolean);
    if (!ids.length) return;
    if (ids.length > 1 && !confirm(`Restaurer ${ids.length} dépense(s) à partir de leur copie dans l'historique ?`)) return;

    let done = 0, skipped = [];
    ids.forEach(eid => {
      const e = (Data.activityLog || []).find(x => String(x.id) === String(eid));
      const payload = e?.meta?.after || e?.meta?.before;
      const uid = e?.meta?.id;
      if (!e || !payload || uid == null || !payload.date) { skipped.push('copie introuvable'); return; }
      if ((Data.histDep || []).some(d => String(d.userId) === String(uid))) { skipped.push(`${payload.label || '?'} : déjà présente`); return; }
      if (typeof Clotures !== 'undefined' && Clotures.isMonthClosed && Clotures.isMonthClosed(payload.date)) {
        skipped.push(`${payload.label || '?'} : mois clôturé`); return;
      }
      Data.histDep.push({ ...payload, userId: uid });
      done++;
      this.log('create', 'depenses',
        `Dépense ${payload.dept || ''} · ${payload.label || ''} (restaurée depuis l'historique)`,
        `${Data.fmt(payload.montant || 0)} · ${payload.paiement || 'esp'}`,
        { id: uid, after: payload, restored: true });
    });

    if (done) {
      Data.bumpNextIdFromAllData();
      if (typeof Depenses !== 'undefined' && Depenses.persist) Depenses.persist();
      App.renderAll();
    }
    let msg = done ? `✅ ${done} dépense(s) restaurée(s) et sauvegardée(s).` : 'Aucune dépense restaurée.';
    if (skipped.length) msg += '\n\nIgnorée(s) :\n· ' + skipped.join('\n· ');
    alert(msg);
    App.closeModal();
  },

  // Helpers de la modale de rapprochement
  _recoApply() {
    const f = document.getElementById('reco-from')?.value;
    const t = document.getElementById('reco-to')?.value;
    if (!f || !t) return;
    App.closeModal();
    this.reconcileDepenses(f, t);
  },
  _recoPreset(k) {
    const today = new Date().toISOString().slice(0, 10);
    const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const d7    = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const d30   = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    let from = today, to = today;
    if (k === 'today') { from = today; to = today; }
    else if (k === 'yest')  { from = yest;  to = yest;  }
    else if (k === '7d')    { from = d7;    to = today; }
    else if (k === '30d')   { from = d30;   to = today; }
    App.closeModal();
    this.reconcileDepenses(from, to);
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
