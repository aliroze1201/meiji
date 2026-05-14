/**
 * main.js — Point d'entrée MEIJI
 * Navigation, initialisation, renderAll
 */

const App = {

  currentPage: 'dashboard',
  period: 'tout',
  filters: {
    dep: 'all',
    emp: 'all',
    cred: 'all',
    cemp: 'all',
    an: 'all',
  },

  // ===================== NAVIGATION =====================
  nav(pageId) {
    const el = document.querySelector(`[data-page="${pageId}"]`);
    if (el) this.navFromEl(pageId, el);
  },

  navFromEl(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('active');
    if (el) el.classList.add('active');
    this.currentPage = pageId;
    this.updateTopbarTitle(pageId);
    if (typeof Auth !== 'undefined' && Auth.applyPageMode) Auth.applyPageMode(pageId);
    this.renderAll();
    if (pageId === 'utilisateurs' && typeof Utilisateurs !== 'undefined') Utilisateurs.render();
  },

  updateTopbarTitle(pageId) {
    const titles = {
      dashboard: 'Tableau de bord',
      recettes: 'Recettes CA',
      depenses: 'Dépenses',
      pointage: 'Pointage journée',
      analyse: 'Analyse charges',
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
    if (typeof Banque   !== 'undefined' && Banque.save)   await tryStep('Banque (solde + mouvements)',         () => Banque.save());
    if (typeof Banque   !== 'undefined' && Banque.saveList) await tryStep(`Liste banques (${(Data.banques||[]).length})`, () => Banque.saveList());
    if (typeof Mobile   !== 'undefined' && Mobile.save)   await tryStep('Mobile Money (solde + mouvements)',   () => Mobile.save());
    if (typeof Mobile   !== 'undefined' && Mobile.saveList) await tryStep(`Liste opérateurs (${(Data.operateursMobile||[]).length})`, () => Mobile.saveList());
    if (typeof Suivi    !== 'undefined' && Suivi.persist) await tryStep(`${(Data.cheques||[]).length} chèque(s)`,   () => Suivi.persist());
    if (typeof Credits  !== 'undefined' && Credits.persist) await tryStep(`${(Data.credits||[]).length} crédit(s)`,  () => Credits.persist());
    if (typeof Employes !== 'undefined' && Employes.save)  await tryStep(`${(Data.employes||[]).length} employé(s)`, () => Employes.save());
    if (typeof Clotures !== 'undefined' && Clotures.persist) await tryStep('Clôtures', () => Clotures.persist());
    if (typeof Stock    !== 'undefined' && Stock.save)    await tryStep('Articles + mouvements stock',          () => Stock.save());
    if (typeof Stock    !== 'undefined' && Stock.save)       await tryStep(`Stock (${(Data.stockArticles||[]).length} art. / ${(Data.stockMouvements||[]).length} mvt.)`, () => Stock.save());
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
    if (overlay) overlay.classList.add('show');
  },

  closeModal() {
    document.getElementById('modal-container').innerHTML = '';
  },

  // ===================== RENDER ALL =====================
  renderAll() {
    const pl = document.getElementById('period-label');
    if (pl) pl.textContent = this.getPeriodLabel();
    Dashboard.render();
    Recettes.render();
    Depenses.renderTable();
    Analyse.render();
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
  },

  // ===================== INIT =====================
  init() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => this.navFromEl(el.dataset.page, el));
    });

    // Period bar
    this.initPeriodBar();

    // Tabs
    this.initTabs('dep-tabs', f => { this.filters.dep = f; Depenses.renderTable(); });
    this.initTabs('emp-tabs', f => { this.filters.emp = f; Employes.render(); });
    this.initTabs('cred-tabs', f => { this.filters.cred = f; Credits.render(); });
    this.initTabs('cemp-tabs', f => { this.filters.cemp = f; CEmployes.render(); });
    this.initTabs('an-tabs', f => { this.filters.an = f; Analyse.render(); });

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

    if (typeof Pointage !== 'undefined') Pointage.init();
    if (typeof Stock !== 'undefined' && Stock.initOnce) Stock.initOnce();

    // Tous les modules sont async (Supabase). Premier rendu immédiat avec
    // les seeds, puis re-render dès que les données serveur arrivent.
    this.renderAll();
    Promise.all([
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
      (typeof Fournisseurs !== 'undefined' && Fournisseurs.restore ? Fournisseurs.restore() : Promise.resolve()),
      (typeof Associes !== 'undefined' && Associes.restore ? Associes.restore() : Promise.resolve()),
    ])
    .then(() => Recettes.restore())
    .then(() => this.renderAll())
    .catch(e => console.error('Restore modules:', e));
    console.log('🍣 MEIJI App initialisée');
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Auth !== 'undefined') await Auth.init();
  App.init();
});
