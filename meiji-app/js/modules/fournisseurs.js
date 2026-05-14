/**
 * fournisseurs.js — Carnet fournisseurs + factures.
 *
 * Modèle :
 *   Data.fournisseursListe : [{ id, nom, contact, telephone, observation, actif }]
 *   Data.fournisseurs      : [{ id, date, four, num, ech, lib, deb, cred, solde, obs }]
 *
 * Persistance : table app_state (clés 'meiji-fournisseurs-liste' et
 * 'meiji-fournisseurs-factures') via AppDB.
 */

const Fournisseurs = {
  STORAGE_LIST:    'meiji-fournisseurs-liste',
  STORAGE_FACTURE: 'meiji-fournisseurs-factures',
  editId: null,           // édition d'un fournisseur (liste)
  editFactureId: null,    // édition d'une facture

  // ===================== LISTE FOURNISSEURS =====================
  openListModal() {
    if (!Array.isArray(Data.fournisseursListe)) Data.fournisseursListe = [];
    const rows = Data.fournisseursListe.length
      ? Data.fournisseursListe.map(f => `
          <tr>
            <td><b>${this._esc(f.nom)}</b></td>
            <td>${this._esc(f.contact || '')}</td>
            <td>${this._esc(f.telephone || '')}</td>
            <td>${f.actif === false ? '<span class="badge b-red">Inactif</span>' : '<span class="badge b-green">Actif</span>'}</td>
            <td class="nowrap">
              <button class="btn btn-sm" onclick="Fournisseurs.openFournForm(${f.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="Fournisseurs.removeFourn(${f.id})" style="margin-left:4px">🗑</button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="5" class="empty">Aucun fournisseur enregistré</td></tr>';
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:720px">
          <div class="modal-title">🚚 Gérer les fournisseurs</div>
          <div style="font-size:13px;color:var(--c-muted);margin-bottom:10px">
            Les fournisseurs de cette liste apparaissent comme choix dans le formulaire « Nouvelle facture ».
          </div>
          <div style="margin-bottom:12px">
            <button class="btn btn-primary" onclick="Fournisseurs.openFournForm(null)"><i class="ti ti-plus"></i> Nouveau fournisseur</button>
          </div>
          <table>
            <thead><tr><th>Nom</th><th>Contact</th><th>Téléphone</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="modal-actions" style="margin-top:16px">
            <button class="btn btn-primary" onclick="App.closeModal()">Fermer</button>
          </div>
        </div>
      </div>`);
  },

  openFournForm(id) {
    this.editId = id;
    const f = id ? (Data.fournisseursListe || []).find(x => x.id === id) : null;
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${id ? 'Modifier fournisseur' : 'Nouveau fournisseur'}</div>
          <div class="fg"><label class="fl">Nom *</label>
            <input type="text" id="fr-nom" value="${this._esc(f?.nom || '')}" placeholder="Ex: BATIMAT, REGAL, ORCA...">
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Contact</label>
              <input type="text" id="fr-contact" value="${this._esc(f?.contact || '')}" placeholder="Nom du commercial...">
            </div>
            <div class="fg"><label class="fl">Téléphone</label>
              <input type="text" id="fr-tel" value="${this._esc(f?.telephone || '')}" placeholder="+242...">
            </div>
          </div>
          <div class="fg"><label class="fl">Observation</label>
            <input type="text" id="fr-obs" value="${this._esc(f?.observation || '')}" placeholder="Adresse, conditions, etc.">
          </div>
          <div class="fg" style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="fr-actif" ${f?.actif === false ? '' : 'checked'} style="width:auto">
            <label for="fr-actif" style="margin:0">Fournisseur actif (visible dans les menus déroulants)</label>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="Fournisseurs.openListModal()">Retour à la liste</button>
            <button class="btn btn-primary" onclick="Fournisseurs.saveFourn()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  saveFourn() {
    const nom = (document.getElementById('fr-nom')?.value || '').trim();
    if (!nom) { alert('Nom obligatoire.'); return; }
    const contact    = (document.getElementById('fr-contact')?.value || '').trim() || null;
    const telephone  = (document.getElementById('fr-tel')?.value || '').trim() || null;
    const observation= (document.getElementById('fr-obs')?.value || '').trim() || null;
    const actif      = !!document.getElementById('fr-actif')?.checked;
    if (!Array.isArray(Data.fournisseursListe)) Data.fournisseursListe = [];
    // Anti-doublon (insensible à la casse)
    const exists = Data.fournisseursListe.some(x =>
      x.id !== this.editId &&
      (x.nom || '').toLowerCase() === nom.toLowerCase());
    if (exists) { alert('Un fournisseur avec ce nom existe déjà.'); return; }
    if (this.editId) {
      const f = Data.fournisseursListe.find(x => x.id === this.editId);
      if (f) Object.assign(f, { nom, contact, telephone, observation, actif });
    } else {
      Data.fournisseursListe.push({ id: Data.newId(), nom, contact, telephone, observation, actif });
    }
    this.editId = null;
    this.saveList();
    this.openListModal();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
  },

  removeFourn(id) {
    const f = (Data.fournisseursListe || []).find(x => x.id === id);
    if (!f) return;
    const nbFactures = (Data.fournisseurs || []).filter(fa => fa.four === f.nom).length;
    let msg = `Supprimer le fournisseur « ${f.nom} » ?`;
    if (nbFactures) msg += `\n\n${nbFactures} facture(s) existent à son nom — elles seront conservées (juste le menu déroulant ne le proposera plus).`;
    if (!confirm(msg)) return;
    Data.fournisseursListe = Data.fournisseursListe.filter(x => x.id !== id);
    this.saveList();
    this.openListModal();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
  },

  // ===================== FACTURES =====================
  openModal(id) {
    this.editFactureId = id;
    const fa = id ? (Data.fournisseurs || []).find(x => x.id === id) : null;
    const list = (Data.fournisseursListe || []).filter(x => x.actif !== false || (fa && x.nom === fa.four));
    if (!list.length) {
      if (confirm('Aucun fournisseur enregistré. Veux-tu en créer un maintenant ?')) {
        this.openFournForm(null);
      }
      return;
    }
    const opts = list.map(f =>
      `<option value="${this._esc(f.nom)}" ${fa && fa.four === f.nom ? 'selected' : ''}>${this._esc(f.nom)}</option>`
    ).join('');
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${id ? 'Modifier facture' : 'Nouvelle facture'} fournisseur</div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label>
              <input type="date" id="fo-date" value="${fa?.date || Data.today()}"></div>
            <div class="fg"><label class="fl">Fournisseur</label>
              <select id="fo-four">${opts}</select>
              <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
                <a href="#" onclick="App.closeModal();Fournisseurs.openListModal();return false">Gérer les fournisseurs</a>
              </div>
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">N° Facture</label><input type="text" id="fo-num" value="${this._esc(fa?.num || '')}" placeholder="F-2026-001"></div>
            <div class="fg"><label class="fl">Échéance</label><input type="date" id="fo-ech" value="${fa?.ech || Data.today()}"></div>
          </div>
          <div class="fg"><label class="fl">Désignation</label><input type="text" id="fo-lib" value="${this._esc(fa?.lib || '')}" placeholder="Description"></div>
          <div class="fr">
            <div class="fg"><label class="fl">Débit (FCFA)</label><input type="number" id="fo-deb" value="${fa?.deb || ''}" placeholder="0"></div>
            <div class="fg"><label class="fl">Crédit (FCFA)</label><input type="number" id="fo-cred" value="${fa?.cred || ''}" placeholder="0"></div>
          </div>
          <div class="fg"><label class="fl">Observation</label><input type="text" id="fo-obs" value="${this._esc(fa?.obs || '')}" placeholder="Remarques..."></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Fournisseurs.save()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  save() {
    const deb  = parseFloat(document.getElementById('fo-deb')?.value)  || 0;
    const cred = parseFloat(document.getElementById('fo-cred')?.value) || 0;
    const payload = {
      date: document.getElementById('fo-date')?.value,
      four: document.getElementById('fo-four')?.value,
      num:  document.getElementById('fo-num')?.value,
      ech:  document.getElementById('fo-ech')?.value,
      lib:  document.getElementById('fo-lib')?.value,
      deb, cred,
      solde: deb - cred,
      obs:  document.getElementById('fo-obs')?.value,
    };
    if (!Array.isArray(Data.fournisseurs)) Data.fournisseurs = [];
    if (this.editFactureId) {
      const idx = Data.fournisseurs.findIndex(f => f.id === this.editFactureId);
      if (idx >= 0) Data.fournisseurs[idx] = { ...Data.fournisseurs[idx], ...payload };
    } else {
      Data.fournisseurs.unshift({ id: Data.newId(), ...payload });
    }
    this.editFactureId = null;
    this.persist();
    App.closeModal();
    this.render();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
  },

  removeFacture(id) {
    const f = (Data.fournisseurs || []).find(x => x.id === id);
    if (!f) return;
    if (!confirm(`Supprimer la facture ${f.num || ''} du ${Data.fmtD(f.date)} ?`)) return;
    Data.fournisseurs = Data.fournisseurs.filter(x => x.id !== id);
    this.persist();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
    else this.render();
  },

  // ===================== RENDER =====================
  render() {
    const list = App.filterByDate(Data.fournisseurs || []);

    // KPI dynamique : une tuile par fournisseur de la liste, avec son solde net
    const kpisEl = document.getElementById('fournisseurs-kpis');
    if (kpisEl) {
      const fourns = (Data.fournisseursListe || []).filter(f => f.actif !== false);
      // Map nom → solde
      const bal = {};
      fourns.forEach(f => bal[f.nom] = 0);
      list.forEach(fa => {
        if (bal[fa.four] !== undefined) bal[fa.four] += (Number(fa.deb)||0) - (Number(fa.cred)||0);
      });
      if (!fourns.length) {
        kpisEl.innerHTML = `
          <div class="card" style="text-align:center;padding:18px;margin-bottom:16px">
            <div style="color:var(--c-muted);font-size:13px;margin-bottom:8px">Aucun fournisseur enregistré.</div>
            <button class="btn btn-primary" onclick="Fournisseurs.openFournForm(null)"><i class="ti ti-plus"></i> Ajouter un fournisseur</button>
          </div>`;
      } else {
        kpisEl.innerHTML = '<div class="g4" style="margin-bottom:16px">' + fourns.map(f => `
          <div class="mc blue">
            <div class="mc-label blue"><i class="ti ti-truck-delivery"></i> ${this._esc(f.nom)}</div>
            <div class="mc-val blue">${Data.fmt(bal[f.nom] || 0)}</div>
            ${f.telephone ? `<div class="mc-sub">${this._esc(f.telephone)}</div>` : ''}
          </div>
        `).join('') + '</div>';
      }
    }

    const tb = document.getElementById('fourn-table');
    if (!tb) return;
    if (!list.length) { tb.innerHTML = '<tr><td colspan="9" class="empty">Aucune facture sur cette période</td></tr>'; return; }

    tb.innerHTML = list.map(f => `
      <tr>
        <td class="nowrap">${Data.fmtDs(f.date)}</td>
        <td class="fw-bold">${this._esc(f.four || '')}</td>
        <td>${this._esc(f.num || '')}</td>
        <td>${this._esc(f.lib || '')}</td>
        <td class="text-right text-red">${Data.fmts(f.deb)}</td>
        <td class="text-right text-green">${Data.fmts(f.cred)}</td>
        <td class="text-right fw-bold">${Data.fmts(f.solde)}</td>
        <td><span class="badge ${f.solde <= 0 ? 'b-green' : 'b-red'}">${f.solde <= 0 ? 'Soldé' : 'En cours'}</span></td>
        <td class="nowrap">
          ${f.id ? `<button class="btn btn-sm" title="Modifier" onclick="Fournisseurs.openModal(${f.id})">✏️</button>` : ''}
          ${f.id ? `<button class="btn btn-sm btn-danger" title="Supprimer" onclick="Fournisseurs.removeFacture(${f.id})" style="margin-left:4px">🗑</button>` : ''}
        </td>
      </tr>`).join('');
  },

  // ===================== PERSISTANCE =====================
  persist() {
    if (typeof AppDB === 'undefined') return;
    AppDB.save(this.STORAGE_FACTURE, Data.fournisseurs || []);
  },
  saveList() {
    if (typeof AppDB === 'undefined') return;
    AppDB.save(this.STORAGE_LIST, Data.fournisseursListe || []);
  },
  async restore() {
    if (typeof AppDB === 'undefined') return;
    const facts = await AppDB.load(this.STORAGE_FACTURE);
    if (Array.isArray(facts)) Data.fournisseurs = facts;
    const liste = await AppDB.load(this.STORAGE_LIST);
    if (Array.isArray(liste)) Data.fournisseursListe = liste;
    if (!Array.isArray(Data.fournisseursListe)) Data.fournisseursListe = [];
    if (!Array.isArray(Data.fournisseurs)) Data.fournisseurs = [];
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },
};
