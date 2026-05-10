/**
 * auth.js — Authentification Supabase + rôles
 *
 * Rôles:
 *  - admin       : accès complet, peut gérer les utilisateurs
 *  - responsable : accès complet sauf gestion utilisateurs
 *  - caissier    : Tableau de bord, Pointage, Recettes, Dépenses
 *  - serveur     : Tableau de bord, Recettes uniquement
 */

const Auth = {
  client: null,
  user: null,
  profile: null, // { id, email, nom, role }

  USER_DOMAIN: '@meiji.local',

  toEmail(idOrEmail) {
    const v = (idOrEmail || '').trim().toLowerCase();
    if (!v) return '';
    return v.includes('@') ? v : v + this.USER_DOMAIN;
  },
  toUsername(email) {
    if (!email) return '';
    return email.endsWith(this.USER_DOMAIN) ? email.slice(0, -this.USER_DOMAIN.length) : email;
  },

  ALL_PAGES: ['dashboard','pointage','recettes','depenses','analyse','banque','mobile','suivi','categories','employes','comptes-emp','credits','fournisseurs','bilan'],

  ROLE_PERMISSIONS: {
    admin:       ['*'],
    responsable: ['dashboard','pointage','recettes','depenses','analyse','banque','mobile','suivi','categories','employes','comptes-emp','credits','fournisseurs','bilan'],
    gerant:      ['dashboard','pointage','recettes','depenses','analyse','banque','mobile','suivi','categories','employes','comptes-emp','credits','fournisseurs','bilan'],
    // 'utilisateurs' réservé à admin (couvert par '*')
    caissier:    ['dashboard','pointage','recettes','depenses'],
    serveur:     ['dashboard','recettes'],
  },

  async init() {
    if (!Config.isAuthEnabled()) {
      console.warn('🔒 Auth Supabase non configurée — voir SUPABASE_SETUP.md. App en mode public.');
      this._unlockUI();
      return;
    }
    if (typeof supabase === 'undefined') {
      console.error('Supabase SDK non chargé');
      return;
    }
    this.client = supabase.createClient(Config.supabase.url, Config.supabase.anonKey);

    const { data: { session } } = await this.client.auth.getSession();
    if (session) await this._onLogin(session.user);
    else this._showLogin();

    this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) this._onLogin(session.user);
      if (event === 'SIGNED_OUT') location.reload();
    });
  },

  async _onLogin(user) {
    this.user = user;
    const { data, error } = await this.client.from('profiles').select('*').eq('id', user.id).single();
    if (error || !data) {
      alert('Profil introuvable. Contactez un administrateur.');
      await this.logout();
      return;
    }
    this.profile = data;
    this._unlockUI();
    this._applyRolePermissions();
    this._renderUserBadge();
  },

  _showLogin() {
    document.body.classList.add('auth-locked');
    let overlay = document.getElementById('login-overlay');
    if (overlay) { overlay.style.display = 'flex'; return; }
    overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.innerHTML = `
      <div class="login-card">
        <div class="login-logo"><i class="ti ti-fish"></i> MEIJI</div>
        <div class="login-sub">Connexion à votre espace</div>
        <form id="login-form">
          <label>Identifiant</label>
          <input type="text" id="login-email" required autofocus autocomplete="username" placeholder="ex: ali">
          <label>Mot de passe</label>
          <input type="password" id="login-password" required autocomplete="current-password">
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:12px">
            <i class="ti ti-login"></i> Se connecter
          </button>
          <div id="login-error" class="login-error"></div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = this.toEmail(document.getElementById('login-email').value);
      const password = document.getElementById('login-password').value;
      const errEl = document.getElementById('login-error');
      errEl.textContent = '';
      const { error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) errEl.textContent = error.message;
    });
  },

  _unlockUI() {
    document.body.classList.remove('auth-locked');
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  async logout() {
    if (this.client) await this.client.auth.signOut();
    location.reload();
  },

  hasAccess(pageId) {
    if (!Config.isAuthEnabled()) return true;
    if (!this.profile) return false;
    if (this.profile.role === 'admin') return true;
    // Si l'admin a défini une liste personnalisée pour cet utilisateur, elle prime sur le rôle.
    const custom = this.profile.pages;
    if (Array.isArray(custom)) return custom.includes(pageId);
    const perms = this.ROLE_PERMISSIONS[this.profile.role] || [];
    return perms.includes('*') || perms.includes(pageId);
  },

  canEdit(pageId) {
    if (!Config.isAuthEnabled()) return true;
    if (!this.profile) return false;
    if (this.profile.role === 'admin') return true;
    if (!this.hasAccess(pageId)) return false;
    const ro = this.profile.pages_readonly;
    if (Array.isArray(ro) && ro.includes(pageId)) return false;
    return true;
  },

  applyPageMode(pageId) {
    const editable = this.canEdit(pageId);
    document.body.classList.toggle('view-only', !editable);
    document.body.dataset.pageMode = editable ? 'edit' : 'view';
  },

  _applyRolePermissions() {
    document.querySelectorAll('.nav-item').forEach(el => {
      const page = el.dataset.page;
      if (!this.hasAccess(page)) el.style.display = 'none';
    });
    const isAdmin = this.profile?.role === 'admin';
    const usersNav = document.getElementById('nav-users');
    if (usersNav) usersNav.style.display = isAdmin ? '' : 'none';
  },

  _renderUserBadge() {
    const avatar = document.querySelector('.tb-avatar');
    if (!avatar || !this.profile) return;
    const display = this.profile.nom || this.toUsername(this.profile.email);
    avatar.textContent = (display || '?').charAt(0).toUpperCase();
    avatar.title = `${display} · ${this.profile.role}`;
    avatar.style.cursor = 'pointer';
    avatar.onclick = () => this._showUserMenu();
  },

  _showUserMenu() {
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:380px">
          <div class="modal-title"><i class="ti ti-user"></i> Mon compte</div>
          <div style="text-align:center;padding:8px 0">
            <div style="font-size:18px;font-weight:700">${this.profile.nom || '—'}</div>
            <div style="color:var(--c-muted);font-size:13px">${this.toUsername(this.profile.email)}</div>
            <div style="margin-top:8px"><span class="badge b-blue">${this.profile.role}</span></div>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Fermer</button>
            <button class="btn btn-danger" onclick="Auth.logout()"><i class="ti ti-logout"></i> Déconnexion</button>
          </div>
        </div>
      </div>`);
  },
};
