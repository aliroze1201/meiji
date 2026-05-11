/**
 * credits.js — Crédits clients (statut ouvert/réglé).
 */

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

  save() {
    const c = {
      id: Data.newId(),
      date: document.getElementById('cr-date')?.value,
      ticket: document.getElementById('cr-tick')?.value,
      client: document.getElementById('cr-client')?.value,
      dept: document.getElementById('cr-dept')?.value,
      montant: parseFloat(document.getElementById('cr-mnt')?.value) || 0,
      statut: 'ouvert',
    };
    if (!c.client || !c.montant) { alert('Client et montant requis'); return; }
    Data.credits.push(c);
    this.persist();
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

  confirmRegler(id) {
    const c = Data.credits.find(x => x.id === id);
    if (!c) return;
    const date = document.getElementById('reg-date')?.value;
    const mode = document.getElementById('reg-mode')?.value;
    if (!date || !mode) return alert('Date et mode requis');

    // Trouver ou créer la journée de règlement
    let j = Data.journees.find(x => x.date === date);
    if (!j) {
      j = {
        id: Data.newId(),
        userRec: true,
        date,
        s:{esp:0,chq:0,mob:0,cred:0},
        b:{esp:0,chq:0,mob:0,cred:0},
        c:{esp:0,chq:0,mob:0,cred:0},
        ds:0, db:0, dc:0, cs:0, cb:0, cc:0,
        deps:{s:[],b:[],c:[]},
      };
      Data.journees.push(j);
      Data.journees.sort((a,b) => a.date.localeCompare(b.date));
    } else {
      // Marquer la journée comme modifiée pour qu'elle soit persistée
      j.userRec = true;
    }
    const k = c.dept === 'SUSHI' ? 's' : c.dept === 'BAR' ? 'b' : 'c';
    j[k][mode] = (j[k][mode] || 0) + c.montant;

    // Marquer le crédit comme réglé
    c.statut = 'regle';
    c.dateReg = date;
    c.modeReg = mode;

    // Persistance
    this.persist();
    if (typeof Recettes !== 'undefined' && Recettes.persistUser) Recettes.persistUser();

    App.closeModal();
    App.renderAll();
  },

  persist() {
    AppDB.save(this.STORAGE_KEY, Data.credits);
  },

  async restore() {
    const arr = await AppDB.load(this.STORAGE_KEY);
    if (!Array.isArray(arr)) return;
    // Source de vérité = cloud. On ré-ajoute les seeds dont l'id n'est pas dans le cloud.
    const out = [...arr];
    const savedIds = new Set(arr.map(c => c.id));
    Data.credits.forEach(c => { if (!savedIds.has(c.id)) out.push(c); });
    Data.credits = out;
  },

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

