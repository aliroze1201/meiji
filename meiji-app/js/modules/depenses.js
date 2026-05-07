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
  renderTable() {
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
    if (!list.length) { tb.innerHTML = '<tr><td colspan="9" class="empty">Aucune dépense</td></tr>'; return; }

    const dash = '<span style="color:var(--c-muted)">—</span>';
    tb.innerHTML = list.map(d => {
      const col = catColors[d.groupe || 'Autres'] || '#94A3B8';
      const obs = d.observation ? this._escape(d.observation) : '';
      const obsCell = obs ? `<span title="${obs}" style="display:inline-block;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom">${obs}</span>` : dash;
      const deleteBtn = d.userId
        ? `<button class="btn-ghost" title="Supprimer" onclick="Depenses.remove(${d.userId})"><i class="ti ti-trash"></i></button>`
        : '';
      return `
      <tr>
        <td class="nowrap">${Data.fmtDs(d.date)}</td>
        <td><span style="font-size:11px;padding:3px 9px;border-radius:999px;background:${col}22;color:${col};font-weight:700">${d.groupe || 'Autres'}</span></td>
        <td>${this._escape(d.label || '')}</td>
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

  openModal() {
    const cats = Data.categories.filter(c => c.type === 'dep');
    const today = Data.today();
    const opts = cats.map(c => `<option value="${this._escape(c.nom)}"></option>`).join('');
    const html = `
      <div class="modal-overlay show" onclick="if(event.target===this)App.closeModal()">
        <div class="modal modal-lg">
          <div class="modal-title"><i class="ti ti-plus"></i> Nouvelle dépense</div>

          <div class="fr">
            <div class="fg"><label class="fl">Date</label>
              <input type="date" id="dep-form-date" value="${today}">
            </div>
            <div class="fg"><label class="fl">Département</label>
              <select id="dep-form-dept">
                <option value="SUSHI">SUSHI</option>
                <option value="BAR">BAR</option>
                <option value="CHICHA">CHICHA</option>
              </select>
            </div>
          </div>

          <div class="fg">
            <label class="fl">Catégorie <span style="color:var(--c-muted);font-weight:500;text-transform:none">(tapez pour rechercher)</span></label>
            <input type="text" id="dep-form-cat" list="dep-form-catlist" placeholder="Ex : Boissons, Matières premières...">
            <datalist id="dep-form-catlist">${opts}</datalist>
          </div>

          <div class="fg">
            <label class="fl">Désignation</label>
            <input type="text" id="dep-form-label" placeholder="Nom de l'article ou service">
          </div>

          <div class="fr3">
            <div class="fg"><label class="fl">Quantité</label>
              <input type="number" id="dep-form-qte" value="1" min="0" step="1" oninput="Depenses._compute()">
            </div>
            <div class="fg"><label class="fl">Prix unitaire (FCFA)</label>
              <input type="number" id="dep-form-prix" min="0" step="100" oninput="Depenses._compute()" placeholder="0">
            </div>
            <div class="fg"><label class="fl">Montant total (FCFA)</label>
              <input type="number" id="dep-form-montant" min="0" step="1" placeholder="0"
                     style="font-weight:700;color:var(--c-red);background:var(--c-red-soft)">
            </div>
          </div>
          <div style="font-size:11px;color:var(--c-muted);margin:-6px 0 12px">
            Le montant se calcule automatiquement (Qté × Prix). Vous pouvez aussi le saisir directement.
          </div>

          <div class="fg">
            <label class="fl">Observation (optionnel)</label>
            <textarea id="dep-form-obs" rows="2" placeholder="Précisions, fournisseur, n° de facture, etc."></textarea>
          </div>

          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Depenses.save()"><i class="ti ti-check"></i> Enregistrer</button>
          </div>
        </div>
      </div>`;
    App.showModal(html);
    setTimeout(() => document.getElementById('dep-form-cat')?.focus(), 50);
  },

  _compute() {
    const q = parseFloat(document.getElementById('dep-form-qte')?.value) || 0;
    const p = parseFloat(document.getElementById('dep-form-prix')?.value) || 0;
    const m = document.getElementById('dep-form-montant');
    if (m && (q || p)) m.value = Math.round(q * p);
  },

  save() {
    const date = document.getElementById('dep-form-date').value;
    const dept = document.getElementById('dep-form-dept').value;
    const cat  = document.getElementById('dep-form-cat').value.trim();
    const label = document.getElementById('dep-form-label').value.trim();
    const qte  = parseFloat(document.getElementById('dep-form-qte').value) || 0;
    const prix = parseFloat(document.getElementById('dep-form-prix').value) || 0;
    const mnt  = parseFloat(document.getElementById('dep-form-montant').value) || 0;
    const obs  = document.getElementById('dep-form-obs').value.trim();

    if (!date) return alert('Date requise');
    if (!cat)  return alert('Catégorie requise');
    if (!mnt)  return alert('Montant requis');

    const id = Data.newId();
    Data.histDep.push({
      userId: id,
      date,
      dept,
      label: label || cat,
      groupe: cat,
      qte: qte || null,
      prix: prix || null,
      montant: mnt,
      observation: obs || null,
    });

    this.persist();
    App.closeModal();
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

  persist() {
    try {
      const userDeps = Data.histDep.filter(d => d.userId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userDeps));
    } catch (e) {
      console.warn('localStorage indisponible', e);
    }
  },

  restore() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const userDeps = JSON.parse(raw);
      if (!Array.isArray(userDeps)) return;
      // Ne pas dupliquer si déjà présents
      const existingIds = new Set(Data.histDep.filter(d => d.userId).map(d => d.userId));
      userDeps.forEach(d => {
        if (!existingIds.has(d.userId)) Data.histDep.push(d);
      });
    } catch (e) {
      console.warn('Erreur restauration', e);
    }
  },

  // ===================== EXPORT / IMPORT EXCEL =====================
  exportExcel() {
    if (typeof XLSX === 'undefined') return alert('Bibliothèque Excel non chargée');
    const all = Data.getAllDeps().slice().sort((a,b) => b.date.localeCompare(a.date));
    const rows = all.map(d => ({
      'Date':         d.date,
      'Département':  d.dept,
      'Catégorie':    d.groupe || '',
      'Désignation':  d.label || '',
      'Quantité':     d.qte != null ? d.qte : '',
      'Prix unitaire': d.prix != null ? d.prix : '',
      'Montant':      d.montant,
      'Observation':  d.observation || '',
      'ID':           d.userId || '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Largeurs de colonnes
    ws['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 32 },
      { wch: 9 },  { wch: 13 }, { wch: 14 }, { wch: 36 }, { wch: 8 },
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
          imported.push({
            userId: id,
            date:   String(r['Date'] || '').slice(0, 10),
            dept:   String(r['Département'] || 'SUSHI').toUpperCase(),
            label:  String(r['Désignation'] || ''),
            groupe: String(r['Catégorie'] || 'Autres'),
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
