/**
 * employes.js — Fiche des employés (salaires, primes, avances).
 */

// ===================== EMPLOYÉS =====================
const Employes = {
  STORAGE_KEY: 'meiji-employes',
  STORAGE_HIST: 'meiji-emp-historique',

  save() {
    AppDB.save(this.STORAGE_KEY, Data.employes);
  },

  persistHist() {
    AppDB.save(this.STORAGE_HIST, Data.empHistorique || []);
  },

  async restore() {
    const arr = await AppDB.load(this.STORAGE_KEY);
    if (Array.isArray(arr)) Data.employes = arr;
    const hist = await AppDB.load(this.STORAGE_HIST);
    if (Array.isArray(hist)) Data.empHistorique = hist;
  },

  // ===================== CLÔTURE MENSUELLE =====================
  _ymOf(d) { return (d || '').slice(0, 7); },
  _moisFr(ym) {
    const mois = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    if (!ym || ym.length < 7) return ym || '—';
    const [y, m] = ym.split('-');
    return `${mois[parseInt(m, 10)]} ${y}`;
  },

  openClotureModal() {
    if (typeof Auth !== 'undefined' && !Auth.canEdit('employes')) {
      alert('Accès refusé.'); return;
    }
    const ym = this._ymOf(Data.today());
    const already = (Data.empHistorique || []).some(h => h.ym === ym);

    const list = Data.employes || [];
    const totBrut   = list.reduce((s, e) => s + (e.brut   || 0), 0);
    const totPrime  = list.reduce((s, e) => s + (e.prime  || 0), 0);
    const totAvance = list.reduce((s, e) => s + (e.avance || 0), 0);
    const totNet    = list.reduce((s, e) => s + (e.net    || 0), 0);

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:520px">
          <div class="modal-title"><i class="ti ti-calendar-check"></i> Clôturer ${this._moisFr(ym)}</div>

          ${already ? `
            <div style="background:#A32D2D15;border:1px solid #A32D2D55;color:#A32D2D;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-size:13px">
              <i class="ti ti-alert-triangle"></i> Le mois <strong>${this._moisFr(ym)}</strong> a déjà été clôturé. Une nouvelle clôture <strong>remplacera</strong> l'archive existante.
            </div>` : ''}

          <div style="background:var(--c-surface);padding:12px;border-radius:8px;margin-bottom:12px;font-size:13px;line-height:1.6">
            En clôturant ce mois :
            <ul style="margin:8px 0 0 18px;padding:0">
              <li>Un instantané de <b>${list.length}</b> employé(s) est archivé</li>
              <li>Les <b>primes</b> et <b>avances</b> sont remises à <b>0</b></li>
              <li>L'historique des <b>paiements</b> du mois est archivé puis vidé</li>
              <li>Le <b>salaire brut</b> et le <b>poste</b> sont conservés</li>
              <li>Les <b>dettes</b> en cours sont conservées (non remises à zéro)</li>
            </ul>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:14px;font-size:12px">
            <div style="background:var(--c-surface);padding:8px;border-radius:6px;display:flex;justify-content:space-between"><span>Masse brute</span><b>${Data.fmt(totBrut)}</b></div>
            <div style="background:var(--c-surface);padding:8px;border-radius:6px;display:flex;justify-content:space-between"><span>Total primes</span><b style="color:var(--c-green)">${Data.fmt(totPrime)}</b></div>
            <div style="background:var(--c-surface);padding:8px;border-radius:6px;display:flex;justify-content:space-between"><span>Total avances</span><b style="color:var(--c-red)">${Data.fmt(totAvance)}</b></div>
            <div style="background:var(--c-surface);padding:8px;border-radius:6px;display:flex;justify-content:space-between"><span>Total net</span><b>${Data.fmt(totNet)}</b></div>
          </div>

          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Employes.confirmCloture('${ym}')"><i class="ti ti-check"></i> ${already ? 'Re-clôturer' : 'Confirmer la clôture'}</button>
          </div>
        </div>
      </div>`);
  },

  confirmCloture(ym) {
    const list = Data.employes || [];
    if (!Array.isArray(Data.empHistorique)) Data.empHistorique = [];

    const snapshot = {
      ym,
      closedAt: new Date().toISOString(),
      closedBy: (typeof Auth !== 'undefined' && Auth.profile) ? Auth.profile.nom : null,
      totaux: {
        effectif: list.length,
        brut:   list.reduce((s, e) => s + (e.brut   || 0), 0),
        prime:  list.reduce((s, e) => s + (e.prime  || 0), 0),
        avance: list.reduce((s, e) => s + (e.avance || 0), 0),
        net:    list.reduce((s, e) => s + (e.net    || 0), 0),
      },
      employes: list.map(e => ({
        nom: e.nom,
        poste: e.poste,
        dept: e.dept,
        brut: e.brut || 0,
        prime: e.prime || 0,
        avance: e.avance || 0,
        net: e.net || 0,
        paiements: Array.isArray(e.paiements) ? e.paiements.slice() : [],
      })),
    };

    // Remplace une éventuelle clôture existante du même mois
    Data.empHistorique = Data.empHistorique.filter(h => h.ym !== ym);
    Data.empHistorique.push(snapshot);
    Data.empHistorique.sort((a, b) => b.ym.localeCompare(a.ym));

    // Reset des compteurs employés (brut conservé)
    list.forEach(e => {
      e.prime  = 0;
      e.avance = 0;
      e.net    = Number(e.brut) || 0;
      e.paiements = [];
    });

    this.save();
    this.persistHist();

    try {
      if (typeof Audit !== 'undefined') Audit.log('create', 'employes',
        `Clôture mois ${ym}`,
        `${snapshot.totaux.effectif} employés · net ${Data.fmt(snapshot.totaux.net)}`,
        { after: snapshot.totaux });
    } catch (err) {}

    App.closeModal();
    App.renderAll();
  },

  renderHistorique() {
    const container = document.getElementById('emp-historique');
    if (!container) return;
    const items = (Data.empHistorique || []).slice().sort((a, b) => b.ym.localeCompare(a.ym));
    if (!items.length) {
      container.innerHTML = '';
      return;
    }
    const rows = items.map(h => `
      <tr>
        <td class="fw-bold">${this._moisFr(h.ym)}</td>
        <td class="text-right">${h.totaux?.effectif ?? (h.employes?.length || 0)}</td>
        <td class="text-right">${Data.fmt(h.totaux?.brut   || 0)}</td>
        <td class="text-right text-green">${Data.fmt(h.totaux?.prime  || 0)}</td>
        <td class="text-right text-red">${Data.fmt(h.totaux?.avance || 0)}</td>
        <td class="text-right fw-bold">${Data.fmt(h.totaux?.net    || 0)}</td>
        <td style="color:var(--c-muted);font-size:11px">${h.closedAt ? new Date(h.closedAt).toLocaleDateString('fr-FR') : '—'}</td>
        <td class="nowrap">
          <button class="btn btn-sm" onclick="Employes.openHistorique('${h.ym}')"><i class="ti ti-eye"></i> Consulter</button>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;gap:8px">
          <i class="ti ti-history"></i>
          <span style="font-weight:700">Historique mensuel</span>
          <span style="color:var(--c-muted);font-size:12px">— ${items.length} clôture(s)</span>
        </div>
        <table>
          <thead><tr>
            <th>Mois</th>
            <th class="text-right">Effectif</th>
            <th class="text-right">Brut</th>
            <th class="text-right">Primes</th>
            <th class="text-right">Avances</th>
            <th class="text-right">Net</th>
            <th>Clôturé le</th>
            <th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  openHistorique(ym) {
    const h = (Data.empHistorique || []).find(x => x.ym === ym);
    if (!h) return;
    const rows = (h.employes || []).map(e => {
      const lastPay = Array.isArray(e.paiements) && e.paiements.length
        ? e.paiements.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]
        : null;
      return `
        <tr>
          <td class="fw-bold">${this._escape(e.nom)}</td>
          <td>${this._escape(e.poste || '-')}</td>
          <td><span class="badge ${e.dept==='BAR'?'b-green':e.dept==='CHICHA'?'b-amber':'b-blue'}">${e.dept}</span></td>
          <td class="text-right">${Data.fmts(e.brut)}</td>
          <td class="text-right text-green">${e.prime ? '+' + Data.fmts(e.prime) : '-'}</td>
          <td class="text-right text-red">${e.avance ? Data.fmts(e.avance) : '-'}</td>
          <td class="text-right fw-bold">${Data.fmts(e.net)}</td>
          <td style="font-size:11px;color:var(--c-muted)">${lastPay ? `${Data.fmtDs(lastPay.date)} · ${lastPay.mode==='esp'?'💵':lastPay.mode==='banque'?'🏦':'📱'} ${Data.fmts(lastPay.montant)}` : '—'}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="8" class="empty">Aucun employé archivé</td></tr>';

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:920px;width:95vw">
          <div class="modal-title">
            <i class="ti ti-history"></i> Archive — ${this._moisFr(h.ym)}
            ${h.closedBy ? `<span style="font-size:11px;color:var(--c-muted);margin-left:8px">par ${this._escape(h.closedBy)}</span>` : ''}
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
            <div class="mc blue"><div class="mc-label blue">Effectif</div><div class="mc-val blue">${h.totaux?.effectif ?? 0}</div></div>
            <div class="mc"><div class="mc-label">Brut</div><div class="mc-val">${Data.fmt(h.totaux?.brut || 0)}</div></div>
            <div class="mc"><div class="mc-label">Avances</div><div class="mc-val" style="color:var(--c-red)">${Data.fmt(h.totaux?.avance || 0)}</div></div>
            <div class="mc"><div class="mc-label">Net versé</div><div class="mc-val">${Data.fmt(h.totaux?.net || 0)}</div></div>
          </div>

          <div style="max-height:55vh;overflow:auto">
            <table>
              <thead><tr>
                <th>Nom</th><th>Poste</th><th>Dept</th>
                <th class="text-right">Brut</th>
                <th class="text-right">Prime</th>
                <th class="text-right">Avance</th>
                <th class="text-right">Net</th>
                <th>Dernier paiement</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>

          <div class="modal-actions">
            ${(typeof Auth === 'undefined' || (Auth.profile && Auth.profile.role === 'admin'))
              ? `<button class="btn" style="color:var(--c-red)" onclick="Employes.deleteHistorique('${h.ym}')"><i class="ti ti-trash"></i> Supprimer cette archive</button>`
              : ''}
            <button class="btn btn-primary" onclick="App.closeModal()">Fermer</button>
          </div>
        </div>
      </div>`);
  },

  deleteHistorique(ym) {
    if (!confirm(`Supprimer définitivement l'archive de ${this._moisFr(ym)} ?`)) return;
    Data.empHistorique = (Data.empHistorique || []).filter(h => h.ym !== ym);
    this.persistHist();
    App.closeModal();
    this.renderHistorique();
  },

  openModal(idx) {
    const editing = idx != null && idx >= 0;
    const e = editing ? Data.employes[idx] : { nom: '', poste: '', dept: 'BAR', brut: 0, prime: 0, avance: 0 };
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${editing ? 'Modifier' : 'Nouvel'} employé</div>
          <div class="fg"><label class="fl">Nom complet</label><input type="text" id="emp-nom" value="${e.nom}" placeholder="Ex: DUPONT JEAN"></div>
          <div class="fr">
            <div class="fg"><label class="fl">Poste</label><input type="text" id="emp-poste" value="${e.poste}" placeholder="Ex: SERVEUR"></div>
            <div class="fg"><label class="fl">Département</label>
              <select id="emp-dept">
                <option value="BAR" ${e.dept==='BAR'?'selected':''}>BAR</option>
                <option value="RESTAURANT" ${e.dept==='RESTAURANT'?'selected':''}>RESTAURANT</option>
                <option value="CHICHA" ${e.dept==='CHICHA'?'selected':''}>CHICHA</option>
              </select>
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Salaire brut (FCFA)</label><input type="number" id="emp-modal-brut" value="${e.brut || ''}" placeholder="0" oninput="Employes._calcNet()"></div>
            <div class="fg"><label class="fl">Prime (FCFA)</label><input type="number" id="emp-modal-prime" value="${e.prime || ''}" placeholder="0" oninput="Employes._calcNet()"></div>
            <div class="fg"><label class="fl">Avance (FCFA)</label><input type="number" id="emp-modal-avance" value="${e.avance || ''}" placeholder="0" oninput="Employes._calcNet()"></div>
          </div>
          <div style="background:var(--c-surface);padding:12px;border-radius:8px;margin:8px 0;text-align:center">
            <span style="font-size:12px;color:var(--c-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600">Salaire net</span>
            <div id="emp-net-disp" style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--c-bar)">0 FCFA</div>
            <span style="font-size:11px;color:var(--c-muted)">Brut + Prime − Avance</span>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Employes.save_(${editing ? idx : -1})">Enregistrer</button>
          </div>
        </div>
      </div>`);
    this._calcNet();
  },

  _calcNet() {
    const brut = parseFloat(document.getElementById('emp-modal-brut')?.value) || 0;
    const prime = parseFloat(document.getElementById('emp-modal-prime')?.value) || 0;
    const avance = parseFloat(document.getElementById('emp-modal-avance')?.value) || 0;
    const net = brut + prime - avance;
    const el = document.getElementById('emp-net-disp');
    if (el) el.textContent = Data.fmt(net);
  },

  save_(idx) {
    const nom = document.getElementById('emp-nom')?.value.trim();
    if (!nom) { alert('Le nom est requis'); return; }
    const brut = parseFloat(document.getElementById('emp-modal-brut')?.value) || 0;
    const prime = parseFloat(document.getElementById('emp-modal-prime')?.value) || 0;
    const avance = parseFloat(document.getElementById('emp-modal-avance')?.value) || 0;
    const entry = {
      nom,
      poste: document.getElementById('emp-poste')?.value.trim() || '',
      dept: document.getElementById('emp-dept')?.value || 'BAR',
      brut, prime, avance,
      net: brut + prime - avance,
    };
    const isUpdate = idx >= 0;
    if (isUpdate) Data.employes[idx] = { ...Data.employes[idx], ...entry };
    else Data.employes.push(entry);
    try {
      if (typeof Audit !== 'undefined') Audit.log(isUpdate ? 'update' : 'create', 'employes',
        `Employé ${entry.nom}`,
        `${entry.poste || ''} · ${entry.dept} · net ${Data.fmt(entry.net)}`,
        { after: entry });
    } catch (e) {}
    this.save();
    App.closeModal();
    this.render();
  },

  delete(idx) {
    if (!confirm('Supprimer cet employé ?')) return;
    const removed = Data.employes[idx];
    Data.employes.splice(idx, 1);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'employes',
        `Employé ${removed?.nom || ''}`,
        removed ? `${removed.poste || ''} · ${removed.dept}` : null,
        { before: removed });
    } catch (e) {}
    this.save();
    this.render();
  },

  // ===================== PAIEMENT EMPLOYÉ =====================
  // Crée une dépense ("Salaires") qui impacte la journée et les soldes
  // selon le mode de règlement (espèces / banque / mobile).
  openPayModal(idx) {
    const e = Data.employes[idx];
    if (!e) return;
    const deptDefault = e.dept === 'RESTAURANT' ? 'SUSHI' : (e.dept || 'BAR');
    const montantDefault = e.net || 0;
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title"><i class="ti ti-cash"></i> Payer ${this._escape(e.nom)}</div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label>
              <input type="date" id="pay-date" value="${Data.today()}"></div>
            <div class="fg"><label class="fl">Montant (FCFA)</label>
              <input type="number" id="pay-montant" min="0" step="any" value="${montantDefault}"></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Type</label>
              <select id="pay-type">
                <option value="salaire">💼 Salaire</option>
                <option value="avance">⏬ Avance</option>
                <option value="prime">⭐ Prime</option>
              </select>
            </div>
            <div class="fg"><label class="fl">Mode de règlement</label>
              <select id="pay-mode">
                <option value="esp">💵 Espèces (caisse)</option>
                <option value="banque">🏦 Banque</option>
                <option value="mobile">📱 Mobile Money</option>
              </select>
            </div>
            <div class="fg"><label class="fl">Caisse impactée</label>
              <select id="pay-dept">
                <option value="SUSHI"  ${deptDefault==='SUSHI'?'selected':''}>SUSHI</option>
                <option value="BAR"    ${deptDefault==='BAR'?'selected':''}>BAR</option>
                <option value="CHICHA" ${deptDefault==='CHICHA'?'selected':''}>CHICHA</option>
              </select>
            </div>
          </div>
          <div class="fg"><label class="fl">Observation (optionnel)</label>
            <input type="text" id="pay-obs" placeholder="Salaire mai, prime, avance..."></div>
          <div style="background:var(--c-surface);padding:10px 12px;border-radius:8px;font-size:12px;color:var(--c-muted);margin:6px 0">
            <i class="ti ti-info-circle"></i> Cette opération crée une dépense qui réduit votre caisse, banque ou mobile. Si le type est « Avance » ou « Prime », le montant met à jour la colonne correspondante de l'employé et recalcule le net.
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Employes.confirmPay(${idx})"><i class="ti ti-check"></i> Valider le paiement</button>
          </div>
        </div>
      </div>`);
  },

  confirmPay(idx) {
    const e = Data.employes[idx];
    if (!e) return;
    const date    = document.getElementById('pay-date')?.value || Data.today();
    const montant = parseFloat(document.getElementById('pay-montant')?.value) || 0;
    const mode    = document.getElementById('pay-mode')?.value || 'esp';
    const dept    = document.getElementById('pay-dept')?.value || 'BAR';
    const type    = document.getElementById('pay-type')?.value || 'salaire';
    const obs     = document.getElementById('pay-obs')?.value.trim() || '';
    if (montant <= 0) { alert('Le montant doit être supérieur à 0.'); return; }

    if (typeof Clotures !== 'undefined' && Clotures.isMonthClosed && Clotures.isMonthClosed(date)) {
      alert('Le mois de cette date est clôturé : paiement bloqué.');
      return;
    }

    const typeLabel = { salaire: 'Salaire', avance: 'Avance', prime: 'Prime' }[type] || 'Salaire';
    const typeGroupe = { salaire: 'Salaires', avance: 'Personnel', prime: 'Personnel' }[type];

    const userId = Data.newId();
    const depense = {
      userId,
      date,
      dept,
      label:  `${typeLabel} ${e.nom}`,
      groupe: typeGroupe,
      qte:    null,
      prix:   null,
      montant,
      observation: obs || `${typeLabel} ${e.nom} (${e.poste || ''})`.trim(),
      paiement: mode,
      empNom: e.nom,
      payType: type,
    };
    Data.histDep.push(depense);

    // Persistance via le module Dépenses
    if (typeof Depenses !== 'undefined' && Depenses.persist) Depenses.persist();

    // Mise à jour des compteurs employé selon le type
    if (type === 'avance') {
      e.avance = (Number(e.avance) || 0) + montant;
    } else if (type === 'prime') {
      e.prime = (Number(e.prime) || 0) + montant;
    }
    // Recalcule le net (brut + prime - avance) quoi qu'il arrive
    e.net = (Number(e.brut) || 0) + (Number(e.prime) || 0) - (Number(e.avance) || 0);

    // Trace dans l'historique de l'employé
    e.paiements = Array.isArray(e.paiements) ? e.paiements : [];
    e.paiements.push({ id: userId, date, montant, mode, dept, type });
    this.save();

    try {
      if (typeof Audit !== 'undefined') Audit.log('create', 'depenses',
        `${typeLabel} ${e.nom}`,
        `${Data.fmt(montant)} · ${mode} · ${dept}`,
        { id: userId, after: depense });
    } catch (err) {}

    App.closeModal();
    App.renderAll();
  },

  _escape(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  // ===================== FICHE DE DETTE =====================

  _detteSolde(d) {
    const paye = (d.reglements || []).reduce((s, r) => s + (r.montant || 0), 0);
    return Math.max(0, (d.montant || 0) - paye);
  },

  _detteTotaux(e) {
    const dettes = Array.isArray(e.dettes) ? e.dettes : [];
    const totalDette = dettes.reduce((s, d) => s + (d.montant || 0), 0);
    const totalRegle = dettes.reduce((s, d) => s + (d.reglements || []).reduce((sr, r) => sr + (r.montant || 0), 0), 0);
    return { totalDette, totalRegle, soldeRestant: Math.max(0, totalDette - totalRegle) };
  },

  openFicheDette(idx) {
    const e = Data.employes[idx];
    if (!e) return;
    this._renderFicheDette(idx);
  },

  _renderFicheDette(idx) {
    const e = Data.employes[idx];
    if (!e) return;
    const dettes = Array.isArray(e.dettes) ? e.dettes : [];
    const { totalDette, totalRegle, soldeRestant } = this._detteTotaux(e);

    const lignesDettes = dettes.length ? dettes.map((d, di) => {
      const solde = this._detteSolde(d);
      const paye = (d.reglements || []).reduce((s, r) => s + (r.montant || 0), 0);
      const statut = solde <= 0 ? `<span class="badge b-green">Réglé</span>` : `<span class="badge b-red">Solde : ${Data.fmts(solde)}</span>`;
      const lignesReg = (d.reglements || []).map(r =>
        `<div style="font-size:11px;color:var(--c-muted);padding:2px 0 2px 12px">
          ↳ ${Data.fmtDs(r.date)} · Règlement ${Data.fmts(r.montant)} · Caisse ${r.caisse}
         </div>`).join('');
      const btnRegler = solde > 0
        ? `<button class="btn btn-sm btn-primary" onclick="Employes.openReglementDette(${idx}, ${di})" style="margin-top:4px"><i class="ti ti-coin"></i> Régler</button>`
        : '';
      return `
        <div style="background:var(--c-surface);border-radius:8px;padding:10px 12px;margin-bottom:8px;border:1px solid var(--c-border)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div>
              <div style="font-weight:600;font-size:13px">${this._escape(d.motif)}</div>
              <div style="font-size:11px;color:var(--c-muted)">${Data.fmtDs(d.date)} · Montant initial : ${Data.fmts(d.montant)}</div>
              ${lignesReg}
            </div>
            <div style="text-align:right;flex-shrink:0">
              ${statut}
              ${btnRegler}
            </div>
          </div>
        </div>`;
    }).join('') : `<div class="empty" style="padding:16px 0;text-align:center;color:var(--c-muted)">Aucune dette enregistrée</div>`;

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:560px">
          <div class="modal-title"><i class="ti ti-receipt-2"></i> Fiche de dette — ${this._escape(e.nom)}</div>

          <div class="fr" style="gap:8px;margin-bottom:12px">
            <div style="flex:1;background:var(--c-surface);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:11px;color:var(--c-muted);text-transform:uppercase;letter-spacing:1px">Total dette</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--c-red)">${Data.fmts(totalDette)}</div>
            </div>
            <div style="flex:1;background:var(--c-surface);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:11px;color:var(--c-muted);text-transform:uppercase;letter-spacing:1px">Déjà réglé</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--c-green)">${Data.fmts(totalRegle)}</div>
            </div>
            <div style="flex:1;background:var(--c-surface);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:11px;color:var(--c-muted);text-transform:uppercase;letter-spacing:1px">Reste à régler</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:800;color:${soldeRestant>0?'var(--c-red)':'var(--c-green)'}">${Data.fmts(soldeRestant)}</div>
            </div>
          </div>

          <div style="font-size:12px;color:var(--c-muted);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Détail des dettes</div>
          <div id="dette-liste" style="max-height:260px;overflow-y:auto">${lignesDettes}</div>

          <div style="border-top:1px solid var(--c-border);margin-top:12px;padding-top:12px">
            <div style="font-size:12px;color:var(--c-muted);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Ajouter une nouvelle dette</div>
            <div class="fr">
              <div class="fg"><label class="fl">Date</label><input type="date" id="nd-date" value="${Data.today()}"></div>
              <div class="fg"><label class="fl">Montant (FCFA)</label><input type="number" id="nd-montant" min="1" placeholder="0"></div>
            </div>
            <div class="fg"><label class="fl">Motif / Description</label><input type="text" id="nd-motif" placeholder="Ex: Avance sur marchandises, prêt personnel..."></div>
          </div>

          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Fermer</button>
            <button class="btn btn-primary" onclick="Employes.saveDette(${idx})"><i class="ti ti-plus"></i> Enregistrer la dette</button>
          </div>
        </div>
      </div>`);
  },

  saveDette(idx) {
    const e = Data.employes[idx];
    if (!e) return;
    const date = document.getElementById('nd-date')?.value || Data.today();
    const montant = parseFloat(document.getElementById('nd-montant')?.value) || 0;
    const motif = document.getElementById('nd-motif')?.value.trim() || '';
    if (montant <= 0) { alert('Le montant doit être supérieur à 0.'); return; }
    if (!motif) { alert('Le motif est requis.'); return; }

    if (!Array.isArray(e.dettes)) e.dettes = [];
    const dette = { id: Data.newId(), date, motif, montant, reglements: [] };
    e.dettes.push(dette);

    try {
      if (typeof Audit !== 'undefined') Audit.log('create', 'employes',
        `Dette ${e.nom}`, `${motif} · ${Data.fmt(montant)}`, { after: dette });
    } catch(err) {}

    this.save();
    this._renderFicheDette(idx);
  },

  openReglementDette(empIdx, detteIdx) {
    const e = Data.employes[empIdx];
    if (!e) return;
    const d = (e.dettes || [])[detteIdx];
    if (!d) return;
    const solde = this._detteSolde(d);
    const deptDefault = e.dept === 'RESTAURANT' ? 'SUSHI' : (e.dept || 'BAR');

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title"><i class="ti ti-coin"></i> Règlement de dette — ${this._escape(e.nom)}</div>
          <div style="background:var(--c-surface);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px">
            <div style="font-weight:600">${this._escape(d.motif)}</div>
            <div style="color:var(--c-muted);font-size:12px">Dette initiale : ${Data.fmts(d.montant)} · Solde restant : <strong style="color:var(--c-red)">${Data.fmts(solde)}</strong></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label><input type="date" id="reg-date" value="${Data.today()}"></div>
            <div class="fg"><label class="fl">Montant à régler (FCFA)</label><input type="number" id="reg-montant" min="1" max="${solde}" value="${solde}" placeholder="0"></div>
          </div>
          <div class="fg"><label class="fl">Caisse impactée</label>
            <select id="reg-caisse">
              <option value="SUSHI"  ${deptDefault==='SUSHI'?'selected':''}>SUSHI</option>
              <option value="BAR"    ${deptDefault==='BAR'?'selected':''}>BAR</option>
              <option value="CHICHA" ${deptDefault==='CHICHA'?'selected':''}>CHICHA</option>
            </select>
          </div>
          <div style="background:var(--c-surface);padding:10px 12px;border-radius:8px;font-size:12px;color:var(--c-muted);margin:6px 0">
            <i class="ti ti-info-circle"></i> Ce règlement crée une dépense sur la caisse sélectionnée et déduit le montant du salaire net restant à payer à l'employé.
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="Employes.openFicheDette(${empIdx})">Retour</button>
            <button class="btn btn-primary" onclick="Employes.confirmReglementDette(${empIdx}, ${detteIdx})"><i class="ti ti-check"></i> Valider le règlement</button>
          </div>
        </div>
      </div>`);
  },

  confirmReglementDette(empIdx, detteIdx) {
    const e = Data.employes[empIdx];
    if (!e) return;
    const d = (e.dettes || [])[detteIdx];
    if (!d) return;
    const solde = this._detteSolde(d);

    const date    = document.getElementById('reg-date')?.value || Data.today();
    const montant = parseFloat(document.getElementById('reg-montant')?.value) || 0;
    const caisse  = document.getElementById('reg-caisse')?.value || 'BAR';

    if (montant <= 0) { alert('Le montant doit être supérieur à 0.'); return; }
    if (montant > solde + 0.01) { alert(`Le montant ne peut pas dépasser le solde restant (${Data.fmts(solde)}).`); return; }

    if (typeof Clotures !== 'undefined' && Clotures.isMonthClosed && Clotures.isMonthClosed(date)) {
      alert('Le mois de cette date est clôturé : règlement bloqué.');
      return;
    }

    // Enregistre le règlement sur la dette
    if (!Array.isArray(d.reglements)) d.reglements = [];
    const regId = Data.newId();
    d.reglements.push({ id: regId, date, montant, caisse });

    // Déduit du salaire net : on augmente l'avance (net = brut + prime - avance)
    e.avance = (Number(e.avance) || 0) + montant;
    e.net = (Number(e.brut) || 0) + (Number(e.prime) || 0) - (Number(e.avance) || 0);

    // Crée une dépense qui impact la caisse
    const depense = {
      userId: regId,
      date,
      dept: caisse,
      label: `Règlement dette ${e.nom}`,
      groupe: 'Personnel',
      qte: null, prix: null,
      montant,
      observation: `Règlement dette : ${d.motif}`,
      paiement: 'esp',
      empNom: e.nom,
      payType: 'dette',
    };
    Data.histDep.push(depense);
    if (typeof Depenses !== 'undefined' && Depenses.persist) Depenses.persist();

    try {
      if (typeof Audit !== 'undefined') Audit.log('create', 'depenses',
        `Règlement dette ${e.nom}`, `${Data.fmt(montant)} · caisse ${caisse} · ${d.motif}`,
        { id: regId, after: depense });
    } catch(err) {}

    this.save();
    App.renderAll();
    this.openFicheDette(empIdx);
  },

  render() {
    const filter = App.filters.emp;
    const list = filter === 'all' ? Data.employes : Data.employes.filter(e => e.dept === filter);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    const totBrut = list.reduce((s, e) => s + (e.brut || 0), 0);
    const totAvance = list.reduce((s, e) => s + (e.avance || 0), 0);
    const totDettes = list.reduce((s, e) => s + this._detteTotaux(e).soldeRestant, 0);
    set('emp-effectif', list.length);
    set('emp-brut', Data.fmt(totBrut));
    set('emp-avances', Data.fmt(totAvance));
    const elDettes = document.getElementById('emp-dettes-total');
    if (elDettes) elDettes.textContent = Data.fmt(totDettes);

    const tb = document.getElementById('emp-table');
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="9" class="empty">Aucun employé</td></tr>';
      return;
    }
    tb.innerHTML = list.map((e) => {
      const realIdx = Data.employes.indexOf(e);
      const lastPay = Array.isArray(e.paiements) && e.paiements.length
        ? e.paiements.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]
        : null;
      const lastLabel = lastPay
        ? `<div style="font-size:10.5px;color:var(--c-muted);margin-top:2px">Payé le ${Data.fmtDs(lastPay.date)} · ${lastPay.mode==='esp'?'💵':lastPay.mode==='banque'?'🏦':'📱'} ${Data.fmts(lastPay.montant)}</div>`
        : '';
      const { soldeRestant } = this._detteTotaux(e);
      const detteBadge = soldeRestant > 0
        ? `<span class="badge b-red" style="margin-left:4px;font-size:10px" title="Dette restante">Dette ${Data.fmts(soldeRestant)}</span>`
        : '';
      return `
      <tr data-search-id="emp:${this._escape(e.nom)}">
        <td class="fw-bold">${e.nom}${lastLabel}</td>
        <td>${e.poste || '-'}</td>
        <td><span class="badge ${e.dept==='BAR'?'b-green':e.dept==='CHICHA'?'b-amber':'b-blue'}">${e.dept}</span></td>
        <td class="text-right">${Data.fmts(e.brut)}</td>
        <td class="text-right text-green">${e.prime ? '+' + Data.fmts(e.prime) : '-'}</td>
        <td class="text-right text-red">${e.avance ? Data.fmts(e.avance) : '-'}</td>
        <td class="text-right fw-bold">${Data.fmts(e.net)}${detteBadge}</td>
        <td class="nowrap">
          <button class="btn btn-sm btn-primary" onclick="Employes.openPayModal(${realIdx})" title="Payer cet employé"><i class="ti ti-cash"></i> Payer</button>
          <button class="btn btn-sm" onclick="Employes.openFicheDette(${realIdx})" title="Fiche de dette" style="${soldeRestant>0?'color:var(--c-red);font-weight:600':''}"><i class="ti ti-receipt-2"></i> Dettes</button>
          <button class="btn btn-sm" onclick="Employes.openModal(${realIdx})" title="Modifier"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm" onclick="Employes.delete(${realIdx})" title="Supprimer" style="color:var(--c-red)"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');

    this.renderHistorique();
  },
};

