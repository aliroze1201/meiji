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

  async save() {
    const nom = document.getElementById('cat-nom')?.value.trim();
    if (!nom) { alert('Nom requis'); return; }
    const cat = {
      nom,
      type: document.getElementById('cat-type')?.value,
      color: document.getElementById('cat-color')?.value,
      dept: document.getElementById('cat-dept')?.value,
      desc: document.getElementById('cat-desc')?.value,
    };
    try {
      if (this.editId) {
        if (Store && Store.ready) {
          const saved = await Store.updateCategorie(this.editId, cat);
          const idx = Data.categories.findIndex(c => c.id === this.editId);
          if (idx >= 0) Data.categories[idx] = saved;
        } else {
          const idx = Data.categories.findIndex(c => c.id === this.editId);
          if (idx >= 0) Data.categories[idx] = { id: this.editId, ...cat };
        }
      } else {
        if (Store && Store.ready) {
          const saved = await Store.insertCategorie(cat);
          Data.categories.push(saved);
        } else {
          Data.categories.push({ id: Data.newId(), ...cat });
        }
      }
    } catch (e) { alert('Erreur : ' + e.message); return; }
    this.editId = null;
    App.closeModal();
    this.render();
  },

  async delete(id) {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      if (Store && Store.ready) await Store.deleteCategorie(id);
    } catch (e) { alert('Erreur : ' + e.message); return; }
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

// ===================== EMPLOYÉS =====================
const Employes = {
  STORAGE_KEY: 'meiji-employes',
  save() { /* données en cloud désormais */ },
  restore() { /* géré par Store.bootstrap */ },

  openModal(idx) {
    const editing = idx != null && idx >= 0;
    const e = editing ? Data.employes[idx] : { nom: '', poste: '', dept: 'BAR', brut: 0, prime: 0, avance: 0 };
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">${editing ? 'Modifier' : 'Nouvel'} employé</div>
          <div class="fg"><label class="fl">Nom complet</label><input type="text" id="emp-nom" value="${e.nom}" placeholder="Ex: DUPONT JEAN"></div>
          <div class="fr">
            <div class="fg"><label class="fl">Poste</label><input type="text" id="emp-poste" value="${e.poste}" placeholder="Ex: SERVEUR"></div>
            <div class="fg"><label class="fl">Département</label>
              <select id="emp-dept">
                <option value="BAR" ${e.dept==='BAR'?'selected':''}>BAR</option>
                <option value="RESTAURANT" ${e.dept==='RESTAURANT'?'selected':''}>RESTAURANT</option>
                <option value="CHICHA" ${e.dept==='CHICHA'?'selected':''}>CHICHA</option>
              </select>
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Salaire brut (FCFA)</label><input type="number" id="emp-brut" value="${e.brut || ''}" placeholder="0" oninput="Employes._calcNet()"></div>
            <div class="fg"><label class="fl">Prime (FCFA)</label><input type="number" id="emp-prime" value="${e.prime || ''}" placeholder="0" oninput="Employes._calcNet()"></div>
            <div class="fg"><label class="fl">Avance (FCFA)</label><input type="number" id="emp-avance" value="${e.avance || ''}" placeholder="0" oninput="Employes._calcNet()"></div>
          </div>
          <div style="background:var(--c-surface);padding:12px;border-radius:8px;margin:8px 0;text-align:center">
            <span style="font-size:12px;color:var(--c-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600">Salaire net</span>
            <div id="emp-net-disp" style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--c-bar)">0 FCFA</div>
            <span style="font-size:11px;color:var(--c-muted)">Brut + Prime − Avance</span>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Employes.save_(${editing ? idx : -1})">Enregistrer</button>
          </div>
        </div>
      </div>`);
    this._calcNet();
  },

  _calcNet() {
    const brut = parseFloat(document.getElementById('emp-brut')?.value) || 0;
    const prime = parseFloat(document.getElementById('emp-prime')?.value) || 0;
    const avance = parseFloat(document.getElementById('emp-avance')?.value) || 0;
    const net = brut + prime - avance;
    const el = document.getElementById('emp-net-disp');
    if (el) el.textContent = Data.fmt(net);
  },

  async save_(idx) {
    const nom = document.getElementById('emp-nom')?.value.trim();
    if (!nom) { alert('Le nom est requis'); return; }
    const brut = parseFloat(document.getElementById('emp-brut')?.value) || 0;
    const prime = parseFloat(document.getElementById('emp-prime')?.value) || 0;
    const avance = parseFloat(document.getElementById('emp-avance')?.value) || 0;
    const entry = {
      nom,
      poste: document.getElementById('emp-poste')?.value.trim() || '',
      dept: document.getElementById('emp-dept')?.value || 'BAR',
      brut, prime, avance,
      net: brut + prime - avance,
    };
    try {
      if (Store && Store.ready) {
        if (idx >= 0) {
          const existing = Data.employes[idx];
          const saved = await Store.updateEmploye(existing.id, entry);
          Data.employes[idx] = saved;
        } else {
          const saved = await Store.insertEmploye(entry);
          Data.employes.push(saved);
        }
      } else {
        if (idx >= 0) Data.employes[idx] = entry;
        else Data.employes.push(entry);
      }
    } catch (e) { alert('Erreur : ' + e.message); return; }
    App.closeModal();
    this.render();
  },

  async delete(idx) {
    if (!confirm('Supprimer cet employé ?')) return;
    const e = Data.employes[idx];
    try {
      if (Store && Store.ready && e?.id) await Store.deleteEmploye(e.id);
    } catch (err) { alert('Erreur : ' + err.message); return; }
    Data.employes.splice(idx, 1);
    this.render();
  },

  render() {
    const filter = App.filters.emp;
    const list = filter === 'all' ? Data.employes : Data.employes.filter(e => e.dept === filter);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    const totBrut = list.reduce((s, e) => s + (e.brut || 0), 0);
    const totAvance = list.reduce((s, e) => s + (e.avance || 0), 0);
    set('emp-effectif', list.length);
    set('emp-brut', Data.fmt(totBrut));
    set('emp-avances', Data.fmt(totAvance));

    const tb = document.getElementById('emp-table');
    if (!tb) return;
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="8" class="empty">Aucun employé</td></tr>';
      return;
    }
    tb.innerHTML = list.map((e) => {
      const realIdx = Data.employes.indexOf(e);
      return `
      <tr>
        <td class="fw-bold">${e.nom}</td>
        <td>${e.poste || '-'}</td>
        <td><span class="badge ${e.dept==='BAR'?'b-green':e.dept==='CHICHA'?'b-amber':'b-blue'}">${e.dept}</span></td>
        <td class="text-right">${Data.fmts(e.brut)}</td>
        <td class="text-right text-green">${e.prime ? '+' + Data.fmts(e.prime) : '-'}</td>
        <td class="text-right text-red">${e.avance ? Data.fmts(e.avance) : '-'}</td>
        <td class="text-right fw-bold">${Data.fmts(e.net)}</td>
        <td class="nowrap">
          <button class="btn btn-sm" onclick="Employes.openModal(${realIdx})" title="Modifier"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm" onclick="Employes.delete(${realIdx})" title="Supprimer" style="color:var(--c-red)"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  },
};

// ===================== COMPTES EMPLOYÉS =====================
const CEmployes = {
  openModal() {
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">Écriture compte employé</div>
          <div class="fr">
            <div class="fg"><label class="fl">Employé</label>
              <select id="ce-emp"><option>CHRIST</option><option>FRANCIS</option><option>KING</option></select>
            </div>
            <div class="fg"><label class="fl">Date</label><input type="date" id="ce-date" value="${Data.today()}"></div>
          </div>
          <div class="fg"><label class="fl">Désignation</label><input type="text" id="ce-lib" placeholder="Avance salaire, achat..."></div>
          <div class="fr">
            <div class="fg"><label class="fl">Débit</label><input type="number" id="ce-deb" placeholder="0"></div>
            <div class="fg"><label class="fl">Crédit (remboursement)</label><input type="number" id="ce-cred" placeholder="0"></div>
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="CEmployes.save()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  save() {
    const emp = document.getElementById('ce-emp')?.value;
    const e = {
      id: Data.newId(),
      date: document.getElementById('ce-date')?.value,
      lib: document.getElementById('ce-lib')?.value,
      deb: parseFloat(document.getElementById('ce-deb')?.value) || 0,
      cred: parseFloat(document.getElementById('ce-cred')?.value) || 0,
    };
    if (!e.lib) { alert('Désignation requise'); return; }
    Data.compteEmp[emp].push(e);
    App.closeModal();
    this.render();
  },

  render() {
    const filter = App.filters.cemp;
    const names = filter === 'all' ? ['CHRIST', 'FRANCIS', 'KING'] : [filter];
    const container = document.getElementById('cemp-cards');
    if (!container) return;
    container.innerHTML = names.map(emp => {
      const ops = Data.compteEmp[emp] || [];
      const totD = ops.reduce((s,o) => s + o.deb, 0);
      const totC = ops.reduce((s,o) => s + o.cred, 0);
      const solde = totD - totC;
      const rows = ops.length ? ops.map(o => `
        <tr>
          <td>${Data.fmtDs(o.date)}</td>
          <td>${o.lib}</td>
          <td class="text-right text-red">${o.deb ? Data.fmts(o.deb) : '-'}</td>
          <td class="text-right text-green">${o.cred ? Data.fmts(o.cred) : '-'}</td>
          <td class="text-right fw-bold">${Data.fmts(o.deb - o.cred)}</td>
        </tr>`).join('') : '<tr><td colspan="5" class="empty">Aucune écriture — ajoutez via le formulaire</td></tr>';

      return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <div style="font-size:13px;font-weight:700">${emp}</div>
              <div style="font-size:11px;color:#aaa">Cuisinier SUSHI</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:#aaa">Solde</div>
              <div style="font-size:16px;font-weight:700;color:${solde>0?'#A32D2D':solde<0?'#0F6E56':'#aaa'}">
                ${Data.fmt(Math.abs(solde))} ${solde > 0 ? 'dû' : solde < 0 ? 'crédit' : ''}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:1rem;margin-bottom:10px;font-size:11px">
            <span>Total débit : <b class="text-red">${Data.fmt(totD)}</b></span>
            <span>Total crédit : <b class="text-green">${Data.fmt(totC)}</b></span>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Désignation</th><th class="text-right">Débit</th><th class="text-right">Crédit</th><th class="text-right">Mouvement</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
  },
};

// ===================== CRÉDITS CLIENTS =====================
const Credits = {
  STORAGE_KEY: 'meiji-credits',

  openModal() {
    App.showModal(`
      <div class="modal-overlay show">
        <div class="modal">
          <div class="modal-title"><i class="ti ti-receipt-2"></i> Nouveau crédit client</div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label><input type="date" id="cr-date" value="${Data.today()}"></div>
            <div class="fg"><label class="fl">N° Ticket</label><input type="text" id="cr-tick" placeholder="205"></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Nom du client</label><input type="text" id="cr-client" placeholder="Nom client"></div>
            <div class="fg"><label class="fl">Département</label>
              <select id="cr-dept"><option>SUSHI</option><option>BAR</option><option>CHICHA</option></select>
            </div>
          </div>
          <div class="fg"><label class="fl">Montant (FCFA)</label><input type="number" id="cr-mnt" placeholder="0"></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Credits.save()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  async save() {
    const c = {
      date: document.getElementById('cr-date')?.value,
      ticket: document.getElementById('cr-tick')?.value,
      client: document.getElementById('cr-client')?.value,
      dept: document.getElementById('cr-dept')?.value,
      montant: parseFloat(document.getElementById('cr-mnt')?.value) || 0,
      statut: 'ouvert',
    };
    if (!c.client || !c.montant) { alert('Client et montant requis'); return; }
    try {
      if (Store && Store.ready) {
        const saved = await Store.insertCredit(c);
        Data.credits.push(saved);
      } else {
        Data.credits.push({ id: Data.newId(), ...c });
      }
    } catch (e) {
      alert('Erreur enregistrement : ' + e.message);
      return;
    }
    App.closeModal();
    App.renderAll();
  },

  // Ouvre la modale de règlement (date + mode de paiement)
  regler(id) {
    const c = Data.credits.find(x => x.id === id);
    if (!c) return;
    const deptColor = c.dept === 'SUSHI' ? 'var(--c-sushi)' : c.dept === 'BAR' ? 'var(--c-bar)' : 'var(--c-chicha)';
    App.showModal(`
      <div class="modal-overlay show" onclick="if(event.target===this)App.closeModal()">
        <div class="modal">
          <div class="modal-title"><i class="ti ti-cash"></i> Régler le crédit</div>
          <div style="background:var(--c-bg-2);padding:14px 16px;border-radius:var(--r-md);margin-bottom:16px;border-left:3px solid ${deptColor}">
            <div style="font-size:12px;color:var(--c-muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700">Crédit</div>
            <div style="font-size:15px;font-weight:700;margin-top:2px">${c.client}</div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12.5px;color:var(--c-muted)">
              <span>Caisse <b style="color:${deptColor}">${c.dept}</b></span>
              <span>Ticket #${c.ticket || '-'}</span>
              <span>du ${Data.fmtD(c.date)}</span>
            </div>
            <div style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--c-red);margin-top:8px">
              ${Data.fmt(c.montant)}
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Date du règlement</label>
              <input type="date" id="reg-date" value="${Data.today()}">
            </div>
            <div class="fg"><label class="fl">Mode de paiement</label>
              <select id="reg-mode">
                <option value="esp">💵 Espèces</option>
                <option value="chq">📄 Chèque</option>
                <option value="mob">📱 Mobile Money</option>
              </select>
            </div>
          </div>
          <div style="font-size:11.5px;color:var(--c-muted);margin-top:4px">
            <i class="ti ti-info-circle"></i> Le montant sera reporté automatiquement dans les recettes <b>${c.dept}</b> du jour choisi.
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-success" onclick="Credits.confirmRegler(${id})"><i class="ti ti-check"></i> Confirmer le règlement</button>
          </div>
        </div>
      </div>`);
  },

  async confirmRegler(id) {
    const c = Data.credits.find(x => x.id === id);
    if (!c) return;
    const date = document.getElementById('reg-date')?.value;
    const mode = document.getElementById('reg-mode')?.value;
    if (!date || !mode) return alert('Date et mode requis');

    // Trouver ou créer la journée de règlement
    let j = Data.journees.find(x => x.date === date);
    if (!j) {
      j = {
        date,
        s:{esp:0,chq:0,mob:0,cred:0},
        b:{esp:0,chq:0,mob:0,cred:0},
        c:{esp:0,chq:0,mob:0,cred:0},
        ds:0, db:0, dc:0, cs:0, cb:0, cc:0,
        deps:{s:[],b:[],c:[]},
      };
    }
    const k = c.dept === 'SUSHI' ? 's' : c.dept === 'BAR' ? 'b' : 'c';
    j[k][mode] = (j[k][mode] || 0) + c.montant;

    try {
      if (Store && Store.ready) {
        const savedJ = await Store.upsertJournee(j);
        const idx = Data.journees.findIndex(x => x.date === savedJ.date);
        if (idx >= 0) Data.journees[idx] = savedJ;
        else Data.journees.push(savedJ);
        Data.journees.sort((a,b) => a.date.localeCompare(b.date));

        const updated = await Store.updateCredit(c.id, {
          ...c, statut: 'regle', dateReg: date, modeReg: mode,
        });
        const ci = Data.credits.findIndex(x => x.id === c.id);
        if (ci >= 0) Data.credits[ci] = updated;
      } else {
        if (!Data.journees.find(x => x.date === date)) {
          Data.journees.push({ id: Data.newId(), ...j });
          Data.journees.sort((a,b) => a.date.localeCompare(b.date));
        }
        c.statut = 'regle'; c.dateReg = date; c.modeReg = mode;
      }
    } catch (e) {
      alert('Erreur enregistrement : ' + e.message);
      return;
    }

    App.closeModal();
    App.renderAll();
  },

  // No-op : conservée pour compat
  persist() { /* données en cloud désormais */ },
  restore() { /* données chargées via Store.bootstrap() */ },

  render() {
    const filter = App.filters.cred;
    const periodList = App.filterByDate(Data.credits);
    const list = filter === 'all' ? periodList : periodList.filter(c => c.statut === filter);
    const open = periodList.filter(c => c.statut === 'ouvert').reduce((s,c) => s + c.montant, 0);
    const regle = periodList.filter(c => c.statut === 'regle').reduce((s,c) => s + c.montant, 0);
    const clients = [...new Set(periodList.map(c => c.client))].length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('cr-total', Data.fmt(open));
    set('cr-regle', Data.fmt(regle));
    set('cr-nb', clients);

    const tb = document.getElementById('cred-table');
    if (!tb) return;
    if (!list.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">Aucun crédit</td></tr>'; return; }

    const modeLabel = { esp: '💵 Espèces', chq: '📄 Chèque', mob: '📱 Mobile' };
    tb.innerHTML = list.map(c => {
      const statut = c.statut === 'ouvert'
        ? '<span class="badge b-red">En cours</span>'
        : `<span class="badge b-green">Réglé</span>${c.modeReg ? `<span class="badge b-blue" style="margin-left:4px">${modeLabel[c.modeReg]||c.modeReg}</span>` : ''}${c.dateReg ? `<div style="font-size:10.5px;color:var(--c-muted);margin-top:2px">le ${Data.fmtDs(c.dateReg)}</div>` : ''}`;
      const action = c.statut === 'ouvert'
        ? `<button class="btn btn-sm btn-success" onclick="Credits.regler(${c.id})"><i class="ti ti-check"></i> Régler</button>`
        : '<span class="text-muted">—</span>';
      return `
      <tr>
        <td class="nowrap">${Data.fmtDs(c.date)}</td>
        <td>${c.ticket || '-'}</td>
        <td class="fw-bold">${c.client}</td>
        <td><span class="badge ${c.dept==='SUSHI'?'b-blue':c.dept==='BAR'?'b-green':'b-amber'}">${c.dept}</span></td>
        <td class="text-right fw-bold" style="color:${c.statut==='ouvert'?'var(--c-red)':'var(--c-bar)'}">${Data.fmts(c.montant)} FCFA</td>
        <td>${statut}</td>
        <td>${action}</td>
      </tr>`;
    }).join('');
  },
};

// ===================== FOURNISSEURS =====================
const Fournisseurs = {
  openModal() {
    App.showModal(`
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-title">Nouvelle facture fournisseur</div>
          <div class="fr">
            <div class="fg"><label class="fl">Date</label><input type="date" id="fo-date" value="${Data.today()}"></div>
            <div class="fg"><label class="fl">Fournisseur</label>
              <select id="fo-four"><option>BATIMAT</option><option>REGAL</option><option>ORCA</option><option>HUSS NEHME</option></select>
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">N° Facture</label><input type="text" id="fo-num" placeholder="F-2026-001"></div>
            <div class="fg"><label class="fl">Échéance</label><input type="date" id="fo-ech" value="${Data.today()}"></div>
          </div>
          <div class="fg"><label class="fl">Désignation</label><input type="text" id="fo-lib" placeholder="Description"></div>
          <div class="fr">
            <div class="fg"><label class="fl">Débit (FCFA)</label><input type="number" id="fo-deb" placeholder="0"></div>
            <div class="fg"><label class="fl">Crédit (FCFA)</label><input type="number" id="fo-cred" placeholder="0"></div>
          </div>
          <div class="fg"><label class="fl">Observation</label><input type="text" id="fo-obs" placeholder="Remarques..."></div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-primary" onclick="Fournisseurs.save()">Enregistrer</button>
          </div>
        </div>
      </div>`);
  },

  async save() {
    const f = {
      date: document.getElementById('fo-date')?.value,
      four: document.getElementById('fo-four')?.value,
      num: document.getElementById('fo-num')?.value,
      ech: document.getElementById('fo-ech')?.value,
      lib: document.getElementById('fo-lib')?.value,
      deb: parseFloat(document.getElementById('fo-deb')?.value) || 0,
      cred: parseFloat(document.getElementById('fo-cred')?.value) || 0,
      obs: document.getElementById('fo-obs')?.value,
    };
    f.solde = f.deb - f.cred;
    try {
      if (Store && Store.ready) {
        const saved = await Store.insertFournisseur(f);
        Data.fournisseurs.unshift(saved);
      } else {
        Data.fournisseurs.unshift({ id: Data.newId(), ...f });
      }
    } catch (e) { alert('Erreur : ' + e.message); return; }
    App.closeModal();
    this.render();
  },

  render() {
    const list = App.filterByDate(Data.fournisseurs);
    const b = { BATIMAT: 0, REGAL: 0, ORCA: 0, 'HUSS NEHME': 0 };
    list.forEach(f => { if (b[f.four] !== undefined) b[f.four] += (f.deb - f.cred); });
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('f-bat', Data.fmt(b['BATIMAT']));
    set('f-reg', Data.fmt(b['REGAL']));
    set('f-orc', Data.fmt(b['ORCA']));
    set('f-hus', Data.fmt(b['HUSS NEHME']));

    const tb = document.getElementById('fourn-table');
    if (!tb) return;
    if (!list.length) { tb.innerHTML = '<tr><td colspan="8" class="empty">Aucune facture sur cette période</td></tr>'; return; }

    tb.innerHTML = list.map(f => `
      <tr>
        <td class="nowrap">${Data.fmtDs(f.date)}</td>
        <td class="fw-bold">${f.four}</td>
        <td>${f.num}</td>
        <td>${f.lib}</td>
        <td class="text-right text-red">${Data.fmts(f.deb)}</td>
        <td class="text-right text-green">${Data.fmts(f.cred)}</td>
        <td class="text-right fw-bold">${Data.fmts(f.solde)}</td>
        <td><span class="badge ${f.solde <= 0 ? 'b-green' : 'b-red'}">${f.solde <= 0 ? 'Soldé' : 'En cours'}</span></td>
      </tr>`).join('');
  },
};

// ===================== BILAN =====================
const Bilan = {
  render() {
    const journees = App.filterByDate(Data.journees);
    const last = journees[0] || Data.journees[0] || { cs: 0, cb: 0, cc: 0 };
    const allDeps = App.filterByDate(Data.getAllDeps());
    const totDep = allDeps.reduce((s,d) => s + d.montant, 0);
    const totCA = journees.reduce((s,j) => s + Data.caTotal(j), 0);
    const credO = App.filterByDate(Data.credits).filter(c => c.statut === 'ouvert').reduce((s,c) => s + c.montant, 0);
    const actif = last.cs + last.cb + last.cc + Data.soldes.banque.montant + Data.soldes.mobile.montant + credO;
    const rn = totCA - totDep;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('bi-ts', Data.fmt(last.cs));
    set('bi-tb', Data.fmt(last.cb));
    set('bi-tc', Data.fmt(last.cc));
    set('bi-banque', Data.fmt(Data.soldes.banque.montant));
    set('bi-mobile', Data.fmt(Data.soldes.mobile.montant));
    set('bi-cred', Data.fmt(credO));
    set('bi-ta', Data.fmt(actif));
    set('bi-de', Data.fmt(totDep));

    const rnel = document.getElementById('bi-rn');
    if (rnel) { rnel.textContent = Data.fmt(rn); rnel.style.color = rn >= 0 ? '#0F6E56' : '#A32D2D'; }
  },
};
