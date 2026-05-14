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
    const val = parseFloat(document.getElementById('inp-banque')?.value) || 0;
    Data.soldes.banque = { montant: val, date: new Date().toLocaleDateString('fr-FR') };
    document.getElementById('inp-banque').value = '';
    this.save();
    this.render();
    Dashboard.render();
    Bilan.render();
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
    set('banque-solde', Data.fmt(Data.soldes.banque.montant));
    set('banque-update', Data.soldes.banque.date ? 'Mis à jour le ' + Data.soldes.banque.date : 'Non renseigné');
    set('banque-in', Data.fmt(totalIn));
    set('banque-out', Data.fmt(totalOut));
    set('banque-nb', list.length);

    const tb = document.getElementById('banque-table');
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="7" class="empty">Aucun mouvement sur cette période.</td></tr>';
      return;
    }
    let solde = Data.soldes.banque.montant;
    const caisseLabel = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' };
    tb.innerHTML = list.map(m => {
      const s = solde;
      solde -= (m.type === 'in' ? m.mnt : -m.mnt);
      const cBadge = m.caisse
        ? `<span class="badge ${m.caisse==='s'?'b-blue':m.caisse==='b'?'b-green':'b-amber'}" title="Impact cumul cash">${caisseLabel[m.caisse]}</span>`
        : '<span style="color:var(--c-muted);font-size:11px">—</span>';
      return `<tr>
        <td class="nowrap">${Data.fmtDs(m.date)}</td>
        <td>${m.lib}</td>
        <td style="color:#aaa">${m.op || '-'}</td>
        <td>${cBadge}</td>
        <td class="text-right text-green fw-bold">${m.type === 'in' ? '+' + Data.fmts(m.mnt) + ' FCFA' : '-'}</td>
        <td class="text-right text-red fw-bold">${m.type === 'out' ? '-' + Data.fmts(m.mnt) + ' FCFA' : '-'}</td>
        <td class="text-right fw-bold">${Data.fmts(s)} FCFA</td>
      </tr>`;
    }).join('');
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
    if (!Array.isArray(Data.banques)) Data.banques = [];
    if (this.editBkId) {
      const b = Data.banques.find(x => x.id === this.editBkId);
      if (b) Object.assign(b, { nom, observation, actif });
    } else {
      Data.banques.push({ id: Data.newId(), nom, observation, actif });
    }
    this.editBkId = null;
    this.saveList();
    this.openListModal();
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
