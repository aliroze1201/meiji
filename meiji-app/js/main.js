/**
 * main.js — Point d'entrée MEIJI
 * Navigation, initialisation, renderAll
 */

const App = {

  currentPage: 'accueil',
  period: 'tout',
  filters: {
    dep: 'all',
    emp: 'all',
    cred: 'all',
    cemp: 'all',
    an: 'all',
    prix: 'all',
  },

  // ===================== NAVIGATION =====================
  nav(pageId) {
    const el = document.querySelector(`[data-page="${pageId}"]`);
    if (el) this.navFromEl(pageId, el);
  },

  navFromEl(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tn-group.has-active').forEach(g => g.classList.remove('has-active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    if (el) {
      el.classList.add('active');
      const grp = el.closest('.tn-group');
      if (grp) grp.classList.add('has-active');
    }
    this.currentPage = pageId;
    this.updateTopbarTitle(pageId);
    if (typeof Auth !== 'undefined' && Auth.applyPageMode) Auth.applyPageMode(pageId);
    this.renderAll();
    if (pageId === 'utilisateurs' && typeof Utilisateurs !== 'undefined') Utilisateurs.render();
    if (pageId === 'historique'   && typeof Audit        !== 'undefined') Audit.render();
  },

  updateTopbarTitle(pageId) {
    const titles = {
      accueil: 'Accueil',
      dashboard: 'Tableau de bord',
      recettes: 'Recettes CA',
      depenses: 'Dépenses',
      pointage: 'Pointage journée',
      analyse: 'Analyse charges',
      prix: 'Analyse des prix',
      banque: 'Compte Bancaire',
      mobile: 'Mobile Money',
      categories: 'Catégories',
      employes: 'Employés',
      'comptes-emp': 'Comptes employés',
      credits: 'Crédits clients',
      suivi: 'Suivi des chèques',
      fournisseurs: 'Fournisseurs',
      stock: 'Gestion de stock',
      bilan: 'Bilan',
      clotures: 'Clôtures mensuelles',
      utilisateurs: 'Utilisateurs',
      associes: 'Associés',
      historique: 'Historique des activités',
    };
    const tb = document.getElementById('tb-title');
    if (tb) tb.textContent = titles[pageId] || 'MEIJI';
  },

  // ===================== SYNCHRONISATION FORCÉE =====================
  // Pousse toutes les données en mémoire vers Supabase. Utile pour rassurer
  // l'utilisateur ou réparer une éventuelle désynchro silencieuse.
  async syncAll() {
    const btn = document.getElementById('btn-sync');
    const icon = btn?.querySelector('i');
    const origIcon = icon?.className;
    if (icon) icon.className = 'ti ti-loader-2';
    if (btn) btn.disabled = true;

    if (typeof Config === 'undefined' || !Config.isAuthEnabled || !Config.isAuthEnabled()) {
      alert('ℹ️ Mode public (sans Supabase) : tes données restent uniquement dans ce navigateur.');
      if (icon) icon.className = origIcon;
      if (btn) btn.disabled = false;
      return;
    }
    if (typeof Auth === 'undefined' || !Auth.profile) {
      alert('🔒 Tu n\'es pas connecté. Connecte-toi pour synchroniser avec le cloud.');
      if (icon) icon.className = origIcon;
      if (btn) btn.disabled = false;
      return;
    }

    const report = [];
    const tryStep = async (label, fn) => {
      try { await fn(); report.push(`✅ ${label}`); }
      catch (e) { console.error('Sync ' + label, e); report.push(`❌ ${label} : ${e.message || 'erreur'}`); }
    };

    // Modules basés sur app_state (AppDB.save direct, robuste)
    if (typeof Depenses !== 'undefined' && Depenses.persist) await tryStep(
      `${Data.histDep.filter(d => d.userId).length} dépense(s)`,
      () => Depenses.persist()
    );
    if (typeof Depenses !== 'undefined' && Depenses.persistAttente) await tryStep(
      `${(Data.depAttente || []).length} dépense(s) en attente de validation`,
      () => Depenses.persistAttente()
    );
    if (typeof Banque   !== 'undefined' && Banque.save)   await tryStep('Banque (solde + mouvements)',         () => Banque.save());
    if (typeof Banque   !== 'undefined' && Banque.saveList) await tryStep(`Liste banques (${(Data.banques||[]).length})`, () => Banque.saveList());
    if (typeof Mobile   !== 'undefined' && Mobile.save)   await tryStep('Mobile Money (solde + mouvements)',   () => Mobile.save());
    if (typeof Mobile   !== 'undefined' && Mobile.saveList) await tryStep(`Liste opérateurs (${(Data.operateursMobile||[]).length})`, () => Mobile.saveList());
    if (typeof Suivi    !== 'undefined' && Suivi.persist) await tryStep(`${(Data.cheques||[]).length} chèque(s)`,   () => Suivi.persist());
    if (typeof Credits  !== 'undefined' && Credits.persist) await tryStep(`${(Data.credits||[]).length} crédit(s)`,  () => Credits.persist());
    if (typeof Employes !== 'undefined' && Employes.save)  await tryStep(`${(Data.employes||[]).length} employé(s)`, () => Employes.save());
    if (typeof Employes !== 'undefined' && Employes.persistHist) await tryStep(`Historique mensuel (${(Data.empHistorique||[]).length})`, () => Employes.persistHist());
    if (typeof CEmployes !== 'undefined' && CEmployes.save) await tryStep('Comptes employés', () => CEmployes.save());
    if (typeof Clotures !== 'undefined' && Clotures.persist) await tryStep('Clôtures', () => Clotures.persist());
    if (typeof Stock    !== 'undefined' && Stock.save)    await tryStep(`Stock (${(Data.stockArticles||[]).length} art. / ${(Data.stockMouvements||[]).length} mvt.)`, () => Stock.save());
    if (typeof Categories !== 'undefined' && Categories.persist) await tryStep(`${(Data.categories||[]).length} catégorie(s)`, () => Categories.persist());
    if (typeof Fournisseurs !== 'undefined' && Fournisseurs.persist) await tryStep(`${(Data.fournisseurs||[]).length} facture(s) fournisseur`, () => Fournisseurs.persist());
    if (typeof Fournisseurs !== 'undefined' && Fournisseurs.saveList) await tryStep(`Liste fournisseurs (${(Data.fournisseursListe||[]).length})`, () => Fournisseurs.saveList());
    if (typeof Associes !== 'undefined' && Associes.save) await tryStep(
      `Associés (${(Data.associes||[]).length}) + prélèvements (${(Data.prelevements||[]).length})`,
      () => Associes.save()
    );
    if (Data.fondInit && typeof Pointage !== 'undefined' && Pointage.SEED_KEY) {
      await tryStep('Soldes d\'ouverture', () => AppDB.save(Pointage.SEED_KEY, Data.fondInit));
    }
    if (typeof Audit !== 'undefined' && Audit.save) await tryStep(`Historique (${(Data.activityLog||[]).length})`, () => Audit.save());

    // Journées (Supabase table dédiée)
    if (typeof JourneesDB !== 'undefined' && JourneesDB.enabled && JourneesDB.enabled()) {
      const userJ = Data.journees.filter(j => j.userRec);
      let okJ = 0, failJ = 0;
      for (const j of userJ) {
        try {
          const ok = await JourneesDB.upsertOne(j);
          if (ok) okJ++; else failJ++;
        } catch { failJ++; }
      }
      report.push(failJ === 0
        ? `✅ ${okJ} journée(s) validée(s)`
        : `❌ Journées : ${okJ} OK / ${failJ} en échec`);
    }

    if (icon) icon.className = origIcon;
    if (btn) btn.disabled = false;
    alert('📤 Synchronisation Supabase\n\n' + report.join('\n'));
  },

  // ===================== THEME =====================
  initTheme() {
    const saved = localStorage.getItem('meiji-theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('meiji-theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('meiji-theme', 'dark');
      }
      Dashboard.render();
    });
  },

  // ===================== PERIOD =====================
  initPeriodBar() {
    const seg = document.getElementById('period-seg');
    if (!seg) return;
    seg.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.period = btn.dataset.period;
        seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.buildPeriodInputs();
        // Re-rendre tous les modules pour appliquer le filtre période partout
        this.renderAll();
      });
    });
    this.buildPeriodInputs();
  },

  // Vérifie si une date (string AAAA-MM-JJ) est dans la période active
  inPeriod(dateStr) {
    if (!dateStr) return true;
    if (this.period === 'tout') return true;
    if (this.period === 'jour') {
      const s = document.getElementById('sel-jour');
      return s ? dateStr === s.value : true;
    }
    if (this.period === 'mois') {
      const m = document.getElementById('sel-mois');
      const y = document.getElementById('sel-annee');
      if (!m || !y) return true;
      return dateStr.startsWith(y.value + '-' + m.value.padStart(2, '0'));
    }
    if (this.period === 'annee') {
      const y = document.getElementById('sel-annee2');
      return y ? dateStr.startsWith(y.value) : true;
    }
    if (this.period === 'plage') {
      const d = document.getElementById('sel-debut');
      const f = document.getElementById('sel-fin');
      if (!d || !f) return true;
      const v = dateStr.slice(0, 10);
      const dv = d.value, fv = f.value;
      if (dv && v < dv) return false;
      if (fv && v > fv) return false;
      return true;
    }
    return true;
  },

  // Filtre un tableau d'objets ayant un champ date
  filterByDate(items, dateField = 'date') {
    return items.filter(x => this.inPeriod(x[dateField]));
  },

  buildPeriodInputs() {
    const di = document.getElementById('period-inputs');
    if (!di) return;
    const today = Data.today();
    const re = () => this.renderAll();
    if (this.period === 'jour') {
      di.innerHTML = `<input type="date" id="sel-jour" value="${today}">`;
      document.getElementById('sel-jour').addEventListener('change', re);
    } else if (this.period === 'mois') {
      di.innerHTML = `
        <select id="sel-mois">
          <option value="1">Janvier</option><option value="2">Février</option><option value="3">Mars</option>
          <option value="4" selected>Avril</option><option value="5">Mai</option><option value="6">Juin</option>
          <option value="7">Juillet</option><option value="8">Août</option><option value="9">Septembre</option>
          <option value="10">Octobre</option><option value="11">Novembre</option><option value="12">Décembre</option>
        </select>
        <select id="sel-annee">
          <option value="2025">2025</option><option value="2026" selected>2026</option><option value="2027">2027</option>
        </select>`;
      document.getElementById('sel-mois').addEventListener('change', re);
      document.getElementById('sel-annee').addEventListener('change', re);
    } else if (this.period === 'annee') {
      di.innerHTML = `<select id="sel-annee2"><option value="2025">2025</option><option value="2026" selected>2026</option><option value="2027">2027</option></select>`;
      document.getElementById('sel-annee2').addEventListener('change', re);
    } else if (this.period === 'plage') {
      const last30 = new Date(); last30.setDate(last30.getDate() - 30);
      const startDefault = last30.toISOString().split('T')[0];
      di.innerHTML = `
        <span style="font-size:11px;color:var(--c-muted);font-weight:600">Du</span>
        <input type="date" id="sel-debut" value="${this._lastDebut || startDefault}">
        <span style="font-size:11px;color:var(--c-muted);font-weight:600">au</span>
        <input type="date" id="sel-fin" value="${this._lastFin || today}">`;
      const debut = document.getElementById('sel-debut');
      const fin   = document.getElementById('sel-fin');
      debut.addEventListener('change', () => { this._lastDebut = debut.value; re(); });
      fin.addEventListener('change',   () => { this._lastFin   = fin.value;   re(); });
    } else {
      di.innerHTML = '';
    }
  },

  filterJournees() {
    return Data.journees.filter(j => this.inPeriod(j.date));
  },

  getPeriodLabel() {
    const mois = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    if (this.period === 'tout') return 'Toutes les périodes';
    if (this.period === 'jour') { const s = document.getElementById('sel-jour'); return s ? Data.fmtD(s.value) : ''; }
    if (this.period === 'mois') { const m = document.getElementById('sel-mois'), y = document.getElementById('sel-annee'); if (!m || !y) return ''; return mois[parseInt(m.value)] + ' ' + y.value; }
    if (this.period === 'annee') { const y = document.getElementById('sel-annee2'); return y ? 'Année ' + y.value : ''; }
    if (this.period === 'plage') {
      const d = document.getElementById('sel-debut');
      const f = document.getElementById('sel-fin');
      if (!d || !f) return '';
      return 'Du ' + (d.value ? Data.fmtD(d.value) : '?') + ' au ' + (f.value ? Data.fmtD(f.value) : '?');
    }
    return '';
  },

  // ===================== TABS =====================
  initTabs(containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        callback(tab.dataset.filter);
      });
    });
  },

  // ===================== MODALS =====================
  showModal(html) {
    const container = document.getElementById('modal-container');
    container.innerHTML = html;
    const overlay = container.querySelector('.modal-overlay');
    if (overlay) {
      overlay.classList.add('show');
      // ARIA : signaler la modale aux lecteurs d'écran
      const modal = overlay.querySelector('.modal');
      if (modal) {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
        const title = modal.querySelector('.modal-title');
        if (title) {
          if (!title.id) title.id = 'modal-title-' + Date.now();
          modal.setAttribute('aria-labelledby', title.id);
        }
        // Focus initial : premier champ saisissable ou la modale elle-même
        const focusable = modal.querySelector('input, select, textarea, button');
        (focusable || modal).focus?.();
      }
      // Fermeture clavier : Échap
      this._modalKeyHandler = (e) => { if (e.key === 'Escape') this.closeModal(); };
      document.addEventListener('keydown', this._modalKeyHandler);
    }
  },

  closeModal() {
    document.getElementById('modal-container').innerHTML = '';
    if (this._modalKeyHandler) {
      document.removeEventListener('keydown', this._modalKeyHandler);
      this._modalKeyHandler = null;
    }
  },

  // ===================== RENDER ALL =====================
  renderAll() {
    const pl = document.getElementById('period-label');
    if (pl) pl.textContent = this.getPeriodLabel();
    // Accueil rendu en premier : indépendant des autres modules (et de leurs
    // CDN), il reste affiché même si un rendu ultérieur échoue.
    if (typeof Accueil !== 'undefined' && Accueil.render) Accueil.render();
    Dashboard.render();
    Recettes.render();
    Depenses.renderTable();
    Analyse.render();
    if (typeof Prix !== 'undefined') Prix.render();
    Banque.render();
    Mobile.render();
    Categories.render();
    Employes.render();
    CEmployes.render();
    Credits.render();
    Suivi.render();
    Fournisseurs.render();
    Bilan.render();
    if (typeof Clotures !== 'undefined') Clotures.render();
    if (typeof Pointage !== 'undefined') Pointage.render();
    if (typeof Stock !== 'undefined') Stock.render();
    if (typeof Associes !== 'undefined') Associes.render();
    if (typeof Audit !== 'undefined' && Audit.render) Audit.render();
  },

  // ===================== INIT =====================
  init() {
    // Navigation — les .nav-item sont des <div> : on les rend accessibles
    // au clavier (tabulation + Entrée/Espace) comme de vrais boutons.
    document.querySelectorAll('.nav-item').forEach(el => {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      const activate = () => {
        this.navFromEl(el.dataset.page, el);
        document.querySelectorAll('.tn-group.open').forEach(g => g.classList.remove('open'));
      };
      el.addEventListener('click', activate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });

    // Top-nav dropdowns
    document.querySelectorAll('.tn-group .tn-trigger').forEach(trig => {
      trig.addEventListener('click', (e) => {
        e.stopPropagation();
        const group = trig.closest('.tn-group');
        const wasOpen = group.classList.contains('open');
        document.querySelectorAll('.tn-group.open').forEach(g => g.classList.remove('open'));
        if (!wasOpen) group.classList.add('open');
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tn-group')) {
        document.querySelectorAll('.tn-group.open').forEach(g => g.classList.remove('open'));
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.tn-group.open').forEach(g => g.classList.remove('open'));
      }
    });

    // Period bar
    this.initPeriodBar();

    // Tabs
    this.initTabs('dep-tabs', f => { this.filters.dep = f; Depenses.renderTable(); });
    this.initTabs('emp-tabs', f => { this.filters.emp = f; Employes.render(); });
    this.initTabs('cred-tabs', f => { this.filters.cred = f; Credits.render(); });
    // cemp-tabs : les onglets sont reconstruits dynamiquement par CEmployes.renderTabs()
    this.initTabs('an-tabs', f => { this.filters.an = f; Analyse.render(); });
    this.initTabs('prix-tabs', f => { this.filters.prix = f; if (typeof Prix !== 'undefined') Prix.render(); });

    // Dropdown "Nouvelle ligne"
    const dd = document.getElementById('dep-dd');
    document.getElementById('dep-dd-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dd?.classList.toggle('open');
    });
    document.querySelectorAll('.dep-dd-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Depenses.addDraftRow(btn.dataset.dept);
        dd?.classList.remove('open');
      });
    });
    document.addEventListener('click', (e) => {
      if (dd && !dd.contains(e.target)) dd.classList.remove('open');
    });

    // Entrée dans la zone de saisie -> nouvelle ligne avec la même caisse
    document.getElementById('draft-tbody')?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const row = e.target.closest('tr[data-draft-id]');
      if (!row) return;
      const sel = row.querySelector('select.fld-dept');
      const dept = sel ? sel.value : 'SUSHI';
      e.preventDefault();
      Depenses.addDraftRow(dept);
    });

    document.getElementById('btn-commit-dep')?.addEventListener('click', () => Depenses.commitDrafts());

    // Recettes — saisie journées
    document.getElementById('btn-new-rec')?.addEventListener('click', () => Recettes.addDraft());
    document.getElementById('btn-commit-rec')?.addEventListener('click', () => Recettes.commitDrafts());
    document.getElementById('btn-export-rec')?.addEventListener('click', () => Recettes.exportExcel());
    document.getElementById('btn-import-rec')?.addEventListener('click', () => document.getElementById('rec-file-input')?.click());
    document.getElementById('rec-file-input')?.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) Recettes.importExcel(f);
      e.target.value = '';
    });
    document.getElementById('btn-export-dep')?.addEventListener('click', () => Depenses.exportExcel());
    document.getElementById('btn-import-dep')?.addEventListener('click', () => document.getElementById('dep-file-input')?.click());
    document.getElementById('dep-file-input')?.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) Depenses.importExcel(f);
      e.target.value = '';
    });
    document.getElementById('btn-new-cat')?.addEventListener('click', () => Categories.openModal(null));
    document.getElementById('btn-new-subcat')?.addEventListener('click', () => Categories.openSubModal());
    document.getElementById('btn-new-cemp')?.addEventListener('click', () => CEmployes.openModal());
    document.getElementById('btn-new-emp')?.addEventListener('click', () => Employes.openModal());
    document.getElementById('btn-cloture-emp')?.addEventListener('click', () => Employes.openClotureModal());
    document.getElementById('btn-new-cred')?.addEventListener('click', () => Credits.openModal());
    document.getElementById('btn-new-chq')?.addEventListener('click', () => Suivi.openModal());
    this.initTabs('suivi-tabs', f => { Suivi.filter = f; Suivi.render(); });
    document.getElementById('btn-new-fourn')?.addEventListener('click', () => Fournisseurs.openModal());
    document.getElementById('btn-new-fournisseur')?.addEventListener('click', () => Fournisseurs.openFournForm(null));
    document.getElementById('btn-list-fournisseurs')?.addEventListener('click', () => Fournisseurs.openListModal());
    document.getElementById('btn-new-mvt-banque')?.addEventListener('click', () => Banque.openMvtModal());
    document.getElementById('btn-new-mvt-mobile')?.addEventListener('click', () => Mobile.openMvtModal());
    document.getElementById('btn-list-banques')?.addEventListener('click', () => Banque.openListModal());
    document.getElementById('btn-list-mobiles')?.addEventListener('click', () => Mobile.openListModal());
    document.getElementById('btn-save-banque')?.addEventListener('click', () => Banque.saveSolde());
    document.getElementById('btn-save-mobile')?.addEventListener('click', () => Mobile.saveSolde());

    // Associés
    document.getElementById('btn-new-assoc')?.addEventListener('click', () => Associes.openAssocModal(null));
    document.getElementById('btn-new-prelv')?.addEventListener('click', () => Associes.openPrelvModal(null));

    // Theme
    this.initTheme();

    // Synchronisation forcée vers Supabase
    document.getElementById('btn-sync')?.addEventListener('click', () => this.syncAll());

    // ===== Historique (audit log) =====
    document.getElementById('btn-audit-export')?.addEventListener('click',   () => { if (typeof Audit !== 'undefined') Audit.exportExcel(); });
    document.getElementById('btn-audit-clear')?.addEventListener('click',    () => { if (typeof Audit !== 'undefined') Audit.clear(); });
    document.getElementById('btn-audit-backfill')?.addEventListener('click',  () => { if (typeof Audit !== 'undefined') Audit.backfillFromData(); });
    document.getElementById('btn-audit-reconcile')?.addEventListener('click', () => { if (typeof Audit !== 'undefined') Audit.reconcileDepenses(); });
    this.initTabs('au-tabs', f => { if (typeof Audit !== 'undefined') { Audit.filter = f; Audit.render(); } });
    document.getElementById('au-module')?.addEventListener('change', (e) => { if (typeof Audit !== 'undefined') { Audit.moduleFilter = e.target.value; Audit.render(); } });
    document.getElementById('au-search')?.addEventListener('input',  (e) => { if (typeof Audit !== 'undefined') { Audit.search       = e.target.value; Audit.render(); } });
    document.getElementById('au-from')?.addEventListener('change',   (e) => { if (typeof Audit !== 'undefined') { Audit.dateFrom     = e.target.value; Audit.render(); } });
    document.getElementById('au-to')?.addEventListener('change',     (e) => { if (typeof Audit !== 'undefined') { Audit.dateTo       = e.target.value; Audit.render(); } });

    if (typeof Pointage !== 'undefined') Pointage.init();
    if (typeof Stock !== 'undefined' && Stock.initOnce) Stock.initOnce();
    if (typeof Search !== 'undefined' && Search.init) Search.init();

    // Tous les modules sont async (Supabase). Premier rendu immédiat avec
    // les seeds, puis re-render dès que les données serveur arrivent.
    this.renderAll();
    this.restoreAll()
      .then(() => this.initCloudSync())
      .catch(e => console.error('Restore modules:', e));
    console.log('🍣 MEIJI App initialisée');
  },

  // ===================== RESTAURATION DEPUIS LE CLOUD =====================
  // Recharge TOUTES les données depuis Supabase (ou localStorage en repli),
  // puis re-render. Réutilisée au démarrage ET par le rafraîchissement auto.
  restoreAll() {
    return Promise.all([
      Credits.restore(),   // doit précéder Recettes (journées peuvent porter des règlements)
      Depenses.restore(),
      Suivi.restore(),
      Banque.restore(),
      Mobile.restore(),
      Employes.restore(),
      (typeof Clotures !== 'undefined' ? Clotures.restore() : Promise.resolve()),
      (typeof Pointage !== 'undefined' && Pointage.restore ? Pointage.restore() : Promise.resolve()),
      (typeof Stock !== 'undefined' && Stock.restore ? Stock.restore() : Promise.resolve()),
      (typeof Categories !== 'undefined' && Categories.restore ? Categories.restore() : Promise.resolve()),
      (typeof Analyse !== 'undefined' && Analyse.restorePrev ? Analyse.restorePrev() : Promise.resolve()),
      (typeof Fournisseurs !== 'undefined' && Fournisseurs.restore ? Fournisseurs.restore() : Promise.resolve()),
      (typeof CEmployes !== 'undefined' && CEmployes.restore ? CEmployes.restore() : Promise.resolve()),
      (typeof Associes !== 'undefined' && Associes.restore ? Associes.restore() : Promise.resolve()),
      (typeof Audit !== 'undefined' && Audit.restore ? Audit.restore() : Promise.resolve()),
    ])
    .then(() => Recettes.restore())
    .then(() => Data.bumpNextIdFromAllData())
    .then(() => this.renderAll());
  },

  // ===================== SYNCHRO CLOUD : ÉTAT + AUTO-REFRESH =====================
  _lastRefresh: 0,
  _refreshing: false,

  initCloudSync() {
    // Mode public : pas de cloud, on l'indique discrètement et on s'arrête là.
    if (typeof Config === 'undefined' || !Config.isAuthEnabled || !Config.isAuthEnabled()) {
      this.setSyncStatus('local', 'Mode local (non connecté au cloud)');
      return;
    }

    // Remonter à l'écran toute erreur cloud silencieuse (écriture/lecture).
    if (typeof AppDB !== 'undefined') {
      AppDB.onError = (err) => {
        this.setSyncStatus('error', err.message);
        this.toast(err.message, 'error');
      };
    }

    // Test de connexion au démarrage : confirme que les données se synchronisent
    // vraiment (table présente + droits OK), sinon explique pourquoi.
    if (typeof AppDB !== 'undefined' && AppDB.healthCheck) {
      AppDB.healthCheck().then((res) => {
        if (res.ok) {
          this.setSyncStatus('ok', 'Données synchronisées avec le cloud');
        } else if (res.reason === 'disabled') {
          this.setSyncStatus('local', res.message);
        } else {
          this.setSyncStatus('error', res.message);
          this.toast('⚠️ Synchronisation cloud impossible : ' + res.message, 'error', 12000);
        }
      });
    }

    // Rafraîchissement automatique : dès que l'utilisateur revient sur l'app
    // (changement d'onglet, réveil du téléphone), on recharge depuis le cloud
    // pour refléter ce qui a pu être saisi sur un autre appareil.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refreshFromCloud();
    });
    window.addEventListener('focus', () => this.refreshFromCloud());
    window.addEventListener('online', () => this.refreshFromCloud());
  },

  // Recharge depuis le cloud, avec garde-fous : pas si déconnecté, pas si une
  // modale/saisie est ouverte (on évite d'écraser une saisie en cours), et
  // pas plus d'une fois toutes les 5 s.
  async refreshFromCloud() {
    if (typeof AppDB === 'undefined' || !AppDB.enabled || !AppDB.enabled()) return;
    if (this._refreshing) return;
    if (Date.now() - this._lastRefresh < 5000) return;
    // Ne pas perturber une saisie en cours
    if (document.getElementById('modal-container')?.innerHTML.trim()) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // ⚠️ Jamais de rechargement pendant ou juste après une écriture locale.
    // Scénario du bug « les dépenses disparaissent au Valider » : commitDrafts()
    // pousse les lignes en mémoire et lance persist() (upsert cloud asynchrone) ;
    // la fermeture du confirm() redonne le focus à la fenêtre → refreshFromCloud()
    // relisait le cloud AVANT la fin de l'upsert → restore() remplaçait
    // Data.histDep par l'ancienne liste, effaçant les dépenses tout juste validées.
    if (AppDB.hasPendingWrites && AppDB.hasPendingWrites()) {
      // Si des écritures ont échoué (offline…), tenter de les rattraper d'abord ;
      // tant que le cloud est en retard sur le local, on ne recharge pas.
      if (!AppDB.flushDirty || !(await AppDB.flushDirty())) return;
    }
    if (typeof JourneesDB !== 'undefined' && JourneesDB.hasPendingWrites && JourneesDB.hasPendingWrites()) return;
    // Petit délai de grâce après toute écriture locale : laisse l'upsert se
    // propager avant d'accepter une relecture (protection ceinture-bretelles).
    if (AppDB.lastWriteAt && Date.now() - AppDB.lastWriteAt < 10000) return;

    this._refreshing = true;
    this.setSyncStatus('sync', 'Rafraîchissement…');
    try {
      await this.restoreAll();
      this._lastRefresh = Date.now();
      this.setSyncStatus('ok', 'Données à jour');
    } catch (e) {
      console.error('refreshFromCloud:', e);
      this.setSyncStatus('error', 'Échec du rafraîchissement');
    } finally {
      this._refreshing = false;
    }
  },

  // Met à jour l'état visuel du bouton de synchro (couleur + infobulle).
  setSyncStatus(state, title) {
    const btn = document.getElementById('btn-sync');
    if (!btn) return;
    btn.classList.remove('sync-ok', 'sync-error', 'sync-local', 'sync-busy');
    const map = { ok: 'sync-ok', error: 'sync-error', local: 'sync-local', sync: 'sync-busy' };
    if (map[state]) btn.classList.add(map[state]);
    if (title) btn.title = title;
  },

  // ===================== TOAST =====================
  toast(message, type = 'info', duration = 5000) {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'toast-host';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span>${message}</span><button class="toast-x" aria-label="Fermer">&times;</button>`;
    el.querySelector('.toast-x').addEventListener('click', () => el.remove());
    host.appendChild(el);
    if (duration > 0) setTimeout(() => el.remove(), duration);
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Auth !== 'undefined') await Auth.init();
  App.init();
});
