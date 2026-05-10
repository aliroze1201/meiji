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
      .select('id,email,nom,role,created_at')
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
    body.innerHTML = this.rows.map(u => `
      <tr data-id="${u.id}">
        <td><b>${Auth.toUsername(u.email)}</b></td>
        <td><input class="u-nom" type="text" value="${(u.nom || '').replace(/"/g, '&quot;')}" placeholder="Prénom Nom"></td>
        <td>
          <select class="u-role">
            ${ROLES.map(r => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:right">
          <button class="btn btn-primary u-save"><i class="ti ti-device-floppy"></i> Enregistrer</button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="4" class="text-muted" style="text-align:center;padding:24px">Aucun utilisateur</td></tr>`;

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
          setTimeout(() => {
            btn.innerHTML = '<i class="ti ti-device-floppy"></i> Enregistrer';
          }, 1500);
        }
      });
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
