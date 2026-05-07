/**
 * modules/journee.js — Gestion des journées
 */

const Journee = {
  editId: null,
  modalDeps: { s: [], b: [], c: [] },

  renderTable() {
    const filter = App.filters.jour;
    const list = filter === 'all' ? Data.journees : Data.journees.filter(j => j.date.startsWith(filter));
    const tb = document.getElementById('jour-table');
    if (!tb) return;
    if (!list.length) { tb.innerHTML = '<tr><td colspan="16" class="empty">Aucune journée enregistrée</td></tr>'; return; }
    tb.innerHTML = list.map(j => `
      <tr>
        <td class="nowrap fw-bold">${Data.fmtDs(j.date)}</td>
        <td class="text-right">${Data.fmts(j.s.esp)}</td><td class="text-right">${Data.fmts(j.s.chq)}</td><td class="text-right">${Data.fmts(j.s.mob)}</td><td class="text-right">${Data.fmts(j.s.cred)}</td>
        <td class="text-right">${Data.fmts(j.b.esp)}</td><td class="text-right">${Data.fmts(j.b.chq)}</td><td class="text-right">${Data.fmts(j.b.mob)}</td><td class="text-right">${Data.fmts(j.b.cred)}</td>
        <td class="text-right">${Data.fmts(j.c.esp)}</td><td class="text-right">${Data.fmts(j.c.chq)}</td><td class="text-right">${Data.fmts(j.c.mob)}</td><td class="text-right">${Data.fmts(j.c.cred)}</td>
        <td class="text-right text-red">${Data.fmts(Data.depTotal(j))}</td>
        <td class="text-right fw-bold">${Data.fmts(Data.caTotal(j))}</td>
        <td class="nowrap">
          <button class="btn btn-sm" onclick="Journee.openModal(${j.id})" style="color:#185FA5">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="Journee.delete(${j.id})" style="margin-left:3px">🗑</button>
        </td>
      </tr>`).join('');
  },

  openModal(id) {
    this.editId = id;
    this.modalDeps = { s: [], b: [], c: [] };
    const j = id !== null ? Data.journees.find(x => x.id === id) : null;
    if (j && j.deps) {
      this.modalDeps.s = (j.deps.s || []).map(x => ({ ...x }));
      this.modalDeps.b = (j.deps.b || []).map(x => ({ ...x }));
      this.modalDeps.c = (j.deps.c || []).map(x => ({ ...x }));
    }

    const catOptions = Data.categories
      .filter(c => c.type === 'dep' || c.type === 'both')
      .map(c => `<option value="${c.nom}">${c.nom}</option>`).join('');

    const depts = [
      { k: 's', name: 'SUSHI', icon: '🍱', col: '#185FA5' },
      { k: 'b', name: 'BAR', icon: '🍸', col: '#0F6E56' },
      { k: 'c', name: 'CHICHA', icon: '💨', col: '#BA7517' },
    ];

    const blocksHTML = depts.map(d => {
      const v = j ? j[d.k] : { esp: 0, chq: 0, mob: 0, cred: 0 };
      return `
        <div class="dept-block">
          <div class="dept-block-title" style="color:${d.col}">${d.icon} Caisse ${d.name}</div>
          <div class="pay-grid">
            ${['esp','chq','mob','cred'].map((f, i) => `
              <div class="pay-field">
                <label>${['Espèces','Chèque','Mobile','Crédit client'][i]}</label>
                <input type="number" id="j-${d.k}-${f}" value="${v[f] || ''}" placeholder="0" oninput="Journee.calcTotal('${d.k}')">
              </div>`).join('')}
          </div>
          <div class="pay-total-row">
            <span style="color:#888">Total CA ${d.name}</span>
            <span style="font-weight:700;color:${d.col}" id="j-${d.k}-tot">0 FCFA</span>
          </div>
          <div class="pay-grid" style="margin-top:10px">
            <div class="pay-field" style="grid-column:span 2">
              <label>Dépenses ${d.name} (total)</label>
              <input type="number" id="j-${d.k}-dep" value="${j ? (j['d' + d.k] || '') : ''}" placeholder="0">
            </div>
            <div class="pay-field" style="grid-column:span 2">
              <label>Caisse restante</label>
              <input type="number" id="j-${d.k}-caisse" value="${j ? (j['c' + d.k] || '') : ''}" placeholder="0">
            </div>
          </div>
          <div style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.04em;margin:10px 0 4px">Détail dépenses ${d.name}</div>
          <div class="dep-list" id="dl-${d.k}"></div>
          <div class="dep-add">
            <select id="da-${d.k}-g" style="font-size:11px;padding:4px 7px">${catOptions}</select>
            <input type="text" id="da-${d.k}-l" placeholder="Désignation" style="font-size:11px;padding:4px 7px">
            <input type="number" id="da-${d.k}-m" placeholder="Montant" style="font-size:11px;padding:4px 7px">
            <button class="btn btn-primary btn-sm" onclick="Journee.addDepLine('${d.k}')">+ Ajouter</button>
          </div>
        </div>`;
    }).join('');

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal modal-lg">
          <div class="modal-title">${id === null ? 'Nouvelle journée' : 'Modifier la journée'}</div>
          <div class="fg">
            <label class="fl">Date</label>
            <input type="date" id="j-date" value="${j ? j.date : Data.today()}">
          </div>
          ${blocksHTML}
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Journee.save()">💾 Enregistrer</button>
          </div>
        </div>
      </div>`);

    depts.forEach(d => this.calcTotal(d.k));
    ['s', 'b', 'c'].forEach(k => this.renderDepList(k));
  },

  calcTotal(dept) {
    const v = ['esp','chq','mob','cred'].reduce((s, k) => {
      const el = document.getElementById(`j-${dept}-${k}`);
      return s + (parseFloat(el?.value) || 0);
    }, 0);
    const el = document.getElementById(`j-${dept}-tot`);
    if (el) el.textContent = Data.fmt(v);
  },

  addDepLine(dept) {
    const grp = document.getElementById(`da-${dept}-g`)?.value;
    const lib = document.getElementById(`da-${dept}-l`)?.value.trim();
    const mnt = parseFloat(document.getElementById(`da-${dept}-m`)?.value) || 0;
    if (!lib || !mnt) return;
    this.modalDeps[dept].push({ id: Data.newId(), groupe: grp, label: lib, montant: mnt });
    document.getElementById(`da-${dept}-l`).value = '';
    document.getElementById(`da-${dept}-m`).value = '';
    this.renderDepList(dept);
  },

  removeDepLine(dept, id) {
    this.modalDeps[dept] = this.modalDeps[dept].filter(x => x.id !== id);
    this.renderDepList(dept);
  },

  renderDepList(dept) {
    const el = document.getElementById(`dl-${dept}`);
    if (!el) return;
    const list = this.modalDeps[dept];
    const catColors = Data.getCatColors();
    if (!list.length) {
      el.innerHTML = '<div style="padding:7px 10px;font-size:11px;color:#aaa">Aucune dépense — ajoutez via le formulaire ci-dessous</div>';
      return;
    }
    el.innerHTML = list.map(d => `
      <div class="dep-item">
        <span style="font-size:10px;padding:2px 6px;border-radius:10px;background:${catColors[d.groupe]||'#888'}22;color:${catColors[d.groupe]||'#888'};font-weight:600;white-space:nowrap">${d.groupe}</span>
        <span class="dep-item-label">${d.label}</span>
        <span class="dep-item-mnt">${Data.fmts(d.montant)} F</span>
        <button class="btn-ghost" onclick="Journee.removeDepLine('${dept}', ${d.id})" style="color:#ccc" onmouseover="this.style.color='#A32D2D'" onmouseout="this.style.color='#ccc'">×</button>
      </div>`).join('');
  },

  g(id) { return parseFloat(document.getElementById(id)?.value) || 0; },

  save() {
    const date = document.getElementById('j-date')?.value;
    if (!date) { alert('Veuillez entrer une date.'); return; }
    const entry = {
      id: this.editId !== null ? this.editId : Data.newId(),
      date,
      s: { esp: this.g('j-s-esp'), chq: this.g('j-s-chq'), mob: this.g('j-s-mob'), cred: this.g('j-s-cred') },
      b: { esp: this.g('j-b-esp'), chq: this.g('j-b-chq'), mob: this.g('j-b-mob'), cred: this.g('j-b-cred') },
      c: { esp: this.g('j-c-esp'), chq: this.g('j-c-chq'), mob: this.g('j-c-mob'), cred: this.g('j-c-cred') },
      ds: this.g('j-s-dep'), db: this.g('j-b-dep'), dc: this.g('j-c-dep'),
      cs: this.g('j-s-caisse'), cb: this.g('j-b-caisse'), cc: this.g('j-c-caisse'),
      deps: { s: [...this.modalDeps.s], b: [...this.modalDeps.b], c: [...this.modalDeps.c] },
    };
    if (this.editId !== null) {
      const idx = Data.journees.findIndex(x => x.id === this.editId);
      if (idx >= 0) Data.journees[idx] = entry;
    } else {
      Data.journees.unshift(entry);
    }
    Data.journees.sort((a, b) => b.date.localeCompare(a.date));
    App.closeModal();
    App.renderAll();
  },

  delete(id) {
    if (!confirm('Supprimer cette journée ?')) return;
    Data.journees = Data.journees.filter(x => x.id !== id);
    App.renderAll();
  },
};
