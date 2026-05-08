/**
 * modules/banque.js — Compte bancaire
 */

const Banque = {
  saveSolde() {
    const val = parseFloat(document.getElementById('inp-banque')?.value) || 0;
    Data.soldes.banque = { montant: val, date: new Date().toLocaleDateString('fr-FR') };
    document.getElementById('inp-banque').value = '';
    this.render();
    Dashboard.render();
    Bilan.render();
  },

  openMvtModal() {
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
            <div class="fg"><label class="fl">Banque / Référence</label><input type="text" id="mvt-op" placeholder="Ex: LCBG, chèque n°..."></div>
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
    const mvt = {
      id: Data.newId(),
      date: document.getElementById('mvt-date')?.value,
      lib: document.getElementById('mvt-lib')?.value,
      op: document.getElementById('mvt-op')?.value,
      mnt: parseFloat(document.getElementById('mvt-mnt')?.value) || 0,
      type: this._mvtType,
      ref: document.getElementById('mvt-ref')?.value,
    };
    if (!mvt.lib || !mvt.mnt) { alert('Libellé et montant requis'); return; }
    Data.mvtsBanque.unshift(mvt);
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
      tb.innerHTML = '<tr><td colspan="6" class="empty">Aucun mouvement sur cette période.</td></tr>';
      return;
    }
    let solde = Data.soldes.banque.montant;
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
