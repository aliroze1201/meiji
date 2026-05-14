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

  // Mois "actif" :
  //  - si période = mois → ce mois
  //  - sinon → mois de la dernière date journée filtrée, ou mois courant
  currentMonth() {
    if (App.period === 'mois') {
      const m = document.getElementById('sel-mois');
      const y = document.getElementById('sel-annee');
      if (m && y) return y.value + '-' + String(m.value).padStart(2, '0');
    }
    const jj = (typeof App !== 'undefined' && App.filterJournees)
      ? App.filterJournees()
      : (Data.journees || []);
    if (jj.length) {
      const last = jj.map(j => j.date).filter(Boolean).sort().slice(-1)[0];
      if (last) return last.slice(0, 7);
    }
    return Data.today().slice(0, 7);
  },

  // CA du pot BAR + CHICHA sur un mois
  caPot(ym) {
    return (Data.journees || [])
      .filter(j => this.ymOf(j.date) === ym)
      .reduce((s, j) => s + Data.caisse(j, 'b') + Data.caisse(j, 'c'), 0);
  },

  // Charges du pot : dépenses BAR + CHICHA + masse salariale BAR + CHICHA
  chargesPot(ym) {
    const deps = Data.getAllDeps()
      .filter(d => this.ymOf(d.date) === ym && (d.dept === 'BAR' || d.dept === 'CHICHA'))
      .reduce((s, d) => s + (Number(d.montant) || 0), 0);
    const sal = (Data.employes || [])
      .filter(e => e.dept === 'BAR' || e.dept === 'CHICHA')
      .reduce((s, e) => s + (Number(e.net) || 0), 0);
    return deps + sal;
  },

  beneficePot(ym) { return this.caPot(ym) - this.chargesPot(ym); },

  prelvAssocMois(assocId, ym) {
    return (Data.prelevements || [])
      .filter(p => p.associeId === assocId && this.ymOf(p.date) === ym)
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

    const ym = this.currentMonth();
    const ca = this.caPot(ym);
    const charges = this.chargesPot(ym);
    const benef = ca - charges;

    // KPI label mois
    this._set('assoc-mois-label', this.monthLabel(ym));
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
          const prelv = this.prelvAssocMois(a.id, ym);
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
        assocTb.innerHTML = list.map(a => `<tr>
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
        prelvTb.innerHTML = list.map(p => `<tr>
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
    if (this.editAssocId) {
      const a = Data.associes.find(x => x.id === this.editAssocId);
      if (a) { a.nom = nom; a.part = part; a.actif = !!actif; }
    } else {
      const newId = Data.associes.length
        ? Math.max(...Data.associes.map(a => a.id || 0)) + 1
        : 1;
      Data.associes.push({ id: newId, nom, part, actif: !!actif });
    }
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
                <input type="radio" name="prelv-pay" value="esp" ${pay === 'esp' ? 'checked' : ''}> 💵 Espèces
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="prelv-pay" value="banque" ${pay === 'banque' ? 'checked' : ''}> 🏦 Banque
              </label>
              <label style="cursor:pointer;display:flex;align-items:center;gap:4px">
                <input type="radio" name="prelv-pay" value="mobile" ${pay === 'mobile' ? 'checked' : ''}> 📱 Mobile
              </label>
            </div></div>
          <div class="fg"><label class="fl">Observation</label>
            <input type="text" id="prelv-obs" value="${this._esc(p?.observation || '')}" placeholder="Note (optionnelle)"></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Associes.savePrelv()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  savePrelv() {
    const date = document.getElementById('prelv-date')?.value;
    const associeId = parseInt(document.getElementById('prelv-assoc')?.value, 10);
    const montant = parseFloat(document.getElementById('prelv-mnt')?.value);
    const payRadio = document.querySelector('input[name="prelv-pay"]:checked');
    const paiement = payRadio ? payRadio.value : 'esp';
    const observation = (document.getElementById('prelv-obs')?.value || '').trim() || null;

    if (!date) { alert('Date obligatoire.'); return; }
    if (!associeId) { alert('Associé obligatoire.'); return; }
    if (isNaN(montant) || montant <= 0) { alert('Montant doit être supérieur à 0.'); return; }

    if (!Array.isArray(Data.prelevements)) Data.prelevements = [];
    if (this.editPrelvId) {
      const p = Data.prelevements.find(x => x.id === this.editPrelvId);
      if (p) Object.assign(p, { date, associeId, montant, paiement, observation });
    } else {
      Data.prelevements.push({
        id: Data.newId(),
        date, associeId, montant, paiement, observation
      });
    }
    this.editPrelvId = null;
    this.save();
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
    this.save();
    if (typeof App !== 'undefined' && App.renderAll) App.renderAll();
    else this.render();
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
