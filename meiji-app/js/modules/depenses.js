/**
 * modules/depenses.js — Dépenses, Recettes, Analyse
 */

// ===================== RECETTES =====================
const Recettes = {
  render() {
    const jj = Data.journees;
    const tS = jj.reduce((s,j) => s + Data.caisse(j,'s'), 0);
    const tB = jj.reduce((s,j) => s + Data.caisse(j,'b'), 0);
    const tC = jj.reduce((s,j) => s + Data.caisse(j,'c'), 0);
    const tEsp = jj.reduce((s,j) => s + j.s.esp + j.b.esp + j.c.esp, 0);
    const tChq = jj.reduce((s,j) => s + j.s.chq + j.b.chq + j.c.chq, 0);
    const tMob = jj.reduce((s,j) => s + j.s.mob + j.b.mob + j.c.mob + j.s.cred + j.b.cred + j.c.cred, 0);

    this._set('r-s', Data.fmt(tS));
    this._set('r-b', Data.fmt(tB));
    this._set('r-c', Data.fmt(tC));
    this._set('r-esp', Data.fmt(tEsp));
    this._set('r-chq', Data.fmt(tChq));
    this._set('r-mob', Data.fmt(tMob));

    const tb = document.getElementById('rec-table');
    if (!tb) return;
    if (!jj.length) { tb.innerHTML = '<tr><td colspan="6" class="empty">Aucune recette</td></tr>'; return; }

    tb.innerHTML = jj.map(j => {
      const total = Data.caTotal(j);
      const pays = [];
      const allPays = { esp: j.s.esp+j.b.esp+j.c.esp, chq: j.s.chq+j.b.chq+j.c.chq, mob: j.s.mob+j.b.mob+j.c.mob, cred: j.s.cred+j.b.cred+j.c.cred };
      if (allPays.esp) pays.push(`<span class="badge b-blue">Esp. ${Data.fmts(allPays.esp)}</span>`);
      if (allPays.chq) pays.push(`<span class="badge b-purple">Chq ${Data.fmts(allPays.chq)}</span>`);
      if (allPays.mob) pays.push(`<span class="badge b-green">Mob ${Data.fmts(allPays.mob)}</span>`);
      if (allPays.cred) pays.push(`<span class="badge b-amber">Créd ${Data.fmts(allPays.cred)}</span>`);
      return `<tr>
        <td>${Data.fmtD(j.date)}</td>
        <td class="text-right text-blue">${Data.fmts(Data.caisse(j,'s'))}</td>
        <td class="text-right text-green">${Data.fmts(Data.caisse(j,'b'))}</td>
        <td class="text-right" style="color:#BA7517">${Data.fmts(Data.caisse(j,'c'))}</td>
        <td class="text-right fw-bold">${Data.fmts(total)}</td>
        <td><div style="display:flex;gap:4px;flex-wrap:wrap">${pays.join('')}</div></td>
      </tr>`;
    }).join('');
  },
  _set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; },
};

// ===================== DEPENSES =====================
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
    const all = Data.getAllDeps();
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
    if (!list.length) { tb.innerHTML = '<tr><td colspan="8" class="empty">Aucune dépense</td></tr>'; return; }

    const dash = '<span style="color:var(--c-muted)">—</span>';
    tb.innerHTML = list.map(d => {
      const col = catColors[d.groupe || 'Autres'] || '#94A3B8';
      const obsRaw = d.observation || d.label || '';
      const obs = obsRaw ? this._escape(obsRaw) : '';
      const obsCell = obs ? `<span title="${obs}" style="display:inline-block;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom">${obs}</span>` : dash;
      const deleteBtn = d.userId
        ? `<button class="btn-ghost" title="Supprimer" onclick="Depenses.remove(${d.userId})"><i class="ti ti-trash"></i></button>`
        : '';
      return `
      <tr>
        <td class="nowrap">${Data.fmtDs(d.date)}</td>
        <td><span style="font-size:11px;padding:3px 9px;border-radius:999px;background:${col}22;color:${col};font-weight:700">${d.groupe || 'Autres'}</span></td>
        <td class="text-right">${d.qte != null ? d.qte : dash}</td>
        <td class="text-right">${d.prix != null ? Data.fmts(d.prix) : dash}</td>
        <td class="text-right fw-bold text-red">${Data.fmts(d.montant)} FCFA</td>
        <td><span class="badge ${d.dept==='SUSHI'?'b-blue':d.dept==='BAR'?'b-green':'b-amber'}">${d.dept}</span></td>
        <td>${obsCell}</td>
        <td>${deleteBtn}</td>
      </tr>`;
    }).join('');
  },

  _escape(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },

  // ===================== BROUILLONS (saisie en cours) =====================
  newDraft() {
    return {
      id: this._draftSeq++,
      date: Data.today(),
      dept: 'SUSHI',
      cat:  '',
      qte:  '',
      prix: '',
      montant: '',
      obs: '',
    };
  },

  addDraftRow() {
    this.drafts.push(this.newDraft());
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
    // recalcul auto du montant si l'utilisateur n'a pas écrit dedans
    if (field === 'qte' || field === 'prix') {
      const q = parseFloat(d.qte) || 0;
      const p = parseFloat(d.prix) || 0;
      if (q && p) d.montant = Math.round(q * p);
      const tr = document.querySelector(`#draft-tbody tr[data-draft-id="${id}"]`);
      const inp = tr?.querySelector('input.fld-montant');
      if (inp) inp.value = d.montant || '';
    }
    this.persistDrafts();
    this._refreshDraftSummary();
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

    tb.innerHTML = this.drafts.map(d => `
      <tr data-draft-id="${d.id}">
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
        <td><input type="number" class="fld-prix" min="0" step="100" placeholder="0"
              value="${this._escape(d.prix)}"
              oninput="Depenses.updateDraft(${d.id},'prix',this.value)"></td>
        <td><input type="number" class="fld-montant montant" min="0" step="1" placeholder="0"
              value="${this._escape(d.montant)}"
              oninput="Depenses.updateDraft(${d.id},'montant',this.value)"></td>
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

    if (!confirm(`Valider ${this.drafts.length} dépense(s) ? Elles seront ajoutées à l'historique.`)) return;

    this.drafts.forEach(d => {
      const id = Data.newId();
      Data.histDep.push({
        userId: id,
        date:   d.date,
        dept:   d.dept,
        label:  d.cat,
        groupe: d.cat,
        qte:    parseFloat(d.qte)  || null,
        prix:   parseFloat(d.prix) || null,
        montant: parseFloat(d.montant),
        observation: d.obs || null,
      });
    });

    this.drafts = [];
    this.persistDrafts();
    this.persist();
    App.renderAll();
  },

  remove(userId) {
    if (!confirm('Supprimer cette dépense ?')) return;
    const idx = Data.histDep.findIndex(d => d.userId === userId);
    if (idx >= 0) {
      Data.histDep.splice(idx, 1);
      this.persist();
      App.renderAll();
    }
  },

  // ===================== PERSISTANCE LOCALE =====================
  STORAGE_KEY: 'meiji-user-deps',
  DRAFT_KEY:   'meiji-dep-drafts',

  persist() {
    try {
      const userDeps = Data.histDep.filter(d => d.userId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userDeps));
    } catch (e) { console.warn('localStorage indisponible', e); }
  },

  persistDrafts() {
    try {
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify({
        seq: this._draftSeq,
        drafts: this.drafts,
      }));
    } catch (e) { console.warn('localStorage indisponible', e); }
  },

  restore() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const userDeps = JSON.parse(raw);
        if (Array.isArray(userDeps)) {
          const existingIds = new Set(Data.histDep.filter(d => d.userId).map(d => d.userId));
          userDeps.forEach(d => { if (!existingIds.has(d.userId)) Data.histDep.push(d); });
        }
      }
    } catch (e) { console.warn('Erreur restauration', e); }

    try {
      const rawD = localStorage.getItem(this.DRAFT_KEY);
      if (rawD) {
        const obj = JSON.parse(rawD);
        if (obj && Array.isArray(obj.drafts)) {
          this.drafts = obj.drafts;
          this._draftSeq = obj.seq || (this.drafts.reduce((m,d) => Math.max(m, d.id || 0), 0) + 1);
        }
      }
    } catch (e) { console.warn('Erreur restauration drafts', e); }
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
      'Observation':  d.observation || d.label || '',
      'ID':           d.userId || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Largeurs de colonnes
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 22 },
      { wch: 9 },  { wch: 13 }, { wch: 14 }, { wch: 40 }, { wch: 8 },
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

// ===================== ANALYSE =====================
const Analyse = {
  render() {
    const filter = App.filters.an;
    const all = Data.getAllDeps();
    const fil = filter === 'all' ? all : all.filter(d => d.dept === filter);
    const tot = fil.reduce((s,d) => s + d.montant, 0);
    const catColors = Data.getCatColors();

    // Métriques
    const groups = {};
    fil.forEach(d => { groups[d.groupe] = (groups[d.groupe] || 0) + d.montant; });
    const dominant = Object.entries(groups).sort((a,b) => b[1]-a[1])[0]?.[0] || '-';
    const distinctLabels = [...new Set(fil.map(d => d.label))].length;

    const metricsEl = document.getElementById('an-metrics');
    if (metricsEl) metricsEl.innerHTML = `
      <div class="mc red"><div class="mc-label red">Total charges</div><div class="mc-val red">${Data.fmt(tot)}</div></div>
      <div class="mc blue"><div class="mc-label blue">Postes distincts</div><div class="mc-val blue">${distinctLabels}</div></div>
      <div class="mc"><div class="mc-label">Groupe dominant</div><div class="mc-val" style="font-size:14px">${dominant}</div></div>`;

    // Groupes avec détail
    const byG = {};
    fil.forEach(d => {
      if (!byG[d.groupe]) byG[d.groupe] = { total: 0, items: [], byDept: { SUSHI: 0, BAR: 0, CHICHA: 0 } };
      byG[d.groupe].total += d.montant;
      byG[d.groupe].items.push(d);
      byG[d.groupe].byDept[d.dept] = (byG[d.groupe].byDept[d.dept] || 0) + d.montant;
    });
    const sorted = Object.entries(byG).sort((a,b) => b[1].total - a[1].total);

    const container = document.getElementById('an-groups');
    if (!container) return;
    container.innerHTML = sorted.map(([grp, info]) => {
      const pct = tot ? Math.round((info.total / tot) * 100) : 0;
      const col = catColors[grp] || '#888';
      const byLabel = {};
      info.items.forEach(d => {
        if (!byLabel[d.label]) byLabel[d.label] = { total: 0, dept: d.dept, count: 0 };
        byLabel[d.label].total += d.montant;
        byLabel[d.label].count++;
      });
      const subRows = Object.entries(byLabel).sort((a,b) => b[1].total - a[1].total).map(([lbl, li]) => `
        <tr>
          <td style="padding-left:1.5rem">${lbl}</td>
          <td><span class="badge ${li.dept==='SUSHI'?'b-blue':li.dept==='BAR'?'b-green':'b-amber'}">${li.dept}</span></td>
          <td class="text-right" style="color:#aaa">${li.count}x</td>
          <td class="text-right fw-bold text-red">${Data.fmts(li.total)} FCFA</td>
          <td class="text-right" style="color:#aaa;font-size:11px">${info.total ? Math.round((li.total/info.total)*100) : 0}%</td>
        </tr>`).join('');

      return `
        <div class="card" style="padding:14px 18px">
          <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer"
            onclick="const sub=this.parentElement.querySelector('.an-sub');sub.style.display=sub.style.display==='none'?'block':'none'">
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700">
              <span style="width:10px;height:10px;border-radius:2px;background:${col};display:inline-block"></span>
              ${grp}
              <span style="font-size:11px;color:#aaa;font-weight:400">${pct}%</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge b-blue">S: ${Data.fmts(info.byDept.SUSHI)}</span>
              <span class="badge b-green">B: ${Data.fmts(info.byDept.BAR)}</span>
              <span class="badge b-amber">C: ${Data.fmts(info.byDept.CHICHA)}</span>
              <span class="fw-bold text-red" style="font-size:13px">${Data.fmt(info.total)}</span>
              <span style="color:#aaa">▼</span>
            </div>
          </div>
          <div class="progress-bg" style="margin:.5rem 0">
            <div class="progress-fill" style="background:${col};width:${pct}%"></div>
          </div>
          <div class="an-sub" style="display:none">
            <table>
              <thead><tr><th>Désignation</th><th>Dept</th><th>Nb fois</th><th class="text-right">Total</th><th class="text-right">%</th></tr></thead>
              <tbody>${subRows}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');
  },
};
