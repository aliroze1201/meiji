/**
 * utilisateurs.js — Gestion des utilisateurs (admin uniquement)
 * Liste les profils Supabase et permet de modifier nom + rôle.
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
        <td>${u.email}</td>
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
};
