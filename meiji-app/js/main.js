/**
 * main.js — Point d'entrée MEIJI
 * Navigation, initialisation, renderAll
 */

const App = {

  currentPage: 'dashboard',
  period: 'mois',
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
    this.renderAll();
  },

  updateTopbarTitle(pageId) {
    const titles = {
      dashboard: 'Tableau de bord',
      recettes: 'Recettes CA',
      depenses: 'Dépenses',
      analyse: 'Analyse charges',
      banque: 'Compte Bancaire',
      mobile: 'Mobile Money',
      categories: 'Catégories',
      employes: 'Employés',
      'comptes-emp': 'Comptes employés',
      credits: 'Crédits clients',
      fournisseurs: 'Fournisseurs',
      bilan: 'Bilan',
    };
    const tb = document.getElementById('tb-title');
    if (tb) tb.textContent = titles[pageId] || 'MEIJI';
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
        Dashboard.render();
      });
    });
    this.buildPeriodInputs();
  },

  buildPeriodInputs() {
    const di = document.getElementById('period-inputs');
    if (!di) return;
    const today = Data.today();
    if (this.period === 'jour') {
      di.innerHTML = `<input type="date" id="sel-jour" value="${today}">`;
      document.getElementById('sel-jour').addEventListener('change', () => Dashboard.render());
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
      document.getElementById('sel-mois').addEventListener('change', () => Dashboard.render());
      document.getElementById('sel-annee').addEventListener('change', () => Dashboard.render());
    } else if (this.period === 'annee') {
      di.innerHTML = `<select id="sel-annee2"><option value="2025">2025</option><option value="2026" selected>2026</option><option value="2027">2027</option></select>`;
      document.getElementById('sel-annee2').addEventListener('change', () => Dashboard.render());
    } else {
      di.innerHTML = '';
    }
  },

  filterJournees() {
    const jj = Data.journees;
    if (this.period === 'tout') return jj;
    if (this.period === 'jour') {
      const s = document.getElementById('sel-jour');
      return s ? jj.filter(x => x.date === s.value) : jj;
    }
    if (this.period === 'mois') {
      const m = document.getElementById('sel-mois'), y = document.getElementById('sel-annee');
      if (!m || !y) return jj;
      return jj.filter(x => x.date.startsWith(y.value + '-' + m.value.padStart(2, '0')));
    }
    if (this.period === 'annee') {
      const y = document.getElementById('sel-annee2');
      return y ? jj.filter(x => x.date.startsWith(y.value)) : jj;
    }
    return jj;
  },

  getPeriodLabel() {
    const mois = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    if (this.period === 'tout') return 'Toutes les périodes';
    if (this.period === 'jour') { const s = document.getElementById('sel-jour'); return s ? Data.fmtD(s.value) : ''; }
    if (this.period === 'mois') { const m = document.getElementById('sel-mois'), y = document.getElementById('sel-annee'); if (!m || !y) return ''; return mois[parseInt(m.value)] + ' ' + y.value; }
    if (this.period === 'annee') { const y = document.getElementById('sel-annee2'); return y ? 'Année ' + y.value : ''; }
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
    Fournisseurs.render();
    Bilan.render();
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

    // Buttons
    document.querySelectorAll('.dep-add').forEach(btn => {
      btn.addEventListener('click', () => Depenses.addDraftRow(btn.dataset.dept));
    });
    document.getElementById('btn-commit-dep')?.addEventListener('click', () => Depenses.commitDrafts());
    document.getElementById('btn-export-dep')?.addEventListener('click', () => Depenses.exportExcel());
    document.getElementById('btn-import-dep')?.addEventListener('click', () => document.getElementById('dep-file-input')?.click());
    document.getElementById('dep-file-input')?.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) Depenses.importExcel(f);
      e.target.value = '';
    });
    document.getElementById('btn-new-cat')?.addEventListener('click', () => Categories.openModal(null));
    document.getElementById('btn-new-cemp')?.addEventListener('click', () => CEmployes.openModal());
    document.getElementById('btn-new-cred')?.addEventListener('click', () => Credits.openModal());
    document.getElementById('btn-new-fourn')?.addEventListener('click', () => Fournisseurs.openModal());
    document.getElementById('btn-new-mvt-banque')?.addEventListener('click', () => Banque.openMvtModal());
    document.getElementById('btn-new-mvt-mobile')?.addEventListener('click', () => Mobile.openMvtModal());
    document.getElementById('btn-save-banque')?.addEventListener('click', () => Banque.saveSolde());
    document.getElementById('btn-save-mobile')?.addEventListener('click', () => Mobile.saveSolde());

    // Theme
    this.initTheme();

    // Restaurer les dépenses sauvegardées localement
    Depenses.restore();

    // Initial render
    this.renderAll();
    console.log('🍣 MEIJI App initialisée');
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
