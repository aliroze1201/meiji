/**
 * modules/mobile.js — Mobile Money
 */

const Mobile = {
  STORAGE_KEY: 'meiji-mobile',
  STORAGE_LIST: 'meiji-operateurs-mobile',
  editOpId: null,

  save() {
    AppDB.save(this.STORAGE_KEY, {
      solde: Data.soldes.mobile,
      mvts: Data.mvtsMobile,
    });
  },

  saveList() {
    AppDB.save(this.STORAGE_LIST, Data.operateursMobile || []);
  },

  async restore() {
    const data = await AppDB.load(this.STORAGE_KEY);
    if (data) {
      if (data.solde) Data.soldes.mobile = data.solde;
      if (Array.isArray(data.mvts)) Data.mvtsMobile = data.mvts;
    }
    const list = await AppDB.load(this.STORAGE_LIST);
    if (Array.isArray(list)) Data.operateursMobile = list;
  },

  saveSolde() {
    const val = parseFloat(document.getElementById('inp-mobile')?.value) || 0;
    Data.soldes.mobile = { montant: val, date: new Date().toLocaleDateString('fr-FR') };
    document.getElementById('inp-mobile').value = '';
    this.save();
    this.render();
    Dashboard.render();
    Bilan.render();
  },

  openMvtModal() {
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">📱 Nouveau mouvement Mobile Money</div>
          <div class="mvt-type">
            <div class="mvt-btn in active" id="mmvt-in-btn" onclick="Mobile._setType('in')">+ Entrée</div>
            <div class="mvt-btn out" id="mmvt-out-btn" onclick="Mobile._setType('out')">− Sortie</div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label><input type="date" id="mmvt-date" value="${Data.today()}"></div>
            <div class="fg">
              <label class="fl">Opérateur</label>
              <select id="mmvt-op">${(() => {
                const ops = (Data.operateursMobile || []).filter(o => o.actif !== false);
                return ops.length
                  ? ops.map(o => `<option value="${this._esc(o.nom)}">${this._esc(o.nom)}</option>`).join('')
                  : '<option value="" disabled>Aucun opérateur — clique "Gérer opérateurs"</option>';
              })()}</select>
              <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
                <a href="#" onclick="App.closeModal();Mobile.openListModal();return false">Gérer la liste des opérateurs</a>
              </div>
            </div>
          </div>
          <div class="fg">
            <label class="fl">Caisse source / destination (impact cash)</label>
            <select id="mmvt-caisse">
              <option value="">— Aucune (mobile uniquement) —</option>
              <option value="s">🍱 SUSHI</option>
              <option value="b">🍸 BAR</option>
              <option value="c">💨 CHICHA</option>
            </select>
            <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
              <b>Entrée + caisse</b> : versement cash de la caisse vers mobile money (cumul cash de la caisse ↓).<br>
              <b>Sortie + caisse</b> : retrait mobile vers la caisse (cumul cash ↑).
            </div>
          </div>
          <div class="fg"><label class="fl">Libellé</label><input type="text" id="mmvt-lib" placeholder="Description du mouvement..."></div>
          <div class="fg"><label class="fl">Montant (FCFA)</label><input type="number" id="mmvt-mnt" placeholder="0"></div>
          <div class="fg"><label class="fl">N° Transaction</label><input type="text" id="mmvt-ref" placeholder="Référence transaction..."></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Mobile.saveMvt()">Enregistrer</button>
          </div>
        </div>
      </div>`);
    Mobile._mvtType = 'in';
  },

  _mvtType: 'in',
  _setType(t) {
    this._mvtType = t;
    document.getElementById('mmvt-in-btn').className = 'mvt-btn in' + (t === 'in' ? ' active' : '');
    document.getElementById('mmvt-out-btn').className = 'mvt-btn out' + (t === 'out' ? ' active' : '');
  },

  saveMvt() {
    const caisseRaw = document.getElementById('mmvt-caisse')?.value || '';
    const mvt = {
      id: Data.newId(),
      date: document.getElementById('mmvt-date')?.value,
      lib: document.getElementById('mmvt-lib')?.value,
      op: document.getElementById('mmvt-op')?.value,
      mnt: parseFloat(document.getElementById('mmvt-mnt')?.value) || 0,
      type: this._mvtType,
      ref: document.getElementById('mmvt-ref')?.value,
      caisse: ['s','b','c'].includes(caisseRaw) ? caisseRaw : null,
    };
    if (!mvt.lib || !mvt.mnt) { alert('Libellé et montant requis'); return; }
    Data.mvtsMobile.unshift(mvt);
    this.save();
    App.closeModal();
    this.render();
    Dashboard.render();
    Bilan.render();
  },

  render() {
    const list = App.filterByDate(Data.mvtsMobile);
    const totalIn = list.filter(m => m.type === 'in').reduce((s,m) => s + m.mnt, 0);
    const totalOut = list.filter(m => m.type === 'out').reduce((s,m) => s + m.mnt, 0);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('mobile-solde', Data.fmt(Data.soldes.mobile.montant));
    set('mobile-update', Data.soldes.mobile.date ? 'Mis à jour le ' + Data.soldes.mobile.date : 'Non renseigné');
    set('mobile-in', Data.fmt(totalIn));
    set('mobile-out', Data.fmt(totalOut));
    set('mobile-nb', list.length);

    const tb = document.getElementById('mobile-table');
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="7" class="empty">Aucun mouvement sur cette période.</td></tr>';
      return;
    }
    let solde = Data.soldes.mobile.montant;
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

  // ===================== GESTION DE LA LISTE DES OPÉRATEURS =====================
  openListModal() {
    if (!Array.isArray(Data.operateursMobile)) Data.operateursMobile = [];
    const rows = Data.operateursMobile.length
      ? Data.operateursMobile.map(o => `
          <tr>
            <td><b>${this._esc(o.nom)}</b></td>
            <td>${o.actif === false ? '<span class="badge b-red">Inactif</span>' : '<span class="badge b-green">Actif</span>'}</td>
            <td>${this._esc(o.observation || '')}</td>
            <td class="nowrap">
              <button class="btn btn-sm" onclick="Mobile.openOpForm(${o.id})">✏️</button>
              <button class="btn btn-sm btn-danger" onclick="Mobile.removeOp(${o.id})" style="margin-left:4px">🗑</button>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="4" class="empty">Aucun opérateur enregistré</td></tr>';
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:640px">
          <div class="modal-title">📱 Gérer les opérateurs Mobile Money</div>
          <div style="font-size:13px;color:var(--c-muted);margin-bottom:10px">
            Les opérateurs de cette liste apparaissent dans le formulaire « Nouveau mouvement ».
          </div>
          <div style="margin-bottom:12px">
            <button class="btn btn-primary" onclick="Mobile.openOpForm(null)"><i class="ti ti-plus"></i> Nouvel opérateur</button>
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

  openOpForm(id) {
    this.editOpId = id;
    const o = id ? (Data.operateursMobile || []).find(x => x.id === id) : null;
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${id ? 'Modifier opérateur' : 'Nouvel opérateur'}</div>
          <div class="fg"><label class="fl">Nom *</label>
            <input type="text" id="op-nom" value="${this._esc(o?.nom || '')}" placeholder="Ex: MTN, Airtel, Orange Money...">
          </div>
          <div class="fg"><label class="fl">Observation</label>
            <input type="text" id="op-obs" value="${this._esc(o?.observation || '')}" placeholder="N° commerçant, contact...">
          </div>
          <div class="fg" style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="op-actif" ${o?.actif === false ? '' : 'checked'} style="width:auto">
            <label for="op-actif" style="margin:0">Opérateur actif</label>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="Mobile.openListModal()">Retour à la liste</button>
            <button class="btn btn-primary" onclick="Mobile.saveOp()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  saveOp() {
    const nom = (document.getElementById('op-nom')?.value || '').trim();
    if (!nom) { alert('Nom obligatoire.'); return; }
    const observation = (document.getElementById('op-obs')?.value || '').trim() || null;
    const actif = !!document.getElementById('op-actif')?.checked;
    if (!Array.isArray(Data.operateursMobile)) Data.operateursMobile = [];
    if (this.editOpId) {
      const o = Data.operateursMobile.find(x => x.id === this.editOpId);
      if (o) Object.assign(o, { nom, observation, actif });
    } else {
      Data.operateursMobile.push({ id: Data.newId(), nom, observation, actif });
    }
    this.editOpId = null;
    this.saveList();
    this.openListModal();
  },

  removeOp(id) {
    const o = (Data.operateursMobile || []).find(x => x.id === id);
    if (!o) return;
    if (!confirm(`Supprimer l'opérateur « ${o.nom} » ?\n\nLes mouvements existants conservent son nom, seule la liste de choix est nettoyée.`)) return;
    Data.operateursMobile = Data.operateursMobile.filter(x => x.id !== id);
    this.saveList();
    this.openListModal();
  },

  _esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },
};
