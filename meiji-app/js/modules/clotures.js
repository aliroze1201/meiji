/**
 * clotures.js — Clôtures mensuelles.
 *
 * Permet à un admin ou responsable de clôturer un mois :
 *  - calcule un snapshot (CA, charges, résultat, paiements, soldes)
 *  - archive le mois (consultable ensuite)
 *  - verrouille les saisies sur ce mois (recettes & dépenses)
 *  - exporte automatiquement un fichier Excel récap du mois
 *
 * Stockage : table app_state via AppDB (clé 'meiji-clotures').
 */

const Clotures = {
  STORAGE_KEY: 'meiji-clotures',
  items: [], // [{ ym, closedAt, closedBy, snapshot }]

  // ===================== HELPERS =====================
  ymOf(dateStr) {
    return (dateStr || '').slice(0, 7); // 'YYYY-MM'
  },

  isMonthClosed(dateStr) {
    const ym = this.ymOf(dateStr);
    return !!ym && this.items.some(c => c.ym === ym);
  },

  canManage() {
    if (typeof Auth === 'undefined' || !Auth.profile) return true;
    const role = Auth.profile.role;
    return role === 'admin' || role === 'responsable';
  },

  canReopen() {
    return typeof Auth === 'undefined' || !Auth.profile || Auth.profile.role === 'admin';
  },

  monthLabel(ym) {
    const mois = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    if (!ym || ym.length < 7) return ym || '—';
    const [y, m] = ym.split('-');
    return `${mois[parseInt(m)]} ${y}`;
  },

  // ===================== SNAPSHOT =====================
  buildSnapshot(ym) {
    const jj = Data.journees.filter(j => this.ymOf(j.date) === ym);
    const ca = {
      s: jj.reduce((s,j) => s + Data.caisse(j, 's'), 0),
      b: jj.reduce((s,j) => s + Data.caisse(j, 'b'), 0),
      c: jj.reduce((s,j) => s + Data.caisse(j, 'c'), 0),
    };
    ca.total = ca.s + ca.b + ca.c;

    const pay = {
      esp: jj.reduce((s,j) => s + j.s.esp + j.b.esp + j.c.esp, 0),
      chq: jj.reduce((s,j) => s + j.s.chq + j.b.chq + j.c.chq, 0),
      mob: jj.reduce((s,j) => s + j.s.mob + j.b.mob + j.c.mob, 0),
      cred:jj.reduce((s,j) => s + j.s.cred + j.b.cred + j.c.cred, 0),
    };

    const deps = Data.getAllDeps().filter(d => this.ymOf(d.date) === ym);
    const charges = deps.reduce((s,d) => s + (d.montant || 0), 0);
    const chargesParDept = {
      SUSHI:  deps.filter(d => d.dept === 'SUSHI').reduce((s,d) => s + d.montant, 0),
      BAR:    deps.filter(d => d.dept === 'BAR').reduce((s,d) => s + d.montant, 0),
      CHICHA: deps.filter(d => d.dept === 'CHICHA').reduce((s,d) => s + d.montant, 0),
    };

    return {
      ca,
      paiements: pay,
      charges,
      chargesParDept,
      resultatNet: ca.total - charges,
      nbJournees: jj.length,
      nbDepenses: deps.length,
      soldeBanque: Data.soldes?.banque?.montant || 0,
      soldeMobile: Data.soldes?.mobile?.montant || 0,
      journees: jj.map(j => ({
        date: j.date,
        s: { ...j.s }, b: { ...j.b }, c: { ...j.c },
        ca: Data.caTotal(j),
      })),
      depenses: deps.map(d => ({
        date: d.date, dept: d.dept, label: d.label,
        groupe: d.groupe, montant: d.montant,
        observation: d.observation || null,
      })),
    };
  },

  availableMonths() {
    const set = new Set();
    Data.journees.forEach(j => { if (j.date) set.add(this.ymOf(j.date)); });
    Data.getAllDeps().forEach(d => { if (d.date) set.add(this.ymOf(d.date)); });
    const closed = new Set(this.items.map(c => c.ym));
    return [...set].filter(ym => ym && !closed.has(ym)).sort();
  },

  // ===================== ACTIONS =====================
  openCloturerModal() {
    if (!this.canManage()) return alert("Action réservée à l'administrateur ou au responsable.");
    const months = this.availableMonths();
    if (!months.length) return alert("Aucun mois ouvert avec des données à clôturer.");

    const defaultYm = months[months.length - 1];
    const options = months.map(ym =>
      `<option value="${ym}" ${ym === defaultYm ? 'selected' : ''}>${this.monthLabel(ym)}</option>`
    ).join('');

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:560px">
          <div class="modal-title"><i class="ti ti-calendar-check"></i> Clôturer un mois</div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div>
              <label style="font-size:12px;color:var(--c-muted)">Mois à clôturer</label>
              <select id="clo-ym" style="width:100%" onchange="Clotures._refreshPreview()">
                ${options}
              </select>
            </div>
            <div id="clo-preview"></div>
            <div style="font-size:12px;color:var(--c-muted)">
              <i class="ti ti-info-circle"></i> À la clôture, les recettes et dépenses du mois seront <b>verrouillées</b>
              (plus de saisie ni de suppression). Un fichier Excel récap sera téléchargé.
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Clotures.confirmCloturer()">
              <i class="ti ti-check"></i> Clôturer
            </button>
          </div>
        </div>
      </div>`);
    this._refreshPreview();
  },

  _refreshPreview() {
    const sel = document.getElementById('clo-ym');
    const box = document.getElementById('clo-preview');
    if (!sel || !box) return;
    const snap = this.buildSnapshot(sel.value);
    box.innerHTML = `
      <div class="g3">
        <div class="mc blue"><div class="mc-label blue">CA Total</div><div class="mc-val blue">${Data.fmt(snap.ca.total)}</div><div class="mc-sub">${snap.nbJournees} journée(s)</div></div>
        <div class="mc red"><div class="mc-label red">Charges</div><div class="mc-val red">${Data.fmt(snap.charges)}</div><div class="mc-sub">${snap.nbDepenses} dépense(s)</div></div>
        <div class="mc green"><div class="mc-label green">Résultat net</div><div class="mc-val green">${Data.fmt(snap.resultatNet)}</div><div class="mc-sub">CA − charges</div></div>
      </div>`;
  },

  async confirmCloturer() {
    const sel = document.getElementById('clo-ym');
    if (!sel) return;
    const ym = sel.value;
    if (!ym) return;

    if (this.items.some(c => c.ym === ym)) {
      alert('Ce mois est déjà clôturé.');
      App.closeModal();
      return;
    }

    if (!confirm(`Clôturer définitivement le mois de ${this.monthLabel(ym)} ?\n\nLes saisies de ce mois seront verrouillées.`)) return;

    const snapshot = this.buildSnapshot(ym);
    const item = {
      ym,
      closedAt: new Date().toISOString(),
      closedBy: (typeof Auth !== 'undefined' && Auth.profile)
        ? (Auth.profile.nom || Auth.toUsername(Auth.profile.email) || Auth.profile.role)
        : '—',
      snapshot,
    };
    this.items.push(item);
    this.items.sort((a,b) => a.ym.localeCompare(b.ym));
    await this.persist();

    try { this.exportExcel(item); } catch (e) { console.error('Export Excel clôture:', e); }

    App.closeModal();
    App.renderAll();
    alert(`✅ Mois ${this.monthLabel(ym)} clôturé. Le récap Excel a été téléchargé.`);
  },

  async reouvrir(ym) {
    if (!this.canReopen()) return alert("Réouverture réservée à l'administrateur.");
    if (!confirm(`Rouvrir le mois de ${this.monthLabel(ym)} ? Les saisies redeviendront modifiables.`)) return;
    this.items = this.items.filter(c => c.ym !== ym);
    await this.persist();
    App.renderAll();
  },

  // ===================== EXPORT EXCEL =====================
  exportExcel(item) {
    if (typeof XLSX === 'undefined') { alert('Bibliothèque Excel non chargée'); return; }
    const snap = item.snapshot;
    const wb = XLSX.utils.book_new();

    const resume = [
      ['Mois clôturé', this.monthLabel(item.ym)],
      ['Clôturé le',   new Date(item.closedAt).toLocaleString('fr-FR')],
      ['Clôturé par',  item.closedBy],
      [],
      ['CA SUSHI',   snap.ca.s],
      ['CA BAR',     snap.ca.b],
      ['CA CHICHA',  snap.ca.c],
      ['CA Total',   snap.ca.total],
      [],
      ['Espèces',    snap.paiements.esp],
      ['Chèques',    snap.paiements.chq],
      ['Mobile',     snap.paiements.mob],
      ['Crédit',     snap.paiements.cred],
      [],
      ['Charges SUSHI',  snap.chargesParDept.SUSHI],
      ['Charges BAR',    snap.chargesParDept.BAR],
      ['Charges CHICHA', snap.chargesParDept.CHICHA],
      ['Charges Total',  snap.charges],
      [],
      ['Résultat net',   snap.resultatNet],
      ['Solde bancaire', snap.soldeBanque],
      ['Solde mobile',   snap.soldeMobile],
    ];
    const wsR = XLSX.utils.aoa_to_sheet(resume);
    wsR['!cols'] = [{ wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsR, 'Résumé');

    const recRows = snap.journees.map(j => ({
      'Date': j.date,
      'SUSHI Espèces': j.s.esp, 'SUSHI Chèque': j.s.chq, 'SUSHI Mobile': j.s.mob, 'SUSHI Crédit': j.s.cred,
      'BAR Espèces':   j.b.esp, 'BAR Chèque':   j.b.chq, 'BAR Mobile':   j.b.mob, 'BAR Crédit':   j.b.cred,
      'CHICHA Espèces':j.c.esp, 'CHICHA Chèque':j.c.chq, 'CHICHA Mobile':j.c.mob, 'CHICHA Crédit':j.c.cred,
      'Total CA': j.ca,
    }));
    if (recRows.length) {
      const wsRec = XLSX.utils.json_to_sheet(recRows);
      XLSX.utils.book_append_sheet(wb, wsRec, 'Recettes');
    }

    const depRows = snap.depenses.map(d => ({
      'Date': d.date,
      'Département': d.dept,
      'Libellé': d.label,
      'Groupe': d.groupe || '',
      'Montant': d.montant,
      'Observation': d.observation || '',
    }));
    if (depRows.length) {
      const wsDep = XLSX.utils.json_to_sheet(depRows);
      XLSX.utils.book_append_sheet(wb, wsDep, 'Dépenses');
    }

    XLSX.writeFile(wb, `meiji-cloture-${item.ym}.xlsx`);
  },

  // ===================== RENDER =====================
  render() {
    const tbody = document.getElementById('clo-table');
    if (!tbody) return;

    const btn = document.getElementById('btn-new-clo');
    if (btn) btn.style.display = this.canManage() ? '' : 'none';

    if (!this.items.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Aucun mois clôturé pour l\'instant.</td></tr>';
      this._setKpis(0, 0, 0, 0);
      return;
    }

    const sorted = this.items.slice().sort((a,b) => b.ym.localeCompare(a.ym));
    const totCA = sorted.reduce((s,i) => s + (i.snapshot.ca.total || 0), 0);
    const totCh = sorted.reduce((s,i) => s + (i.snapshot.charges || 0), 0);
    this._setKpis(sorted.length, totCA, totCh, totCA - totCh);

    const canRe = this.canReopen();
    tbody.innerHTML = sorted.map(it => {
      const s = it.snapshot;
      const closedAt = new Date(it.closedAt).toLocaleDateString('fr-FR');
      return `<tr>
        <td><b>${this.monthLabel(it.ym)}</b></td>
        <td class="text-right">${Data.fmt(s.ca.total)}</td>
        <td class="text-right" style="color:var(--c-red)">${Data.fmt(s.charges)}</td>
        <td class="text-right" style="font-weight:700;color:${s.resultatNet >= 0 ? 'var(--c-bar)' : 'var(--c-red)'}">${Data.fmt(s.resultatNet)}</td>
        <td>${s.nbJournees} journée(s) · ${s.nbDepenses} dépense(s)</td>
        <td><span style="font-size:12px;color:var(--c-muted)">${this._esc(it.closedBy)} · ${closedAt}</span></td>
        <td style="white-space:nowrap">
          <button class="btn btn-sm" title="Re-télécharger l'Excel" onclick="Clotures.reexport('${it.ym}')"><i class="ti ti-file-spreadsheet"></i></button>
          ${canRe ? `<button class="btn btn-sm btn-danger" title="Rouvrir le mois" onclick="Clotures.reouvrir('${it.ym}')"><i class="ti ti-lock-open"></i></button>` : ''}
        </td>
      </tr>`;
    }).join('');
  },

  _setKpis(nb, ca, ch, net) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('clo-nb', String(nb));
    set('clo-ca', Data.fmt(ca));
    set('clo-charges', Data.fmt(ch));
    set('clo-net', Data.fmt(net));
  },

  reexport(ym) {
    const it = this.items.find(c => c.ym === ym);
    if (!it) return;
    this.exportExcel(it);
  },

  // ===================== PERSIST / RESTORE =====================
  async persist() {
    await AppDB.save(this.STORAGE_KEY, this.items);
  },

  async restore() {
    const raw = await AppDB.load(this.STORAGE_KEY);
    if (Array.isArray(raw)) this.items = raw;
  },

  // ===================== GUARDS =====================
  // À appeler avant toute écriture sur une date donnée.
  // Retourne true si bloqué (et affiche un message).
  guard(dateStr, label) {
    if (this.isMonthClosed(dateStr)) {
      alert(`🔒 ${label || 'Cette opération'} est impossible : le mois de ${this.monthLabel(this.ymOf(dateStr))} est clôturé.`);
      return true;
    }
    return false;
  },

  _esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
};
