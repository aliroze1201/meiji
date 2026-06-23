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
    Data.soldes.mobile = { montant: val, date: Data.nowFR() };
    document.getElementById('inp-mobile').value = '';
    this.save();
    this.render();
    Dashboard.render();
    Bilan.render();
  },

  // ---------- Helpers solde par opérateur ----------
  soldeOfOp(opNom) {
    const o = (Data.operateursMobile || []).find(x => x.nom === opNom);
    const base = Number(o?.solde) || 0;
    const mvts = (Data.mvtsMobile || []).filter(m => (m.op || '') === opNom);
    const inn  = mvts.filter(m => m.type === 'in').reduce((s,m) => s + (Number(m.mnt)||0), 0);
    const out  = mvts.filter(m => m.type === 'out').reduce((s,m) => s + (Number(m.mnt)||0), 0);
    return base + inn - out;
  },

  soldeGlobal() {
    let total = (Data.operateursMobile || []).reduce((s,o) => s + this.soldeOfOp(o.nom), 0);
    const knownNames = new Set((Data.operateursMobile || []).map(o => o.nom));
    const orphelin = (Data.mvtsMobile || []).filter(m => !m.op || !knownNames.has(m.op));
    const inn = orphelin.filter(m => m.type === 'in').reduce((s,m) => s + (Number(m.mnt)||0), 0);
    const out = orphelin.filter(m => m.type === 'out').reduce((s,m) => s + (Number(m.mnt)||0), 0);
    total += inn - out;
    total += Number(Data.soldes?.mobile?.montant) || 0;
    return total;
  },

  saveOpSolde(id) {
    const el = document.getElementById('inp-mb-' + id);
    if (!el) return;
    const val = parseFloat(el.value);
    if (isNaN(val)) { alert('Saisis un nombre valide.'); return; }
    const o = (Data.operateursMobile || []).find(x => x.id === id);
    if (!o) return;
    const beforeSolde = o.solde;
    o.solde = val;
    o.soldeDate = Data.nowFR();
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'mobile',
        `Solde référence ${o.nom}`,
        `${Data.fmt(beforeSolde || 0)} → ${Data.fmt(val)}`,
        { id: o.id, before: { solde: beforeSolde }, after: { solde: val } });
    } catch (e) {}
    this.saveList();
    this.render();
    if (typeof Dashboard !== 'undefined') Dashboard.render();
    if (typeof Bilan !== 'undefined') Bilan.render();
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
    try {
      if (typeof Audit !== 'undefined') Audit.log('create', 'mobile',
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
    const list = App.filterByDate(Data.mvtsMobile);
    const totalIn = list.filter(m => m.type === 'in').reduce((s,m) => s + m.mnt, 0);
    const totalOut = list.filter(m => m.type === 'out').reduce((s,m) => s + m.mnt, 0);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('mobile-solde', Data.fmt(this.soldeGlobal()));
    set('mobile-in', Data.fmt(totalIn));
    set('mobile-out', Data.fmt(totalOut));
    set('mobile-nb', list.length);

    // Grille de cartes par opérateur
    const grid = document.getElementById('mobiles-grid');
    if (grid) {
      const ops = (Data.operateursMobile || []).filter(o => o.actif !== false);
      if (!ops.length) {
        grid.innerHTML = `
          <div class="card" style="text-align:center;padding:18px;margin-bottom:16px">
            <div style="color:var(--c-muted);font-size:13px;margin-bottom:8px">Aucun opérateur enregistré.</div>
            <button class="btn btn-primary" onclick="Mobile.openListModal()"><i class="ti ti-plus"></i> Ajouter un opérateur</button>
          </div>`;
      } else {
        grid.innerHTML = '<div class="g3" style="margin-bottom:16px">' + ops.map(o => {
          const live = this.soldeOfOp(o.nom);
          const base = Number(o.solde) || 0;
          const mvts = (Data.mvtsMobile || []).filter(m => (m.op || '') === o.nom);
          const inn = mvts.filter(m => m.type === 'in').reduce((s,m) => s + (Number(m.mnt)||0), 0);
          const out = mvts.filter(m => m.type === 'out').reduce((s,m) => s + (Number(m.mnt)||0), 0);
          return `
            <div class="card" style="padding:16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <span style="font-weight:700;font-size:15px;color:var(--c-purple)"><i class="ti ti-device-mobile"></i> ${this._esc(o.nom)}</span>
                <button class="btn btn-ghost" style="padding:4px 8px" onclick="Mobile.openOpForm(${o.id})" title="Modifier"><i class="ti ti-edit"></i></button>
              </div>
              <div style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--c-purple);font-variant-numeric:tabular-nums">${Data.fmt(live)}</div>
              <div style="font-size:11px;color:var(--c-muted);margin-bottom:10px">
                Référence : ${Data.fmt(base)}${o.soldeDate ? ' · ' + o.soldeDate : ''}<br>
                + ${Data.fmts(inn)} entrées · − ${Data.fmts(out)} sorties
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="number" id="inp-mb-${o.id}" placeholder="Nouveau solde de référence..." style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--c-border);background:var(--c-surface);font-size:13px">
                <button class="btn btn-primary btn-sm" onclick="Mobile.saveOpSolde(${o.id})"><i class="ti ti-check"></i></button>
              </div>
            </div>`;
        }).join('') + '</div>';
      }
    }

    const tb = document.getElementById('mobile-table');
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="8" class="empty">Aucun mouvement sur cette période.</td></tr>';
      return;
    }
    let solde = this.soldeGlobal();
    const caisseLabel = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' };
    tb.innerHTML = list.map(m => {
      const s = solde;
      solde -= (m.type === 'in' ? m.mnt : -m.mnt);
      const cBadge = m.caisse
        ? `<span class="badge ${m.caisse==='s'?'b-blue':m.caisse==='b'?'b-green':'b-amber'}" title="Impact cumul cash">${caisseLabel[m.caisse]}</span>`
        : '<span style="color:var(--c-muted);font-size:11px">—</span>';
      const lockIcon = m.relPrelv
        ? ' <i class="ti ti-lock" title="Lié à un prélèvement associé — supprime-le depuis la page Associés" style="color:var(--c-warning);font-size:13px"></i>'
        : '';
      return `<tr data-search-id="mob:${m.id}">
        <td class="nowrap">${Data.fmtDs(m.date)}</td>
        <td>${this._esc(m.lib || '')}${lockIcon}</td>
        <td style="color:#aaa">${this._esc(m.op || '-')}</td>
        <td>${cBadge}</td>
        <td class="text-right text-green fw-bold">${m.type === 'in' ? '+' + Data.fmts(m.mnt) + ' FCFA' : '-'}</td>
        <td class="text-right text-red fw-bold">${m.type === 'out' ? '-' + Data.fmts(m.mnt) + ' FCFA' : '-'}</td>
        <td class="text-right fw-bold">${Data.fmts(s)} FCFA</td>
        <td class="nowrap">
          <button class="btn btn-sm btn-danger" title="Supprimer ce mouvement" onclick="Mobile.removeMvt(${m.id})"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  },

  // Supprimer un mouvement Mobile Money
  removeMvt(id) {
    const m = (Data.mvtsMobile || []).find(x => x.id === id);
    if (!m) return;
    if (m.relPrelv) {
      alert('🔒 Ce mouvement est lié à un prélèvement associé.\n\nPour le supprimer, va sur la page Associés et supprime le prélèvement correspondant — le mouvement disparaîtra automatiquement.');
      return;
    }
    const lbl = `${Data.fmtDs(m.date)} · ${m.lib || ''} · ${Data.fmt(m.mnt)} (${m.type === 'in' ? '+' : '−'})`;
    if (!confirm('Supprimer ce mouvement Mobile Money ?\n\n' + lbl + '\n\nCette action est irréversible.')) return;
    Data.mvtsMobile = Data.mvtsMobile.filter(x => x.id !== id);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'mobile',
        `Mvt ${m.op || ''} · ${m.lib || ''}`,
        `${Data.fmt(m.mnt)} · ${m.type === 'in' ? 'entrée' : 'sortie'}`,
        { id: m.id, before: m });
    } catch (e) {}
    this.save();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
    else this.render();
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
          <div class="fg"><label class="fl">Solde de référence (FCFA)</label>
            <input type="number" id="op-solde" value="${o?.solde != null ? o.solde : ''}" placeholder="0">
            <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
              Point de départ du calcul. Les entrées et sorties s'ajoutent automatiquement.
              ${o?.soldeDate ? 'Dernière mise à jour : ' + this._esc(o.soldeDate) : ''}
            </div>
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
    const soldeRaw = document.getElementById('op-solde')?.value;
    const solde = soldeRaw !== '' && soldeRaw != null ? parseFloat(soldeRaw) : 0;
    const soldeDate = soldeRaw !== '' && soldeRaw != null ? Data.nowFR() : null;
    if (!Array.isArray(Data.operateursMobile)) Data.operateursMobile = [];
    if (this.editOpId) {
      const o = Data.operateursMobile.find(x => x.id === this.editOpId);
      if (o) {
        const before = { ...o };
        const update = { nom, observation, actif, solde };
        if (o.solde !== solde) update.soldeDate = soldeDate || o.soldeDate;
        Object.assign(o, update);
        try {
          if (typeof Audit !== 'undefined') Audit.log('update', 'mobile',
            `Opérateur ${nom}`,
            `Solde de référence : ${Data.fmt(solde)}`,
            { id: o.id, before, after: { ...o } });
        } catch (e) {}
      }
    } else {
      const id = Data.newId();
      Data.operateursMobile.push({ id, nom, observation, actif, solde, soldeDate });
      try {
        if (typeof Audit !== 'undefined') Audit.log('create', 'mobile',
          `Opérateur ${nom}`,
          `Création · solde initial ${Data.fmt(solde)}`,
          { id });
      } catch (e) {}
    }
    this.editOpId = null;
    this.saveList();
    this.openListModal();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
  },

  removeOp(id) {
    const o = (Data.operateursMobile || []).find(x => x.id === id);
    if (!o) return;
    if (!confirm(`Supprimer l'opérateur « ${o.nom} » ?\n\nLes mouvements existants conservent son nom, seule la liste de choix est nettoyée.`)) return;
    Data.operateursMobile = Data.operateursMobile.filter(x => x.id !== id);
    this.saveList();
    this.openListModal();
  },

  _esc(s) { return Data.h(s); },
};
