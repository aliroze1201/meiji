/**
 * accueil.js — Page d'accueil : menu des onglets sous forme de tuiles carrées.
 *
 * Les tuiles sont générées à partir d'une liste statique (page, icône, label,
 * couleur) et filtrées selon les droits de l'utilisateur (Auth.hasAccess).
 * En mode public (sans Supabase), toutes les tuiles sont visibles.
 */

const Accueil = {
  // Ordre d'affichage des tuiles. Les pages admin (utilisateurs, historique)
  // n'apparaissent que si l'utilisateur y a accès.
  TILES: [
    { page: 'dashboard',   icon: 'ti-layout-dashboard', label: 'Tableau de bord', color: 'blue'  },
    { page: 'pointage',    icon: 'ti-cash-register',    label: 'Pointage journée', color: 'green' },
    { page: 'recettes',    icon: 'ti-trending-up',      label: 'Recettes CA',      color: 'green' },
    { page: 'depenses',    icon: 'ti-trending-down',    label: 'Dépenses',         color: 'red'   },
    { page: 'analyse',     icon: 'ti-chart-pie',        label: 'Analyse charges',  color: 'amber' },
    { page: 'banque',      icon: 'ti-building-bank',    label: 'Banque',           color: 'blue'  },
    { page: 'mobile',      icon: 'ti-device-mobile',    label: 'Mobile Money',     color: 'teal'  },
    { page: 'suivi',       icon: 'ti-checks',           label: 'Suivi chèques',    color: 'teal'  },
    { page: 'categories',  icon: 'ti-tags',             label: 'Catégories',       color: 'amber' },
    { page: 'employes',    icon: 'ti-users',            label: 'Employés',         color: 'blue'  },
    { page: 'comptes-emp', icon: 'ti-user-dollar',      label: 'Comptes employés', color: 'green' },
    { page: 'credits',     icon: 'ti-receipt-2',        label: 'Crédits clients',  color: 'red'   },
    { page: 'fournisseurs',icon: 'ti-truck-delivery',   label: 'Fournisseurs',     color: 'blue'  },
    { page: 'stock',       icon: 'ti-box-seam',         label: 'Stock',            color: 'amber' },
    { page: 'associes',    icon: 'ti-users-group',      label: 'Associés',         color: 'teal'  },
    { page: 'bilan',       icon: 'ti-report-analytics', label: 'Bilan',            color: 'green' },
    { page: 'clotures',    icon: 'ti-calendar-check',   label: 'Clôtures',         color: 'amber' },
    { page: 'utilisateurs',icon: 'ti-user-shield',      label: 'Utilisateurs',     color: 'red'   },
    { page: 'historique',  icon: 'ti-history',          label: 'Historique',       color: 'blue'  },
  ],

  render() {
    const grid = document.getElementById('accueil-grid');
    if (!grid) return;
    const allowed = this.TILES.filter(t =>
      (typeof Auth === 'undefined' || typeof Auth.hasAccess !== 'function') || Auth.hasAccess(t.page)
    );
    grid.innerHTML = allowed.map(t => `
      <button type="button" class="accueil-tile ${t.color}" onclick="App.nav('${t.page}')" aria-label="${this._esc(t.label)}">
        <span class="accueil-tile-icon"><i class="ti ${t.icon}"></i></span>
        <span class="accueil-tile-label">${this._esc(t.label)}</span>
      </button>`).join('');
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },
};
