/**
 * employes.js — Fiche des employés (salaires, primes, avances).
 */

// ===================== EMPLOYÉS =====================
const Employes = {
  STORAGE_KEY: 'meiji-employes',

  save() {
    AppDB.save(this.STORAGE_KEY, Data.employes);
  },

  async restore() {
    const arr = await AppDB.load(this.STORAGE_KEY);
    if (Array.isArray(arr)) Data.employes = arr;
  },

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

  save_(idx) {
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
    if (idx >= 0) Data.employes[idx] = entry;
    else Data.employes.push(entry);
    this.save();
    App.closeModal();
    this.render();
  },

  delete(idx) {
    if (!confirm('Supprimer cet employé ?')) return;
    Data.employes.splice(idx, 1);
    this.save();
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

