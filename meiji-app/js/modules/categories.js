/**
 * modules/categories.js — Gestion des catégories
 */
const Categories = {
  editId: null,

  openModal(id) {
    this.editId = id;
    const c = id ? Data.categories.find(x => x.id === id) : null;
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${id ? 'Modifier catégorie' : 'Nouvelle catégorie'}</div>
          <div class="fg"><label class="fl">Nom</label><input type="text" id="cat-nom" value="${c?.nom||''}" placeholder="Ex: Fruits de mer, Vins..."></div>
          <div class="fr">
            <div class="fg"><label class="fl">Type</label>
              <select id="cat-type">
                <option value="dep" ${c?.type==='dep'?'selected':''}>Dépense</option>
                <option value="rec" ${c?.type==='rec'?'selected':''}>Recette</option>
                <option value="both" ${c?.type==='both'?'selected':''}>Les deux</option>
              </select>
            </div>
            <div class="fg"><label class="fl">Couleur</label>
              <select id="cat-color">
                <option value="#185FA5" ${c?.color==='#185FA5'?'selected':''}>🔵 Bleu</option>
                <option value="#0F6E56" ${c?.color==='#0F6E56'?'selected':''}>🟢 Vert</option>
                <option value="#A32D2D" ${c?.color==='#A32D2D'?'selected':''}>🔴 Rouge</option>
                <option value="#BA7517" ${c?.color==='#BA7517'?'selected':''}>🟡 Ambre</option>
                <option value="#3C3489" ${c?.color==='#3C3489'?'selected':''}>🟣 Violet</option>
                <option value="#0E6B5E" ${c?.color==='#0E6B5E'?'selected':''}>🩵 Teal</option>
                <option value="#854F0B" ${c?.color==='#854F0B'?'selected':''}>🟤 Brun</option>
                <option value="#3B6D11" ${c?.color==='#3B6D11'?'selected':''}>🌿 Olive</option>
                <option value="#993556" ${c?.color==='#993556'?'selected':''}>🌸 Rose</option>
                <option value="#5F5E5A" ${c?.color==='#5F5E5A'?'selected':''}>⬜ Gris</option>
              </select>
            </div>
          </div>
          <div class="fg"><label class="fl">Département</label>
            <select id="cat-dept">
              <option value="all" ${!c||c.dept==='all'?'selected':''}>Tous</option>
              <option value="SUSHI" ${c?.dept==='SUSHI'?'selected':''}>SUSHI</option>
              <option value="BAR" ${c?.dept==='BAR'?'selected':''}>BAR</option>
              <option value="CHICHA" ${c?.dept==='CHICHA'?'selected':''}>CHICHA</option>
            </select>
          </div>
          <div class="fg"><label class="fl">Description</label><input type="text" id="cat-desc" value="${c?.desc||''}" placeholder="Optionnel..."></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Categories.save()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  save() {
    const nom = document.getElementById('cat-nom')?.value.trim();
    if (!nom) { alert('Nom requis'); return; }
    const cat = {
      id: this.editId || Data.newId(),
      nom,
      type: document.getElementById('cat-type')?.value,
      color: document.getElementById('cat-color')?.value,
      dept: document.getElementById('cat-dept')?.value,
      desc: document.getElementById('cat-desc')?.value,
    };
    if (this.editId) {
      const idx = Data.categories.findIndex(c => c.id === this.editId);
      if (idx >= 0) Data.categories[idx] = cat;
    } else {
      Data.categories.push(cat);
    }
    this.editId = null;
    App.closeModal();
    this.render();
  },

  delete(id) {
    if (!confirm('Supprimer cette catégorie ?')) return;
    Data.categories = Data.categories.filter(c => c.id !== id);
    this.render();
  },

  render() {
    const rec = Data.categories.filter(c => c.type === 'rec' || c.type === 'both');
    const dep = Data.categories.filter(c => c.type === 'dep' || c.type === 'both');
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const countEl = document.getElementById('cat-count');
    if (countEl) countEl.textContent = Data.categories.length + ' catégories';

    const itemHtml = c => `
      <div class="cat-item">
        <div style="width:12px;height:12px;border-radius:50%;background:${c.color};flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:12px">${c.nom}</div>
          <div style="font-size:10px;color:#aaa">${c.dept === 'all' ? 'Tous depts' : c.dept}${c.desc ? ' · ' + c.desc : ''}</div>
        </div>
        <button class="btn-ghost" onclick="Categories.openModal(${c.id})">✏️</button>
      </div>`;

    set('cat-rec', rec.length ? rec.map(itemHtml).join('') : '<div class="empty">Aucune catégorie recette</div>');
    set('cat-dep', dep.length ? dep.map(itemHtml).join('') : '<div class="empty">Aucune catégorie dépense</div>');
    set('cat-table', Data.categories.map(c => `
      <tr>
        <td style="display:flex;align-items:center;gap:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0;display:inline-block"></span>
          <b>${c.nom}</b>
        </td>
        <td><span class="badge ${c.type==='dep'?'b-red':c.type==='rec'?'b-green':'b-purple'}">${c.type==='dep'?'Dépense':c.type==='rec'?'Recette':'Les deux'}</span></td>
        <td><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${c.color}"></span></td>
        <td><span class="badge b-blue">${c.dept === 'all' ? 'Tous' : c.dept}</span></td>
        <td class="nowrap">
          <button class="btn btn-sm" onclick="Categories.openModal(${c.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="Categories.delete(${c.id})" style="margin-left:4px">🗑</button>
        </td>
      </tr>`).join(''));
  },
};
