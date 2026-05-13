/**
 * recettes.js — Journées CA : brouillons, validation, import/export Excel.
 *
 * Persistance : table Supabase journees + journee_deps via JourneesDB.
 */

// ===================== RECETTES =====================
const Recettes = {
  drafts: [],
  _draftSeq: 1,
  STORAGE_KEY: 'meiji-rec-drafts',
  USER_KEY:    'meiji-user-recs',  // journées validées par l'utilisateur

  render() {
    this.renderHistory();
    // Toujours montrer au moins un tableau prêt à remplir
    if (!this.drafts.length) {
      this.drafts.push(this.newDraft());
    }
    this.renderDrafts();
  },

  renderHistory() {
    const jj = App.filterByDate(Data.journees);
    const tS = jj.reduce((s,j) => s + Data.caisse(j,'s'), 0);
    const tB = jj.reduce((s,j) => s + Data.caisse(j,'b'), 0);
    const tC = jj.reduce((s,j) => s + Data.caisse(j,'c'), 0);
    const tEsp = jj.reduce((s,j) => s + j.s.esp + j.b.esp + j.c.esp, 0);
    const tChq = jj.reduce((s,j) => s + j.s.chq + j.b.chq + j.c.chq, 0);
    const tMob = jj.reduce((s,j) => s + j.s.mob + j.b.mob + j.c.mob + j.s.cred + j.b.cred + j.c.cred, 0);

    this._set('r-s', Data.fmt(tS));
    this._set('r-b', Data.fmt(tB));
    this._set('r-c', Data.fmt(tC));
    this._set('r-esp', Data.fmt(tEsp));
    this._set('r-chq', Data.fmt(tChq));
    this._set('r-mob', Data.fmt(tMob));

    // Cumul espèces restantes (fin de la dernière journée de la période)
    const lastDate = jj.length
      ? jj.map(j => j.date).sort().slice(-1)[0]
      : null;
    const cumS = lastDate ? Data.cashEndOfDay(lastDate, 's') : 0;
    const cumB = lastDate ? Data.cashEndOfDay(lastDate, 'b') : 0;
    const cumC = lastDate ? Data.cashEndOfDay(lastDate, 'c') : 0;
    this._set('r-cum-s', Data.fmt(cumS));
    this._set('r-cum-b', Data.fmt(cumB));
    this._set('r-cum-c', Data.fmt(cumC));
    const sub = lastDate ? 'au ' + Data.fmtD(lastDate) : 'au —';
    this._set('r-cum-s-sub', sub);
    this._set('r-cum-b-sub', sub);
    this._set('r-cum-c-sub', sub);

    const tb = document.getElementById('rec-table');
    if (!tb) return;
    if (!jj.length) { tb.innerHTML = '<tr><td colspan="10" class="empty">Aucune recette</td></tr>'; return; }

    tb.innerHTML = jj.slice().sort((a,b) => b.date.localeCompare(a.date)).map(j => {
      const total = Data.caTotal(j);
      const pays = [];
      const allPays = { esp: j.s.esp+j.b.esp+j.c.esp, chq: j.s.chq+j.b.chq+j.c.chq, mob: j.s.mob+j.b.mob+j.c.mob, cred: j.s.cred+j.b.cred+j.c.cred };
      if (allPays.esp) pays.push(`<span class="badge b-blue">Esp. ${Data.fmts(allPays.esp)}</span>`);
      if (allPays.chq) pays.push(`<span class="badge b-purple">Chq ${Data.fmts(allPays.chq)}</span>`);
      if (allPays.mob) pays.push(`<span class="badge b-green">Mob ${Data.fmts(allPays.mob)}</span>`);
      if (allPays.cred) pays.push(`<span class="badge b-amber">Créd ${Data.fmts(allPays.cred)}</span>`);
      // Cumul espèces restantes en FIN de cette journée (par caisse + total)
      const cumS = Data.cashEndOfDay(j.date, 's');
      const cumB = Data.cashEndOfDay(j.date, 'b');
      const cumC = Data.cashEndOfDay(j.date, 'c');
      const cumT = cumS + cumB + cumC;
      const colorCum = (n) => n >= 0 ? 'var(--c-bar)' : 'var(--c-red)';
      return `<tr>
        <td>${Data.fmtD(j.date)}</td>
        <td class="text-right text-blue">${Data.fmts(Data.caisse(j,'s'))}</td>
        <td class="text-right text-green">${Data.fmts(Data.caisse(j,'b'))}</td>
        <td class="text-right" style="color:var(--c-chicha)">${Data.fmts(Data.caisse(j,'c'))}</td>
        <td class="text-right fw-bold">${Data.fmts(total)}</td>
        <td class="text-right" style="color:${colorCum(cumS)}">${Data.fmts(cumS)}</td>
        <td class="text-right" style="color:${colorCum(cumB)}">${Data.fmts(cumB)}</td>
        <td class="text-right" style="color:${colorCum(cumC)}">${Data.fmts(cumC)}</td>
        <td class="text-right fw-bold" style="color:${colorCum(cumT)}">${Data.fmts(cumT)}</td>
        <td><div style="display:flex;gap:4px;flex-wrap:wrap">${pays.join('')}</div></td>
      </tr>`;
    }).join('');
  },

  // ===================== BROUILLONS =====================
  newDraft() {
    return {
      id: this._draftSeq++,
      date: Data.today(),
      s: { verif:'', esp:'', chq:'', mob:'', cred:'' },
      b: { verif:'', esp:'', chq:'', mob:'', cred:'' },
      c: { verif:'', esp:'', chq:'', mob:'', cred:'' },
    };
  },

  addDraft() {
    this.drafts.push(this.newDraft());
    this.persistDrafts();
    this.renderDrafts();
  },

  removeDraft(id) {
    if (!confirm('Supprimer cette journée en cours ?')) return;
    this.drafts = this.drafts.filter(d => d.id !== id);
    // Toujours laisser au moins une ligne prête à remplir
    if (!this.drafts.length) this.drafts.push(this.newDraft());
    this.persistDrafts();
    this.renderDrafts();
  },

  updateDraft(id, caisse, mode, value) {
    const d = this.drafts.find(x => x.id === id);
    if (!d) return;
    d[caisse][mode] = value;
    // Auto-calcul des espèces si verif/chq/mob/cred change :
    //   espèces = total verif − chèque − mobile − crédit
    if (mode !== 'esp') {
      const v  = parseFloat(d[caisse].verif) || 0;
      const ch = parseFloat(d[caisse].chq)   || 0;
      const mb = parseFloat(d[caisse].mob)   || 0;
      const cr = parseFloat(d[caisse].cred)  || 0;
      const esp = v - ch - mb - cr;
      d[caisse].esp = esp ? esp : '';
      const espInput = document.querySelector(`[data-rec-draft="${id}"] tr.${caisse==='s'?'sushi':caisse==='b'?'bar':'chicha'} input[data-mode="esp"]`);
      if (espInput) {
        espInput.value = d[caisse].esp;
        espInput.classList.toggle('neg', esp < 0);
      }
    }
    this.persistDrafts();
    this._refreshTotals(id);
    this._refreshHeader();
  },

  updateDate(id, date) {
    const d = this.drafts.find(x => x.id === id);
    if (!d) return;
    d.date = date;
    this.persistDrafts();
  },

  _draftTotal(d) {
    return ['s','b','c'].reduce((sum, k) => {
      return sum + ['esp','chq','mob','cred'].reduce((s2, m) => s2 + (parseFloat(d[k][m]) || 0), 0);
    }, 0);
  },

  _refreshTotals(id) {
    const d = this.drafts.find(x => x.id === id);
    if (!d) return;
    const card = document.querySelector(`[data-rec-draft="${id}"]`);
    if (!card) return;
    ['s','b','c'].forEach(k => {
      const total = ['esp','chq','mob','cred'].reduce((s, m) => s + (parseFloat(d[k][m]) || 0), 0);
      const el = card.querySelector(`.row-total[data-k="${k}"]`);
      if (el) el.textContent = Data.fmts(total);
    });
    ['verif','esp','chq','mob','cred'].forEach(m => {
      const total = ['s','b','c'].reduce((s, k) => s + (parseFloat(d[k][m]) || 0), 0);
      const el = card.querySelector(`.col-total[data-m="${m}"]`);
      if (el) el.textContent = Data.fmts(total);
    });
    const grand = card.querySelector('.rec-draft-total');
    if (grand) grand.textContent = `Total CA : ${Data.fmt(this._draftTotal(d))}`;
    const allTotal = card.querySelector('.col-total[data-m="all"]');
    if (allTotal) allTotal.textContent = Data.fmts(this._draftTotal(d));
  },

  _refreshHeader() {
    const c = document.getElementById('rec-draft-count');
    const t = document.getElementById('rec-draft-total');
    const total = this.drafts.reduce((s, d) => s + this._draftTotal(d), 0);
    if (c) c.textContent = `· ${this.drafts.length} journée${this.drafts.length > 1 ? 's' : ''}`;
    if (t) t.textContent = total ? `Total brouillon : ${Data.fmt(total)}` : '';
  },

  renderDrafts() {
    const list = document.getElementById('rec-draft-list');
    if (!list) return;
    if (!this.drafts.length) {
      list.innerHTML = '';
      this._refreshHeader();
      return;
    }

    list.innerHTML = this.drafts.map(d => {
      const sum = (k) => (parseFloat(d[k].esp)||0) + (parseFloat(d[k].chq)||0) + (parseFloat(d[k].mob)||0) + (parseFloat(d[k].cred)||0);
      const tS = sum('s'), tB = sum('b'), tC = sum('c');
      const tVer  = (parseFloat(d.s.verif)||0)+(parseFloat(d.b.verif)||0)+(parseFloat(d.c.verif)||0);
      const tEsp  = (parseFloat(d.s.esp)||0)+(parseFloat(d.b.esp)||0)+(parseFloat(d.c.esp)||0);
      const tChq  = (parseFloat(d.s.chq)||0)+(parseFloat(d.b.chq)||0)+(parseFloat(d.c.chq)||0);
      const tMob  = (parseFloat(d.s.mob)||0)+(parseFloat(d.b.mob)||0)+(parseFloat(d.c.mob)||0);
      const tCred = (parseFloat(d.s.cred)||0)+(parseFloat(d.b.cred)||0)+(parseFloat(d.c.cred)||0);
      const grand = tS + tB + tC;

      const editable = (k, m, v) => `<td><input type="number" min="0" step="100" placeholder="0"
        data-mode="${m}" value="${this._esc(v)}"
        oninput="Recettes.updateDraft(${d.id},'${k}','${m}',this.value)"></td>`;
      const lockedEsp = (k, v) => {
        const n = parseFloat(v);
        const cls = (n < 0) ? 'esp-locked neg' : 'esp-locked';
        return `<td><div class="esp-wrap"><i class="ti ti-lock"></i><input type="number" readonly tabindex="-1"
          data-mode="esp" class="${cls}" placeholder="0" value="${this._esc(v)}"></div></td>`;
      };
      const dataMap = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' };
      const row = (k) => `
        <tr class="${k==='s'?'sushi':k==='b'?'bar':'chicha'}">
          <td><span class="caisse-label"><span class="dot"></span>${dataMap[k]}</span></td>
          ${editable(k,'verif', d[k].verif)}
          ${editable(k,'chq',   d[k].chq)}
          ${editable(k,'mob',   d[k].mob)}
          ${editable(k,'cred',  d[k].cred)}
          ${lockedEsp(k,        d[k].esp)}
          <td class="row-total" data-k="${k}">${Data.fmts(k==='s'?tS:k==='b'?tB:tC)}</td>
        </tr>`;

      return `
      <div class="rec-draft" data-rec-draft="${d.id}">
        <div class="rec-draft-head">
          <span style="font-size:12px;color:var(--c-muted);font-weight:700;text-transform:uppercase;letter-spacing:.05em">Date :</span>
          <input type="date" class="rec-draft-date" value="${this._esc(d.date)}"
                 onchange="Recettes.updateDate(${d.id}, this.value)">
          <span class="rec-draft-total">Total CA : ${Data.fmt(grand)}</span>
          <button class="btn-ghost" title="Supprimer la journée"
                  onclick="Recettes.removeDraft(${d.id})"><i class="ti ti-trash"></i></button>
        </div>
        <div style="font-size:11.5px;color:var(--c-muted);margin-bottom:8px">
          <i class="ti ti-info-circle"></i> Saisissez le <b>C.A. cible</b> (objectif/comptage de la caisse), puis Chèque / Mobile / Crédit.
          La colonne <b>Espèces</b> <i class="ti ti-lock" style="font-size:11px"></i> se calcule automatiquement : <code style="font-family:var(--font-mono);background:var(--c-bg-2);padding:1px 5px;border-radius:4px">Espèces = C.A. cible − Chèque − Mobile − Crédit</code>.
        </div>
        <div style="overflow-x:auto">
          <table class="rec-draft-table">
            <thead>
              <tr>
                <th>Caisse</th>
                <th>C.A. cible</th>
                <th>Chèque</th>
                <th>Mobile</th>
                <th>Crédit</th>
                <th>Espèces <i class="ti ti-lock" style="font-size:11px"></i></th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${row('s')}
              ${row('b')}
              ${row('c')}
              <tr class="totals">
                <td>Total</td>
                <td class="col-total" data-m="verif">${Data.fmts(tVer)}</td>
                <td class="col-total" data-m="chq">${Data.fmts(tChq)}</td>
                <td class="col-total" data-m="mob">${Data.fmts(tMob)}</td>
                <td class="col-total" data-m="cred">${Data.fmts(tCred)}</td>
                <td class="col-total" data-m="esp">${Data.fmts(tEsp)}</td>
                <td class="col-total" data-m="all">${Data.fmts(grand)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
    }).join('');
    this._refreshHeader();
  },

  commitDrafts() {
    if (!this.drafts.length) return alert('Aucune saisie à valider.');

    if (typeof Clotures !== 'undefined') {
      const blocked = this.drafts.find(d => d.date && this._draftTotal(d) && Clotures.isMonthClosed(d.date));
      if (blocked) {
        alert(`🔒 Impossible : la journée du ${Data.fmtD(blocked.date)} appartient au mois de ${Clotures.monthLabel(Clotures.ymOf(blocked.date))}, qui est clôturé.`);
        return;
      }
    }

    const invalid = this.drafts.filter(d => !d.date || !this._draftTotal(d)).length;
    if (invalid) {
      if (!confirm(`${invalid} journée(s) sans date ou sans montant. Continuer quand même (ces lignes seront ignorées) ?`)) return;
    } else if (!confirm(`Valider ${this.drafts.length} journée(s) ? Elles seront ajoutées à l'historique.`)) {
      return;
    }

    const toSave = [];
    this.drafts.forEach(d => {
      if (!d.date || !this._draftTotal(d)) return;
      // Si une journée existe déjà à cette date, on la met à jour (préserve deps/ds/cs).
      const existing = Data.journees.find(j => j.date === d.date);
      const obj = existing ? { ...existing } : {
        id: Data.newId(),
        date: d.date,
        ds: 0, db: 0, dc: 0,
        cs: 0, cb: 0, cc: 0,
        deps: { s:[], b:[], c:[] },
      };
      obj.userRec = true;
      obj.date = d.date;
      obj.s = { esp:+d.s.esp||0, chq:+d.s.chq||0, mob:+d.s.mob||0, cred:+d.s.cred||0 };
      obj.b = { esp:+d.b.esp||0, chq:+d.b.chq||0, mob:+d.b.mob||0, cred:+d.b.cred||0 };
      obj.c = { esp:+d.c.esp||0, chq:+d.c.chq||0, mob:+d.c.mob||0, cred:+d.c.cred||0 };
      if (!existing) Data.journees.push(obj);
      toSave.push(obj);
    });

    Data.journees.sort((a,b) => a.date.localeCompare(b.date));

    this.drafts = [];
    this.persistDrafts();
    this.persistUser(toSave);
    App.renderAll();
    if (toSave.length) alert(`✅ ${toSave.length} journée(s) validée(s).`);
  },

  // ===================== PERSISTANCE =====================
  persistDrafts() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        seq: this._draftSeq,
        drafts: this.drafts,
      }));
    } catch (e) {}
  },

  // Sauvegarde : Supabase si dispo, sinon localStorage (mode public).
  // Si `targets` est fourni, on n'upsert que ces journées-là (plus rapide).
  async persistUser(targets) {
    if (typeof JourneesDB !== 'undefined' && JourneesDB.enabled()) {
      const list = Array.isArray(targets) ? targets : Data.journees.filter(j => j.userRec);
      for (const j of list) {
        const ok = await JourneesDB.upsertOne(j);
        if (!ok) { alert('⚠️ Sauvegarde Supabase échouée pour ' + j.date + '. Voir console.'); break; }
      }
      return;
    }
    try {
      const userJ = Data.journees.filter(j => j.userRec);
      localStorage.setItem(this.USER_KEY, JSON.stringify(userJ));
    } catch (e) {}
  },

  // Charge depuis Supabase si dispo (et écrase le seed local), sinon localStorage.
  async restore() {
    let loaded = false;
    if (typeof JourneesDB !== 'undefined' && JourneesDB.enabled()) {
      const rows = await JourneesDB.loadAll();
      if (Array.isArray(rows)) {
        // Supabase = source de vérité : remplace toutes les journées existantes.
        Data.journees = rows;
        loaded = true;
      }
    }
    if (!loaded) {
      // Fallback localStorage (mode public ou offline)
      try {
        const rawU = localStorage.getItem(this.USER_KEY);
        if (rawU) {
          const arr = JSON.parse(rawU);
          if (Array.isArray(arr)) {
            arr.forEach(uj => {
              const idx = Data.journees.findIndex(j => j.date === uj.date);
              if (idx >= 0) Data.journees[idx] = uj;
              else Data.journees.push(uj);
            });
            Data.journees.sort((a,b) => a.date.localeCompare(b.date));
          }
        }
      } catch (e) {}
    }
    try {
      const rawD = localStorage.getItem(this.STORAGE_KEY);
      if (rawD) {
        const obj = JSON.parse(rawD);
        if (obj && Array.isArray(obj.drafts)) {
          this.drafts = obj.drafts;
          this._draftSeq = obj.seq || (this.drafts.reduce((m,d) => Math.max(m, d.id||0), 0) + 1);
        }
      }
    } catch (e) {}
  },

  // ===================== EXPORT / IMPORT EXCEL =====================
  exportExcel() {
    if (typeof XLSX === 'undefined') return alert('Bibliothèque Excel non chargée');
    const rows = Data.journees.slice().sort((a,b) => b.date.localeCompare(a.date)).map(j => ({
      'Date':         j.date,
      'SUSHI Espèces': j.s.esp, 'SUSHI Chèque': j.s.chq, 'SUSHI Mobile': j.s.mob, 'SUSHI Crédit': j.s.cred,
      'BAR Espèces':   j.b.esp, 'BAR Chèque':   j.b.chq, 'BAR Mobile':   j.b.mob, 'BAR Crédit':   j.b.cred,
      'CHICHA Espèces':j.c.esp, 'CHICHA Chèque':j.c.chq, 'CHICHA Mobile':j.c.mob, 'CHICHA Crédit':j.c.cred,
      'Total CA':      Data.caTotal(j),
      'Saisie utilisateur': j.userRec ? '1' : '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, ...Array(13).fill({ wch: 14 }), { wch: 14 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Recettes');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `meiji-recettes-${today}.xlsx`);
  },

  importExcel(file) {
    if (typeof XLSX === 'undefined') return alert('Bibliothèque Excel non chargée');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: 0 });
        const imported = [];
        rows.forEach(r => {
          if (!r['Saisie utilisateur']) return;
          imported.push({
            id: Data.newId(),
            userRec: true,
            date: String(r['Date'] || '').slice(0, 10),
            s: { esp:+r['SUSHI Espèces']||0, chq:+r['SUSHI Chèque']||0, mob:+r['SUSHI Mobile']||0, cred:+r['SUSHI Crédit']||0 },
            b: { esp:+r['BAR Espèces']  ||0, chq:+r['BAR Chèque']  ||0, mob:+r['BAR Mobile']  ||0, cred:+r['BAR Crédit']  ||0 },
            c: { esp:+r['CHICHA Espèces']||0,chq:+r['CHICHA Chèque']||0,mob:+r['CHICHA Mobile']||0,cred:+r['CHICHA Crédit']||0 },
            ds:0, db:0, dc:0, cs:0, cb:0, cc:0,
            deps: { s:[], b:[], c:[] },
          });
        });
        if (!imported.length) {
          alert("Aucune ligne 'Saisie utilisateur' trouvée à importer.");
          return;
        }
        if (!confirm(`Importer ${imported.length} journée(s) ? Les saisies utilisateur actuelles seront remplacées.`)) return;
        Data.journees = Data.journees.filter(j => !j.userRec);
        imported.forEach(j => Data.journees.push(j));
        Data.journees.sort((a,b) => a.date.localeCompare(b.date));
        this.persistUser();
        App.renderAll();
        alert(`✅ ${imported.length} journée(s) importée(s).`);
      } catch (err) {
        alert('Erreur lors de la lecture du fichier : ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  _esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  _set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; },
};

