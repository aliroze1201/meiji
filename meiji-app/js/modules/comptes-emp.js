/**
 * comptes-emp.js — Comptes individuels des employés.
 * Liste dynamique : alimentée par Data.employes (onglet Employés).
 * Prêts : décaissent la caisse sélectionnée.
 * Remboursements : réalimentent la caisse sélectionnée.
 */

const CEmployes = {
  STORAGE_KEY: 'meiji-comptes-emp',

  persist() { AppDB.save(this.STORAGE_KEY, Data.compteEmp); },
  save() { return this.persist(); },

  async restore() {
    const obj = await AppDB.load(this.STORAGE_KEY);
    if (obj && typeof obj === 'object') Data.compteEmp = obj;
  },

  // Tous les noms à proposer :
  // - tous les employés de Data.employes (onglet Employés)
  // - + les comptes existants ayant des écritures (pour conserver l'historique
  //   si un employé a été supprimé)
  // Les clés génériques héritées (CHRIST, FRANCIS, KING) sans écriture sont ignorées.
  _allNames() {
    const set = new Set();
    (Data.employes || []).forEach(e => { if (e.nom) set.add(e.nom); });
    Object.entries(Data.compteEmp || {}).forEach(([k, v]) => {
      if (Array.isArray(v) && v.length > 0) set.add(k); // conserve si écritures
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  },

  // Employés à afficher : tous les employés + ceux qui ont des anciennes écritures.
  _activeNames() {
    return this._allNames();
  },

  _escape(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },

  // opts: { emp, type } — type = 'pret' | 'remb' | 'autre'
  openModal(opts = {}) {
    if (typeof Auth !== 'undefined' && !Auth.canEdit('comptes-emp')) {
      alert('Accès refusé.'); return;
    }
    const names = this._allNames();
    if (!names.length) {
      alert("Aucun employé disponible. Ajoutez d'abord un employé dans l'onglet Employés.");
      return;
    }
    const emp  = opts.emp && names.includes(opts.emp) ? opts.emp : names[0];
    const type = opts.type || 'pret';

    const empOptions = names.map(n =>
      `<option value="${this._escape(n)}" ${n === emp ? 'selected' : ''}>${this._escape(n)}</option>`
    ).join('');

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">Écriture compte employé</div>
          <div class="fr">
            <div class="fg"><label class="fl">Employé</label>
              <select id="ce-emp">${empOptions}</select>
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

    if (!emp)                            { alert('Employé requis');     return; }
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

  // Reconstruit les onglets en fonction des employés ayant des écritures.
  renderTabs() {
    const container = document.getElementById('cemp-tabs');
    if (!container) return;
    const active = this._activeNames();
    const filter = App.filters.cemp || 'all';
    const isValid = filter === 'all' || active.includes(filter);
    if (!isValid) App.filters.cemp = 'all';

    const tabs = [
      `<button class="tab ${App.filters.cemp==='all'?'active':''}" data-filter="all">Tous</button>`,
      ...active.map(n => `<button class="tab ${App.filters.cemp===n?'active':''}" data-filter="${this._escape(n)}">${this._escape(n)}</button>`),
    ].join('');
    container.innerHTML = tabs;

    container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        App.filters.cemp = tab.dataset.filter;
        this.render();
      });
    });
  },

  render() {
    this.renderTabs();
    const filter = App.filters.cemp || 'all';
    const active = this._activeNames();
    const names  = filter === 'all' ? active : [filter];
    const container = document.getElementById('cemp-cards');
    if (!container) return;

    if (!names.length) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:32px;color:var(--c-muted)">
          <i class="ti ti-user-dollar" style="font-size:32px;display:block;margin-bottom:8px"></i>
          Aucun employé trouvé.<br>
          Ajoutez d'abord des employés dans l'onglet <b>Employés</b>.
        </div>`;
      return;
    }

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
      const ficheIdx = (Data.employes || []).findIndex(e => e.nom === emp);
      const fiche = ficheIdx >= 0 ? Data.employes[ficheIdx] : null;
      const sousTitre = fiche ? `${fiche.poste || ''} · ${fiche.dept || ''}` : '';
      const empAttr = this._escape(emp);

      // ── Écritures de compte (prêts / remboursements) ──
      const rows = ops.length
        ? [...ops].reverse().map(o => {
            const cm = o.caisse ? caisseMeta[o.caisse] : null;
            const caisseBadge = cm
              ? `<span style="margin-left:6px;font-size:10px;padding:1px 7px;border-radius:10px;background:${cm.bg};color:${cm.color};font-weight:600">${cm.label}</span>`
              : '';
            const icon = `<span style="color:${o.deb>0?'#A32D2D':'#0F6E56'};font-size:12px;margin-right:4px">${typeIcon[o.type]||'·'}</span>`;
            const reglBtn = (o.type === 'pret')
              ? `<button class="btn" style="padding:2px 8px;font-size:11px" onclick="CEmployes.openReglModal('${empAttr}')"><i class="ti ti-cash"></i> Régler</button>`
              : '';
            return `<tr>
              <td>${Data.fmtDs(o.date)}</td>
              <td>${icon}${this._escape(o.lib)}${caisseBadge}</td>
              <td class="text-right text-red">${o.deb  ? Data.fmts(o.deb)  : '-'}</td>
              <td class="text-right text-green">${o.cred ? Data.fmts(o.cred) : '-'}</td>
              <td class="text-right fw-bold">${Data.fmts(o.deb - o.cred)}</td>
              <td style="white-space:nowrap">${reglBtn}</td>
            </tr>`;
          }).join('')
        : '<tr><td colspan="6" class="empty">Aucune écriture</td></tr>';

      const soldeCouleur = solde > 0 ? '#A32D2D' : solde < 0 ? '#0F6E56' : '#aaa';
      const soldeLabel   = solde > 0 ? 'dû' : solde < 0 ? 'crédit' : '';

      // ── Section dettes (si employé trouvé dans Data.employes) ──
      let detteSection = '';
      if (fiche) {
        const dettes = Array.isArray(fiche.dettes) ? fiche.dettes : [];
        const totalDette = dettes.reduce((s, d) => s + (d.montant || 0), 0);
        const totalRegle = dettes.reduce((s, d) => s + (d.reglements || []).reduce((sr, r) => sr + (r.montant || 0), 0), 0);
        const soldeRestant = Math.max(0, totalDette - totalRegle);
        const detteBadge = soldeRestant > 0
          ? `<span class="badge b-red" style="font-size:11px">Solde : ${Data.fmts(soldeRestant)}</span>`
          : dettes.length ? `<span class="badge b-green" style="font-size:11px">Tout réglé</span>` : '';

        const detteRows = dettes.length ? dettes.map((d, di) => {
          const s = Math.max(0, (d.montant || 0) - (d.reglements || []).reduce((sr, r) => sr + (r.montant || 0), 0));
          const statut = s <= 0
            ? `<span class="badge b-green" style="font-size:10px">Réglé</span>`
            : `<span class="badge b-red" style="font-size:10px">${Data.fmts(s)}</span>`;
          const btnR = s > 0
            ? `<button class="btn btn-sm btn-primary" onclick="Employes.openReglementDette(${ficheIdx},${di})"><i class="ti ti-coin"></i> Régler</button>`
            : '';
          return `<tr>
            <td>${Data.fmtDs(d.date)}</td>
            <td>${this._escape(d.motif)}</td>
            <td class="text-right">${Data.fmts(d.montant)}</td>
            <td>${statut}</td>
            <td class="nowrap">${btnR}</td>
          </tr>`;
        }).join('') : `<tr><td colspan="5" class="empty">Aucune dette</td></tr>`;

        detteSection = `
          <div style="border-top:2px solid var(--c-border);margin-top:16px;padding-top:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
              <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px">
                <i class="ti ti-receipt-2"></i> Dettes ${detteBadge}
              </div>
              <button class="btn btn-sm btn-primary" onclick="Employes.openFicheDette(${ficheIdx})">
                <i class="ti ti-plus"></i> Ajouter / Gérer
              </button>
            </div>
            <table>
              <thead><tr>
                <th>Date</th><th>Motif</th>
                <th class="text-right">Montant</th>
                <th>Statut</th><th></th>
              </tr></thead>
              <tbody>${detteRows}</tbody>
            </table>
          </div>`;
      }

      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:14px;font-weight:700">${this._escape(emp)}</div>
              ${sousTitre ? `<div style="font-size:11px;color:var(--c-muted)">${this._escape(sousTitre)}</div>` : ''}
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn" style="font-size:12px;padding:4px 12px" onclick="CEmployes.openReglModal('${empAttr}')">
                <i class="ti ti-cash"></i> Remboursement
              </button>
              <div style="text-align:right">
                <div style="font-size:11px;color:#aaa">Solde prêts</div>
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
          ${detteSection}
        </div>`;
    }).join('');
  },
};
