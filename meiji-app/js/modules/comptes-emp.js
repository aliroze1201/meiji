/**
 * comptes-emp.js — Comptes individuels CHRIST/FRANCIS/KING.
 * Prêts : décaissent la caisse sélectionnée.
 * Remboursements : réalimentent la caisse sélectionnée.
 */

const CEmployes = {
  STORAGE_KEY: 'meiji-comptes-emp',

  persist() { AppDB.save(this.STORAGE_KEY, Data.compteEmp); },

  async restore() {
    const obj = await AppDB.load(this.STORAGE_KEY);
    if (obj && typeof obj === 'object') Data.compteEmp = obj;
  },

  // opts: { emp, type, pretEmp } — type = 'pret' | 'remb' | 'autre'
  openModal(opts = {}) {
    if (typeof Auth !== 'undefined' && !Auth.canEdit('comptes-emp')) {
      alert('Accès refusé.'); return;
    }
    const emp  = opts.emp  || 'CHRIST';
    const type = opts.type || 'pret';

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">Écriture compte employé</div>
          <div class="fr">
            <div class="fg"><label class="fl">Employé</label>
              <select id="ce-emp">
                <option ${emp==='CHRIST'  ? 'selected' : ''}>CHRIST</option>
                <option ${emp==='FRANCIS' ? 'selected' : ''}>FRANCIS</option>
                <option ${emp==='KING'    ? 'selected' : ''}>KING</option>
              </select>
            </div>
            <div class="fg"><label class="fl">Date</label>
              <input type="date" id="ce-date" value="${Data.today()}">
            </div>
          </div>

          <div class="fg"><label class="fl">Type</label>
            <select id="ce-type" onchange="CEmployes.onTypeChange()">
              <option value="pret"  ${type==='pret'  ? 'selected' : ''}>Prêt — sortie caisse</option>
              <option value="remb"  ${type==='remb'  ? 'selected' : ''}>Remboursement — entrée caisse</option>
              <option value="autre" ${type==='autre' ? 'selected' : ''}>Autre (sans impact caisse)</option>
            </select>
          </div>

          <div class="fg" id="ce-caisse-row" style="display:${type!=='autre'?'':'none'}">
            <label class="fl">Caisse impactée</label>
            <select id="ce-caisse">
              <option value="s">🍱 SUSHI</option>
              <option value="b">🍸 BAR</option>
              <option value="c">💨 CHICHA</option>
            </select>
          </div>

          <div class="fg"><label class="fl">Désignation</label>
            <input type="text" id="ce-lib" placeholder="Prêt, avance salaire...">
          </div>

          <div id="ce-montant-row" style="display:${type!=='autre'?'':'none'}">
            <div class="fg"><label class="fl">Montant</label>
              <input type="number" id="ce-montant" placeholder="0" min="0">
            </div>
          </div>

          <div id="ce-autre-row" style="display:${type==='autre'?'':'none'}">
            <div class="fr">
              <div class="fg"><label class="fl">Débit</label>
                <input type="number" id="ce-deb" placeholder="0" min="0">
              </div>
              <div class="fg"><label class="fl">Crédit</label>
                <input type="number" id="ce-cred" placeholder="0" min="0">
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="CEmployes.submitModal()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  onTypeChange() {
    const type = document.getElementById('ce-type')?.value;
    const isAutre = type === 'autre';
    document.getElementById('ce-caisse-row').style.display  = isAutre ? 'none' : '';
    document.getElementById('ce-montant-row').style.display = isAutre ? 'none' : '';
    document.getElementById('ce-autre-row').style.display   = isAutre ? ''     : 'none';
  },

  submitModal() {
    const emp    = document.getElementById('ce-emp')?.value;
    const type   = document.getElementById('ce-type')?.value;
    const date   = document.getElementById('ce-date')?.value;
    const lib    = document.getElementById('ce-lib')?.value?.trim();
    const caisse = (type !== 'autre')
      ? (document.getElementById('ce-caisse')?.value || 'b')
      : null;

    let deb = 0, cred = 0;
    if (type === 'pret') {
      deb = parseFloat(document.getElementById('ce-montant')?.value) || 0;
    } else if (type === 'remb') {
      cred = parseFloat(document.getElementById('ce-montant')?.value) || 0;
    } else {
      deb  = parseFloat(document.getElementById('ce-deb')?.value)  || 0;
      cred = parseFloat(document.getElementById('ce-cred')?.value) || 0;
    }

    if (!lib)                            { alert('Désignation requise'); return; }
    if (type === 'pret'  && deb  <= 0)   { alert('Montant requis');      return; }
    if (type === 'remb'  && cred <= 0)   { alert('Montant requis');      return; }

    const entry = { id: Data.newId(), date, lib, type, caisse, deb, cred };
    if (!Data.compteEmp[emp]) Data.compteEmp[emp] = [];
    Data.compteEmp[emp].push(entry);
    this.persist();
    App.closeModal();
    this.render();
  },

  // Ouvre le modal pré-rempli en mode remboursement pour un employé
  openReglModal(emp) {
    this.openModal({ emp, type: 'remb' });
  },

  render() {
    const filter = App.filters.cemp;
    const names  = filter === 'all' ? ['CHRIST', 'FRANCIS', 'KING'] : [filter];
    const container = document.getElementById('cemp-cards');
    if (!container) return;

    const caisseMeta = {
      s: { label: 'SUSHI',  color: '#185FA5', bg: '#185FA515' },
      b: { label: 'BAR',    color: '#0F6E56', bg: '#0F6E5615' },
      c: { label: 'CHICHA', color: '#BA7517', bg: '#BA751715' },
    };
    const typeIcon = { pret: '↗', remb: '↙', autre: '·' };

    container.innerHTML = names.map(emp => {
      const ops  = Data.compteEmp[emp] || [];
      const totD = ops.reduce((s, o) => s + (o.deb || 0), 0);
      const totC = ops.reduce((s, o) => s + (o.cred || 0), 0);
      const solde = totD - totC;

      const rows = ops.length
        ? [...ops].reverse().map(o => {
            const cm = o.caisse ? caisseMeta[o.caisse] : null;
            const caisseBadge = cm
              ? `<span style="margin-left:6px;font-size:10px;padding:1px 7px;border-radius:10px;background:${cm.bg};color:${cm.color};font-weight:600">${cm.label}</span>`
              : '';
            const icon = `<span style="color:${o.deb>0?'#A32D2D':'#0F6E56'};font-size:12px;margin-right:4px">${typeIcon[o.type]||'·'}</span>`;
            const reglBtn = (o.type === 'pret')
              ? `<button class="btn" style="padding:2px 8px;font-size:11px" onclick="CEmployes.openReglModal('${emp}')"><i class="ti ti-cash"></i> Régler</button>`
              : '';
            return `<tr>
              <td>${Data.fmtDs(o.date)}</td>
              <td>${icon}${o.lib}${caisseBadge}</td>
              <td class="text-right text-red">${o.deb  ? Data.fmts(o.deb)  : '-'}</td>
              <td class="text-right text-green">${o.cred ? Data.fmts(o.cred) : '-'}</td>
              <td class="text-right fw-bold">${Data.fmts(o.deb - o.cred)}</td>
              <td style="white-space:nowrap">${reglBtn}</td>
            </tr>`;
          }).join('')
        : '<tr><td colspan="6" class="empty">Aucune écriture — ajoutez via le formulaire</td></tr>';

      const soldeCouleur = solde > 0 ? '#A32D2D' : solde < 0 ? '#0F6E56' : '#aaa';
      const soldeLabel   = solde > 0 ? 'dû' : solde < 0 ? 'crédit' : '';

      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div style="font-size:14px;font-weight:700">${emp}</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn" style="font-size:12px;padding:4px 12px" onclick="CEmployes.openReglModal('${emp}')">
                <i class="ti ti-cash"></i> Remboursement
              </button>
              <div style="text-align:right">
                <div style="font-size:11px;color:#aaa">Solde</div>
                <div style="font-size:16px;font-weight:700;color:${soldeCouleur}">
                  ${Data.fmt(Math.abs(solde))} <span style="font-size:12px">${soldeLabel}</span>
                </div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:1.2rem;margin-bottom:10px;font-size:11px">
            <span>Total prêts : <b class="text-red">${Data.fmt(totD)}</b></span>
            <span>Total remboursé : <b class="text-green">${Data.fmt(totC)}</b></span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Désignation</th>
                <th class="text-right">Débit</th>
                <th class="text-right">Crédit</th>
                <th class="text-right">Mvt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
  },
};
