/**
 * modules/mobile.js — Mobile Money (cloud Supabase)
 */

const Mobile = {
  STORAGE_KEY: 'meiji-mobile', // legacy
  restore() { /* géré par Store.bootstrap */ },

  async saveSolde() {
    const val = parseFloat(document.getElementById('inp-mobile')?.value) || 0;
    const dateStr = new Date().toLocaleDateString('fr-FR');
    Data.soldes.mobile = { montant: val, date: dateStr };
    document.getElementById('inp-mobile').value = '';
    try {
      if (Store && Store.ready) await Store.upsertSolde('mobile', val, dateStr);
    } catch (e) { alert('Erreur enregistrement : ' + e.message); return; }
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
            <div class="fg"><label class="fl">Opérateur</label><input type="text" id="mmvt-op" placeholder="Ex: MTN, Airtel, Orange..."></div>
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

  async saveMvt() {
    const mvt = {
      date: document.getElementById('mmvt-date')?.value,
      lib: document.getElementById('mmvt-lib')?.value,
      op: document.getElementById('mmvt-op')?.value,
      mnt: parseFloat(document.getElementById('mmvt-mnt')?.value) || 0,
      type: this._mvtType,
      ref: document.getElementById('mmvt-ref')?.value,
    };
    if (!mvt.lib || !mvt.mnt) { alert('Libellé et montant requis'); return; }
    try {
      if (Store && Store.ready) {
        const saved = await Store.insertMvt('mobile', mvt);
        Data.mvtsMobile.unshift(saved);
      } else {
        Data.mvtsMobile.unshift({ id: Data.newId(), ...mvt });
      }
    } catch (e) { alert('Erreur : ' + e.message); return; }
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
      tb.innerHTML = '<tr><td colspan="6" class="empty">Aucun mouvement sur cette période.</td></tr>';
      return;
    }
    let solde = Data.soldes.mobile.montant;
    tb.innerHTML = list.map(m => {
      const s = solde;
      solde -= (m.type === 'in' ? m.mnt : -m.mnt);
      return `<tr>
        <td class="nowrap">${Data.fmtDs(m.date)}</td>
        <td>${m.lib}</td>
        <td style="color:#aaa">${m.op || '-'}</td>
        <td class="text-right text-green fw-bold">${m.type === 'in' ? '+' + Data.fmts(m.mnt) + ' FCFA' : '-'}</td>
        <td class="text-right text-red fw-bold">${m.type === 'out' ? '-' + Data.fmts(m.mnt) + ' FCFA' : '-'}</td>
        <td class="text-right fw-bold">${Data.fmts(s)} FCFA</td>
      </tr>`;
    }).join('');
  },
};
