/**
 * modules/stock.js — Gestion de stock restaurant (MEIJI)
 *
 * Modèles : Data.stockArticles, Data.stockMouvements
 *
 * Stock courant d'un article = stock_init
 *   + Σ entrées − (Σ sorties + Σ pertes)
 *   avec remise à plat à chaque mouvement 'inventaire' (le comptage physique
 *   devient la nouvelle base à sa date).
 *
 * Calcul : tri chronologique des mouvements, balayage avec :
 *   entree     → bal += qte
 *   sortie/perte → bal -= qte
 *   inventaire → bal  = qte (reset)
 */

const Stock = {
  STORAGE_ART: 'meiji-stock-articles',
  STORAGE_MVT: 'meiji-stock-mvts',

  filterDept: 'all',
  searchTerm: '',
  editingArticleId: null,

  CATEGORIES: ['Poisson','Viande','Légumes','Fruits','Épicerie','Alcool','Soft','Produits laitiers','Surgelés','Emballages','Hygiène','Chicha','Autres'],
  UNITES: ['kg','g','L','cl','unité','pièce','caisse','bouteille'],
  DEPTS:  ['SUSHI','BAR','CHICHA','RESTAURANT'],

  // ===================== CALCULS =====================
  stockCourant(articleId) {
    const art = Data.stockArticles.find(a => a.id === articleId);
    if (!art) return 0;
    const mvts = Data.stockMouvements
      .filter(m => m.articleId === articleId)
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.id - b.id));
    let bal = Number(art.stock_init) || 0;
    for (const m of mvts) {
      const q = Number(m.quantite) || 0;
      switch (m.type) {
        case 'entree':     bal += q; break;
        case 'sortie':
        case 'perte':      bal -= q; break;
        case 'inventaire': bal  = q; break;
      }
    }
    return bal;
  },

  valeurArticle(art) {
    const s = this.stockCourant(art.id);
    return Math.max(0, s) * (Number(art.prix_unitaire) || 0);
  },

  statut(art) {
    const s = this.stockCourant(art.id);
    if (s <= 0) return 'rupture';
    if (s <= (Number(art.seuil_min) || 0)) return 'bas';
    return 'ok';
  },

  // ===================== RENDER =====================
  render() {
    if (!document.getElementById('page-stock')) return;
    this._renderKpis();
    this.renderArticles();
    this.renderMouvements();
  },

  _renderKpis() {
    const arts = Data.stockArticles;
    let valeur = 0, ssSeuil = 0, ruptures = 0;
    arts.forEach(a => {
      const s = this.stockCourant(a.id);
      valeur += Math.max(0, s) * (Number(a.prix_unitaire) || 0);
      if (s <= 0) ruptures++;
      else if (s <= (Number(a.seuil_min) || 0)) ssSeuil++;
    });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('stk-nb',      arts.length);
    set('stk-valeur',  Data.fmt(valeur));
    set('stk-bas',     ssSeuil);
    set('stk-rupture', ruptures);
  },

  _filteredArticles() {
    const q = (this.searchTerm || '').trim().toLowerCase();
    return Data.stockArticles.filter(a => {
      if (this.filterDept !== 'all' && a.dept !== this.filterDept) return false;
      if (!q) return true;
      return [a.nom, a.ref, a.categorie, a.fournisseur]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q));
    });
  },

  renderArticles() {
    const tb = document.getElementById('stk-art-table');
    if (!tb) return;
    const list = this._filteredArticles().slice();
    // Tri : ruptures puis bas puis ok, ensuite par nom
    const rank = { rupture: 0, bas: 1, ok: 2 };
    list.sort((a, b) => {
      const r = rank[this.statut(a)] - rank[this.statut(b)];
      if (r !== 0) return r;
      return (a.nom || '').localeCompare(b.nom || '');
    });

    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="11" class="empty">Aucun article. Cliquez "+ Nouvel article" pour démarrer.</td></tr>';
      return;
    }

    tb.innerHTML = list.map(a => {
      const s = this.stockCourant(a.id);
      const st = this.statut(a);
      const badge = st === 'rupture' ? '<span class="badge b-red">Rupture</span>'
                  : st === 'bas'     ? '<span class="badge b-amber">Bas</span>'
                  :                    '<span class="badge b-green">OK</span>';
      const valeur = Math.max(0, s) * (Number(a.prix_unitaire) || 0);
      const sAff = (Math.round(s * 1000) / 1000).toLocaleString('fr-FR');
      return `<tr>
        <td><b>${this._esc(a.nom)}</b></td>
        <td style="color:var(--c-muted)">${this._esc(a.ref || '-')}</td>
        <td>${this._esc(a.categorie || '-')}</td>
        <td>${this._esc(a.dept)}</td>
        <td class="text-right fw-bold">${sAff} ${badge}</td>
        <td>${this._esc(a.unite)}</td>
        <td class="text-right">${(Number(a.seuil_min)||0).toLocaleString('fr-FR')}</td>
        <td class="text-right">${Data.fmts(Number(a.prix_unitaire)||0)}</td>
        <td class="text-right fw-bold">${Data.fmts(valeur)}</td>
        <td style="color:var(--c-muted)">${this._esc(a.fournisseur || '-')}</td>
        <td class="nowrap">
          <button class="btn btn-sm btn-ghost" onclick="Stock.openArticleModal(${a.id})" title="Éditer"><i class="ti ti-pencil"></i></button>
          <button class="btn btn-sm btn-ghost" onclick="Stock.removeArticle(${a.id})" title="Supprimer"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  },

  renderMouvements() {
    const tb = document.getElementById('stk-mvt-table');
    if (!tb) return;
    const arts = new Map(Data.stockArticles.map(a => [a.id, a]));
    const list = Data.stockMouvements.slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id - a.id))
      .slice(0, 100);

    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="7" class="empty">Aucun mouvement enregistré.</td></tr>';
      return;
    }
    tb.innerHTML = list.map(m => {
      const a = arts.get(m.articleId);
      const lbl = a ? `${a.nom} <span style="color:var(--c-muted)">(${a.unite})</span>` : `<i style="color:var(--c-muted)">article supprimé</i>`;
      const typeBadge = {
        entree:     '<span class="badge b-green">+ Entrée</span>',
        sortie:     '<span class="badge b-blue">− Sortie</span>',
        perte:      '<span class="badge b-red">Perte</span>',
        inventaire: '<span class="badge b-amber">Inventaire</span>',
      }[m.type] || m.type;
      const q = (Math.round(Number(m.quantite) * 1000) / 1000).toLocaleString('fr-FR');
      return `<tr>
        <td class="nowrap">${Data.fmtDs(m.date)}</td>
        <td>${typeBadge}</td>
        <td>${lbl}</td>
        <td class="text-right fw-bold">${q}</td>
        <td>${this._esc(m.motif || '-')}</td>
        <td style="color:var(--c-muted)">${this._esc(m.ref || '-')}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="Stock.removeMvt(${m.id})" title="Supprimer"><i class="ti ti-trash"></i></button></td>
      </tr>`;
    }).join('');
  },

  _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  // ===================== CRUD ARTICLES =====================
  openArticleModal(id = null) {
    this.editingArticleId = id;
    const a = id ? Data.stockArticles.find(x => x.id === id) : null;
    const opts = (arr, val) => arr.map(o => `<option value="${o}"${o===val?' selected':''}>${o}</option>`).join('');
    const datalistCats = this.CATEGORIES.map(c => `<option value="${c}">`).join('');
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:680px">
          <div class="modal-title"><i class="ti ti-box"></i> ${a ? 'Éditer' : 'Nouvel'} article</div>
          <div class="fr">
            <div class="fg"><label class="fl">Nom *</label><input type="text" id="stk-nom" value="${a ? this._esc(a.nom) : ''}" placeholder="Saumon filet, Vodka 70cl..."></div>
            <div class="fg"><label class="fl">Référence interne</label><input type="text" id="stk-ref" value="${a ? this._esc(a.ref||'') : ''}" placeholder="Optionnel"></div>
          </div>
          <div class="fr">
            <div class="fg">
              <label class="fl">Catégorie</label>
              <input type="text" id="stk-cat" list="stk-cat-list" value="${a ? this._esc(a.categorie||'') : ''}" placeholder="Poisson, Alcool...">
              <datalist id="stk-cat-list">${datalistCats}</datalist>
            </div>
            <div class="fg">
              <label class="fl">Département *</label>
              <select id="stk-dept">${opts(this.DEPTS, a?.dept || 'SUSHI')}</select>
            </div>
            <div class="fg">
              <label class="fl">Unité *</label>
              <select id="stk-unite">${opts(this.UNITES, a?.unite || 'unité')}</select>
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Stock initial</label><input type="number" step="0.001" id="stk-init" value="${a ? (a.stock_init||0) : 0}"></div>
            <div class="fg"><label class="fl">Seuil mini (alerte)</label><input type="number" step="0.001" id="stk-seuil" value="${a ? (a.seuil_min||0) : 0}"></div>
            <div class="fg"><label class="fl">Prix unitaire (FCFA)</label><input type="number" step="1" id="stk-prix" value="${a ? (a.prix_unitaire||0) : 0}"></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Fournisseur</label><input type="text" id="stk-fourn" value="${a ? this._esc(a.fournisseur||'') : ''}" placeholder="Optionnel"></div>
            <div class="fg"><label class="fl"><input type="checkbox" id="stk-peri" ${a?.perissable ? 'checked' : ''}> Périssable</label></div>
            <div class="fg"><label class="fl">Date péremption</label><input type="date" id="stk-perdate" value="${a?.date_peremption || ''}"></div>
          </div>
          <div class="fg"><label class="fl">Observation</label><input type="text" id="stk-obs" value="${a ? this._esc(a.observation||'') : ''}" placeholder="Notes libres..."></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Stock.saveArticle()"><i class="ti ti-check"></i> Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  saveArticle() {
    const nom   = (document.getElementById('stk-nom')?.value || '').trim();
    const dept  = document.getElementById('stk-dept')?.value;
    const unite = document.getElementById('stk-unite')?.value;
    const prix  = parseFloat(document.getElementById('stk-prix')?.value) || 0;
    const seuil = parseFloat(document.getElementById('stk-seuil')?.value) || 0;
    if (!nom)           { alert('Le nom est obligatoire'); return; }
    if (!dept)          { alert('Le département est obligatoire'); return; }
    if (!unite)         { alert('L\'unité est obligatoire'); return; }
    if (prix < 0)       { alert('Prix invalide'); return; }
    if (seuil < 0)      { alert('Seuil invalide'); return; }

    const data = {
      nom,
      ref:           (document.getElementById('stk-ref')?.value || '').trim() || null,
      categorie:     (document.getElementById('stk-cat')?.value || '').trim() || 'Autres',
      dept,
      unite,
      stock_init:    parseFloat(document.getElementById('stk-init')?.value)  || 0,
      seuil_min:     seuil,
      prix_unitaire: prix,
      fournisseur:   (document.getElementById('stk-fourn')?.value || '').trim() || null,
      observation:   (document.getElementById('stk-obs')?.value || '').trim() || null,
      perissable:    !!document.getElementById('stk-peri')?.checked,
      date_peremption: document.getElementById('stk-perdate')?.value || null,
    };

    const wasEdit = !!this.editingArticleId;
    let savedId = this.editingArticleId;
    if (this.editingArticleId) {
      const idx = Data.stockArticles.findIndex(a => a.id === this.editingArticleId);
      if (idx >= 0) Data.stockArticles[idx] = { ...Data.stockArticles[idx], ...data };
    } else {
      savedId = Data.newId();
      Data.stockArticles.push({
        id: savedId,
        date_creation: Data.today(),
        ...data,
      });
    }
    try {
      if (typeof Audit !== 'undefined') Audit.log(wasEdit ? 'update' : 'create', 'stock',
        `Article ${data.nom}`,
        `${data.dept} · ${data.unite} · seuil ${data.seuil_min}`,
        { id: savedId, after: data });
    } catch (e) {}
    this.editingArticleId = null;
    this.save();
    App.closeModal();
    App.renderAll();
  },

  removeArticle(id) {
    const a = Data.stockArticles.find(x => x.id === id);
    if (!a) return;
    const linked = Data.stockMouvements.filter(m => m.articleId === id).length;
    const msg = linked
      ? `Supprimer "${a.nom}" ?\n\nCela supprimera aussi ${linked} mouvement(s) lié(s).`
      : `Supprimer "${a.nom}" ?`;
    if (!confirm(msg)) return;
    Data.stockArticles = Data.stockArticles.filter(x => x.id !== id);
    Data.stockMouvements = Data.stockMouvements.filter(m => m.articleId !== id);
    try {
      if (typeof Audit !== 'undefined') Audit.log('delete', 'stock',
        `Article ${a.nom}`,
        linked ? `${linked} mouvement(s) lié(s) supprimé(s)` : null,
        { id: a.id, before: a });
    } catch (e) {}
    this.save();
    App.renderAll();
  },

  // ===================== MOUVEMENTS =====================
  _mvtType: 'entree',
  _setMvtType(t) {
    this._mvtType = t;
    ['entree','sortie','perte'].forEach(k => {
      const el = document.getElementById('stk-mvt-btn-' + k);
      if (el) el.classList.toggle('active', k === t);
    });
  },

  openMvtModal(typeDefault = 'entree') {
    this._mvtType = typeDefault;
    if (!Data.stockArticles.length) {
      alert('Crée d\'abord au moins un article.');
      return;
    }
    const artOpts = Data.stockArticles
      .slice()
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
      .map(a => `<option value="${a.id}">${this._esc(a.nom)} — ${this._esc(a.dept)} (${this._esc(a.unite)})</option>`)
      .join('');
    const btn = (k, label, cls) =>
      `<div class="mvt-btn ${cls}${k===typeDefault?' active':''}" id="stk-mvt-btn-${k}" onclick="Stock._setMvtType('${k}')">${label}</div>`;

    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:620px">
          <div class="modal-title"><i class="ti ti-transfer"></i> Nouveau mouvement de stock</div>
          <div class="mvt-type">
            ${btn('entree','+ Entrée','in')}
            ${btn('sortie','− Sortie','out')}
            ${btn('perte','✗ Perte / Casse','out')}
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label><input type="date" id="stk-mvt-date" value="${Data.today()}"></div>
            <div class="fg"><label class="fl">Article *</label><select id="stk-mvt-art">${artOpts}</select></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Quantité *</label><input type="number" step="0.001" id="stk-mvt-qte" placeholder="0"></div>
            <div class="fg"><label class="fl">Motif</label><input type="text" id="stk-mvt-motif" placeholder="Réception fournisseur, conso cuisine..."></div>
            <div class="fg"><label class="fl">Référence</label><input type="text" id="stk-mvt-ref" placeholder="N° BL, ticket..."></div>
          </div>
          <div class="fg"><label class="fl">Observation</label><input type="text" id="stk-mvt-obs" placeholder="Notes libres..."></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Stock.saveMvt()"><i class="ti ti-check"></i> Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  saveMvt() {
    const artId = parseInt(document.getElementById('stk-mvt-art')?.value);
    const qte   = parseFloat(document.getElementById('stk-mvt-qte')?.value);
    const date  = document.getElementById('stk-mvt-date')?.value;
    if (!artId)                 { alert('Sélectionne un article'); return; }
    if (!qte || qte <= 0)       { alert('Quantité invalide'); return; }
    if (!date)                  { alert('Date requise'); return; }
    const mvtId = Data.newId();
    const newMvt = {
      id: mvtId,
      date,
      articleId: artId,
      type: this._mvtType,
      quantite: qte,
      motif:       (document.getElementById('stk-mvt-motif')?.value || '').trim() || null,
      ref:         (document.getElementById('stk-mvt-ref')?.value   || '').trim() || null,
      observation: (document.getElementById('stk-mvt-obs')?.value   || '').trim() || null,
    };
    Data.stockMouvements.push(newMvt);
    try {
      if (typeof Audit !== 'undefined') {
        const art = Data.stockArticles.find(a => a.id === artId);
        Audit.log('create', 'stock',
          `Mvt ${this._mvtType} · ${art?.nom || ''}`,
          `${qte} ${art?.unite || ''}${newMvt.motif ? ' · ' + newMvt.motif : ''}`,
          { id: mvtId, after: newMvt });
      }
    } catch (e) {}
    this.save();
    App.closeModal();
    App.renderAll();
  },

  removeMvt(id) {
    if (!confirm('Supprimer ce mouvement ?')) return;
    const removed = Data.stockMouvements.find(m => m.id === id);
    Data.stockMouvements = Data.stockMouvements.filter(m => m.id !== id);
    try {
      if (typeof Audit !== 'undefined' && removed) {
        const art = Data.stockArticles.find(a => a.id === removed.articleId);
        Audit.log('delete', 'stock',
          `Mvt ${removed.type} · ${art?.nom || ''}`,
          `${removed.quantite} ${art?.unite || ''}`,
          { id: removed.id, before: removed });
      }
    } catch (e) {}
    this.save();
    App.renderAll();
  },

  openInventaireModal() {
    if (!Data.stockArticles.length) {
      alert('Crée d\'abord au moins un article.');
      return;
    }
    const artOpts = Data.stockArticles
      .slice()
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
      .map(a => `<option value="${a.id}">${this._esc(a.nom)} — ${this._esc(a.dept)} (${this._esc(a.unite)})</option>`)
      .join('');
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal" style="max-width:560px">
          <div class="modal-title"><i class="ti ti-clipboard-check"></i> Saisie d'inventaire</div>
          <div style="font-size:12px;color:var(--c-muted);margin-bottom:10px">
            La quantité saisie devient la nouvelle base du stock à cette date.
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label><input type="date" id="stk-inv-date" value="${Data.today()}"></div>
            <div class="fg"><label class="fl">Article *</label><select id="stk-inv-art">${artOpts}</select></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Quantité comptée *</label><input type="number" step="0.001" id="stk-inv-qte" placeholder="0"></div>
            <div class="fg"><label class="fl">Observation</label><input type="text" id="stk-inv-obs" placeholder="Notes..."></div>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Stock.saveInventaire()"><i class="ti ti-check"></i> Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  saveInventaire() {
    const artId = parseInt(document.getElementById('stk-inv-art')?.value);
    const qte   = parseFloat(document.getElementById('stk-inv-qte')?.value);
    const date  = document.getElementById('stk-inv-date')?.value;
    if (!artId)                 { alert('Sélectionne un article'); return; }
    if (isNaN(qte) || qte < 0)  { alert('Quantité invalide'); return; }
    if (!date)                  { alert('Date requise'); return; }
    Data.stockMouvements.push({
      id: Data.newId(),
      date,
      articleId: artId,
      type: 'inventaire',
      quantite: qte,
      motif: 'Comptage physique',
      ref: null,
      observation: (document.getElementById('stk-inv-obs')?.value || '').trim() || null,
    });
    this.save();
    App.closeModal();
    App.renderAll();
  },

  // ===================== EXPORT EXCEL =====================
  exportExcel() {
    if (typeof XLSX === 'undefined') return alert('Bibliothèque Excel non chargée');
    const arts = Data.stockArticles.map(a => ({
      Nom: a.nom,
      Référence: a.ref || '',
      Catégorie: a.categorie || '',
      Département: a.dept,
      Unité: a.unite,
      'Stock initial': a.stock_init || 0,
      'Stock courant': this.stockCourant(a.id),
      'Seuil mini': a.seuil_min || 0,
      'Prix unitaire (FCFA)': a.prix_unitaire || 0,
      'Valeur stock (FCFA)': this.valeurArticle(a),
      Fournisseur: a.fournisseur || '',
      Périssable: a.perissable ? 'oui' : 'non',
      'Date péremption': a.date_peremption || '',
      'Date création': a.date_creation || '',
      Observation: a.observation || '',
    }));
    const artMap = new Map(Data.stockArticles.map(a => [a.id, a]));
    const mvts = Data.stockMouvements
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(m => {
        const a = artMap.get(m.articleId);
        return {
          Date: m.date,
          Type: m.type,
          Article: a ? a.nom : '(supprimé)',
          Département: a ? a.dept : '',
          Quantité: m.quantite,
          Unité: a ? a.unite : '',
          Motif: m.motif || '',
          Référence: m.ref || '',
          Observation: m.observation || '',
        };
      });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arts), 'Articles');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mvts), 'Mouvements');
    XLSX.writeFile(wb, `meiji-stock-${Data.today()}.xlsx`);
  },

  // ===================== PERSISTANCE =====================
  async restore() {
    try {
      const arts = await AppDB.load(this.STORAGE_ART);
      if (Array.isArray(arts)) Data.stockArticles = arts;
    } catch (e) { console.error('Stock.restore articles:', e); }
    try {
      const mvts = await AppDB.load(this.STORAGE_MVT);
      if (Array.isArray(mvts)) Data.stockMouvements = mvts;
    } catch (e) { console.error('Stock.restore mvts:', e); }
  },

  async save() {
    await AppDB.save(this.STORAGE_ART, Data.stockArticles);
    await AppDB.save(this.STORAGE_MVT, Data.stockMouvements);
  },

  // ===================== INIT (handlers de page) =====================
  initOnce() {
    if (this._initialized) return;
    this._initialized = true;

    document.getElementById('btn-stk-new-art')?.addEventListener('click', () => this.openArticleModal());
    document.getElementById('btn-stk-new-mvt')?.addEventListener('click', () => this.openMvtModal('entree'));
    document.getElementById('btn-stk-inv')?.addEventListener('click', () => this.openInventaireModal());
    document.getElementById('btn-stk-export')?.addEventListener('click', () => this.exportExcel());

    // Search
    const s = document.getElementById('stk-search');
    if (s) s.addEventListener('input', () => { this.searchTerm = s.value; this.render(); });

    // Tabs dept
    App.initTabs('stk-tabs', f => { this.filterDept = f; this.render(); });
  },
};
