/**
 * associes.js — Suivi de la répartition des bénéfices BAR + CHICHA
 *
 * Modèle « un seul pot commun » :
 *  - SUSHI/RESTAURANT reste 100 % à l'utilisateur, hors calcul.
 *  - BAR + CHICHA fusionnés en un seul pot.
 *  - Le bénéfice de ce pot est réparti par % entre les associés.
 *  - Les prélèvements (avances) sont des distributions de bénéfice, pas
 *    des charges d'exploitation : ils n'entrent PAS dans le calcul du bénéfice.
 *  - Impact cash : prélèvements espèces -> sortie automatique sur la caisse BAR
 *    (cf. Data.cashOutOnDate). Banque/Mobile -> dashboard solde théorique.
 */

const Associes = {
  STORAGE_ASSOC: 'meiji-associes',
  STORAGE_PRELV: 'meiji-prelevements',
  editAssocId: null,
  editPrelvId: null,

  MOIS: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],

  // ===== Helpers =====
  ymOf(date) { return (date || '').slice(0, 7); },

  monthLabel(ym) {
    if (!ym || ym.length < 7) return '—';
    const m = parseInt(ym.slice(5, 7), 10);
    const y = ym.slice(0, 4);
    return (this.MOIS[m - 1] || '?') + ' ' + y;
  },

  // Étiquette de la période globale (utilisée dans le KPI)
  periodLabel() {
    if (typeof App === 'undefined') return '—';
    if (App.period === 'tout')  return 'Tout';
    if (App.period === 'jour')  return 'Jour';
    if (App.period === 'annee') {
      const y = document.getElementById('sel-annee2');
      return 'Année ' + (y?.value || '');
    }
    if (App.period === 'plage') {
      const d = document.getElementById('sel-debut');
      const f = document.getElementById('sel-fin');
      return 'Plage ' + (d?.value || '?') + ' → ' + (f?.value || '?');
    }
    if (App.period === 'mois') {
      const m = document.getElementById('sel-mois');
      const y = document.getElementById('sel-annee');
      if (m && y) return this.monthLabel(y.value + '-' + String(m.value).padStart(2, '0'));
    }
    return '—';
  },

  // ===== Sources filtrées par la période globale =====
  _filteredJournees() {
    return (typeof App !== 'undefined' && App.filterJournees)
      ? App.filterJournees()
      : (Data.journees || []);
  },
  _filteredDeps() {
    return (typeof App !== 'undefined' && App.filterByDate)
      ? App.filterByDate(Data.getAllDeps())
      : Data.getAllDeps();
  },
  _filteredPrelv() {
    return (typeof App !== 'undefined' && App.filterByDate)
      ? App.filterByDate(Data.prelevements || [])
      : (Data.prelevements || []);
  },

  // Mois distincts couverts par la période (utile pour les salaires théoriques)
  _monthsInPeriod() {
    const set = new Set();
    this._filteredJournees().forEach(j => { if (j.date) set.add(this.ymOf(j.date)); });
    this._filteredDeps().forEach(d => { if (d.date) set.add(this.ymOf(d.date)); });
    return [...set].filter(Boolean);
  },

  // Détecte une dépense qui est en réalité un transfert vers la banque ou
  // mobile money : ce n'est pas une charge d'exploitation, donc exclu du pot.
  _isTransfert(d) {
    const g = (d.groupe || '').toLowerCase();
    const l = (d.label || '').toUpperCase();
    if (g === 'transfert' || g === 'transferts' || g === 'virement') return true;
    if (/^(VERSEMENT|VERSE|TRANSFERT|VIREMENT|DEPOT|DÉPÔT|DEPOSE) (BANQUE|BK|MOBILE|MOMO|MM)/.test(l)) return true;
    if (/(VERSEMENT|TRANSFERT|VIREMENT).*BANQUE/.test(l)) return true;
    if (/(VERSEMENT|TRANSFERT).*MOBILE/.test(l)) return true;
    return false;
  },

  // CA du pot BAR + CHICHA sur la période globale
  caPot() {
    return this._filteredJournees()
      .reduce((s, j) => s + Data.caisse(j, 'b') + Data.caisse(j, 'c'), 0);
  },

  // Charges du pot = dépenses BAR + CHICHA sur la période, hors transferts
  // cash→banque ou cash→mobile (qui sont des mouvements de trésorerie, pas
  // des charges). Les transferts saisis via l'onglet Banque ne sont déjà pas
  // dans getAllDeps() — cette exclusion couvre le cas d'une saisie manuelle
  // dans Dépenses.
  chargesPot() {
    return this._filteredDeps()
      .filter(d => (d.dept === 'BAR' || d.dept === 'CHICHA') && !this._isTransfert(d))
      .reduce((s, d) => s + (Number(d.montant) || 0), 0);
  },

  // Détail des charges pour affichage UI : nombre de lignes de dépenses
  _chargesBreakdown() {
    const allDepsFiltered = this._filteredDeps()
      .filter(d => (d.dept === 'BAR' || d.dept === 'CHICHA') && !this._isTransfert(d));
    const transferts = this._filteredDeps()
      .filter(d => (d.dept === 'BAR' || d.dept === 'CHICHA') && this._isTransfert(d))
      .reduce((s, d) => s + (Number(d.montant) || 0), 0);
    return { nbLignes: allDepsFiltered.length, transferts };
  },

  beneficePot() { return this.caPot() - this.chargesPot(); },

  // Prélèvements d'un associé sur la période globale
  prelvAssocPeriode(assocId) {
    return this._filteredPrelv()
      .filter(p => p.associeId === assocId)
      .reduce((s, p) => s + (Number(p.montant) || 0), 0);
  },

  sommeParts() {
    return (Data.associes || []).filter(a => a.actif)
      .reduce((s, a) => s + (Number(a.part) || 0), 0);
  },

  // ===================== RENDER =====================
  render() {
    if (!Array.isArray(Data.associes)) Data.associes = [];
    if (!Array.isArray(Data.prelevements)) Data.prelevements = [];

    const ca = this.caPot();
    const charges = this.chargesPot();
    const benef = ca - charges;

    // Détail des charges pour affichage transparent
    const breakdown = this._chargesBreakdown();
    const subEl = document.getElementById('assoc-charges-sub');
    if (subEl) {
      const parts = [];
      if (breakdown.nbLignes) parts.push(`${breakdown.nbLignes} ligne${breakdown.nbLignes > 1 ? 's' : ''} de dépenses`);
      if (breakdown.transferts > 0) parts.push(`Transferts banque/mobile exclus : ${Data.fmt(breakdown.transferts)}`);
      subEl.textContent = parts.join(' · ');
    }

    // KPI label : période globale (Jour / Mois / Année / Plage / Tout)
    this._set('assoc-mois-label', this.periodLabel());
    this._set('assoc-ca', Data.fmt(ca));
    this._set('assoc-charges', Data.fmt(charges));
    const bEl = document.getElementById('assoc-benef');
    if (bEl) {
      bEl.textContent = Data.fmt(benef);
      bEl.style.color = benef >= 0 ? 'var(--c-bar)' : 'var(--c-red)';
    }

    // Avertissement somme des parts ≠ 100
    const sumParts = this.sommeParts();
    const warnEl = document.getElementById('assoc-warn');
    if (warnEl) {
      if (sumParts !== 100 && (Data.associes || []).some(a => a.actif)) {
        warnEl.style.display = '';
        warnEl.innerHTML = `⚠ La somme des parts des associés actifs est de <b>${sumParts}%</b> (attendu : 100%).`;
      } else {
        warnEl.style.display = 'none';
        warnEl.innerHTML = '';
      }
    }

    // ===== Récap mensuel =====
    const recap = document.getElementById('assoc-recap-table');
    if (recap) {
      const actifs = (Data.associes || []).filter(a => a.actif);
      if (!actifs.length) {
        recap.innerHTML = '<tr><td colspan="5" class="empty">Aucun associé actif.</td></tr>';
      } else {
        let totPart = 0, totPrelv = 0, totSolde = 0;
        const rows = actifs.map(a => {
          const part = Number(a.part) || 0;
          const partTheo = Math.round(benef * part / 100);
          const prelv = this.prelvAssocPeriode(a.id);
          const solde = partTheo - prelv;
          totPart += partTheo; totPrelv += prelv; totSolde += solde;
          return `<tr>
            <td><b>${this._esc(a.nom)}</b></td>
            <td class="text-right">${part}%</td>
            <td class="text-right">${Data.fmt(partTheo)}</td>
            <td class="text-right">${Data.fmt(prelv)}</td>
            <td class="text-right fw-bold" style="color:${solde >= 0 ? 'var(--c-bar)' : 'var(--c-red)'}">${Data.fmt(solde)}</td>
          </tr>`;
        }).join('');
        const totalRow = `<tr class="total-row">
          <td><b>Total</b></td>
          <td class="text-right"><b>${sumParts}%</b></td>
          <td class="text-right"><b>${Data.fmt(totPart)}</b></td>
          <td class="text-right"><b>${Data.fmt(totPrelv)}</b></td>
          <td class="text-right"><b>${Data.fmt(totSolde)}</b></td>
        </tr>`;
        recap.innerHTML = rows + totalRow;
      }
    }

    // ===== Tableau Associés (CRUD) =====
    const assocTb = document.getElementById('assoc-table');
    if (assocTb) {
      const list = Data.associes || [];
      if (!list.length) {
        assocTb.innerHTML = '<tr><td colspan="4" class="empty">Aucun associé.</td></tr>';
      } else {
        assocTb.innerHTML = list.map(a => `<tr data-search-id="ass:${a.id}">
          <td><b>${this._esc(a.nom)}</b></td>
          <td class="text-right">${Number(a.part) || 0}%</td>
          <td>${a.actif ? '<span class="badge b-green">Actif</span>' : '<span class="badge">Inactif</span>'}</td>
          <td class="text-right">
            <button class="btn" onclick="Associes.openAssocModal(${a.id})" title="Modifier"><i class="ti ti-edit"></i></button>
            <button class="btn btn-danger" onclick="Associes.removeAssoc(${a.id})" title="Supprimer"><i class="ti ti-trash"></i></button>
          </td>
        </tr>`).join('');
      }
    }

    // ===== Tableau Prélèvements (CRUD) =====
    const prelvTb = document.getElementById('assoc-prelv-table');
    if (prelvTb) {
      const list = (Data.prelevements || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const byId = {};
      (Data.associes || []).forEach(a => byId[a.id] = a.nom);
      const payBadge = {
        esp:    '<span class="badge b-green">💵 Espèces</span>',
        banque: '<span class="badge b-blue">🏦 Banque</span>',
        mobile: '<span class="badge b-purple">📱 Mobile</span>',
      };
      if (!list.length) {
        prelvTb.innerHTML = '<tr><td colspan="6" class="empty">Aucun prélèvement enregistré.</td></tr>';
      } else {
        prelvTb.innerHTML = list.map(p => `<tr data-search-id="prl:${p.id}">
          <td class="nowrap">${Data.fmtD(p.date)}</td>
          <td>${this._esc(byId[p.associeId] || '—')}</td>
          <td class="text-right fw-bold">${Data.fmt(p.montant)}</td>
          <td>${payBadge[p.paiement] || p.paiement || ''}</td>
          <td style="color:var(--c-muted)">${this._esc(p.observation || '')}</td>
          <td class="text-right">
            <button class="btn" onclick="Associes.openPrelvModal(${p.id})" title="Modifier"><i class="ti ti-edit"></i></button>
            <button class="btn btn-danger" onclick="Associes.removePrelv(${p.id})" title="Supprimer"><i class="ti ti-trash"></i></button>
          </td>
        </tr>`).join('');
      }
    }
  },

  // ===================== CRUD Associés =====================
  openAssocModal(id) {
    this.editAssocId = id;
    const a = id ? (Data.associes || []).find(x => x.id === id) : null;
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title"><i class="ti ti-user-plus"></i> ${id ? 'Modifier' : 'Nouvel'} associé</div>
          <div class="fg"><label class="fl">Nom *</label>
            <input type="text" id="assoc-nom" value="${this._esc(a?.nom || '')}" placeholder="Nom de l'associé"></div>
          <div class="fr">
            <div class="fg"><label class="fl">Part (%)</label>
              <input type="number" id="assoc-part" min="0" max="100" step="0.1" value="${a?.part ?? 50}"></div>
            <div class="fg" style="display:flex;align-items:center;gap:8px;padding-top:22px">
              <input type="checkbox" id="assoc-actif" ${(a ? a.actif : true) ? 'checked' : ''}>
              <label for="assoc-actif" class="fl" style="margin:0">Actif</label>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Associes.saveAssoc()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  saveAssoc() {
    const nom = (document.getElementById('assoc-nom')?.value || '').trim();
    const part = parseFloat(document.getElementById('assoc-part')?.value);
    const actif = document.getElementById('assoc-actif')?.checked;
    if (!nom) { alert('Le nom est obligatoire.'); return; }
    if (isNaN(part) || part < 0 || part > 100) { alert('La part doit être un nombre entre 0 et 100.'); return; }

    if (!Array.isArray(Data.associes)) Data.associes = [];
    const wasEdit = !!this.editAssocId;
    let savedId = this.editAssocId;
    if (this.editAssocId) {
      const a = Data.associes.find(x => x.id === this.editAssocId);
      if (a) { a.nom = nom; a.part = part; a.actif = !!actif; }
    } else {
      savedId = Data.associes.length
        ? Math.max(...Data.associes.map(a => a.id || 0)) + 1
        : 1;
      Data.associes.push({ id: savedId, nom, part, actif: !!actif });
    }
    try {
      if (typeof Audit !== 'undefined') Audit.log(wasEdit ? 'update' : 'create', 'associes',
        `Associé ${nom}`,
        `Part ${part}%${actif ? '' : ' · inactif'}`,
        { id: savedId });
    } catch (e) {}
    this.editAssocId = null;
    this.save();
    App.closeModal();
    this.render();
  },

  removeAssoc(id) {
    const a = (Data.associes || []).find(x => x.id === id);
    if (!a) return;
    const hasPrelv = (Data.prelevements || []).some(p => p.associeId === id);
    if (hasPrelv) {
      alert('Impossible de supprimer "' + a.nom + '" : des prélèvements sont rattachés à cet associé. Supprimez d\'abord ses prélèvements ou réassignez-les.');
      return;
    }
    if (!confirm('Supprimer l\'associé "' + a.nom + '" ?')) return;
    Data.associes = Data.associes.filter(x => x.id !== id);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'associes',
        `Associé ${a.nom}`,
        `Part ${a.part}%`,
        { id: a.id, before: a });
    } catch (e) {}
    this.save();
    this.render();
  },

  // ===================== CRUD Prélèvements =====================
  openPrelvModal(id) {
    this.editPrelvId = id;
    const p = id ? (Data.prelevements || []).find(x => x.id === id) : null;
    const actifs = (Data.associes || []).filter(a => a.actif || (p && a.id === p.associeId));
    if (!actifs.length) {
      alert('Aucun associé actif. Créez d\'abord un associé.');
      return;
    }
    const opts = actifs.map(a =>
      `<option value="${a.id}" ${p && p.associeId === a.id ? 'selected' : ''}>${this._esc(a.nom)}</option>`
    ).join('');
    const pay = p?.paiement || 'esp';
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title"><i class="ti ti-cash"></i> ${id ? 'Modifier' : 'Nouveau'} prélèvement</div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label>
              <input type="date" id="prelv-date" value="${p?.date || Data.today()}"></div>
            <div class="fg"><label class="fl">Associé</label>
              <select id="prelv-assoc">${opts}</select></div>
          </div>
          <div class="fg"><label class="fl">Montant (FCFA) *</label>
            <input type="number" id="prelv-mnt" min="0" step="100" value="${p?.montant || ''}" placeholder="0"></div>
          <div class="fg"><label class="fl">Mode de paiement</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="prelv-pay" value="esp" ${pay === 'esp' ? 'checked' : ''} onchange="Associes._onPayChange()"> 💵 Espèces
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="prelv-pay" value="banque" ${pay === 'banque' ? 'checked' : ''} onchange="Associes._onPayChange()"> 🏦 Banque
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="prelv-pay" value="mobile" ${pay === 'mobile' ? 'checked' : ''} onchange="Associes._onPayChange()"> 📱 Mobile
              </label>
            </div></div>

          <!-- Banque à prélever — visible si paiement === 'banque' -->
          <div class="fg" id="prelv-bk-row" style="display:none">
            <label class="fl">Banque à prélever *</label>
            <select id="prelv-bk">${this._bankOpts(p?.banque)}</select>
            <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
              Le mouvement de sortie sera créé sur cette banque. <a href="#" onclick="App.closeModal();Banque.openListModal();return false">Gérer banques</a>
            </div>
          </div>

          <!-- Opérateur Mobile — visible si paiement === 'mobile' -->
          <div class="fg" id="prelv-mb-row" style="display:none">
            <label class="fl">Opérateur Mobile *</label>
            <select id="prelv-mb">${this._mobileOpts(p?.operateur)}</select>
            <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
              Le mouvement de sortie sera créé sur cet opérateur. <a href="#" onclick="App.closeModal();Mobile.openListModal();return false">Gérer opérateurs</a>
            </div>
          </div>

          <!-- Caisse impactée si paiement === 'esp' -->
          <div class="fg" id="prelv-caisse-row" style="display:none">
            <label class="fl">Caisse impactée (cash)</label>
            <select id="prelv-caisse">
              <option value="b" ${(p?.caisse || 'b') === 'b' ? 'selected' : ''}>🍸 BAR (par défaut)</option>
              <option value="s" ${p?.caisse === 's' ? 'selected' : ''}>🍱 SUSHI</option>
              <option value="c" ${p?.caisse === 'c' ? 'selected' : ''}>💨 CHICHA</option>
            </select>
          </div>
          <div class="fg"><label class="fl">Observation</label>
            <input type="text" id="prelv-obs" value="${this._esc(p?.observation || '')}" placeholder="Note (optionnelle)"></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Associes.savePrelv()">Enregistrer</button>
          </div>
        </div>
      </div>`);
    // Initialise la visibilité conditionnelle des champs banque/mobile/caisse
    setTimeout(() => this._onPayChange(), 10);
  },

  // Bascule les blocs banque / mobile / caisse selon le mode de paiement choisi
  _onPayChange() {
    const sel = document.querySelector('input[name="prelv-pay"]:checked');
    const v = sel ? sel.value : 'esp';
    const bk  = document.getElementById('prelv-bk-row');
    const mb  = document.getElementById('prelv-mb-row');
    const css = document.getElementById('prelv-caisse-row');
    if (bk)  bk.style.display  = v === 'banque' ? '' : 'none';
    if (mb)  mb.style.display  = v === 'mobile' ? '' : 'none';
    if (css) css.style.display = v === 'esp'    ? '' : 'none';
  },

  _bankOpts(selectedNom) {
    const banks = (Data.banques || []).filter(b => b.actif !== false || b.nom === selectedNom);
    if (!banks.length) return '<option value="" disabled>Aucune banque — clique "Gérer banques"</option>';
    return banks.map(b =>
      `<option value="${this._esc(b.nom)}" ${b.nom === selectedNom ? 'selected' : ''}>${this._esc(b.nom)}</option>`
    ).join('');
  },

  _mobileOpts(selectedNom) {
    const ops = (Data.operateursMobile || []).filter(o => o.actif !== false || o.nom === selectedNom);
    if (!ops.length) return '<option value="" disabled>Aucun opérateur — clique "Gérer opérateurs"</option>';
    return ops.map(o =>
      `<option value="${this._esc(o.nom)}" ${o.nom === selectedNom ? 'selected' : ''}>${this._esc(o.nom)}</option>`
    ).join('');
  },

  savePrelv() {
    const date = document.getElementById('prelv-date')?.value;
    const associeId = parseInt(document.getElementById('prelv-assoc')?.value, 10);
    const montant = parseFloat(document.getElementById('prelv-mnt')?.value);
    const payRadio = document.querySelector('input[name="prelv-pay"]:checked');
    const paiement = payRadio ? payRadio.value : 'esp';
    const observation = (document.getElementById('prelv-obs')?.value || '').trim() || null;

    const banque    = paiement === 'banque' ? (document.getElementById('prelv-bk')?.value || '') : null;
    const operateur = paiement === 'mobile' ? (document.getElementById('prelv-mb')?.value || '') : null;
    const caisseRaw = paiement === 'esp'    ? (document.getElementById('prelv-caisse')?.value || 'b') : null;
    const caisse    = ['s','b','c'].includes(caisseRaw) ? caisseRaw : null;

    if (!date) { alert('Date obligatoire.'); return; }
    if (!associeId) { alert('Associé obligatoire.'); return; }
    if (isNaN(montant) || montant <= 0) { alert('Montant doit être supérieur à 0.'); return; }
    if (paiement === 'banque' && !banque) { alert('Choisis la banque à prélever (ou crée une banque via "Gérer banques").'); return; }
    if (paiement === 'mobile' && !operateur) { alert('Choisis l\'opérateur Mobile (ou crée-en un via "Gérer opérateurs").'); return; }

    if (!Array.isArray(Data.prelevements)) Data.prelevements = [];
    let prelv;
    const wasEdit = !!this.editPrelvId;
    if (this.editPrelvId) {
      prelv = Data.prelevements.find(x => x.id === this.editPrelvId);
      if (prelv) Object.assign(prelv, { date, associeId, montant, paiement, observation, banque, operateur, caisse });
    } else {
      prelv = {
        id: Data.newId(),
        date, associeId, montant, paiement, observation, banque, operateur, caisse,
      };
      Data.prelevements.push(prelv);
    }
    if (prelv) this._syncMvtForPrelv(prelv);
    try {
      if (typeof Audit !== 'undefined' && prelv) Audit.log(wasEdit ? 'update' : 'create', 'associes',
        `Prélèvement ${this._associeNom(associeId)}`,
        `${Data.fmt(montant)} · ${paiement}${banque ? ' (' + banque + ')' : ''}${operateur ? ' (' + operateur + ')' : ''}`,
        { id: prelv.id, after: prelv });
    } catch (e) {}

    this.editPrelvId = null;
    this.save();
    if (typeof Banque !== 'undefined' && Banque.save) Banque.save();
    if (typeof Mobile !== 'undefined' && Mobile.save) Mobile.save();
    App.closeModal();
    // Re-render global : le cash et les soldes théoriques dépendent des prélèvements
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
    else this.render();
  },

  removePrelv(id) {
    const p = (Data.prelevements || []).find(x => x.id === id);
    if (!p) return;
    if (!confirm('Supprimer ce prélèvement de ' + Data.fmt(p.montant) + ' ?')) return;
    Data.prelevements = Data.prelevements.filter(x => x.id !== id);
    this._removeMvtForPrelv(id);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'associes',
        `Prélèvement ${this._associeNom(p.associeId)}`,
        `${Data.fmt(p.montant)} · ${p.paiement}`,
        { id: p.id, before: p });
    } catch (e) {}
    this.save();
    if (typeof Banque !== 'undefined' && Banque.save) Banque.save();
    if (typeof Mobile !== 'undefined' && Mobile.save) Mobile.save();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
    else this.render();
  },

  // ===================== Mirroir Banque/Mobile =====================
  // Un prélèvement en mode 'banque' (ou 'mobile') doit aussi apparaître
  // comme une sortie dans la page Banque (ou Mobile) pour que le solde
  // réel et l'historique soient cohérents.
  _associeNom(id) {
    return (Data.associes || []).find(a => a.id === id)?.nom || 'Associé';
  },
  _removeMvtForPrelv(prelvId) {
    if (Array.isArray(Data.mvtsBanque)) {
      Data.mvtsBanque = Data.mvtsBanque.filter(m => m.relPrelv !== prelvId);
    }
    if (Array.isArray(Data.mvtsMobile)) {
      Data.mvtsMobile = Data.mvtsMobile.filter(m => m.relPrelv !== prelvId);
    }
  },
  _syncMvtForPrelv(prelv) {
    // 1) Nettoie tout mouvement précédent lié à ce prélèvement
    this._removeMvtForPrelv(prelv.id);
    // 2) Si le mode est 'banque' ou 'mobile', crée le mouvement miroir
    if (prelv.paiement !== 'banque' && prelv.paiement !== 'mobile') return;
    const arr = prelv.paiement === 'banque' ? Data.mvtsBanque : Data.mvtsMobile;
    if (!Array.isArray(arr)) {
      if (prelv.paiement === 'banque') Data.mvtsBanque = [];
      else Data.mvtsMobile = [];
    }
    const target = prelv.paiement === 'banque' ? Data.mvtsBanque : Data.mvtsMobile;
    const opLabel = prelv.paiement === 'banque'
      ? (prelv.banque || 'Associé')
      : (prelv.operateur || 'Associé');
    target.unshift({
      id: Data.newId(),
      date: prelv.date,
      lib: `Prélèvement ${this._associeNom(prelv.associeId)}`,
      op: opLabel,             // Banque ou opérateur effectivement prélevé
      mnt: Number(prelv.montant) || 0,
      type: 'out',
      ref: '',
      caisse: null,            // Pas de caisse cash : prélèvement = sortie banque/mobile pure
      relPrelv: prelv.id,      // Lien vers le prélèvement source
    });
  },

  // ===================== Persistance =====================
  async restore() {
    try {
      const a = await AppDB.load(this.STORAGE_ASSOC);
      if (Array.isArray(a) && a.length) Data.associes = a;
      const p = await AppDB.load(this.STORAGE_PRELV);
      if (Array.isArray(p)) Data.prelevements = p;
    } catch (e) {
      console.warn('Associes.restore', e);
    }
    if (!Array.isArray(Data.associes)) Data.associes = [];
    if (!Array.isArray(Data.prelevements)) Data.prelevements = [];
  },

  async save() {
    try {
      await AppDB.save(this.STORAGE_ASSOC, Data.associes || []);
      await AppDB.save(this.STORAGE_PRELV, Data.prelevements || []);
    } catch (e) {
      console.warn('Associes.save', e);
    }
  },

  // ===================== utilitaires =====================
  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },
  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
};
