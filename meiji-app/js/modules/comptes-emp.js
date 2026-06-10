/**
 * comptes-emp.js — Comptes individuels CHRIST/FRANCIS/KING.
 */

const CEmployes = {
  STORAGE_KEY: 'meiji-comptes-emp',

  save() { AppDB.save(this.STORAGE_KEY, Data.compteEmp); },

  async restore() {
    const obj = await AppDB.load(this.STORAGE_KEY);
    if (obj && typeof obj === 'object') Data.compteEmp = obj;
  },

  openModal() {
    if (typeof Auth !== 'undefined' && !Auth.canEdit('comptes-emp')) {
      alert('Accès refusé.'); return;
    }
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">Écriture compte employé</div>
          <div class="fr">
            <div class="fg"><label class="fl">Employé</label>
              <select id="ce-emp"><option>CHRIST</option><option>FRANCIS</option><option>KING</option></select>
            </div>
            <div class="fg"><label class="fl">Date</label><input type="date" id="ce-date" value="${Data.today()}"></div>
          </div>
          <div class="fg"><label class="fl">Désignation</label><input type="text" id="ce-lib" placeholder="Avance salaire, achat..."></div>
          <div class="fr">
            <div class="fg"><label class="fl">Débit</label><input type="number" id="ce-deb" placeholder="0"></div>
            <div class="fg"><label class="fl">Crédit (remboursement)</label><input type="number" id="ce-cred" placeholder="0"></div>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="CEmployes.save()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  save() {
    const emp = document.getElementById('ce-emp')?.value;
    const e = {
      id: Data.newId(),
      date: document.getElementById('ce-date')?.value,
      lib: document.getElementById('ce-lib')?.value,
      deb: parseFloat(document.getElementById('ce-deb')?.value) || 0,
      cred: parseFloat(document.getElementById('ce-cred')?.value) || 0,
    };
    if (!e.lib) { alert('Désignation requise'); return; }
    Data.compteEmp[emp].push(e);
    this.save();
    App.closeModal();
    this.render();
  },

  render() {
    const filter = App.filters.cemp;
    const names = filter === 'all' ? ['CHRIST', 'FRANCIS', 'KING'] : [filter];
    const container = document.getElementById('cemp-cards');
    if (!container) return;
    container.innerHTML = names.map(emp => {
      const ops = Data.compteEmp[emp] || [];
      const totD = ops.reduce((s,o) => s + o.deb, 0);
      const totC = ops.reduce((s,o) => s + o.cred, 0);
      const solde = totD - totC;
      const rows = ops.length ? ops.map(o => `
        <tr>
          <td>${Data.fmtDs(o.date)}</td>
          <td>${o.lib}</td>
          <td class="text-right text-red">${o.deb ? Data.fmts(o.deb) : '-'}</td>
          <td class="text-right text-green">${o.cred ? Data.fmts(o.cred) : '-'}</td>
          <td class="text-right fw-bold">${Data.fmts(o.deb - o.cred)}</td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty">Aucune écriture — ajoutez via le formulaire</td></tr>';

      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <div style="font-size:13px;font-weight:700">${emp}</div>
              <div style="font-size:11px;color:#aaa">Cuisinier SUSHI</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:#aaa">Solde</div>
              <div style="font-size:16px;font-weight:700;color:${solde>0?'#A32D2D':solde<0?'#0F6E56':'#aaa'}">
                ${Data.fmt(Math.abs(solde))} ${solde > 0 ? 'dû' : solde < 0 ? 'crédit' : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:1rem;margin-bottom:10px;font-size:11px">
            <span>Total débit : <b class="text-red">${Data.fmt(totD)}</b></span>
            <span>Total crédit : <b class="text-green">${Data.fmt(totC)}</b></span>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Désignation</th><th class="text-right">Débit</th><th class="text-right">Crédit</th><th class="text-right">Mouvement</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
  },
};

