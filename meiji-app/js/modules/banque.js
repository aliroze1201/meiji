/**
 * modules/banque.js — Compte bancaire
 */

const Banque = {
  STORAGE_KEY: 'meiji-banque',
  STORAGE_LIST: 'meiji-banques',
  editBkId: null,

  save() {
    AppDB.save(this.STORAGE_KEY, {
      solde: Data.soldes.banque,
      mvts: Data.mvtsBanque,
    });
  },

  saveList() {
    AppDB.save(this.STORAGE_LIST, Data.banques || []);
  },

  async restore() {
    const data = await AppDB.load(this.STORAGE_KEY);
    if (data) {
      if (data.solde) Data.soldes.banque = data.solde;
      if (Array.isArray(data.mvts)) Data.mvtsBanque = data.mvts;
    }
    const list = await AppDB.load(this.STORAGE_LIST);
    if (Array.isArray(list)) Data.banques = list;
  },

  saveSolde() {
    // Legacy : si l'utilisateur écrit dans le champ global (anciens écrans),
    // on conserve le comportement historique.
    const val = parseFloat(document.getElementById('inp-banque')?.value) || 0;
    Data.soldes.banque = { montant: val, date: new Date().toLocaleDateString('fr-FR') };
    document.getElementById('inp-banque').value = '';
    this.save();
    this.render();
    Dashboard.render();
    Bilan.render();
  },

  // ---------- Helpers solde par banque ----------
  // Solde "live" d'une banque = solde de référence (saisi par l'utilisateur)
  //                           + Σ mouvements 'in' sur cette banque
  //                           − Σ mouvements 'out' sur cette banque
  // Note : les mouvements 'pending' (ex. chèque émis non encore débité)
  // sont EXCLUS du calcul. Ils apparaissent dans l'historique grisés et
  // ne sont comptés qu'une fois confirmés depuis Suivi des chèques.
  soldeOfBank(bankNom) {
    const b = (Data.banques || []).find(x => x.nom === bankNom);
    const base = Number(b?.solde) || 0;
    const mvts = (Data.mvtsBanque || []).filter(m => (m.op || '') === bankNom && !m.pending);
    const inn  = mvts.filter(m => m.type === 'in').reduce((s,m) => s + (Number(m.mnt)||0), 0);
    const out  = mvts.filter(m => m.type === 'out').reduce((s,m) => s + (Number(m.mnt)||0), 0);
    return base + inn - out;
  },

  // Solde total = Σ soldes par banque + solde des mouvements sans banque attribuée
  soldeGlobal() {
    let total = (Data.banques || []).reduce((s,b) => s + this.soldeOfBank(b.nom), 0);
    // Mouvements sans `op` ou avec une banque non listée : on les ajoute aussi
    const knownNames = new Set((Data.banques || []).map(b => b.nom));
    const orphelin = (Data.mvtsBanque || []).filter(m => !m.pending && (!m.op || !knownNames.has(m.op)));
    const inn = orphelin.filter(m => m.type === 'in').reduce((s,m) => s + (Number(m.mnt)||0), 0);
    const out = orphelin.filter(m => m.type === 'out').reduce((s,m) => s + (Number(m.mnt)||0), 0);
    total += inn - out;
    // Compat : ajoute aussi le solde legacy global s'il existe
    total += Number(Data.soldes?.banque?.montant) || 0;
    return total;
  },

  // Mise à jour du solde de référence d'une banque
  saveBankSolde(id) {
    const el = document.getElementById('inp-bk-' + id);
    if (!el) return;
    const val = parseFloat(el.value);
    if (isNaN(val)) { alert('Saisis un nombre valide.'); return; }
    const b = (Data.banques || []).find(x => x.id === id);
    if (!b) return;
    const beforeSolde = b.solde;
    b.solde = val;
    b.soldeDate = new Date().toLocaleDateString('fr-FR');
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'banque',
        `Solde référence ${b.nom}`,
        `${Data.fmt(beforeSolde || 0)} → ${Data.fmt(val)}`,
        { id: b.id, before: { solde: beforeSolde }, after: { solde: val } });
    } catch (e) {}
    this.saveList();
    this.render();
    if (typeof Dashboard !== 'undefined') Dashboard.render();
    if (typeof Bilan !== 'undefined') Bilan.render();
  },

  openMvtModal() {
    const banks = (Data.banques || []).filter(b => b.actif !== false);
    const bankOpts = banks.length
      ? banks.map(b => `<option value="${this._esc(b.nom)}">${this._esc(b.nom)}</option>`).join('')
      : '<option value="" disabled>Aucune banque enregistrée — clique "Gérer banques"</option>';
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">🏦 Nouveau mouvement bancaire</div>
          <div class="mvt-type">
            <div class="mvt-btn in active" id="mvt-in-btn" onclick="Banque._setType('in')">+ Entrée</div>
            <div class="mvt-btn out" id="mvt-out-btn" onclick="Banque._setType('out')">− Sortie</div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label><input type="date" id="mvt-date" value="${Data.today()}"></div>
            <div class="fg">
              <label class="fl">Banque</label>
              <select id="mvt-op">${bankOpts}</select>
              <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
                <a href="#" onclick="App.closeModal();Banque.openListModal();return false">Gérer la liste des banques</a>
              </div>
            </div>
          </div>
          <div class="fg">
            <label class="fl">Caisse source / destination (impact cash)</label>
            <select id="mvt-caisse">
              <option value="">— Aucune (banque uniquement) —</option>
              <option value="s">🍱 SUSHI</option>
              <option value="b">🍸 BAR</option>
              <option value="c">💨 CHICHA</option>
            </select>
            <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
              <b>Entrée + caisse</b> : versement cash <i>de la caisse</i> vers la banque (le cumul cash de la caisse diminue).<br>
              <b>Sortie + caisse</b> : retrait banque vers la caisse (le cumul cash de la caisse augmente).<br>
              Laisse vide si le mouvement n'implique aucune caisse (virement, etc.).
            </div>
          </div>
          <div class="fg"><label class="fl">Libellé</label><input type="text" id="mvt-lib" placeholder="Description du mouvement..."></div>
          <div class="fg"><label class="fl">Montant (FCFA)</label><input type="number" id="mvt-mnt" placeholder="0"></div>
          <div class="fg"><label class="fl">Référence</label><input type="text" id="mvt-ref" placeholder="N° chèque, virement..."></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Banque.saveMvt()">Enregistrer</button>
          </div>
        </div>
      </div>`);
    Banque._mvtType = 'in';
  },

  _mvtType: 'in',
  _setType(t) {
    this._mvtType = t;
    document.getElementById('mvt-in-btn').className = 'mvt-btn in' + (t === 'in' ? ' active' : '');
    document.getElementById('mvt-out-btn').className = 'mvt-btn out' + (t === 'out' ? ' active' : '');
  },

  saveMvt() {
    const caisseRaw = document.getElementById('mvt-caisse')?.value || '';
    const mvt = {
      id: Data.newId(),
      date: document.getElementById('mvt-date')?.value,
      lib: document.getElementById('mvt-lib')?.value,
      op: document.getElementById('mvt-op')?.value,
      mnt: parseFloat(document.getElementById('mvt-mnt')?.value) || 0,
      type: this._mvtType,
      ref: document.getElementById('mvt-ref')?.value,
      caisse: ['s','b','c'].includes(caisseRaw) ? caisseRaw : null,
    };
    if (!mvt.lib || !mvt.mnt) { alert('Libellé et montant requis'); return; }
    Data.mvtsBanque.unshift(mvt);
    try {
      if (typeof Audit !== 'undefined') Audit.log('create', 'banque',
        `Mvt ${mvt.type === 'in' ? '+' : '−'} ${mvt.op || ''} · ${mvt.lib}`,
        `${Data.fmt(mvt.mnt)} · ${mvt.type === 'in' ? 'entrée' : 'sortie'}${mvt.caisse ? ' · caisse ' + mvt.caisse : ''}`,
        { id: mvt.id, after: mvt });
    } catch (e) {}
    this.save();
    App.closeModal();
    this.render();
    Dashboard.render();
    Bilan.render();
  },

  render() {
    const list = App.filterByDate(Data.mvtsBanque);
    const totalIn = list.filter(m => m.type === 'in').reduce((s,m) => s + m.mnt, 0);
    const totalOut = list.filter(m => m.type === 'out').reduce((s,m) => s + m.mnt, 0);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('banque-solde', Data.fmt(this.soldeGlobal()));
    set('banque-in', Data.fmt(totalIn));
    set('banque-out', Data.fmt(totalOut));
    set('banque-nb', list.length);

    // Grille de cartes par banque
    const grid = document.getElementById('banques-grid');
    if (grid) {
      const banks = (Data.banques || []).filter(b => b.actif !== false);
      if (!banks.length) {
        grid.innerHTML = `
          <div class="card" style="text-align:center;padding:18px;margin-bottom:16px">
            <div style="color:var(--c-muted);font-size:13px;margin-bottom:8px">Aucune banque enregistrée.</div>
            <button class="btn btn-primary" onclick="Banque.openListModal()"><i class="ti ti-plus"></i> Ajouter une banque</button>
          </div>`;
      } else {
        grid.innerHTML = '<div class="g3" style="margin-bottom:16px">' + banks.map(b => {
          const live = this.soldeOfBank(b.nom);
          const base = Number(b.solde) || 0;
          const mvts = (Data.mvtsBanque || []).filter(m => (m.op || '') === b.nom);
          const inn = mvts.filter(m => m.type === 'in').reduce((s,m) => s + (Number(m.mnt)||0), 0);
          const out = mvts.filter(m => m.type === 'out').reduce((s,m) => s + (Number(m.mnt)||0), 0);
          return `
            <div class="card" style="padding:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <span style="font-weight:700;font-size:15px;color:var(--c-sushi)"><i class="ti ti-building-bank"></i> ${this._esc(b.nom)}</span>
                <button class="btn btn-ghost" style="padding:4px 8px" onclick="Banque.openBankForm(${b.id})" title="Modifier"><i class="ti ti-edit"></i></button>
              </div>
              <div style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--c-sushi);font-variant-numeric:tabular-nums">${Data.fmt(live)}</div>
              <div style="font-size:11px;color:var(--c-muted);margin-bottom:10px">
                Référence : ${Data.fmt(base)}${b.soldeDate ? ' · ' + b.soldeDate : ''}<br>
                + ${Data.fmts(inn)} entrées · − ${Data.fmts(out)} sorties
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="number" id="inp-bk-${b.id}" placeholder="Nouveau solde de référence..." style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--c-border);background:var(--c-surface);font-size:13px">
                <button class="btn btn-primary btn-sm" onclick="Banque.saveBankSolde(${b.id})"><i class="ti ti-check"></i></button>
              </div>
            </div>`;
        }).join('') + '</div>';
      }
    }

    const tb = document.getElementById('banque-table');
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="8" class="empty">Aucun mouvement sur cette période.</td></tr>';
      return;
    }
    let solde = this.soldeGlobal();
    const caisseLabel = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' };
    tb.innerHTML = list.map(m => {
      const s = solde;
      if (!m.pending) solde -= (m.type === 'in' ? m.mnt : -m.mnt);
      const cBadge = m.caisse
        ? `<span class="badge ${m.caisse==='s'?'b-blue':m.caisse==='b'?'b-green':'b-amber'}" title="Impact cumul cash">${caisseLabel[m.caisse]}</span>`
        : '<span style="color:var(--c-muted);font-size:11px">—</span>';
      const lockIcon = m.relPrelv
        ? ' <i class="ti ti-lock" title="Lié à un prélèvement associé — supprime-le depuis la page Associés" style="color:var(--c-warning);font-size:13px"></i>'
        : '';
      const pendBadge = m.pending
        ? ' <span class="badge b-amber" title="En attente de confirmation depuis Suivi chèques">⏳ Pending</span>'
        : '';
      const rowStyle = m.pending ? 'style="opacity:0.55"' : '';
      const soldeCell = m.pending
        ? '<span class="text-muted" style="font-style:italic">—</span>'
        : Data.fmts(s) + ' FCFA';
      return `<tr ${rowStyle}>
        <td class="nowrap">${Data.fmtDs(m.date)}</td>
        <td>${this._esc(m.lib || '')}${lockIcon}${pendBadge}</td>
        <td style="color:#aaa">${this._esc(m.op || '-')}</td>
        <td>${cBadge}</td>
        <td class="text-right text-green fw-bold">${m.type === 'in' ? '+' + Data.fmts(m.mnt) + ' FCFA' : '-'}</td>
        <td class="text-right text-red fw-bold">${m.type === 'out' ? '-' + Data.fmts(m.mnt) + ' FCFA' : '-'}</td>
        <td class="text-right fw-bold">${soldeCell}</td>
        <td class="nowrap">
          <button class="btn btn-sm btn-danger" title="Supprimer ce mouvement" onclick="Banque.removeMvt(${m.id})"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  },

  // Supprimer un mouvement bancaire
  removeMvt(id) {
    const m = (Data.mvtsBanque || []).find(x => x.id === id);
    if (!m) return;
    if (m.relPrelv) {
      alert('🔒 Ce mouvement est lié à un prélèvement associé.\n\nPour le supprimer, va sur la page Associés et supprime le prélèvement correspondant — le mouvement bancaire disparaîtra automatiquement.');
      return;
    }
    if (m.relCheque) {
      alert('🔒 Ce mouvement est lié à un chèque émis.\n\nPour l\'annuler, va sur la page Suivi des chèques et marque le chèque comme « Rejeté » ou supprime-le — le mouvement bancaire disparaîtra automatiquement.');
      return;
    }
    const lbl = `${Data.fmtDs(m.date)} · ${m.lib || ''} · ${Data.fmt(m.mnt)} (${m.type === 'in' ? '+' : '−'})`;
    if (!confirm('Supprimer ce mouvement bancaire ?\n\n' + lbl + '\n\nCette action est irréversible.')) return;
    Data.mvtsBanque = Data.mvtsBanque.filter(x => x.id !== id);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'banque',
        `Mvt ${m.op || ''} · ${m.lib || ''}`,
        `${Data.fmt(m.mnt)} · ${m.type === 'in' ? 'entrée' : 'sortie'}`,
        { id: m.id, before: m });
    } catch (e) {}
    this.save();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
    else this.render();
  },

  // ===================== GESTION DE LA LISTE DES BANQUES =====================
  openListModal() {
    if (!Array.isArray(Data.banques)) Data.banques = [];
    const rows = Data.banques.length
      ? Data.banques.map(b => `
          <tr>
            <td><b>${this._esc(b.nom)}</b></td>
            <td>${b.actif === false ? '<span class="badge b-red">Inactive</span>' : '<span class="badge b-green">Active</span>'}</td>
            <td>${this._esc(b.observation || '')}</td>
            <td class="nowrap">
              <button class="btn btn-sm" onclick="Banque.openBankForm(${b.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="Banque.removeBank(${b.id})" style="margin-left:4px">🗑</button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="4" class="empty">Aucune banque enregistrée</td></tr>';
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:640px">
          <div class="modal-title">🏦 Gérer les banques</div>
          <div style="font-size:13px;color:var(--c-muted);margin-bottom:10px">
            Les banques de cette liste apparaissent comme choix dans le formulaire « Nouveau mouvement ».
          </div>
          <div style="margin-bottom:12px">
            <button class="btn btn-primary" onclick="Banque.openBankForm(null)"><i class="ti ti-plus"></i> Nouvelle banque</button>
          </div>
          <table>
            <thead><tr><th>Nom</th><th>Statut</th><th>Observation</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="modal-actions" style="margin-top:16px">
            <button class="btn btn-primary" onclick="App.closeModal()">Fermer</button>
          </div>
        </div>
      </div>`);
  },

  openBankForm(id) {
    this.editBkId = id;
    const b = id ? (Data.banques || []).find(x => x.id === id) : null;
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${id ? 'Modifier banque' : 'Nouvelle banque'}</div>
          <div class="fg"><label class="fl">Nom *</label>
            <input type="text" id="bk-nom" value="${this._esc(b?.nom || '')}" placeholder="Ex: LCBG, BCI, Ecobank...">
          </div>
          <div class="fg"><label class="fl">Observation</label>
            <input type="text" id="bk-obs" value="${this._esc(b?.observation || '')}" placeholder="N° de compte, agence...">
          </div>
          <div class="fg"><label class="fl">Solde de référence (FCFA)</label>
            <input type="number" id="bk-solde" value="${b?.solde != null ? b.solde : ''}" placeholder="0">
            <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
              Point de départ du calcul. Les entrées et sorties suivantes s'ajoutent automatiquement.
              ${b?.soldeDate ? 'Dernière mise à jour : ' + this._esc(b.soldeDate) : ''}
            </div>
          </div>
          <div class="fg" style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="bk-actif" ${b?.actif === false ? '' : 'checked'} style="width:auto">
            <label for="bk-actif" style="margin:0">Banque active (visible dans les menus déroulants)</label>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="Banque.openListModal()">Retour à la liste</button>
            <button class="btn btn-primary" onclick="Banque.saveBank()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  saveBank() {
    const nom = (document.getElementById('bk-nom')?.value || '').trim();
    if (!nom) { alert('Nom de banque requis.'); return; }
    const observation = (document.getElementById('bk-obs')?.value || '').trim() || null;
    const actif = !!document.getElementById('bk-actif')?.checked;
    const soldeRaw = document.getElementById('bk-solde')?.value;
    const solde = soldeRaw !== '' && soldeRaw != null ? parseFloat(soldeRaw) : 0;
    const soldeDate = soldeRaw !== '' && soldeRaw != null ? new Date().toLocaleDateString('fr-FR') : null;
    if (!Array.isArray(Data.banques)) Data.banques = [];
    if (this.editBkId) {
      const b = Data.banques.find(x => x.id === this.editBkId);
      if (b) {
        // Ne mettre à jour soldeDate que si la valeur a changé
        const before = { ...b };
        const update = { nom, observation, actif, solde };
        if (b.solde !== solde) update.soldeDate = soldeDate || b.soldeDate;
        Object.assign(b, update);
        try {
          if (typeof Audit !== 'undefined') Audit.log('update', 'banque',
            `Banque ${nom}`,
            `Solde de référence : ${Data.fmt(solde)}`,
            { id: b.id, before, after: { ...b } });
        } catch (e) {}
      }
    } else {
      const id = Data.newId();
      Data.banques.push({ id, nom, observation, actif, solde, soldeDate });
      try {
        if (typeof Audit !== 'undefined') Audit.log('create', 'banque',
          `Banque ${nom}`,
          `Création · solde initial ${Data.fmt(solde)}`,
          { id });
      } catch (e) {}
    }
    this.editBkId = null;
    this.saveList();
    this.openListModal();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
  },

  removeBank(id) {
    const b = (Data.banques || []).find(x => x.id === id);
    if (!b) return;
    if (!confirm(`Supprimer la banque « ${b.nom} » ?\n\nLes mouvements existants liés à cette banque conservent son nom (libre), seule la liste de choix est nettoyée.`)) return;
    Data.banques = Data.banques.filter(x => x.id !== id);
    this.saveList();
    this.openListModal();
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },
};
