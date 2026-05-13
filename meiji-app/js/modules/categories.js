/**
 * modules/categories.js — Gestion des catégories et sous-catégories.
 *
 * Modèle : chaque catégorie a un champ optionnel `parentId`.
 *   - parentId null/absent  → catégorie racine
 *   - parentId = id(parent) → sous-catégorie
 *
 * Une sous-catégorie hérite du type de son parent (cohérence dépense/recette)
 * mais peut avoir son propre département, sa propre couleur et sa propre desc.
 *
 * Persistance : table app_state (clé 'meiji-categories') via AppDB.
 */

const Categories = {
  STORAGE_KEY: 'meiji-categories',
  editId: null,

  // ===================== HELPERS =====================
  isRoot(c)        { return !c.parentId; },
  children(parentId) { return Data.categories.filter(c => c.parentId === parentId); },
  roots(type)      {
    return Data.categories.filter(c => this.isRoot(c) && (
      !type || c.type === type || c.type === 'both'
    ));
  },
  byId(id)         { return Data.categories.find(c => c.id === id); },

  // ===================== MODAL =====================
  openModal(id) {
    this.editId = id;
    const c = id ? this.byId(id) : null;
    const isEdit = !!c;

    // Parents possibles : tous les "racine" du même type (dépense ou recette).
    // Si on édite une sous-catégorie, son parent actuel doit rester visible.
    const buildParentOptions = () => {
      const opts = ['<option value="">— Aucun (catégorie racine)</option>'];
      Data.categories
        .filter(x => this.isRoot(x) && (!isEdit || x.id !== c.id))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        .forEach(p => {
          const sel = c?.parentId === p.id ? 'selected' : '';
          opts.push(`<option value="${p.id}" ${sel}>${this._esc(p.nom)} (${p.type === 'dep' ? 'Dép.' : p.type === 'rec' ? 'Rec.' : 'Mixte'})</option>`);
        });
      return opts.join('');
    };

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${isEdit ? 'Modifier catégorie' : 'Nouvelle catégorie'}</div>

          <div class="fg">
            <label class="fl">Parent (sous-catégorie ?)</label>
            <select id="cat-parent">${buildParentOptions()}</select>
            <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
              Laisser vide pour créer une catégorie racine. Choisir un parent pour créer une sous-catégorie.
            </div>
          </div>

          <div class="fg"><label class="fl">Nom *</label>
            <input type="text" id="cat-nom" value="${this._esc(c?.nom || '')}" placeholder="Ex: Fruits de mer, Vins rouges...">
          </div>

          <div class="fr">
            <div class="fg"><label class="fl">Type</label>
              <select id="cat-type">
                <option value="dep"  ${c?.type === 'dep'  ? 'selected' : ''}>Dépense</option>
                <option value="rec"  ${c?.type === 'rec'  ? 'selected' : ''}>Recette</option>
                <option value="both" ${c?.type === 'both' ? 'selected' : ''}>Les deux</option>
              </select>
              <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
                Hérité du parent automatiquement si sous-catégorie.
              </div>
            </div>
            <div class="fg"><label class="fl">Couleur</label>
              <select id="cat-color">
                <option value="#185FA5" ${c?.color === '#185FA5' ? 'selected' : ''}>🔵 Bleu</option>
                <option value="#0F6E56" ${c?.color === '#0F6E56' ? 'selected' : ''}>🟢 Vert</option>
                <option value="#A32D2D" ${c?.color === '#A32D2D' ? 'selected' : ''}>🔴 Rouge</option>
                <option value="#BA7517" ${c?.color === '#BA7517' ? 'selected' : ''}>🟡 Ambre</option>
                <option value="#3C3489" ${c?.color === '#3C3489' ? 'selected' : ''}>🟣 Violet</option>
                <option value="#0E6B5E" ${c?.color === '#0E6B5E' ? 'selected' : ''}>🩵 Teal</option>
                <option value="#854F0B" ${c?.color === '#854F0B' ? 'selected' : ''}>🟤 Brun</option>
                <option value="#3B6D11" ${c?.color === '#3B6D11' ? 'selected' : ''}>🌿 Olive</option>
                <option value="#993556" ${c?.color === '#993556' ? 'selected' : ''}>🌸 Rose</option>
                <option value="#5F5E5A" ${c?.color === '#5F5E5A' ? 'selected' : ''}>⬜ Gris</option>
              </select>
            </div>
          </div>

          <div class="fg"><label class="fl">Département</label>
            <select id="cat-dept">
              <option value="all"    ${!c || c.dept === 'all' ? 'selected' : ''}>Tous</option>
              <option value="SUSHI"  ${c?.dept === 'SUSHI'  ? 'selected' : ''}>SUSHI</option>
              <option value="BAR"    ${c?.dept === 'BAR'    ? 'selected' : ''}>BAR</option>
              <option value="CHICHA" ${c?.dept === 'CHICHA' ? 'selected' : ''}>CHICHA</option>
            </select>
          </div>

          <div class="fg"><label class="fl">Description</label>
            <input type="text" id="cat-desc" value="${this._esc(c?.desc || '')}" placeholder="Optionnel...">
          </div>

          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Categories.save()">Enregistrer</button>
          </div>
        </div>
      </div>`);

    // Quand on choisit un parent, on force le type du parent dans le select
    // et on le grise visuellement (la sous-catégorie hérite du type parent).
    const onParentChange = () => {
      const pid = parseInt(document.getElementById('cat-parent')?.value, 10);
      const typeSel = document.getElementById('cat-type');
      if (!typeSel) return;
      if (pid) {
        const parent = this.byId(pid);
        if (parent) {
          typeSel.value = parent.type;
          typeSel.disabled = true;
        }
      } else {
        typeSel.disabled = false;
      }
    };
    document.getElementById('cat-parent')?.addEventListener('change', onParentChange);
    onParentChange();
  },

  // ===================== SAVE / DELETE =====================
  save() {
    const nom = document.getElementById('cat-nom')?.value.trim();
    if (!nom) { alert('Nom requis'); return; }

    const parentRaw = document.getElementById('cat-parent')?.value;
    const parentId  = parentRaw ? parseInt(parentRaw, 10) : null;

    // Type : si parent, hérite obligatoirement du parent (cohérence)
    let type = document.getElementById('cat-type')?.value;
    if (parentId) {
      const parent = this.byId(parentId);
      if (parent) type = parent.type;
    }

    // Sécurité : empêcher de se déclarer parent de soi-même
    if (this.editId && parentId === this.editId) {
      alert('Une catégorie ne peut pas être son propre parent.');
      return;
    }
    // Sécurité : empêcher qu'une racine devienne sous-catégorie d'un de ses propres enfants
    if (this.editId && parentId) {
      const desc = this._descendantIds(this.editId);
      if (desc.includes(parentId)) {
        alert('Choix impossible : cela créerait une boucle (parent → enfant → parent).');
        return;
      }
    }

    const cat = {
      id: this.editId || Data.newId(),
      nom,
      type,
      color: document.getElementById('cat-color')?.value,
      dept:  document.getElementById('cat-dept')?.value,
      desc:  document.getElementById('cat-desc')?.value || '',
      parentId,
    };

    if (this.editId) {
      const idx = Data.categories.findIndex(c => c.id === this.editId);
      if (idx >= 0) Data.categories[idx] = cat;
    } else {
      Data.categories.push(cat);
    }
    this.editId = null;
    App.closeModal();
    this.persist();
    this.render();
  },

  delete(id) {
    const kids = this.children(id);
    let msg = 'Supprimer cette catégorie ?';
    if (kids.length) msg = `Cette catégorie a ${kids.length} sous-catégorie(s). Toutes seront supprimées avec elle.\n\nContinuer ?`;
    if (!confirm(msg)) return;
    const toRemove = new Set([id, ...this._descendantIds(id)]);
    Data.categories = Data.categories.filter(c => !toRemove.has(c.id));
    this.persist();
    this.render();
  },

  // Liste récursive des ids descendants d'une catégorie
  _descendantIds(id) {
    const out = [];
    const walk = (pid) => {
      this.children(pid).forEach(ch => { out.push(ch.id); walk(ch.id); });
    };
    walk(id);
    return out;
  },

  // ===================== RENDER =====================
  render() {
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const countEl = document.getElementById('cat-count');
    if (countEl) countEl.textContent = Data.categories.length + ' catégorie(s)';

    // Colonnes Recettes / Dépenses (arborescentes)
    const treeHtml = (rootType) => {
      const racines = Data.categories
        .filter(c => this.isRoot(c) && (c.type === rootType || c.type === 'both'))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      if (!racines.length) return '<div class="empty">Aucune catégorie</div>';
      return racines.map(r => this._nodeHtml(r, 0)).join('');
    };
    set('cat-rec', treeHtml('rec'));
    set('cat-dep', treeHtml('dep'));

    // Tableau global avec indentation visuelle
    const all = this._sortedHierarchy();
    set('cat-table', all.map(({ c, depth }) => {
      const indent = depth ? `style="padding-left:${depth * 24}px"` : '';
      const prefix = depth ? `<span style="color:var(--c-muted);margin-right:6px">${'└'.repeat(1)}</span>` : '';
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px" ${indent}>
              ${prefix}
              <span style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0;display:inline-block"></span>
              <b>${this._esc(c.nom)}</b>
              ${depth ? '<span class="badge b-purple" style="font-size:10px">sous-cat.</span>' : ''}
            </div>
          </td>
          <td><span class="badge ${c.type === 'dep' ? 'b-red' : c.type === 'rec' ? 'b-green' : 'b-purple'}">${c.type === 'dep' ? 'Dépense' : c.type === 'rec' ? 'Recette' : 'Les deux'}</span></td>
          <td><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${c.color}"></span></td>
          <td><span class="badge b-blue">${c.dept === 'all' ? 'Tous' : c.dept}</span></td>
          <td class="nowrap">
            <button class="btn btn-sm" onclick="Categories.openModal(${c.id})" title="Éditer">✏️</button>
            <button class="btn btn-sm" onclick="Categories.addChild(${c.id})" title="Ajouter une sous-catégorie">➕</button>
            <button class="btn btn-sm btn-danger" onclick="Categories.delete(${c.id})" title="Supprimer">🗑</button>
          </td>
        </tr>`;
    }).join(''));
  },

  // Rendu d'un nœud + ses enfants dans les colonnes Rec/Dep
  _nodeHtml(c, depth) {
    const kids = this.children(c.id)
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    const childrenHtml = kids.length
      ? `<div style="margin-left:${(depth + 1) * 16}px;border-left:1px dashed var(--c-border);padding-left:8px;margin-top:4px">
          ${kids.map(ch => this._nodeHtml(ch, depth + 1)).join('')}
        </div>`
      : '';
    return `
      <div class="cat-item" style="margin-bottom:4px">
        <div style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:12.5px;overflow:hidden;text-overflow:ellipsis">${this._esc(c.nom)}</div>
          <div style="font-size:10.5px;color:var(--c-muted)">${c.dept === 'all' ? 'Tous depts' : c.dept}${c.desc ? ' · ' + this._esc(c.desc) : ''}</div>
        </div>
        <button class="btn-ghost" onclick="Categories.openModal(${c.id})" title="Éditer">✏️</button>
        <button class="btn-ghost" onclick="Categories.addChild(${c.id})" title="Ajouter une sous-catégorie">➕</button>
      </div>
      ${childrenHtml}`;
  },

  // Hiérarchie aplatie (racines triées + leurs enfants juste après) pour le tableau
  _sortedHierarchy() {
    const result = [];
    const racines = Data.categories
      .filter(c => this.isRoot(c))
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    const visit = (c, depth) => {
      result.push({ c, depth });
      this.children(c.id)
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        .forEach(ch => visit(ch, depth + 1));
    };
    racines.forEach(r => visit(r, 0));
    return result;
  },

  // Ouverture rapide du modal "Nouvelle sous-catégorie" sur un parent donné
  addChild(parentId) {
    this.editId = null;
    this.openModal();
    setTimeout(() => {
      const sel = document.getElementById('cat-parent');
      if (sel) {
        sel.value = String(parentId);
        sel.dispatchEvent(new Event('change'));
      }
      document.getElementById('cat-nom')?.focus();
    }, 20);
  },

  // ===================== PERSISTANCE =====================
  persist() {
    if (typeof AppDB === 'undefined') return;
    AppDB.save(this.STORAGE_KEY, Data.categories);
  },

  async restore() {
    if (typeof AppDB === 'undefined') return;
    const arr = await AppDB.load(this.STORAGE_KEY);
    if (Array.isArray(arr) && arr.length) {
      // Si le cloud contient quelque chose, il prime sur les seeds
      Data.categories = arr;
    }
    // Sinon on garde les seeds par défaut.
  },

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },
};
