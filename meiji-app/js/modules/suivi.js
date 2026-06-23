/**
 * modules/suivi.js — Suivi des chèques
 * Pointage : reçu → déposé → encaissé / rejeté
 */

const Suivi = {
  STORAGE_KEY: 'meiji-cheques',
  filter: 'all',

  // ===================== SAISIE =====================
  openModal(id) {
    const c = id ? Data.cheques.find(x => x.id === id) : null;
    const today = Data.today();
    App.showModal(`
      <div class="modal-overlay show" onclick="if(event.target===this)App.closeModal()">
        <div class="modal modal-lg">
          <div class="modal-title"><i class="ti ti-checks"></i> ${c ? 'Modifier le chèque' : 'Nouveau chèque'}</div>
          <div class="fr">
            <div class="fg"><label class="fl">Date de réception</label>
              <input type="date" id="chq-f-date" value="${this._esc(c?.date || today)}"></div>
            <div class="fg"><label class="fl">Caisse</label>
              <select id="chq-f-dept">
                <option value="SUSHI"  ${c?.dept==='SUSHI'?'selected':''}>SUSHI</option>
                <option value="BAR"    ${c?.dept==='BAR'?'selected':''}>BAR</option>
                <option value="CHICHA" ${c?.dept==='CHICHA'?'selected':''}>CHICHA</option>
              </select></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">N° du chèque</label>
              <input type="text" id="chq-f-num" placeholder="0000000" value="${this._esc(c?.numero || '')}"></div>
            <div class="fg"><label class="fl">Banque émettrice</label>
              <input type="text" id="chq-f-banque" placeholder="Ex : BGFI, ECOBANK..." value="${this._esc(c?.banque || '')}"></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Tireur (client)</label>
              <input type="text" id="chq-f-tireur" placeholder="Nom du client" value="${this._esc(c?.tireur || '')}"></div>
            <div class="fg"><label class="fl">Montant (FCFA)</label>
              <input type="number" id="chq-f-mnt" placeholder="0" min="0" step="100" value="${this._esc(c?.montant || '')}"></div>
          </div>
          <div class="fg"><label class="fl">Notes (optionnel)</label>
            <textarea id="chq-f-notes" rows="2" placeholder="Précisions, n° de ticket...">${this._esc(c?.notes || '')}</textarea></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Suivi.save(${id || 'null'})"><i class="ti ti-check"></i> Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  save(id) {
    const date    = document.getElementById('chq-f-date')?.value;
    const dept    = document.getElementById('chq-f-dept')?.value;
    const numero  = document.getElementById('chq-f-num')?.value.trim();
    const banque  = document.getElementById('chq-f-banque')?.value.trim();
    const tireur  = document.getElementById('chq-f-tireur')?.value.trim();
    const montant = parseFloat(document.getElementById('chq-f-mnt')?.value) || 0;
    const notes   = document.getElementById('chq-f-notes')?.value.trim();

    if (!date) return alert('Date requise');
    if (!montant) return alert('Montant requis');

    if (id) {
      const c = Data.cheques.find(x => x.id === id);
      if (!c) return;
      const before = { ...c };
      Object.assign(c, { date, dept, numero, banque, tireur, montant, notes });
      try {
        if (typeof Audit !== 'undefined') Audit.log('update', 'suivi',
          `Chèque ${numero || ''} · ${tireur || ''}`,
          `${Data.fmt(montant)} · ${dept}`,
          { id, before, after: { ...c } });
      } catch (e) {}
    } else {
      const newId = Data.newId();
      const c = {
        id: newId,
        date, dept, numero, banque, tireur, montant, notes,
        statut: 'attente',
        dateDepot: null,
        dateEncaissement: null,
      };
      Data.cheques.push(c);
      try {
        if (typeof Audit !== 'undefined') Audit.log('create', 'suivi',
          `Chèque ${numero || ''} · ${tireur || ''}`,
          `${Data.fmt(montant)} · ${dept} · en attente`,
          { id: newId, after: c });
      } catch (e) {}
    }
    this.persist();
    App.closeModal();
    App.renderAll();
  },

  // ===================== TRANSITIONS DE STATUT =====================
  deposer(id) {
    const c = Data.cheques.find(x => x.id === id);
    if (!c) return;
    const date = prompt('Date du dépôt en banque (AAAA-MM-JJ) :', Data.today());
    if (!date) return;
    c.statut = 'depose';
    c.dateDepot = date;
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'suivi',
        `Chèque ${c.numero || ''} · ${c.tireur || ''}`,
        `Déposé le ${Data.fmtD(date)}`,
        { id: c.id, after: { statut: 'depose', dateDepot: date } });
    } catch (e) {}
    this.persist();
    App.renderAll();
  },

  encaisser(id) {
    const c = Data.cheques.find(x => x.id === id);
    if (!c) return;
    const dft = c.sens === 'emis' ? 'Date de débit du compte' : 'Date d\'encaissement';
    const date = prompt(`${dft} (AAAA-MM-JJ) :`, Data.today());
    if (!date) return;
    c.statut = 'encaisse';
    c.dateEncaissement = date;
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'suivi',
        `Chèque ${c.numero || ''} · ${c.tireur || ''}`,
        `Encaissé le ${Data.fmtD(date)} · ${Data.fmt(c.montant)}`,
        { id: c.id, after: { statut: 'encaisse', dateEncaissement: date } });
    } catch (e) {}
    // Chèque ÉMIS : le mouvement bancaire associé sort de l'état pending
    // → il commence à impacter le solde de la banque.
    if (c.sens === 'emis' && Array.isArray(Data.mvtsBanque)) {
      const mvt = Data.mvtsBanque.find(m => m.relCheque === id);
      if (mvt) {
        mvt.pending = false;
        mvt.date = date;
        if (typeof Banque !== 'undefined' && Banque.save) Banque.save();
      }
    }
    this.persist();
    App.renderAll();
  },

  rejeter(id) {
    const c = Data.cheques.find(x => x.id === id);
    if (!c) return;
    if (!confirm('Marquer ce chèque comme rejeté ?')) return;
    c.statut = 'rejete';
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'suivi',
        `Chèque ${c.numero || ''} · ${c.tireur || ''}`,
        `Rejeté · ${Data.fmt(c.montant)}`,
        { id: c.id, after: { statut: 'rejete' } });
    } catch (e) {}
    // Chèque ÉMIS rejeté = annulation → on supprime le mouvement bancaire
    if (c.sens === 'emis' && Array.isArray(Data.mvtsBanque)) {
      Data.mvtsBanque = Data.mvtsBanque.filter(m => m.relCheque !== id);
      if (typeof Banque !== 'undefined' && Banque.save) Banque.save();
    }
    this.persist();
    App.renderAll();
  },

  remove(id) {
    const c = Data.cheques.find(x => x.id === id);
    if (!c) return;
    if (!confirm('Supprimer ce chèque ?')) return;
    // Chèque ÉMIS : supprime aussi le mouvement bancaire miroir
    if (c.sens === 'emis' && Array.isArray(Data.mvtsBanque)) {
      Data.mvtsBanque = Data.mvtsBanque.filter(m => m.relCheque !== id);
      if (typeof Banque !== 'undefined' && Banque.save) Banque.save();
    }
    Data.cheques = Data.cheques.filter(x => x.id !== id);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'suivi',
        `Chèque ${c.numero || ''} · ${c.tireur || ''}`,
        `${Data.fmt(c.montant)} · ${c.statut}`,
        { id: c.id, before: c });
    } catch (e) {}
    this.persist();
    App.renderAll();
  },

  // ===================== PERSISTANCE =====================
  persist() {
    AppDB.save(this.STORAGE_KEY, Data.cheques);
  },

  async restore() {
    const arr = await AppDB.load(this.STORAGE_KEY);
    if (Array.isArray(arr)) Data.cheques = arr;
  },

  // ===================== RENDER =====================
  render() {
    if (!Array.isArray(Data.cheques)) Data.cheques = [];
    const periodList = App.filterByDate(Data.cheques);

    const sumBy = (st) => periodList.filter(c => c.statut === st).reduce((s,c) => s + (c.montant||0), 0);
    const nbBy  = (st) => periodList.filter(c => c.statut === st).length;

    this._set('chq-attente',  Data.fmt(sumBy('attente')));
    this._set('chq-depose',   Data.fmt(sumBy('depose')));
    this._set('chq-encaisse', Data.fmt(sumBy('encaisse')));
    this._set('chq-rejete',   Data.fmt(sumBy('rejete')));
    this._set('chq-nb-attente',  nbBy('attente')  + ' chèque' + (nbBy('attente')>1?'s':''));
    this._set('chq-nb-depose',   nbBy('depose')   + ' chèque' + (nbBy('depose')>1?'s':''));
    this._set('chq-nb-encaisse', nbBy('encaisse') + ' chèque' + (nbBy('encaisse')>1?'s':''));
    this._set('chq-nb-rejete',   nbBy('rejete')   + ' chèque' + (nbBy('rejete')>1?'s':''));

    const tb = document.getElementById('chq-table');
    if (!tb) return;

    let list = this.filter === 'all' ? periodList : periodList.filter(c => c.statut === this.filter);
    list = list.slice().sort((a,b) => (b.date || '').localeCompare(a.date || ''));

    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="10" class="empty">Aucun chèque enregistré</td></tr>';
      return;
    }

    const dash = '<span class="text-muted">—</span>';
    const badge = (s) => {
      const map = {
        attente:   ['b-amber',  '<i class="ti ti-clock"></i> En attente'],
        depose:    ['b-blue',   '<i class="ti ti-building-bank"></i> Déposé'],
        encaisse:  ['b-green',  '<i class="ti ti-circle-check"></i> Encaissé'],
        rejete:    ['b-red',    '<i class="ti ti-circle-x"></i> Rejeté'],
      };
      const [cls, lbl] = map[s] || ['', s];
      return `<span class="badge ${cls}">${lbl}</span>`;
    };
    const deptBadge = (d) => `<span class="badge ${d==='SUSHI'?'b-blue':d==='BAR'?'b-green':'b-amber'}">${d}</span>`;

    const actions = (c) => {
      const buttons = [];
      if (c.statut === 'attente') {
        buttons.push(`<button class="btn btn-sm btn-primary" onclick="Suivi.deposer(${c.id})" title="Déposer en banque"><i class="ti ti-building-bank"></i> Déposer</button>`);
        buttons.push(`<button class="btn btn-sm" onclick="Suivi.openModal(${c.id})" title="Modifier"><i class="ti ti-pencil"></i></button>`);
        buttons.push(`<button class="btn-ghost" onclick="Suivi.remove(${c.id})" title="Supprimer"><i class="ti ti-trash"></i></button>`);
      } else if (c.statut === 'depose') {
        buttons.push(`<button class="btn btn-sm btn-success" onclick="Suivi.encaisser(${c.id})" title="Marquer encaissé"><i class="ti ti-check"></i> Encaisser</button>`);
        buttons.push(`<button class="btn btn-sm btn-danger" onclick="Suivi.rejeter(${c.id})" title="Marquer rejeté"><i class="ti ti-x"></i></button>`);
      } else {
        buttons.push(`<button class="btn-ghost" onclick="Suivi.remove(${c.id})" title="Supprimer"><i class="ti ti-trash"></i></button>`);
      }
      return `<div style="display:flex;gap:4px;flex-wrap:wrap">${buttons.join('')}</div>`;
    };

    tb.innerHTML = list.map(c => `
      <tr data-search-id="chq:${c.id}">
        <td class="nowrap">${Data.fmtDs(c.date)}</td>
        <td>${deptBadge(c.dept)}</td>
        <td><span style="font-family:var(--font-mono);font-weight:600">${this._esc(c.numero || '-')}</span></td>
        <td>${this._esc(c.banque || '-')}</td>
        <td class="fw-bold">${this._esc(c.tireur || '-')}</td>
        <td class="text-right fw-bold" style="color:var(--c-sushi)">${Data.fmts(c.montant)} FCFA</td>
        <td>${badge(c.statut)}</td>
        <td class="nowrap">${c.dateDepot ? Data.fmtDs(c.dateDepot) : dash}</td>
        <td class="nowrap">${c.dateEncaissement ? Data.fmtDs(c.dateEncaissement) : dash}</td>
        <td>${actions(c)}</td>
      </tr>`).join('');
  },

  _esc(v) { return Data.h(v); },
  _set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; },
};
