/**
 * credits.js — Crédits clients (statut ouvert/réglé).
 */

const Credits = {
  STORAGE_KEY: 'meiji-credits',
  OVERDUE_DAYS: 14,  // Seuil pour signaler un crédit en retard

  // Nombre de jours écoulés depuis la création du crédit (jusqu'à aujourd'hui).
  daysSince(c) {
    if (!c?.date) return 0;
    const start = new Date(c.date + 'T12:00:00').getTime();
    const now = Date.now();
    return Math.floor((now - start) / 86400000);
  },

  isOverdue(c) {
    return c.statut === 'ouvert' && this.daysSince(c) >= this.OVERDUE_DAYS;
  },

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
    try {
      if (typeof Audit !== 'undefined') Audit.log('create', 'credits',
        `Crédit ${c.client} · ${c.dept}`,
        `${Data.fmt(c.montant)} · ticket ${c.ticket || '-'}`,
        { id: c.id, after: c });
    } catch (e) {}
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
            <div style="font-size:15px;font-weight:700;margin-top:2px">${Data.h(c.client)}</div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12.5px;color:var(--c-muted)">
              <span>Caisse <b style="color:${deptColor}">${Data.h(c.dept)}</b></span>
              <span>Ticket #${Data.h(c.ticket || '-')}</span>
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
              <select id="reg-mode" onchange="Credits._toggleCompensationHint(this.value)">
                <option value="esp">💵 Espèces</option>
                <option value="chq">📄 Chèque</option>
                <option value="mob">📱 Mobile Money</option>
                <option value="compensation">🔄 Compensation (sans flux)</option>
              </select>
            </div>
          </div>
          <div id="reg-hint-flux" style="font-size:11.5px;color:var(--c-muted);margin-top:4px">
            <i class="ti ti-info-circle"></i> Le montant sera reporté automatiquement dans les recettes <b>${c.dept}</b> du jour choisi.
          </div>
          <div id="reg-hint-compensation" style="display:none;font-size:11.5px;color:var(--c-amber);margin-top:4px">
            <i class="ti ti-alert-triangle"></i> Clôture sans encaissement : aucun montant ne sera ajouté aux recettes ni aux dépenses.
          </div>
          <div class="modal-actions">
            <button class="btn" onclick="App.closeModal()">Annuler</button>
            <button class="btn btn-success" onclick="Credits.confirmRegler(${id})"><i class="ti ti-check"></i> Confirmer le règlement</button>
          </div>
        </div>
      </div>`);
  },

  _toggleCompensationHint(mode) {
    const flux = document.getElementById('reg-hint-flux');
    const comp = document.getElementById('reg-hint-compensation');
    if (flux) flux.style.display = mode === 'compensation' ? 'none' : '';
    if (comp) comp.style.display = mode === 'compensation' ? '' : 'none';
  },

  confirmRegler(id) {
    const c = Data.credits.find(x => x.id === id);
    if (!c) return;
    const date = document.getElementById('reg-date')?.value;
    const mode = document.getElementById('reg-mode')?.value;
    if (!date || !mode) return alert('Date et mode requis');

    // Compensation = clôture sans flux : pas d'impact sur les recettes.
    if (mode !== 'compensation') {
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
        j.userRec = true;
      }
      const k = c.dept === 'SUSHI' ? 's' : c.dept === 'BAR' ? 'b' : 'c';
      j[k][mode] = (j[k][mode] || 0) + c.montant;
      if (typeof Recettes !== 'undefined' && Recettes.persistUser) Recettes.persistUser();
    }

    // Marquer le crédit comme réglé
    c.statut = 'regle';
    c.dateReg = date;
    c.modeReg = mode;
    try {
      if (typeof Audit !== 'undefined') Audit.log('update', 'credits',
        `Crédit ${c.client} · ${c.dept}`,
        `Réglé le ${Data.fmtD(date)} · ${Data.fmt(c.montant)} · mode ${mode}`,
        { id: c.id, after: { statut: 'regle', dateReg: date, modeReg: mode } });
    } catch (e) {}
    this.persist();

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
    const overdue = periodList.filter(c => this.isOverdue(c));
    const list = filter === 'all'    ? periodList
              : filter === 'retard'  ? overdue
              :                        periodList.filter(c => c.statut === filter);
    const open    = periodList.filter(c => c.statut === 'ouvert').reduce((s,c) => s + c.montant, 0);
    const regle   = periodList.filter(c => c.statut === 'regle').reduce((s,c) => s + c.montant, 0);
    const retard  = overdue.reduce((s,c) => s + c.montant, 0);
    const clients = [...new Set(periodList.map(c => c.client))].length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('cr-total', Data.fmt(open));
    set('cr-retard', Data.fmt(retard));
    set('cr-retard-nb', overdue.length ? `${overdue.length} client${overdue.length>1?'s':''}` : '');
    set('cr-regle', Data.fmt(regle));
    set('cr-nb', clients);

    // Bannière d'alerte
    const alert = document.getElementById('cr-alert');
    if (alert) {
      if (overdue.length) {
        const topClients = overdue.slice().sort((a,b) => b.montant - a.montant).slice(0,3)
          .map(c => `${c.client} (${Data.fmts(c.montant)})`).join(', ');
        alert.style.display = 'block';
        alert.innerHTML = `
          <div style="background:color-mix(in srgb, var(--c-amber) 15%, transparent);border:1px solid var(--c-amber);border-radius:var(--r-md);padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
            <i class="ti ti-alert-triangle" style="font-size:24px;color:var(--c-amber)"></i>
            <div style="flex:1">
              <div style="font-weight:700;color:var(--c-amber)">${overdue.length} crédit${overdue.length>1?'s':''} en retard (>${this.OVERDUE_DAYS}j) — ${Data.fmt(retard)}</div>
              <div style="font-size:12px;color:var(--c-muted);margin-top:2px">Principaux : ${topClients}</div>
            </div>
          </div>`;
      } else {
        alert.style.display = 'none';
        alert.innerHTML = '';
      }
    }

    const tb = document.getElementById('cred-table');
    if (!tb) return;
    if (!list.length) { tb.innerHTML = '<tr><td colspan="7" class="empty">Aucun crédit</td></tr>'; return; }

    const modeLabel = {
      esp: '💵 Espèces', chq: '📄 Chèque', mob: '📱 Mobile',
      compensation: '🔄 Compensation'
    };

    tb.innerHTML = list.map(c => {
      const days = this.daysSince(c);
      const overdueBadge = this.isOverdue(c)
        ? `<span class="badge b-amber" title="${days} jours sans règlement"><i class="ti ti-alert-triangle"></i> EN RETARD · ${days}j</span>`
        : '';

      let statut;
      if (c.statut === 'ouvert') {
        const ouvertBadge = this.isOverdue(c)
          ? '<span class="badge b-red">En cours</span>'
          : '<span class="badge b-red">En cours</span>';
        statut = `${ouvertBadge}${overdueBadge ? '<div style="margin-top:4px">'+overdueBadge+'</div>' : ''}`;
      } else {
        const modeBadge = c.modeReg
          ? `<span class="badge ${c.modeReg==='compensation'?'b-purple':'b-blue'}" style="margin-left:4px">${modeLabel[c.modeReg]||c.modeReg}</span>`
          : '';
        const dateReg = c.dateReg ? `<div style="font-size:10.5px;color:var(--c-muted);margin-top:2px">le ${Data.fmtDs(c.dateReg)}</div>` : '';
        statut = `<span class="badge b-green">${c.modeReg==='compensation'?'Clôturé':'Réglé'}</span>${modeBadge}${dateReg}`;
      }

      const action = c.statut === 'ouvert'
        ? `<button class="btn btn-sm btn-success" onclick="Credits.regler(${c.id})"><i class="ti ti-check"></i> Régler</button>`
        : '<span class="text-muted">—</span>';

      const rowStyle = this.isOverdue(c) ? ' style="background:color-mix(in srgb, var(--c-amber) 6%, transparent)"' : '';
      return `
      <tr data-search-id="cre:${c.id}"${rowStyle}>
        <td class="nowrap">${Data.fmtDs(c.date)}</td>
        <td>${Data.h(c.ticket || '-')}</td>
        <td class="fw-bold">${Data.h(c.client)}</td>
        <td><span class="badge ${c.dept==='SUSHI'?'b-blue':c.dept==='BAR'?'b-green':'b-amber'}">${Data.h(c.dept)}</span></td>
        <td class="text-right fw-bold" style="color:${c.statut==='ouvert'?'var(--c-red)':'var(--c-bar)'}">${Data.fmts(c.montant)} FCFA</td>
        <td>${statut}</td>
        <td>${action}</td>
      </tr>`;
    }).join('');
  },
};

