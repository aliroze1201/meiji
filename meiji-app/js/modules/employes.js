/**
 * employes.js — Fiche des employés (salaires, primes, avances).
 */

// ===================== EMPLOYÉS =====================
const Employes = {
  STORAGE_KEY: 'meiji-employes',

  save() {
    AppDB.save(this.STORAGE_KEY, Data.employes);
  },

  async restore() {
    const arr = await AppDB.load(this.STORAGE_KEY);
    if (Array.isArray(arr)) Data.employes = arr;
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
            <div class="fg"><label class="fl">Prime (FCFA)</label><input type="number" id="emp-modal-prime" value="${e.prime || ''}" data-orig="${e.prime || 0}" placeholder="0" oninput="Employes._calcNet();Employes._flagPayField('prime')"></div>
            <div class="fg"><label class="fl">Avance (FCFA)</label><input type="number" id="emp-modal-avance" value="${e.avance || ''}" data-orig="${e.avance || 0}" placeholder="0" oninput="Employes._calcNet();Employes._flagPayField('avance')"></div>
          </div>
          <div id="emp-pay-warn" style="display:none;background:var(--c-warning-soft);border-left:4px solid var(--c-warning);padding:10px 12px;border-radius:6px;margin:8px 0;font-size:13px;color:var(--c-text)">
            <b style="color:var(--c-warning-2)">⚠ Avance / Prime modifiée à la main</b><br>
            Cette modification <b>ne crée pas de dépense</b> et n'apparaîtra <b>pas dans la journée</b> ni dans la caisse.
            Pour qu'un paiement soit déduit du cash, utilisez le bouton <b>« Payer »</b> sur la ligne de l'employé.
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

  // Affiche le bandeau d'avertissement si la valeur courante diffère
  // de la valeur initiale (= modification manuelle sans passer par « Payer »).
  _flagPayField() {
    const warn = document.getElementById('emp-pay-warn');
    if (!warn) return;
    const fields = ['emp-modal-prime', 'emp-modal-avance'];
    const changed = fields.some(id => {
      const el = document.getElementById(id);
      if (!el) return false;
      const cur  = parseFloat(el.value) || 0;
      const orig = parseFloat(el.dataset.orig) || 0;
      return cur !== orig;
    });
    warn.style.display = changed ? 'block' : 'none';
  },

  save_(idx) {
    const nom = document.getElementById('emp-nom')?.value.trim();
    if (!nom) { alert('Le nom est requis'); return; }
    const brut = parseFloat(document.getElementById('emp-modal-brut')?.value) || 0;
    const prime = parseFloat(document.getElementById('emp-modal-prime')?.value) || 0;
    const avance = parseFloat(document.getElementById('emp-modal-avance')?.value) || 0;

    // Si l'utilisateur modifie l'avance/prime à la main (au lieu de passer
    // par « Payer »), demander confirmation : aucune dépense ne sera créée
    // et la journée/caisse ne verra pas le mouvement.
    if (idx >= 0) {
      const orig = Data.employes[idx] || {};
      const primeOrig  = Number(orig.prime)  || 0;
      const avanceOrig = Number(orig.avance) || 0;
      const diffs = [];
      if (prime  !== primeOrig)  diffs.push(`Prime : ${Data.fmt(primeOrig)} → ${Data.fmt(prime)}`);
      if (avance !== avanceOrig) diffs.push(`Avance : ${Data.fmt(avanceOrig)} → ${Data.fmt(avance)}`);
      if (diffs.length) {
        const msg = [
          '⚠ Modification manuelle Avance/Prime',
          '',
          ...diffs,
          '',
          "Cette modification ne crée AUCUNE dépense :",
          "• la journée ne sera pas impactée,",
          "• la caisse (cash / banque / mobile) ne sera pas débitée.",
          '',
          "Pour qu'un paiement apparaisse dans la journée, utilisez le bouton « Payer » sur la ligne de l'employé.",
          '',
          'Continuer quand même (ajustement comptable uniquement) ?'
        ].join('\n');
        if (!confirm(msg)) return;
      }
    }

    const entry = {
      nom,
      poste: document.getElementById('emp-poste')?.value.trim() || '',
      dept: document.getElementById('emp-dept')?.value || 'BAR',
      brut, prime, avance,
      net: brut + prime - avance,
    };
    const isUpdate = idx >= 0;
    if (isUpdate) Data.employes[idx] = entry;
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

  render() {
    const filter = App.filters.emp;
    const list = filter === 'all' ? Data.employes : Data.employes.filter(e => e.dept === filter);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    const totBrut = list.reduce((s, e) => s + (e.brut || 0), 0);
    const totAvance = list.reduce((s, e) => s + (e.avance || 0), 0);
    set('emp-effectif', list.length);
    set('emp-brut', Data.fmt(totBrut));
    set('emp-avances', Data.fmt(totAvance));

    const tb = document.getElementById('emp-table');
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="8" class="empty">Aucun employé</td></tr>';
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
      return `
      <tr data-search-id="emp:${this._escape(e.nom)}">
        <td class="fw-bold">${e.nom}${lastLabel}</td>
        <td>${e.poste || '-'}</td>
        <td><span class="badge ${e.dept==='BAR'?'b-green':e.dept==='CHICHA'?'b-amber':'b-blue'}">${e.dept}</span></td>
        <td class="text-right">${Data.fmts(e.brut)}</td>
        <td class="text-right text-green">${e.prime ? '+' + Data.fmts(e.prime) : '-'}</td>
        <td class="text-right text-red">${e.avance ? Data.fmts(e.avance) : '-'}</td>
        <td class="text-right fw-bold">${Data.fmts(e.net)}</td>
        <td class="nowrap">
          <button class="btn btn-sm btn-primary" onclick="Employes.openPayModal(${realIdx})" title="Payer cet employé"><i class="ti ti-cash"></i> Payer</button>
          <button class="btn btn-sm" onclick="Employes.openModal(${realIdx})" title="Modifier"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm" onclick="Employes.delete(${realIdx})" title="Supprimer" style="color:var(--c-red)"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  },
};

