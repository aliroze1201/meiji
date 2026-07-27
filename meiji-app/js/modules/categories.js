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

  // ===================== DÉPENSES SANS CATÉGORIE =====================
  // Groupes portés par des dépenses enregistrées (histDep + dépenses de
  // journées) qui ne correspondent à AUCUNE catégorie déclarée. L'utilisateur
  // peut créer la catégorie manquante ou rattacher ces dépenses à une
  // catégorie / sous-catégorie existante (le champ `groupe` est réécrit).
  _noncatGroups() {
    const declared = new Set((Data.categories || []).map(c => c.nom));
    const groups = {};
    (Data.getAllDeps() || []).forEach(d => {
      const g = d.groupe || 'Autres';
      if (declared.has(g)) return;
      if (!groups[g]) groups[g] = { nom: g, count: 0, total: 0, items: [] };
      groups[g].count++;
      groups[g].total += d.montant || 0;
      groups[g].items.push(d);
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  },

  renderSansCategorie() {
    const tb = document.getElementById('cat-noncat-table');
    if (!tb) return;
    const groups = this._noncatGroups();
    const nb = groups.reduce((s, g) => s + g.count, 0);
    const tot = groups.reduce((s, g) => s + g.total, 0);
    const countEl = document.getElementById('cat-noncat-count');
    if (countEl) countEl.textContent = String(nb);
    const totEl = document.getElementById('cat-noncat-total');
    if (totEl) totEl.textContent = groups.length ? Data.fmt(tot) : '';

    if (!groups.length) {
      tb.innerHTML = `<tr><td colspan="4" class="empty">✅ Toutes les dépenses enregistrées sont rattachées à une catégorie déclarée.</td></tr>`;
      return;
    }

    tb.innerHTML = groups.map(g => {
      const nomArg = Data.esc(JSON.stringify(g.nom));
      const detail = g.items.slice()
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .map(d => `
          <tr>
            <td class="nowrap">${Data.fmtDs(d.date)}</td>
            <td><span class="badge ${d.dept === 'SUSHI' ? 'b-blue' : d.dept === 'BAR' ? 'b-green' : 'b-amber'}">${d.dept}</span></td>
            <td>${Data.esc(d.label || '')}${d.observation && d.observation !== d.label ? `<div style="font-size:11px;color:var(--c-muted)">${Data.esc(d.observation)}</div>` : ''}</td>
            <td>${d._jSrc ? '<span class="badge b-amber" style="font-size:10px">journée</span>' : '<span class="badge b-blue" style="font-size:10px">dépense</span>'}</td>
            <td class="text-right fw-bold text-red">${Data.fmts(d.montant)} FCFA</td>
          </tr>`).join('');
      return `
      <tr style="cursor:pointer" title="Clique pour voir le détail des dépenses de ce groupe"
          onclick="const n=this.nextElementSibling;if(n)n.style.display=n.style.display==='none'?'':'none'">
        <td><b>${Data.esc(g.nom)}</b></td>
        <td class="text-right">${g.count}</td>
        <td class="text-right fw-bold" style="color:var(--c-warning)">${Data.fmts(g.total)} FCFA</td>
        <td class="nowrap">
          <button class="btn btn-sm btn-primary" title="Créer une catégorie (ou sous-catégorie via le choix du parent) portant ce nom"
                  onclick="event.stopPropagation();Categories.createFromGroupe(${nomArg})"><i class="ti ti-plus"></i> Créer la catégorie</button>
          <button class="btn btn-sm" title="Déplacer ces dépenses vers une catégorie ou sous-catégorie existante"
                  onclick="event.stopPropagation();Categories.openAttachModal(${nomArg})"><i class="ti ti-arrow-merge"></i> Rattacher à…</button>
        </td>
      </tr>
      <tr style="display:none">
        <td colspan="4" style="background:var(--c-bg-2);padding:8px 14px">
          <div style="overflow-x:auto">
            <table>
              <thead><tr><th>Date</th><th>Caisse</th><th>Libellé</th><th>Source</th><th class="text-right">Montant</th></tr></thead>
              <tbody>${detail}</tbody>
            </table>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  // Ouvre la modale « Nouvelle catégorie » préremplie avec le nom du groupe.
  // Comme le rattachement des dépenses se fait par NOM, dès que la catégorie
  // est créée avec ce nom exact, toutes les dépenses du groupe sont classées.
  // L'utilisateur peut aussi choisir un parent pour en faire une sous-catégorie.
  createFromGroupe(nom) {
    this.openModal(null);
    setTimeout(() => {
      const inp = document.getElementById('cat-nom');
      if (inp) { inp.value = nom; inp.select?.(); }
    }, 40);
  },

  // Modale « Rattacher à… » : choix d'une catégorie ou sous-catégorie de
  // dépense existante, puis réécriture du groupe des dépenses concernées.
  openAttachModal(nom) {
    const groups = this._noncatGroups();
    const g = groups.find(x => x.nom === nom);
    if (!g) { this.render(); return; }
    const opts = this._sortedHierarchy()
      .filter(({ c }) => c.type === 'dep' || c.type === 'both')
      .map(({ c, depth }) => {
        const parent = depth ? this.byId(c.parentId) : null;
        const label = parent ? `${parent.nom} › ${c.nom}` : c.nom;
        return `<option value="${c.id}">${this._esc(label)}${depth ? ' (sous-catégorie)' : ''}</option>`;
      }).join('');
    if (!opts) { alert('Aucune catégorie de dépense déclarée. Crée d\'abord une catégorie.'); return; }
    this._attachNom = nom;
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:420px">
          <div class="modal-title"><i class="ti ti-arrow-merge"></i> Rattacher « ${this._esc(nom)} »</div>
          <div style="font-size:13px;margin-bottom:10px">
            ${g.count} dépense(s) · <b>${Data.fmt(g.total)}</b><br>
            <span style="font-size:11.5px;color:var(--c-muted)">Toutes ces dépenses seront déplacées vers la catégorie choisie
            (leur libellé d'origine est conservé en désignation).</span>
          </div>
          <div class="fg"><label class="fl">Catégorie ou sous-catégorie de destination</label>
            <select id="noncat-attach-select">${opts}</select>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Categories.attachGroupe()"><i class="ti ti-check"></i> Rattacher</button>
          </div>
        </div>
      </div>`);
  },

  attachGroupe() {
    const nom = this._attachNom;
    const sel = document.getElementById('noncat-attach-select');
    const target = sel ? this.byId(parseInt(sel.value, 10)) : null;
    if (!nom || !target) { App.closeModal(); return; }

    const match = (d) => (d.groupe || 'Autres') === nom;
    let nbDep = 0;
    (Data.histDep || []).forEach(d => { if (match(d)) { d.groupe = target.nom; nbDep++; } });

    const touched = new Set();
    (Data.journees || []).forEach(j => {
      ['s', 'b', 'c'].forEach(k => {
        ((j.deps && j.deps[k]) || []).forEach(d => {
          if (match(d)) { d.groupe = target.nom; j.userRec = true; touched.add(j); nbDep++; }
        });
      });
    });

    // Cohérence : les dépenses encore en attente de validation suivent aussi.
    let nbAtt = 0;
    (Data.depAttente || []).forEach(d => { if (match(d)) { d.groupe = target.nom; nbAtt++; } });

    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'categories',
        `Groupe « ${nom} » rattaché à ${target.nom}`,
        `${nbDep} dépense(s)${nbAtt ? ` + ${nbAtt} en attente` : ''} déplacée(s)`,
        { from: nom, to: target.nom, toId: target.id });
    } catch (e) {}

    if (typeof Depenses !== 'undefined') {
      if (Depenses.persist) Depenses.persist();
      if (nbAtt && Depenses.persistAttente) Depenses.persistAttente();
    }
    if (touched.size && typeof Recettes !== 'undefined' && Recettes.persistUser) {
      Recettes.persistUser(Array.from(touched));
    }
    this._attachNom = null;
    App.closeModal();
    App.renderAll();
    if (App.toast) App.toast(`✅ ${nbDep + nbAtt} dépense(s) « ${Data.esc(nom)} » rattachée(s) à « ${Data.esc(target.nom)} ».`, 'info', 7000);
  },

  // ===================== RENDER =====================
  render() {
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const countEl = document.getElementById('cat-count');
    if (countEl) countEl.textContent = Data.categories.length + ' catégorie(s)';
    this.renderSansCategorie();

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
