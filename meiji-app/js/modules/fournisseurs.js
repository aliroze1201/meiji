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
    const wasEdit = !!this.editId;
    let savedId = this.editId;
    if (this.editId) {
      const f = Data.fournisseursListe.find(x => x.id === this.editId);
      if (f) Object.assign(f, { nom, contact, telephone, observation, actif });
    } else {
      savedId = Data.newId();
      Data.fournisseursListe.push({ id: savedId, nom, contact, telephone, observation, actif });
    }
    try {
      if (typeof Audit !== 'undefined') Audit.log(wasEdit ? 'update' : 'create', 'fournisseurs',
        `Fournisseur ${nom}`,
        contact || telephone || (actif ? 'actif' : 'inactif'),
        { id: savedId });
    } catch (e) {}
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
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'fournisseurs',
        `Fournisseur ${f.nom}`,
        null,
        { id: f.id, before: f });
    } catch (e) {}
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
    const wasEdit = !!this.editFactureId;
    let savedId = this.editFactureId;
    if (this.editFactureId) {
      const idx = Data.fournisseurs.findIndex(f => f.id === this.editFactureId);
      if (idx >= 0) Data.fournisseurs[idx] = { ...Data.fournisseurs[idx], ...payload };
    } else {
      savedId = Data.newId();
      Data.fournisseurs.unshift({ id: savedId, ...payload });
    }
    try {
      if (typeof Audit !== 'undefined') Audit.log(wasEdit ? 'update' : 'create', 'fournisseurs',
        `Facture ${payload.four || ''} · ${payload.num || ''}`,
        `Débit ${Data.fmt(payload.deb || 0)} · solde ${Data.fmt(payload.solde || 0)}`,
        { id: savedId, after: payload });
    } catch (e) {}
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
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'fournisseurs',
        `Facture ${f.four || ''} · ${f.num || ''}`,
        `${Data.fmt((f.deb || 0) - (f.cred || 0))} (solde)`,
        { id: f.id, before: f });
    } catch (e) {}
    this.persist();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
    else this.render();
  },

  // ===================== RÈGLEMENT FOURNISSEUR =====================
  openReglement(factureId) {
    const fa = (Data.fournisseurs || []).find(x => x.id === factureId);
    if (!fa) return;
    const restant = Math.max(0, (Number(fa.deb)||0) - (Number(fa.cred)||0));
    if (restant <= 0) {
      alert('Cette facture est déjà soldée.');
      return;
    }
    this._reglementFactureId = factureId;
    const banks = (Data.banques || []).filter(b => b.actif !== false);
    const ops   = (Data.operateursMobile || []).filter(o => o.actif !== false);
    const bankOpts = banks.length
      ? banks.map(b => `<option value="${this._esc(b.nom)}">${this._esc(b.nom)}</option>`).join('')
      : '<option value="" disabled>Aucune banque — gère depuis Banque</option>';
    const opOpts = ops.length
      ? ops.map(o => `<option value="${this._esc(o.nom)}">${this._esc(o.nom)}</option>`).join('')
      : '<option value="" disabled>Aucun opérateur — gère depuis Mobile Money</option>';

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:580px">
          <div class="modal-title">💳 Règlement facture · ${this._esc(fa.four || '')}</div>
          <div style="font-size:12px;color:var(--c-muted);margin-bottom:10px">
            Facture ${this._esc(fa.num || '')} · Solde restant à régler : <b style="color:var(--c-text)">${Data.fmt(restant)}</b>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Date du règlement</label>
              <input type="date" id="reg-date" value="${Data.today()}"></div>
            <div class="fg"><label class="fl">Montant (FCFA) *</label>
              <input type="number" id="reg-mnt" value="${restant}" min="1" step="100"></div>
          </div>
          <div class="fg"><label class="fl">Mode de règlement</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="reg-mode" value="esp" checked onchange="Fournisseurs._onRegMode()"> 💵 Espèces
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="reg-mode" value="banque" onchange="Fournisseurs._onRegMode()"> 🏦 Banque
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="reg-mode" value="mobile" onchange="Fournisseurs._onRegMode()"> 📱 Mobile
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="reg-mode" value="cheque" onchange="Fournisseurs._onRegMode()"> 🧾 Chèque
              </label>
            </div>
          </div>

          <!-- Espèces : caisse impactée -->
          <div class="fg" id="reg-row-esp">
            <label class="fl">Caisse impactée (cash)</label>
            <select id="reg-caisse">
              <option value="b">🍸 BAR</option>
              <option value="s">🍱 SUSHI</option>
              <option value="c">💨 CHICHA</option>
            </select>
          </div>

          <!-- Banque -->
          <div class="fg" id="reg-row-bk" style="display:none">
            <label class="fl">Banque à débiter *</label>
            <select id="reg-bk">${bankOpts}</select>
          </div>

          <!-- Mobile -->
          <div class="fg" id="reg-row-mb" style="display:none">
            <label class="fl">Opérateur Mobile *</label>
            <select id="reg-mb">${opOpts}</select>
          </div>

          <!-- Chèque -->
          <div id="reg-row-chq" style="display:none">
            <div class="fr">
              <div class="fg"><label class="fl">N° du chèque *</label>
                <input type="text" id="reg-chq-num" placeholder="0000000"></div>
              <div class="fg"><label class="fl">Banque tirée *</label>
                <select id="reg-chq-bk">${bankOpts}</select></div>
            </div>
            <div style="font-size:11px;color:var(--c-warning);margin-bottom:8px">
              <i class="ti ti-info-circle"></i> Le chèque sera créé dans <b>Suivi des chèques</b> (statut « En attente »).
              Un mouvement <b>« Pending »</b> apparaîtra dans Banque mais <b>n'affectera pas le solde</b>
              tant que tu ne l'auras pas marqué « Encaissé » dans Suivi.
            </div>
          </div>

          <div class="fg"><label class="fl">Observation</label>
            <input type="text" id="reg-obs" placeholder="N° pièce, note..."></div>

          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Fournisseurs.saveReglement()"><i class="ti ti-check"></i> Enregistrer le règlement</button>
          </div>
        </div>
      </div>`);
  },

  _onRegMode() {
    const sel = document.querySelector('input[name="reg-mode"]:checked');
    const v = sel ? sel.value : 'esp';
    const ids = ['reg-row-esp', 'reg-row-bk', 'reg-row-mb', 'reg-row-chq'];
    const map = { esp: 'reg-row-esp', banque: 'reg-row-bk', mobile: 'reg-row-mb', cheque: 'reg-row-chq' };
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = id === map[v] ? '' : 'none';
    });
  },

  saveReglement() {
    const factureId = this._reglementFactureId;
    const fa = (Data.fournisseurs || []).find(x => x.id === factureId);
    if (!fa) { App.closeModal(); return; }

    const date    = document.getElementById('reg-date')?.value || Data.today();
    const montant = parseFloat(document.getElementById('reg-mnt')?.value);
    const obs     = (document.getElementById('reg-obs')?.value || '').trim() || null;
    const modeRadio = document.querySelector('input[name="reg-mode"]:checked');
    const mode = modeRadio ? modeRadio.value : 'esp';
    if (isNaN(montant) || montant <= 0) { alert('Montant invalide.'); return; }

    const fourNom = fa.four || 'Fournisseur';
    const refFact = fa.num ? ` (${fa.num})` : '';

    if (mode === 'esp') {
      const caisseRaw = document.getElementById('reg-caisse')?.value || 'b';
      const caisse = ['s','b','c'].includes(caisseRaw) ? caisseRaw : 'b';
      const deptMap = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' };
      if (!Array.isArray(Data.histDep)) Data.histDep = [];
      Data.histDep.push({
        userId: Data.newId(),
        date, dept: deptMap[caisse],
        label: `Règlement ${fourNom}${refFact}`,
        groupe: 'Fournisseurs',
        qte: null, prix: null,
        montant, observation: obs,
        paiement: 'esp',
        relFacture: factureId,
      });
      if (typeof Depenses !== 'undefined' && Depenses.persist) Depenses.persist();
    }
    else if (mode === 'banque') {
      const bk = document.getElementById('reg-bk')?.value;
      if (!bk) { alert('Choisis la banque à débiter.'); return; }
      if (!Array.isArray(Data.mvtsBanque)) Data.mvtsBanque = [];
      Data.mvtsBanque.unshift({
        id: Data.newId(),
        date,
        lib: `Règlement ${fourNom}${refFact}`,
        op: bk,
        mnt: montant,
        type: 'out',
        ref: obs || '',
        caisse: null,
        relFacture: factureId,
      });
      if (typeof Banque !== 'undefined' && Banque.save) Banque.save();
    }
    else if (mode === 'mobile') {
      const op = document.getElementById('reg-mb')?.value;
      if (!op) { alert('Choisis l\'opérateur Mobile.'); return; }
      if (!Array.isArray(Data.mvtsMobile)) Data.mvtsMobile = [];
      Data.mvtsMobile.unshift({
        id: Data.newId(),
        date,
        lib: `Règlement ${fourNom}${refFact}`,
        op,
        mnt: montant,
        type: 'out',
        ref: obs || '',
        caisse: null,
        relFacture: factureId,
      });
      if (typeof Mobile !== 'undefined' && Mobile.save) Mobile.save();
    }
    else if (mode === 'cheque') {
      const num = (document.getElementById('reg-chq-num')?.value || '').trim();
      const bk  = document.getElementById('reg-chq-bk')?.value;
      if (!num) { alert('N° de chèque requis.'); return; }
      if (!bk)  { alert('Banque tirée requise.'); return; }
      if (!Array.isArray(Data.cheques)) Data.cheques = [];
      if (!Array.isArray(Data.mvtsBanque)) Data.mvtsBanque = [];

      const chequeId = Data.newId();
      Data.cheques.push({
        id: chequeId,
        sens: 'emis',                  // chèque ÉMIS au fournisseur (vs reçu d'un client)
        date,
        dept: 'BAR',                   // valeur par défaut (champ pas pertinent pour émis)
        numero: num,
        banque: bk,
        tireur: fourNom,               // = bénéficiaire pour un chèque émis
        montant,
        notes: obs || `Règlement facture ${fa.num || ''}`.trim(),
        statut: 'attente',
        dateDepot: null,
        dateEncaissement: null,
        relFacture: factureId,
      });
      // Mouvement banque MIRROIR, PENDING jusqu'à confirmation dans Suivi
      Data.mvtsBanque.unshift({
        id: Data.newId(),
        date,
        lib: `Chèque ${num} · ${fourNom}${refFact}`,
        op: bk,
        mnt: montant,
        type: 'out',
        ref: num,
        caisse: null,
        relCheque: chequeId,           // lien vers le chèque
        relFacture: factureId,
        pending: true,                 // n'impacte PAS le solde tant que pending
      });
      if (typeof Suivi  !== 'undefined' && Suivi.persist)  Suivi.persist();
      if (typeof Banque !== 'undefined' && Banque.save)    Banque.save();
    }

    // Mise à jour de la facture : on crédite le montant réglé
    fa.cred = (Number(fa.cred) || 0) + montant;
    fa.solde = (Number(fa.deb) || 0) - fa.cred;
    if (!Array.isArray(fa.reglements)) fa.reglements = [];
    fa.reglements.push({ id: Data.newId(), date, montant, mode, obs });
    try {
      if (typeof Audit !== 'undefined') Audit.log('create', 'reglements-fournisseur',
        `Règlement ${fa.four || ''} · ${fa.num || ''}`,
        `${Data.fmt(montant)} · mode ${mode}`,
        { factureId, mode, montant, date });
    } catch (e) {}
    this.persist();

    App.closeModal();
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

      // Total des dettes en cours (factures non soldées sur la période filtrée)
      let totalDettes = 0;
      let nbDettes = 0;
      list.forEach(fa => {
        const s = Number(fa.solde) || 0;
        if (s > 0) { totalDettes += s; nbDettes++; }
      });
      const totalTile = `
        <div class="mc red" style="margin-bottom:16px">
          <div class="mc-label red"><i class="ti ti-alert-triangle"></i> Total dettes en cours</div>
          <div class="mc-val red">${Data.fmt(totalDettes)}</div>
          <div class="mc-sub">${nbDettes} facture${nbDettes > 1 ? 's' : ''} non soldée${nbDettes > 1 ? 's' : ''}</div>
        </div>`;

      if (!fourns.length) {
        kpisEl.innerHTML = totalTile + `
          <div class="card" style="text-align:center;padding:18px;margin-bottom:16px">
            <div style="color:var(--c-muted);font-size:13px;margin-bottom:8px">Aucun fournisseur enregistré.</div>
            <button class="btn btn-primary" onclick="Fournisseurs.openFournForm(null)"><i class="ti ti-plus"></i> Ajouter un fournisseur</button>
          </div>`;
      } else {
        kpisEl.innerHTML = totalTile + '<div class="g4" style="margin-bottom:16px">' + fourns.map(f => `
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

    // Séparation : les factures non soldées (« en cours ») restent en haut,
    // les factures totalement réglées (« soldées ») basculent en bas.
    const enCours = list.filter(f => (Number(f.solde) || 0) > 0);
    const soldees = list.filter(f => (Number(f.solde) || 0) <= 0);

    let html = '';
    if (enCours.length && soldees.length) {
      html += `<tr class="fourn-sep"><td colspan="9"><i class="ti ti-clock"></i> En cours (${enCours.length})</td></tr>`;
    }
    html += enCours.map(f => this._factureRows(f)).join('');
    if (soldees.length) {
      html += `<tr class="fourn-sep fourn-sep-done"><td colspan="9"><i class="ti ti-circle-check"></i> Réglées (${soldees.length})</td></tr>`;
      html += soldees.map(f => this._factureRows(f)).join('');
    }
    tb.innerHTML = html;
  },

  // Construit la ligne d'une facture + sa ligne « déroulante » de détail des règlements.
  _factureRows(f) {
    const solde = Number(f.solde) || 0;
    const regBtn = f.id && solde > 0
      ? `<button class="btn btn-sm btn-success" title="Régler la facture" onclick="Fournisseurs.openReglement(${f.id})"><i class="ti ti-credit-card"></i> Régler</button>`
      : '';
    const regs = Array.isArray(f.reglements) ? f.reglements : [];
    const nb = regs.length;
    const payToggle = (f.id && nb)
      ? `<button class="btn btn-sm fourn-pay-toggle" id="fpay-btn-${f.id}" title="Voir le détail des paiements" onclick="Fournisseurs.togglePayments(${f.id})"><i class="ti ti-chevron-right"></i> ${nb} paiement${nb > 1 ? 's' : ''}</button>`
      : '';
    const mainRow = `
      <tr data-search-id="four:${this._esc(f.four || '')}">
        <td class="nowrap">${Data.fmtDs(f.date)}</td>
        <td class="fw-bold">${this._esc(f.four || '')}</td>
        <td>${this._esc(f.num || '')}${payToggle ? `<div style="margin-top:4px">${payToggle}</div>` : ''}</td>
        <td>${this._esc(f.lib || '')}</td>
        <td class="text-right text-red">${Data.fmts(f.deb)}</td>
        <td class="text-right text-green">${Data.fmts(f.cred)}</td>
        <td class="text-right fw-bold">${Data.fmts(f.solde)}</td>
        <td><span class="badge ${solde <= 0 ? 'b-green' : 'b-red'}">${solde <= 0 ? 'Soldé' : 'En cours'}</span></td>
        <td class="nowrap">
          ${regBtn}
          ${f.id ? `<button class="btn btn-sm" title="Modifier" onclick="Fournisseurs.openModal(${f.id})" style="margin-left:4px">✏️</button>` : ''}
          ${f.id ? `<button class="btn btn-sm btn-danger" title="Supprimer" onclick="Fournisseurs.removeFacture(${f.id})" style="margin-left:4px">🗑</button>` : ''}
        </td>
      </tr>`;
    if (!f.id || !nb) return mainRow;

    const modeLabels = { esp: '💵 Espèces', banque: '🏦 Banque', mobile: '📱 Mobile', cheque: '🧾 Chèque' };
    const totalPaye = regs.reduce((s, r) => s + (Number(r.montant) || 0), 0);
    const payRows = regs.slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map(r => `
        <tr>
          <td class="nowrap">${Data.fmtD(r.date)}</td>
          <td class="text-right text-green fw-bold">${Data.fmt(r.montant)}</td>
          <td>${modeLabels[r.mode] || this._esc(r.mode || '')}</td>
          <td>${this._esc(r.obs || '')}</td>
        </tr>`).join('');
    const detailRow = `
      <tr class="fourn-pay-row" id="fpay-${f.id}" style="display:none">
        <td colspan="9">
          <div class="fourn-pay-box">
            <div class="fourn-pay-head">🧾 Détail des règlements — ${this._esc(f.four || '')}${f.num ? ` · ${this._esc(f.num)}` : ''}</div>
            <table class="fourn-pay-table">
              <thead><tr><th>Date</th><th class="text-right">Montant</th><th>Mode</th><th>Observation</th></tr></thead>
              <tbody>${payRows}</tbody>
              <tfoot><tr><td class="fw-bold">Total réglé</td><td class="text-right fw-bold text-green">${Data.fmt(totalPaye)}</td><td colspan="2"></td></tr></tfoot>
            </table>
          </div>
        </td>
      </tr>`;
    return mainRow + detailRow;
  },

  // Ouvre / referme la ligne déroulante des paiements d'une facture.
  togglePayments(id) {
    const row = document.getElementById('fpay-' + id);
    const btn = document.getElementById('fpay-btn-' + id);
    if (!row) return;
    const open = row.style.display === 'none';
    row.style.display = open ? '' : 'none';
    const icon = btn && btn.querySelector('i');
    if (icon) icon.className = open ? 'ti ti-chevron-down' : 'ti ti-chevron-right';
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

    // Migration : assigne un id aux anciennes factures qui n'en ont pas et
    // recalcule le solde si manquant. Re-sauvegarde si on a touché.
    let dirty = false;
    Data.fournisseurs.forEach(f => {
      if (!f.id) { f.id = Data.newId(); dirty = true; }
      if (f.solde == null) {
        f.solde = (Number(f.deb) || 0) - (Number(f.cred) || 0);
        dirty = true;
      }
    });
    if (dirty && typeof AppDB !== 'undefined') {
      AppDB.save(this.STORAGE_FACTURE, Data.fournisseurs);
    }

    // Idem pour la liste des fournisseurs (assure un id à chaque entrée)
    let dirtyList = false;
    Data.fournisseursListe.forEach(f => {
      if (!f.id) { f.id = Data.newId(); dirtyList = true; }
    });
    if (dirtyList && typeof AppDB !== 'undefined') {
      AppDB.save(this.STORAGE_LIST, Data.fournisseursListe);
    }
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },
};
