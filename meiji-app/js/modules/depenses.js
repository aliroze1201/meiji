/**
 * depenses.js — Dépenses hors-journée (Data.histDep).
 *
 * Persistance : table app_state (clé meiji-user-deps) via AppDB.
 */

const Depenses = {
  drafts: [],            // saisies en cours (non validées)
  _draftSeq: 1,          // id local des brouillons

  // Render globale appelée par App.renderAll()
  renderTable() {
    this.renderHistory();
    this.renderDrafts();
    this.refreshCatList();
  },

  refreshCatList() {
    const list = document.getElementById('draft-cat-list');
    if (!list) return;
    const cats = Data.categories.filter(c => c.type === 'dep').map(c => c.nom);
    list.innerHTML = cats.map(n => `<option value="${this._escape(n)}"></option>`).join('');
  },

  // ===================== TABLE HISTORIQUE =====================
  renderHistory() {
    const filter = App.filters.dep;
    const all = App.filterByDate(Data.getAllDeps());
    const catColors = Data.getCatColors();
    const totS = all.filter(d => d.dept === 'SUSHI').reduce((s,d) => s + d.montant, 0);
    const totB = all.filter(d => d.dept === 'BAR').reduce((s,d) => s + d.montant, 0);
    const totC = all.filter(d => d.dept === 'CHICHA').reduce((s,d) => s + d.montant, 0);

    this._set('dep-tot', Data.fmt(totS + totB + totC));
    this._set('dep-s', Data.fmt(totS));
    this._set('dep-b', Data.fmt(totB));
    this._set('dep-c', Data.fmt(totC));

    let list = filter === 'all' ? all : all.filter(d => d.dept === filter);
    list = list.slice().sort((a,b) => b.date.localeCompare(a.date));

    const tb = document.getElementById('dep-table');
    if (!tb) return;
    if (!list.length) { tb.innerHTML = '<tr><td colspan="9" class="empty">Aucune dépense</td></tr>'; return; }

    const dash = '<span style="color:var(--c-muted)">—</span>';
    tb.innerHTML = list.map(d => {
      const col = catColors[d.groupe || 'Autres'] || '#94A3B8';
      const obsRaw = d.observation || d.label || '';
      const obs = obsRaw ? this._escape(obsRaw) : '';
      const obsCell = obs ? `<span title="${obs}" style="display:inline-block;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom">${obs}</span>` : dash;
      let editBtn = '', deleteBtn = '';
      if (d.userId != null && d.userId !== '') {
        const uidArg = JSON.stringify(d.userId);
        editBtn = `<button class="btn-ghost" title="Modifier" onclick="Depenses.editLine(${uidArg})" style="margin-right:4px"><i class="ti ti-pencil"></i></button>`;
        deleteBtn = `<button class="btn-ghost" title="Supprimer" onclick="Depenses.remove(${uidArg})"><i class="ti ti-trash"></i></button>`;
      } else if (d._jSrc) {
        const s = d._jSrc;
        editBtn = `<button class="btn-ghost" title="Modifier (dépense d'une journée)" onclick="Depenses.editJourneeDep('${s.jDate}','${s.dk}',${s.idx})" style="margin-right:4px"><i class="ti ti-pencil"></i></button>`;
        deleteBtn = `<button class="btn-ghost" title="Supprimer (dépense d'une journée)" onclick="Depenses.removeJourneeDep('${s.jDate}','${s.dk}',${s.idx})"><i class="ti ti-trash"></i></button>`;
      }
      const pay = d.paiement || 'esp';
      const payCell = (d.userId != null && d.userId !== '')
        ? `<select class="fld-pay" onchange="Depenses.updatePaiement(${JSON.stringify(d.userId)}, this.value)" style="font-size:12px">
             <option value="esp"    ${pay==='esp'   ?'selected':''}>💵 Espèces</option>
             <option value="banque" ${pay==='banque'?'selected':''}>🏦 Banque</option>
             <option value="mobile" ${pay==='mobile'?'selected':''}>📱 Mobile</option>
           </select>`
        : `<span style="font-size:11px;color:var(--c-muted)">${pay==='esp'?'💵 Espèces':pay==='banque'?'🏦 Banque':'📱 Mobile'}</span>`;
      const searchId = 'dep:' + (d.userId || `${d.date}|${(d.label||'').replace(/[|"]/g,'_')}|${d.montant}|${d.dept}`);
      return `
      <tr data-search-id="${this._escape(searchId)}">
        <td class="nowrap">${Data.fmtDs(d.date)}</td>
        <td><span style="font-size:11px;padding:3px 9px;border-radius:999px;background:${col}22;color:${col};font-weight:700">${d.groupe || 'Autres'}</span></td>
        <td class="text-right">${d.qte != null ? d.qte : dash}</td>
        <td class="text-right">${d.prix != null ? Data.fmts(d.prix) : dash}</td>
        <td class="text-right fw-bold text-red">${Data.fmts(d.montant)} FCFA</td>
        <td><span class="badge ${d.dept==='SUSHI'?'b-blue':d.dept==='BAR'?'b-green':'b-amber'}">${d.dept}</span></td>
        <td>${payCell}</td>
        <td>${obsCell}</td>
        <td class="nowrap">${editBtn}${deleteBtn}</td>
      </tr>`;
    }).join('');
  },

  // Charge une dépense validée comme brouillon pour la modifier.
  // L'enregistrement réel se fait au moment du Valider (commitDrafts) :
  //   si d.editingUserId existe → on met à jour l'entrée existante ;
  //   sinon → on crée une nouvelle dépense.
  editLine(userId) {
    const dep = Data.histDep.find(x => x.userId === userId);
    if (!dep) return alert('Dépense introuvable.');
    if (typeof Clotures !== 'undefined' && Clotures.isMonthClosed && Clotures.isMonthClosed(dep.date)) {
      alert(`🔒 Mois clôturé : la dépense du ${Data.fmtD(dep.date)} ne peut pas être modifiée.`);
      return;
    }
    if (this.drafts.some(d => d.editingUserId === userId)) {
      alert('Cette dépense est déjà en cours de modification dans la zone de saisie.');
      const card = document.getElementById('draft-card');
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const draft = {
      id:       this._draftSeq++,
      date:     dep.date,
      dept:     dep.dept,
      cat:      dep.groupe || dep.label || '',
      qte:      dep.qte != null ? String(dep.qte) : '',
      prix:     dep.prix != null ? String(dep.prix) : '',
      montant:  dep.montant != null ? String(dep.montant) : '',
      obs:      dep.observation || '',
      paiement: dep.paiement || 'esp',
      editingUserId: userId,
    };
    this.drafts.unshift(draft);
    this.persistDrafts();
    this.renderDrafts();
    if (App.currentPage !== 'depenses') App.nav('depenses');
    setTimeout(() => {
      const card = document.getElementById('draft-card');
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelector(`#draft-tbody tr[data-draft-id="${draft.id}"] input.fld-cat`)?.focus();
    }, 50);
  },

  // Supprime une dépense rattachée à une journée (Data.journees[].deps).
  removeJourneeDep(jDate, dk, idx) {
    const j = Data.journees.find(x => x.date === jDate);
    if (!j || !j.deps || !j.deps[dk] || !j.deps[dk][idx]) {
      alert('Dépense introuvable.');
      App.renderAll();
      return;
    }
    if (typeof Clotures !== 'undefined' && Clotures.guard(jDate, 'La suppression de cette dépense')) return;
    const dep = j.deps[dk][idx];
    const deptLabel = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' }[dk] || dk;
    if (!confirm(`Supprimer cette dépense de la journée du ${Data.fmtD(jDate)} ?`)) return;
    j.deps[dk].splice(idx, 1);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'depenses',
        `Dépense ${deptLabel} · ${dep.label || ''} (journée ${jDate})`,
        `${Data.fmt(dep.montant || 0)}`,
        { jDate, dk, before: dep });
    } catch (e) {}
    if (typeof Recettes !== 'undefined' && Recettes.persistUser) {
      // marquer la journée comme modifiée pour qu'elle soit bien persistée
      j.userRec = true;
      Recettes.persistUser([j]);
    }
    App.renderAll();
  },

  // Charge une dépense d'une journée comme brouillon pour la modifier.
  // Au moment de Valider, la dépense est retirée de la journée et créée
  // comme dépense utilisateur (histDep) — ce qui permet de saisir qté/prix/etc.
  editJourneeDep(jDate, dk, idx) {
    const j = Data.journees.find(x => x.date === jDate);
    if (!j || !j.deps || !j.deps[dk] || !j.deps[dk][idx]) {
      alert('Dépense introuvable.');
      App.renderAll();
      return;
    }
    if (typeof Clotures !== 'undefined' && Clotures.isMonthClosed && Clotures.isMonthClosed(jDate)) {
      alert(`🔒 Mois clôturé : la dépense du ${Data.fmtD(jDate)} ne peut pas être modifiée.`);
      return;
    }
    if (this.drafts.some(d => d.editingJournee && d.editingJournee.jDate === jDate && d.editingJournee.dk === dk && d.editingJournee.idx === idx)) {
      alert('Cette dépense est déjà en cours de modification dans la zone de saisie.');
      document.getElementById('draft-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const dep = j.deps[dk][idx];
    const dept = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' }[dk] || 'SUSHI';
    const draft = {
      id:       this._draftSeq++,
      date:     jDate,
      dept,
      cat:      dep.groupe || dep.label || '',
      qte:      '',
      prix:     '',
      montant:  dep.montant != null ? String(dep.montant) : '',
      obs:      dep.label && dep.label !== dep.groupe ? dep.label : '',
      paiement: 'esp',
      editingJournee: { jDate, dk, idx },
    };
    this.drafts.unshift(draft);
    this.persistDrafts();
    this.renderDrafts();
    if (App.currentPage !== 'depenses') App.nav('depenses');
    setTimeout(() => {
      const card = document.getElementById('draft-card');
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelector(`#draft-tbody tr[data-draft-id="${draft.id}"] input.fld-cat`)?.focus();
    }, 50);
  },

  // Met à jour le mode de paiement d'une dépense utilisateur déjà validée.
  updatePaiement(userId, value) {
    const d = Data.histDep.find(x => x.userId === userId);
    if (!d) return;
    if (typeof Clotures !== 'undefined' && Clotures.isMonthClosed && Clotures.isMonthClosed(d.date)) {
      alert('🔒 Mois clôturé : modification impossible.');
      App.renderAll();
      return;
    }
    const before = d.paiement;
    d.paiement = value;
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'depenses',
        `Dépense ${d.dept} · ${d.label}`,
        `Mode de paiement : ${before || 'esp'} → ${value}`,
        { id: userId, before: { paiement: before }, after: { paiement: value } });
    } catch (e) {}
    this.persist();
    App.renderAll();
  },

  _escape(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },

  // ===================== BROUILLONS (saisie en cours) =====================
  newDraft(dept) {
    return {
      id: this._draftSeq++,
      date: Data.today(),
      dept: dept || 'SUSHI',
      cat:  '',
      qte:  '',
      prix: '',
      montant: '',
      obs: '',
      paiement: 'esp',
    };
  },

  addDraftRow(dept) {
    this.drafts.push(this.newDraft(dept));
    this.persistDrafts();
    this.renderDrafts();
    // focus sur la catégorie de la nouvelle ligne
    setTimeout(() => {
      const rows = document.querySelectorAll('#draft-tbody tr');
      const last = rows[rows.length - 1];
      last?.querySelector('input.fld-cat')?.focus();
    }, 30);
  },

  removeDraftRow(id) {
    this.drafts = this.drafts.filter(d => d.id !== id);
    this.persistDrafts();
    this.renderDrafts();
  },

  updateDraft(id, field, value) {
    const d = this.drafts.find(x => x.id === id);
    if (!d) return;
    d[field] = value;

    // Recalcul auto : à partir de 2 champs saisis, le 3ᵉ est déduit.
    // Priorité : qté + montant ⇒ prix unitaire calculé automatiquement.
    if (field === 'qte' || field === 'prix' || field === 'montant') {
      this._recalcDraft(d);
      const tr = document.querySelector(`#draft-tbody tr[data-draft-id="${id}"]`);
      if (tr) {
        ['qte','prix','montant'].forEach(f => {
          if (f === field) return; // ne pas écraser ce que l'utilisateur tape
          const inp = tr.querySelector('input.fld-' + f);
          if (inp && document.activeElement !== inp) {
            inp.value = d[f] !== '' && d[f] != null ? d[f] : '';
          }
        });
      }
    }
    this.persistDrafts();
    this._refreshDraftSummary();
  },

  // Calcule le 3ᵉ champ à partir des 2 autres : priorité au prix unitaire.
  _recalcDraft(d) {
    const q = parseFloat(d.qte);
    const p = parseFloat(d.prix);
    const m = parseFloat(d.montant);
    const hasQ = !isNaN(q) && q > 0;
    const hasP = !isNaN(p) && p > 0;
    const hasM = !isNaN(m) && m > 0;
    if (hasQ && hasM) {
      d.prix = Math.round((m / q) * 100) / 100;
    } else if (hasQ && hasP) {
      d.montant = Math.round(q * p);
    } else if (hasP && hasM) {
      d.qte = Math.round((m / p) * 100) / 100;
    }
  },

  _refreshDraftSummary() {
    const c = document.getElementById('draft-count');
    const t = document.getElementById('draft-total');
    const total = this.drafts.reduce((s,d) => s + (parseFloat(d.montant) || 0), 0);
    if (c) c.textContent = `· ${this.drafts.length} ligne${this.drafts.length > 1 ? 's' : ''}`;
    if (t) t.textContent = total ? `Total brouillon : ${Data.fmt(total)}` : '';
  },

  renderDrafts() {
    const tb = document.getElementById('draft-tbody');
    const empty = document.getElementById('draft-empty');
    if (!tb) return;

    if (!this.drafts.length) {
      tb.innerHTML = '';
      if (empty) empty.style.display = 'block';
      this._refreshDraftSummary();
      return;
    }
    if (empty) empty.style.display = 'none';

    // Recalcul défensif : si un brouillon a qté+montant mais pas de prix,
    // on calcule le prix avant rendu pour qu'il s'affiche toujours.
    this.drafts.forEach(d => this._recalcDraft(d));

    tb.innerHTML = this.drafts.map(d => `
      <tr data-draft-id="${d.id}" ${(d.editingUserId || d.editingJournee) ? `style="background:color-mix(in srgb, var(--c-primary-soft) 60%, transparent)" title="${d.editingJournee ? 'Modification d une dépense issue d une journée' : 'Modification d une dépense existante'}"` : ''}>
        <td><input type="date"   class="fld-date"    value="${this._escape(d.date)}"
              onchange="Depenses.updateDraft(${d.id},'date',this.value)"></td>
        <td><select class="fld-dept"
              onchange="Depenses.updateDraft(${d.id},'dept',this.value)">
              <option value="SUSHI"  ${d.dept==='SUSHI'?'selected':''}>SUSHI</option>
              <option value="BAR"    ${d.dept==='BAR'?'selected':''}>BAR</option>
              <option value="CHICHA" ${d.dept==='CHICHA'?'selected':''}>CHICHA</option>
            </select></td>
        <td><input type="text" class="fld-cat" list="draft-cat-list" placeholder="Catégorie"
              value="${this._escape(d.cat)}"
              oninput="Depenses.updateDraft(${d.id},'cat',this.value)"></td>
        <td><input type="number" class="fld-qte" min="0" step="1" placeholder="0"
              value="${this._escape(d.qte)}"
              oninput="Depenses.updateDraft(${d.id},'qte',this.value)"></td>
        <td><input type="number" class="fld-prix" min="0" step="any" placeholder="auto"
              value="${this._escape(d.prix)}"
              oninput="Depenses.updateDraft(${d.id},'prix',this.value)"
              title="Calculé automatiquement à partir de la quantité et du montant"></td>
        <td><input type="number" class="fld-montant montant" min="0" step="1" placeholder="0"
              value="${this._escape(d.montant)}"
              oninput="Depenses.updateDraft(${d.id},'montant',this.value)"></td>
        <td><select class="fld-pay"
              onchange="Depenses.updateDraft(${d.id},'paiement',this.value)">
              <option value="esp"    ${(d.paiement||'esp')==='esp'   ?'selected':''}>💵 Espèces</option>
              <option value="banque" ${d.paiement==='banque'?'selected':''}>🏦 Banque</option>
              <option value="mobile" ${d.paiement==='mobile'?'selected':''}>📱 Mobile</option>
            </select></td>
        <td><input type="text" class="fld-obs" placeholder="Observation"
              value="${this._escape(d.obs)}"
              oninput="Depenses.updateDraft(${d.id},'obs',this.value)"></td>
        <td><button class="draft-del" title="Supprimer la ligne"
              onclick="Depenses.removeDraftRow(${d.id})"><i class="ti ti-trash"></i></button></td>
      </tr>`).join('');
    this._refreshDraftSummary();
  },

  commitDrafts() {
    if (!this.drafts.length) return alert('Aucune ligne à valider.');

    // Validation
    const invalid = [];
    this.drafts.forEach((d, i) => {
      const err = [];
      if (!d.date) err.push('date');
      if (!d.cat)  err.push('catégorie');
      if (!parseFloat(d.montant)) err.push('montant');
      if (err.length) invalid.push(`Ligne ${i+1} : ${err.join(', ')} manquant`);
    });
    if (invalid.length) {
      alert('Certaines lignes sont incomplètes :\n\n' + invalid.join('\n'));
      return;
    }

    if (typeof Clotures !== 'undefined') {
      const blocked = this.drafts.find(d => Clotures.isMonthClosed(d.date));
      if (blocked) {
        alert(`🔒 Impossible : la dépense du ${Data.fmtD(blocked.date)} appartient au mois de ${Clotures.monthLabel(Clotures.ymOf(blocked.date))}, qui est clôturé.`);
        return;
      }
    }

    const nbEdit = this.drafts.filter(d => d.editingUserId || d.editingJournee).length;
    const nbNew  = this.drafts.length - nbEdit;
    const parts = [];
    if (nbNew)  parts.push(`${nbNew} nouvelle(s)`);
    if (nbEdit) parts.push(`${nbEdit} modifiée(s)`);
    if (!confirm(`Valider la saisie ? (${parts.join(' + ')})`)) return;

    const touchedJournees = new Set();
    this.drafts.forEach(d => {
      const payload = {
        date:   d.date,
        dept:   d.dept,
        label:  d.cat,
        groupe: d.cat,
        qte:    parseFloat(d.qte)  || null,
        prix:   parseFloat(d.prix) || null,
        montant: parseFloat(d.montant),
        observation: d.obs || null,
        paiement: d.paiement || 'esp',
      };
      if (d.editingJournee) {
        // Convertit une dépense de journée en dépense utilisateur :
        // retire l'entrée d'origine de j.deps puis crée un nouveau histDep.
        const { jDate, dk, idx } = d.editingJournee;
        const j = Data.journees.find(x => x.date === jDate);
        if (j && j.deps && j.deps[dk] && j.deps[dk][idx]) {
          j.deps[dk].splice(idx, 1);
          j.userRec = true;
          touchedJournees.add(j);
        }
        const newId = Data.newId();
        Data.histDep.push({ ...payload, userId: newId });
        try {
          if (typeof Audit !== 'undefined') Audit.log('update', 'depenses',
            `Dépense ${payload.dept} · ${payload.label} (extraite journée ${jDate})`,
            `${Data.fmt(payload.montant)} · ${payload.paiement}`,
            { id: newId, after: payload });
        } catch (e) {}
      } else if (d.editingUserId) {
        // Mise à jour d'une dépense existante : on conserve son userId
        const idx = Data.histDep.findIndex(x => x.userId === d.editingUserId);
        if (idx >= 0) {
          Data.histDep[idx] = { ...Data.histDep[idx], ...payload, userId: d.editingUserId };
        } else {
          // Si l'original a disparu entre-temps, on crée une nouvelle entrée
          Data.histDep.push({ ...payload, userId: Data.newId() });
        }
        try {
          if (typeof Audit !== 'undefined') Audit.log('update', 'depenses',
            `Dépense ${payload.dept} · ${payload.label}`,
            `${Data.fmt(payload.montant)} · ${payload.paiement}`,
            { id: d.editingUserId, after: payload });
        } catch (e) {}
      } else {
        const newId = Data.newId();
        Data.histDep.push({ ...payload, userId: newId });
        try {
          if (typeof Audit !== 'undefined') Audit.log('create', 'depenses',
            `Dépense ${payload.dept} · ${payload.label}`,
            `${Data.fmt(payload.montant)} · ${payload.paiement}`,
            { id: newId, after: payload });
        } catch (e) {}
      }
    });

    const committedDates = this.drafts.map(d => d.date);
    this.drafts = [];
    this.persistDrafts();
    this.persist();
    if (touchedJournees.size && typeof Recettes !== 'undefined' && Recettes.persistUser) {
      Recettes.persistUser(Array.from(touchedJournees));
    }
    App.renderAll();

    // Si le filtre de période actif masque des lignes tout juste validées,
    // le signaler : sinon elles semblent avoir « disparu » alors qu'elles
    // sont bien enregistrées.
    const hidden = committedDates.filter(dt => !App.inPeriod(dt)).length;
    if (hidden && App.toast) {
      App.toast(`✅ Dépense(s) enregistrée(s) — ${hidden} ligne(s) hors de la période affichée. Passe le filtre sur « Tout » pour les voir.`, 'info', 9000);
    }
  },

  remove(userId) {
    const idx = Data.histDep.findIndex(d => d.userId === userId);
    if (idx < 0) return;
    const dep = Data.histDep[idx];
    if (typeof Clotures !== 'undefined' && Clotures.guard(dep.date, 'La suppression de cette dépense')) return;
    if (!confirm('Supprimer cette dépense ?')) return;
    Data.histDep.splice(idx, 1);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'depenses',
        `Dépense ${dep.dept} · ${dep.label}`,
        `${Data.fmt(dep.montant || 0)} · ${dep.paiement || 'esp'}`,
        { id: userId, before: dep });
    } catch (e) {}
    this.persist();
    App.renderAll();
  },

  // ===================== PERSISTANCE LOCALE =====================
  STORAGE_KEY: 'meiji-user-deps',
  DRAFT_KEY:   'meiji-dep-drafts',

  persist() {
    const userDeps = Data.histDep.filter(d => d.userId);
    AppDB.save(this.STORAGE_KEY, userDeps);
  },

  persistDrafts() {
    // Drafts = saisies en cours, par-navigateur → localStorage uniquement.
    try {
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify({
        seq: this._draftSeq,
        drafts: this.drafts,
      }));
    } catch (e) {}
  },

  async restore() {
    const userDeps = await AppDB.load(this.STORAGE_KEY);
    if (Array.isArray(userDeps)) {
      // La version persistée fait autorité pour les dépenses utilisateur.
      // Les seeds (_seed:true) qui ne sont PAS dans les données stockées sont
      // conservés depuis data.js (migration depuis l'ancienne version sans
      // assignSeedDepIds, ou première utilisation). Les seeds présents dans
      // le stockage sont remplacés par leur version stockée (modification ou
      // suppression intentionnelle persistée).
      const storedIds = new Set(userDeps.map(d => String(d.userId)));
      Data.histDep = Data.histDep.filter(d => d._seed && !storedIds.has(String(d.userId)));
      userDeps.forEach(d => Data.histDep.push(d));
    }
    try {
      const rawD = localStorage.getItem(this.DRAFT_KEY);
      if (rawD) {
        const obj = JSON.parse(rawD);
        if (obj && Array.isArray(obj.drafts)) {
          this.drafts = obj.drafts;
          this._draftSeq = obj.seq || (this.drafts.reduce((m,d) => Math.max(m, d.id || 0), 0) + 1);
        }
      }
    } catch (e) {}
    this.backfillUnitPrices();
  },

  // Rétro-calcule le prix unitaire pour les dépenses existantes
  // où la quantité et le montant sont saisis mais le prix est manquant.
  backfillUnitPrices() {
    let changed = 0;
    Data.histDep.forEach(d => {
      if (!d.userId) return; // ne touche pas aux dépenses issues des journées
      const q = parseFloat(d.qte);
      const m = parseFloat(d.montant);
      const p = parseFloat(d.prix);
      const hasQ = !isNaN(q) && q > 0;
      const hasM = !isNaN(m) && m > 0;
      const hasP = !isNaN(p) && p > 0;
      if (hasQ && hasM && !hasP) {
        d.prix = Math.round((m / q) * 100) / 100;
        changed++;
      }
    });
    if (changed > 0) this.persist();
  },

  // ===================== EXPORT / IMPORT EXCEL =====================
  exportExcel() {
    if (typeof XLSX === 'undefined') return alert('Bibliothèque Excel non chargée');
    const all = Data.getAllDeps().slice().sort((a,b) => b.date.localeCompare(a.date));
    const rows = all.map(d => ({
      'Date':         d.date,
      'Département':  d.dept,
      'Catégorie':    d.groupe || '',
      'Quantité':     d.qte != null ? d.qte : '',
      'Prix unitaire': d.prix != null ? d.prix : '',
      'Montant':      d.montant,
      'Mode':         d.paiement || 'esp',
      'Observation':  d.observation || d.label || '',
      'ID':           d.userId || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Largeurs de colonnes
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 22 },
      { wch: 9 },  { wch: 13 }, { wch: 14 }, { wch: 10 }, { wch: 40 }, { wch: 8 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Dépenses');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `meiji-depenses-${today}.xlsx`);
  },

  importExcel(file) {
    if (typeof XLSX === 'undefined') return alert('Bibliothèque Excel non chargée');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        // On ne ré-importe que les lignes avec un ID (= entrées créées par l'utilisateur)
        const imported = [];
        rows.forEach(r => {
          const id = parseInt(r['ID']);
          if (!id) return;
          const cat = String(r['Catégorie'] || 'Autres');
          const payRaw = String(r['Mode'] || '').toLowerCase().trim();
          const pay = ['esp','banque','mobile'].includes(payRaw) ? payRaw : 'esp';
          imported.push({
            userId: id,
            date:   String(r['Date'] || '').slice(0, 10),
            dept:   String(r['Département'] || 'SUSHI').toUpperCase(),
            label:  cat,
            groupe: cat,
            qte:    r['Quantité']      !== '' ? Number(r['Quantité'])      : null,
            prix:   r['Prix unitaire'] !== '' ? Number(r['Prix unitaire']) : null,
            montant: Number(r['Montant']) || 0,
            observation: String(r['Observation'] || '') || null,
            paiement: pay,
          });
        });

        if (!imported.length) {
          alert('Aucune ligne importable trouvée (colonne ID manquante ou vide).');
          return;
        }

        if (!confirm(`Importer ${imported.length} dépense(s) ? Les dépenses utilisateur actuelles seront remplacées.`)) return;

        // Supprimer les dépenses utilisateur actuelles, garder l'historique
        Data.histDep = Data.histDep.filter(d => !d.userId);
        imported.forEach(d => Data.histDep.push(d));
        // Mettre à jour le compteur d'ID
        const maxId = Math.max(...imported.map(d => d.userId), Data.nextId - 1);
        Data.nextId = maxId + 1;

        this.persist();
        App.renderAll();
        alert(`✅ ${imported.length} dépense(s) importée(s).`);
      } catch (err) {
        alert('Erreur lors de la lecture du fichier : ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  _set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; },
};

