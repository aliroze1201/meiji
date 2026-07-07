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

  // Comparaison d'IDs tolérante (number vs string après JSON restore)
  _eq(a, b) { return a != null && b != null && String(a) === String(b); },

  // ===================== HELPERS =====================
  isRoot(c)        { return !c.parentId; },
  children(parentId) { return Data.categories.filter(c => this._eq(c.parentId, parentId)); },
  roots(type)      {
    return Data.categories.filter(c => this.isRoot(c) && (
      !type || c.type === type || c.type === 'both'
    ));
  },
  byId(id)         { return Data.categories.find(c => this._eq(c.id, id)); },

  // ===================== MODAL =====================
  openModal(id, parentIdHint = null) {
    this.editId = id;
    const c = id ? this.byId(id) : null;
    const isEdit = !!c;
    const isSub  = isEdit ? !!c.parentId : (parentIdHint !== null);
    const effectiveParentHint = (parentIdHint === -1) ? null : parentIdHint;

    const buildParentOptions = (selectedId) => {
      const opts = [];
      Data.categories
        .filter(x => this.isRoot(x) && (!isEdit || !this._eq(x.id, c?.id)))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        .forEach(p => {
          const sel = this._eq(selectedId, p.id) ? 'selected' : '';
          opts.push(`<option value="${p.id}" ${sel}>${this._esc(p.nom)} — ${p.type === 'dep' ? 'Dépense' : p.type === 'rec' ? 'Recette' : 'Mixte'}</option>`);
        });
      return opts.join('');
    };

    const parentSelectedId = isEdit ? c.parentId : effectiveParentHint;
    const headerTitle = isEdit
      ? (isSub ? 'Modifier sous-catégorie' : 'Modifier catégorie')
      : (isSub ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie');

    const noParentSelected = !parentSelectedId ? 'selected' : '';
    const parentOpts = buildParentOptions(parentSelectedId);
    const parentBlock = `
      <div class="fg">
        <label class="fl">Catégorie parente</label>
        <select id="cat-parent" onchange="Categories._onParentChange()">
          <option value="" ${noParentSelected}>— Aucune (catégorie principale) —</option>
          ${parentOpts}
        </select>
        <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
          Laisse « Aucune » pour une catégorie principale, ou choisis un parent pour en faire une sous-catégorie.
        </div>
      </div>`;

    const parentVal = parentSelectedId || '';
    const parentObj = parentVal ? this.byId(parentVal) : null;
    const inheritedType = parentObj ? parentObj.type : null;
    const typeVal = inheritedType || c?.type || 'dep';

    const typeBlock = `
      <div class="fg" id="cat-type-block" ${inheritedType ? 'style="display:none"' : ''}>
        <label class="fl">Type</label>
        <select id="cat-type">
          <option value="dep"  ${typeVal === 'dep'  ? 'selected' : ''}>Dépense</option>
          <option value="rec"  ${typeVal === 'rec'  ? 'selected' : ''}>Recette</option>
          <option value="both" ${typeVal === 'both' ? 'selected' : ''}>Les deux</option>
        </select>
      </div>`;

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${headerTitle}</div>

          ${parentBlock}

          <div class="fg"><label class="fl">Nom *</label>
            <input type="text" id="cat-nom" value="${this._esc(c?.nom || '')}" placeholder="Ex: Matières premières, Saumon...">
          </div>

          <div class="fr">
            ${typeBlock}
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

          <div class="fr">
            <div class="fg"><label class="fl">Département</label>
              <select id="cat-dept">
                <option value="all"    ${!c || c.dept === 'all' ? 'selected' : ''}>Tous</option>
                <option value="SUSHI"  ${c?.dept === 'SUSHI'  ? 'selected' : ''}>SUSHI</option>
                <option value="BAR"    ${c?.dept === 'BAR'    ? 'selected' : ''}>BAR</option>
                <option value="CHICHA" ${c?.dept === 'CHICHA' ? 'selected' : ''}>CHICHA</option>
              </select>
            </div>
            <div class="fg"><label class="fl">Nature (charges)</label>
              <select id="cat-nature">
                <option value="variable" ${(c ? Data.natureOfGroupe(c.nom) : 'variable') === 'variable' ? 'selected' : ''}>📈 Variable</option>
                <option value="fixe"     ${(c ? Data.natureOfGroupe(c.nom) : 'variable') === 'fixe'     ? 'selected' : ''}>📌 Fixe</option>
              </select>
              <div style="font-size:11px;color:var(--c-muted);margin-top:4px">
                Fixe = coût régulier (loyer, salaires…) · Variable = suit l'activité (achats, transport…).
              </div>
            </div>
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

    setTimeout(() => document.getElementById('cat-nom')?.focus(), 30);
  },

  _onParentChange() {
    const parentRaw = document.getElementById('cat-parent')?.value;
    const typeBlock = document.getElementById('cat-type-block');
    const typeSel = document.getElementById('cat-type');
    if (parentRaw) {
      const parent = this.byId(parseInt(parentRaw, 10));
      if (parent && typeSel) typeSel.value = parent.type;
      if (typeBlock) typeBlock.style.display = 'none';
    } else {
      if (typeBlock) typeBlock.style.display = '';
    }
  },

  // ===================== SAVE / DELETE =====================
  save() {
    const nom = document.getElementById('cat-nom')?.value.trim();
    if (!nom) { alert('Nom requis'); return; }

    const parentRaw = document.getElementById('cat-parent')?.value;
    const parentId  = parentRaw ? parseInt(parentRaw, 10) : null;

    let type = document.getElementById('cat-type')?.value;
    if (parentId) {
      const parent = this.byId(parentId);
      if (parent) type = parent.type;
    }

    if (this.editId && this._eq(parentId, this.editId)) {
      alert('Une catégorie ne peut pas être son propre parent.');
      return;
    }
    if (this.editId && parentId) {
      const desc = this._descendantIds(this.editId);
      if (desc.some(did => this._eq(did, parentId))) {
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
      nature: document.getElementById('cat-nature')?.value === 'fixe' ? 'fixe' : 'variable',
      parentId,
    };

    // Si une catégorie racine devient sous-catégorie, ses enfants deviennent racines
    if (this.editId && parentId) {
      const kids = this.children(this.editId);
      kids.forEach(k => { k.parentId = null; });
    }

    const wasEdit = !!this.editId;
    if (this.editId) {
      const idx = Data.categories.findIndex(c => this._eq(c.id, this.editId));
      if (idx >= 0) Data.categories[idx] = cat;
    } else {
      Data.categories.push(cat);
    }
    try {
      if (typeof Audit !== 'undefined') Audit.log(wasEdit ? 'update' : 'create', 'categories',
        `Catégorie ${cat.nom}`,
        `${cat.type} · ${cat.dept}${cat.parentId ? ' · sous-catégorie' : ''}`,
        { id: cat.id, after: cat });
    } catch (e) {}
    this.editId = null;
    App.closeModal();
    this.persist();
    this.render();
  },

  remove(id) {
    const kids = this.children(id);
    let msg = 'Supprimer cette catégorie ?';
    if (kids.length) msg = `Cette catégorie a ${kids.length} sous-catégorie(s). Toutes seront supprimées avec elle.\n\nContinuer ?`;
    if (!confirm(msg)) return;
    const toRemoveIds = [id, ...this._descendantIds(id)];
    const removed = Data.categories.filter(c => toRemoveIds.some(rid => this._eq(rid, c.id)));
    const removedNames = new Set(removed.map(c => c.nom));

    Data.categories = Data.categories.filter(c => !toRemoveIds.some(rid => this._eq(rid, c.id)));

    // Rediriger les dépenses liées vers la catégorie « Autres »
    let redirected = 0;
    (Data.histDep || []).forEach(d => {
      if (d.groupe && removedNames.has(d.groupe)) { d.groupe = 'Autres'; redirected++; }
    });
    Data.journees.forEach(j => {
      ['s','b','c'].forEach(k => {
        ((j.deps && j.deps[k]) || []).forEach(d => {
          if (d.groupe && removedNames.has(d.groupe)) { d.groupe = 'Autres'; redirected++; }
        });
      });
    });
    if (redirected > 0) {
      if (typeof Depenses !== 'undefined' && Depenses.persist) Depenses.persist();
    }

    try {
      if (typeof Audit !== 'undefined') {
        const main = removed.find(c => this._eq(c.id, id)) || removed[0];
        Audit.log('delete', 'categories',
          `Catégorie ${main?.nom || ''}`,
          `${removed.length} cat. supprimée(s)${redirected ? `, ${redirected} dépense(s) redirigée(s) vers Autres` : ''}`,
          { id, before: removed });
      }
    } catch (e) {}
    this.persist();
    this.render();
  },

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

    const treeHtml = (rootType) => {
      const racines = Data.categories
        .filter(c => this.isRoot(c) && (c.type === rootType || c.type === 'both'))
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      if (!racines.length) return '<div class="empty">Aucune catégorie</div>';
      return racines.map(r => this._nodeHtml(r, 0)).join('');
    };
    set('cat-rec', treeHtml('rec'));
    set('cat-dep', treeHtml('dep'));

    const all = this._sortedHierarchy();
    set('cat-table', all.map(({ c, depth }) => {
      const indent = depth ? `style="padding-left:${depth * 24}px"` : '';
      const prefix = depth ? `<span style="color:var(--c-muted);margin-right:6px">└</span>` : '';
      const kids = this.children(c.id);
      const hasKids = kids.length > 0;
      const chevron = !depth && hasKids
        ? `<span class="cat-tbl-chevron" style="cursor:pointer;font-size:12px;transition:transform .2s;display:inline-block;margin-right:4px;transform:rotate(90deg)">▶</span>`
        : '';
      const toggleAttr = !depth && hasKids
        ? `onclick="Categories.toggleTable(this, ${c.id})" style="cursor:pointer"`
        : '';
      return `
        <tr data-search-id="cat:${c.id}" data-cat-parent="${c.parentId || ''}" ${toggleAttr}>
          <td>
            <div style="display:flex;align-items:center;gap:8px" ${indent}>
              ${chevron}${prefix}
              <span style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0;display:inline-block"></span>
              <b>${this._esc(c.nom)}</b>
              ${depth ? '<span class="badge b-purple" style="font-size:10px">sous-cat.</span>' : ''}
              ${!depth && hasKids ? `<span style="font-size:10px;color:var(--c-muted);margin-left:4px">(${kids.length})</span>` : ''}
            </div>
          </td>
          <td>
            <span class="badge ${c.type === 'dep' ? 'b-red' : c.type === 'rec' ? 'b-green' : 'b-purple'}">${c.type === 'dep' ? 'Dépense' : c.type === 'rec' ? 'Recette' : 'Les deux'}</span>
            ${c.type !== 'rec' ? (Data.natureOfGroupe(c.nom) === 'fixe'
              ? '<span class="badge b-purple" title="Charge fixe" style="margin-left:4px">📌 Fixe</span>'
              : '<span class="badge b-amber" title="Charge variable" style="margin-left:4px">📈 Variable</span>') : ''}
          </td>
          <td><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${c.color}"></span></td>
          <td><span class="badge b-blue">${c.dept === 'all' ? 'Tous' : c.dept}</span></td>
          <td class="nowrap">
            <button class="btn btn-sm" onclick="event.stopPropagation();Categories.openModal(${c.id})" title="Modifier">✏️</button>
            <button class="btn btn-sm" onclick="event.stopPropagation();Categories.addChild(${c.id})" title="Ajouter sous-catégorie">➕</button>
            <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();Categories.remove(${c.id})" title="Supprimer">🗑</button>
          </td>
        </tr>`;
    }).join(''));
  },

  _nodeHtml(c, depth) {
    const kids = this.children(c.id)
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    const hasKids = kids.length > 0;
    const chevron = hasKids
      ? `<span class="cat-chevron" style="cursor:pointer;font-size:14px;transition:transform .2s;display:inline-block">▶</span>`
      : `<span style="width:14px;display:inline-block"></span>`;
    const childrenHtml = hasKids
      ? `<div class="cat-children" style="display:none;margin-left:${(depth + 1) * 16}px;border-left:2px solid ${c.color}33;padding-left:8px;margin-top:4px">
          ${kids.map(ch => this._nodeHtml(ch, depth + 1)).join('')}
        </div>`
      : '';
    const toggle = hasKids ? `onclick="Categories.toggle(this)"` : '';
    return `
      <div class="cat-node">
        <div class="cat-item" style="margin-bottom:4px;cursor:${hasKids ? 'pointer' : 'default'}" ${toggle}>
          ${chevron}
          <div style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:12.5px;overflow:hidden;text-overflow:ellipsis">
              ${this._esc(c.nom)}
              ${hasKids ? `<span style="font-size:10px;color:var(--c-muted);font-weight:400;margin-left:4px">(${kids.length})</span>` : ''}
            </div>
            <div style="font-size:10.5px;color:var(--c-muted)">${c.dept === 'all' ? 'Tous depts' : c.dept}${c.desc ? ' · ' + this._esc(c.desc) : ''}</div>
          </div>
          <button class="btn-ghost" onclick="event.stopPropagation();Categories.openModal(${c.id})" title="Modifier">✏️</button>
          <button class="btn-ghost" onclick="event.stopPropagation();Categories.addChild(${c.id})" title="Ajouter sous-catégorie">➕</button>
          <button class="btn-ghost" onclick="event.stopPropagation();Categories.remove(${c.id})" title="Supprimer" style="color:var(--c-red)">🗑</button>
        </div>
        ${childrenHtml}
      </div>`;
  },

  toggle(el) {
    const node = el.closest('.cat-node');
    if (!node) return;
    const children = node.querySelector(':scope > .cat-children');
    const chevron = el.querySelector('.cat-chevron');
    if (!children) return;
    const open = children.style.display !== 'none';
    children.style.display = open ? 'none' : 'block';
    if (chevron) chevron.style.transform = open ? '' : 'rotate(90deg)';
  },

  toggleTable(tr, parentId) {
    const tbody = tr.closest('tbody');
    if (!tbody) return;
    const chevron = tr.querySelector('.cat-tbl-chevron');
    const childRows = tbody.querySelectorAll(`tr[data-cat-parent="${parentId}"]`);
    if (!childRows.length) return;
    const open = childRows[0].style.display !== 'none';
    childRows.forEach(r => r.style.display = open ? 'none' : '');
    if (chevron) chevron.style.transform = open ? '' : 'rotate(90deg)';
  },

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

  addChild(parentId) {
    this.openModal(null, parentId);
  },

  openSubModal() {
    if (!Data.categories.some(c => this.isRoot(c))) {
      alert('Crée d\'abord au moins une catégorie, puis tu pourras y ajouter des sous-catégories.');
      return;
    }
    this.openModal(null, -1);
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
      Data.categories = arr;
    }
  },

  _esc(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },
};
