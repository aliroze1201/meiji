/**
 * utilisateurs.js — Gestion des utilisateurs (admin uniquement)
 * Liste les profils Supabase, permet de modifier nom + rôle, et de créer des agents.
 */

const Utilisateurs = {
  rows: [],

  async render() {
    const root = document.getElementById('page-utilisateurs');
    if (!root) return;
    if (!Config.isAuthEnabled()) {
      root.querySelector('.content').innerHTML =
        '<div class="card"><div class="text-muted">Authentification non configurée.</div></div>';
      return;
    }
    if (!Auth.profile || Auth.profile.role !== 'admin') {
      root.querySelector('.content').innerHTML =
        '<div class="card"><div class="text-muted">Accès réservé aux administrateurs.</div></div>';
      return;
    }
    await this.load();
    this.draw();
    this.bindCreateForm();
  },

  async load() {
    const { data, error } = await Auth.client
      .from('profiles')
      .select('id,email,nom,role,pages,pages_readonly,created_at')
      .order('created_at', { ascending: true });
    if (error) {
      console.error(error);
      this.rows = [];
      return;
    }
    this.rows = data || [];
  },

  draw() {
    const body = document.getElementById('users-tbody');
    if (!body) return;
    const ROLES = ['admin', 'responsable', 'caissier', 'serveur'];
    body.innerHTML = this.rows.map(u => {
      const customCount = Array.isArray(u.pages) ? u.pages.length : null;
      const permsLabel = customCount === null
        ? `<span class="text-muted" style="font-size:12px">par défaut (rôle)</span>`
        : `<span class="badge b-blue">${customCount} page(s) personnalisé(es)</span>`;
      return `
      <tr data-id="${u.id}">
        <td><b>${Auth.toUsername(u.email)}</b></td>
        <td><input class="u-nom" type="text" value="${(u.nom || '').replace(/"/g, '&quot;')}" placeholder="Prénom Nom"></td>
        <td>
          <select class="u-role">
            ${ROLES.map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
        <td>${permsLabel}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn u-perms"><i class="ti ti-lock-cog"></i> Permissions</button>
          <button class="btn btn-primary u-save"><i class="ti ti-device-floppy"></i> Enregistrer</button>
        </td>
      </tr>
    `}).join('') || `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:24px">Aucun utilisateur</td></tr>`;

    body.querySelectorAll('.u-save').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const id = tr.dataset.id;
        const nom = tr.querySelector('.u-nom').value.trim();
        const role = tr.querySelector('.u-role').value;
        btn.disabled = true;
        btn.innerHTML = '<i class="ti ti-loader"></i> ...';
        const { error } = await Auth.client
          .from('profiles')
          .update({ nom, role })
          .eq('id', id);
        btn.disabled = false;
        if (error) {
          alert('Erreur : ' + error.message);
          btn.innerHTML = '<i class="ti ti-device-floppy"></i> Enregistrer';
        } else {
          btn.innerHTML = '<i class="ti ti-check"></i> Enregistré';
          setTimeout(() => { btn.innerHTML = '<i class="ti ti-device-floppy"></i> Enregistrer'; }, 1500);
        }
      });
    });

    body.querySelectorAll('.u-perms').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        const user = this.rows.find(u => u.id === id);
        if (user) this.openPermsModal(user);
      });
    });
  },

  PAGE_LABELS: {
    dashboard: 'Tableau de bord',
    pointage: 'Pointage journée',
    recettes: 'Recettes CA',
    depenses: 'Dépenses',
    analyse: 'Analyse charges',
    banque: 'Banque',
    mobile: 'Mobile Money',
    suivi: 'Suivi chèques',
    categories: 'Catégories',
    employes: 'Employés',
    'comptes-emp': 'Comptes employés',
    credits: 'Crédits clients',
    fournisseurs: 'Fournisseurs',
    bilan: 'Bilan',
  },

  openPermsModal(user) {
    const username = Auth.toUsername(user.email);
    const customSet = new Set(Array.isArray(user.pages) ? user.pages : []);
    const useRoleDefault = !Array.isArray(user.pages);
    const roPages = new Set(Array.isArray(user.pages_readonly) ? user.pages_readonly : []);
    const rolePages = Auth.ROLE_PERMISSIONS[user.role] || [];
    const roleAll = rolePages.includes('*');

    const rows = Auth.ALL_PAGES.map(p => {
      const allowedByRole = roleAll || rolePages.includes(p);
      const view = useRoleDefault ? allowedByRole : customSet.has(p);
      const edit = view && !roPages.has(p);
      return `
        <tr data-page="${p}">
          <td>${this.PAGE_LABELS[p] || p}</td>
          <td style="text-align:center"><input type="checkbox" class="p-view" ${view ? 'checked' : ''}></td>
          <td style="text-align:center"><input type="checkbox" class="p-edit" ${edit ? 'checked' : ''}></td>
        </tr>`;
    }).join('');

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:520px">
          <div class="modal-title"><i class="ti ti-lock-cog"></i> Permissions de « ${username} »</div>
          <div style="font-size:12px;color:var(--c-muted);margin-bottom:8px">
            Coche « Voir » pour autoriser l'accès à la page, et « Modifier » pour autoriser la saisie/édition.
            Si rien n'est coché spécifiquement, les permissions du rôle « ${user.role} » s'appliquent par défaut.
          </div>
          <div style="max-height:380px;overflow:auto;border:1px solid var(--c-border);border-radius:8px">
            <table class="table" style="margin:0">
              <thead><tr><th>Page</th><th style="text-align:center">Voir</th><th style="text-align:center">Modifier</th></tr></thead>
              <tbody id="perms-body">${rows}</tbody>
            </table>
          </div>
          <div class="modal-actions" style="margin-top:12px">
            <button class="btn" id="perms-reset"><i class="ti ti-refresh"></i> Réinitialiser au rôle</button>
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" id="perms-save"><i class="ti ti-device-floppy"></i> Enregistrer</button>
          </div>
        </div>
      </div>`);

    // "Voir" décoché → "Modifier" décoché aussi automatiquement
    document.querySelectorAll('#perms-body .p-view').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if (!e.target.checked) {
          const tr = e.target.closest('tr');
          tr.querySelector('.p-edit').checked = false;
        }
      });
    });
    document.querySelectorAll('#perms-body .p-edit').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) {
          const tr = e.target.closest('tr');
          tr.querySelector('.p-view').checked = true;
        }
      });
    });

    document.getElementById('perms-reset').addEventListener('click', async () => {
      if (!confirm('Réinitialiser aux permissions par défaut du rôle ?')) return;
      const { error } = await Auth.client
        .from('profiles')
        .update({ pages: null, pages_readonly: null })
        .eq('id', user.id);
      if (error) return alert('Erreur : ' + error.message);
      App.closeModal();
      await this.load();
      this.draw();
    });

    document.getElementById('perms-save').addEventListener('click', async () => {
      const pages = [];
      const ro = [];
      document.querySelectorAll('#perms-body tr').forEach(tr => {
        const p = tr.dataset.page;
        const v = tr.querySelector('.p-view').checked;
        const e = tr.querySelector('.p-edit').checked;
        if (v) pages.push(p);
        if (v && !e) ro.push(p);
      });
      const { error } = await Auth.client
        .from('profiles')
        .update({ pages, pages_readonly: ro })
        .eq('id', user.id);
      if (error) return alert('Erreur : ' + error.message);
      App.closeModal();
      await this.load();
      this.draw();
    });
  },

  bindCreateForm() {
    const form = document.getElementById('user-create-form');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('user-create-error');
      const okEl = document.getElementById('user-create-success');
      errEl.textContent = '';
      okEl.textContent = '';

      const username = document.getElementById('uc-username').value.trim().toLowerCase();
      const password = document.getElementById('uc-password').value;
      const nom = document.getElementById('uc-nom').value.trim();
      const role = document.getElementById('uc-role').value;

      if (!/^[a-z0-9._-]{2,32}$/.test(username)) {
        errEl.textContent = "Identifiant invalide (lettres minuscules, chiffres, . _ - ; 2-32 caractères).";
        return;
      }
      if (password.length < 6) {
        errEl.textContent = "Mot de passe : minimum 6 caractères.";
        return;
      }

      const email = Auth.toEmail(username);
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="ti ti-loader"></i> Création...';

      // Client Supabase isolé : ne touche pas la session admin courante
      const tmp = supabase.createClient(Config.supabase.url, Config.supabase.anonKey, {
        auth: {
          storageKey: 'meiji-tmp-create-' + Date.now(),
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data: signupData, error: signupErr } = await tmp.auth.signUp({ email, password });
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ti ti-user-plus"></i> Créer le compte';

      if (signupErr) {
        if (/signups? not allowed/i.test(signupErr.message)) {
          errEl.innerHTML = "Inscriptions désactivées. Active-les dans Supabase → Authentication → Providers → Email → ✅ Enable Email Signups.";
        } else if (/already registered|already exists|duplicate/i.test(signupErr.message)) {
          errEl.textContent = "Cet identifiant existe déjà.";
        } else {
          errEl.textContent = signupErr.message;
        }
        return;
      }

      // Le trigger handle_new_user a inséré un profil avec role='serveur'.
      // On met à jour role + nom avec les valeurs choisies par l'admin.
      const newId = signupData.user?.id;
      if (newId) {
        await Auth.client.from('profiles').update({ nom, role }).eq('id', newId);
      }

      okEl.textContent = `Compte « ${username} » créé avec succès.`;
      form.reset();
      await this.load();
      this.draw();
    });
  },
};
