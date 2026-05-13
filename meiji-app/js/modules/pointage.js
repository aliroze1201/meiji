/**
 * modules/pointage.js — Pointage de la journée (cash count) par caisse.
 *
 * Le solde espèces de chaque caisse (SUSHI, BAR, CHICHA) est cumulé jour
 * après jour à partir des « Soldes d'ouverture » (Data.fondInit). Pour
 * chaque journée et chaque caisse, on calcule :
 *   Report = solde cumulé à la fin de la veille
 *   Théorique fin de journée = Report + Espèces reçues − Dépenses espèces
 * Le caissier saisit le montant réellement compté pour faire ressortir
 * l'écart, indépendamment pour chaque caisse.
 */

const Pointage = {
  STORAGE_KEY: 'meiji-pointage',     // saisies locales (date + comptes/écarts)
  SEED_KEY:    'meiji-fond-init',    // soldes d'ouverture (Data.fondInit) — cloud

  CAISSES: [
    { k: 's', label: 'SUSHI',  icon: 'ti-fish',           color: 'var(--c-sushi)',  cls: 'blue'  },
    { k: 'b', label: 'BAR',    icon: 'ti-glass-cocktail', color: 'var(--c-bar)',    cls: 'green' },
    { k: 'c', label: 'CHICHA', icon: 'ti-flame',          color: 'var(--c-chicha)', cls: 'amber' },
  ],

  init() {
    document.getElementById('btn-pt-load')?.addEventListener('click', () => this.render());
    document.getElementById('pt-date')?.addEventListener('change', () => this.render());

    document.getElementById('btn-pt-seed-toggle')?.addEventListener('click', () => {
      const card = document.getElementById('pt-seed-card');
      if (!card) return;
      card.style.display = card.style.display === 'none' ? '' : 'none';
      if (card.style.display !== 'none') this._fillSeedForm();
    });
    document.getElementById('btn-pt-seed-save')?.addEventListener('click', () => this.saveSeed());
    document.getElementById('btn-pt-seed-auto')?.addEventListener('click', () => this.autoSeed());

    // Date par défaut = dernière journée saisie ou aujourd'hui
    const dateEl = document.getElementById('pt-date');
    if (dateEl && !dateEl.value) {
      const last = [...(Data.journees || [])].sort((a, b) => b.date.localeCompare(a.date))[0];
      dateEl.value = last ? last.date : Data.today();
    }
    this._restoreLocal();
    this.render();
  },

  // Permissions : seuls admin/responsable peuvent modifier les soldes d'ouverture.
  canEditSeed() {
    if (typeof Auth === 'undefined' || !Auth.profile) return true;
    const r = Auth.profile.role;
    return r === 'admin' || r === 'responsable';
  },

  // ===================== SEED (soldes d'ouverture) =====================
  async restore() {
    const data = await AppDB.load(this.SEED_KEY);
    if (data && typeof data === 'object') {
      Data.fondInit = {
        s: +data.s || 0,
        b: +data.b || 0,
        c: +data.c || 0,
        date: data.date || null,
      };
    }
  },

  _fillSeedForm() {
    const f = Data.fondInit || { s: 0, b: 0, c: 0, date: null };
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
    set('pt-seed-date', f.date || '');
    set('pt-seed-s', f.s || '');
    set('pt-seed-b', f.b || '');
    set('pt-seed-c', f.c || '');
    const can = this.canEditSeed();
    ['pt-seed-date', 'pt-seed-s', 'pt-seed-b', 'pt-seed-c', 'btn-pt-seed-save']
      .forEach(id => { const el = document.getElementById(id); if (el) el.disabled = !can; });
  },

  // Calcule, pour chaque caisse, le solde minimal d'ouverture qui ramène
  // tous les cumuls journaliers à zéro ou plus (= aucun jour négatif).
  // Pratique pour caler le fondInit sans connaître l'historique exact du
  // cash physiquement présent au démarrage de l'app.
  async autoSeed() {
    if (!this.canEditSeed()) {
      alert('🔒 Seul un admin ou responsable peut modifier les soldes d\'ouverture.');
      return;
    }
    // Avec la règle « reset mensuel », le fondInit ne couvre que le 1er mois
    // (mois du seed). On calcule donc le matelas minimum nécessaire pour
    // que ce mois-là ne contienne aucun cumul négatif.
    const allDates = Data._allCashDates();
    const seedDate = Data.fondInit?.date || allDates[0] || null;
    if (!seedDate) {
      alert('Aucune donnée à analyser.');
      return;
    }
    const seedMonth = seedDate.slice(0, 7);
    const monthDates = allDates.filter(d => d.slice(0, 7) === seedMonth && d >= seedDate);
    const need = { s: 0, b: 0, c: 0 };
    ['s', 'b', 'c'].forEach(k => {
      let bal = 0;
      let minBal = 0;
      monthDates.forEach(d => {
        bal += Data.cashInOnDate(d, k) - Data.cashOutOnDate(d, k);
        if (bal < minBal) minBal = bal;
      });
      need[k] = Math.max(0, -minBal);
    });
    const labels = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' };
    const monthLbl = (() => {
      const mois = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      const [y, m] = seedMonth.split('-');
      return `${mois[parseInt(m)]} ${y}`;
    })();
    const lines = [
      `Soldes d'ouverture recommandés pour le mois de ${monthLbl}`,
      '(le cumul repart à 0 le 1er de chaque mois suivant) :',
      '',
    ];
    ['s', 'b', 'c'].forEach(k => lines.push(`• ${labels[k]} : ${Data.fmt(need[k])}`));
    lines.push('', 'Appliquer ces valeurs ?');
    if (!confirm(lines.join('\n'))) return;
    Data.fondInit = {
      s: need.s, b: need.b, c: need.c,
      date: seedDate,
    };
    await AppDB.save(this.SEED_KEY, Data.fondInit);
    this._fillSeedForm();
    this.render();
    if (typeof App !== 'undefined') App.renderAll();
    alert('✅ Soldes d\'ouverture mis à jour.');
  },

  async saveSeed() {
    if (!this.canEditSeed()) {
      alert('🔒 Seul un admin ou responsable peut modifier les soldes d\'ouverture.');
      return;
    }
    const date = document.getElementById('pt-seed-date')?.value || null;
    const s = parseFloat(document.getElementById('pt-seed-s')?.value) || 0;
    const b = parseFloat(document.getElementById('pt-seed-b')?.value) || 0;
    const c = parseFloat(document.getElementById('pt-seed-c')?.value) || 0;
    Data.fondInit = { s, b, c, date };
    await AppDB.save(this.SEED_KEY, Data.fondInit);
    this.render();
    if (typeof Dashboard !== 'undefined') Dashboard.render();
    alert('✅ Soldes d\'ouverture enregistrés.');
  },

  // ===================== ÉTAT LOCAL (comptages par caisse / date) =====================
  _state: { date: '', counts: { s: '', b: '', c: '' } },

  _restoreLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object') {
        const dateEl = document.getElementById('pt-date');
        if (saved.date && dateEl) dateEl.value = saved.date;
        this._state.date = saved.date || '';
        this._state.counts = saved.counts || { s: '', b: '', c: '' };
      }
    } catch (e) { /* noop */ }
  },

  _saveLocal() {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._state)); } catch (e) {}
  },

  _onCountChange(k, val) {
    this._state.counts[k] = val;
    this._saveLocal();
    this._renderCaisse(k);
  },

  // ===================== RENDU =====================
  render() {
    const date = document.getElementById('pt-date')?.value || Data.today();
    if (this._state.date !== date) {
      // Nouvelle date sélectionnée : on remet les comptes à zéro localement
      this._state = { date, counts: { s: '', b: '', c: '' } };
      this._saveLocal();
    } else {
      this._state.date = date;
    }

    // Cartes par caisse
    const grid = document.getElementById('pt-caisses-grid');
    if (grid) grid.innerHTML = this.CAISSES.map(c => this._caisseCardHTML(c)).join('');
    this.CAISSES.forEach(c => this._renderCaisse(c.k));

    // Total global théorique
    const totTheorique = this.CAISSES.reduce((s, c) => s + Data.cashEndOfDay(date, c.k), 0);
    this._set('pt-theorique', Data.fmt(totTheorique));
    const tEl = document.getElementById('pt-theorique');
    if (tEl) tEl.style.color = totTheorique >= 0 ? 'var(--c-bar)' : 'var(--c-red)';

    // Dépenses du jour (tableau global, comme avant)
    const tbody = document.getElementById('pt-deps');
    if (tbody) {
      const all = [];
      const j = (Data.journees || []).find(x => x.date === date);
      if (j && j.deps) {
        ['s', 'b', 'c'].forEach(k => {
          const dept = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' }[k];
          (j.deps[k] || []).forEach(d => all.push({ dept, label: d.label, montant: d.montant }));
        });
      }
      (Data.histDep || []).filter(d => d.date === date).forEach(d => all.push(d));
      if (!all.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align:center;padding:16px">Aucune dépense saisie ce jour</td></tr>';
      } else {
        tbody.innerHTML = all.map(d =>
          `<tr><td>${d.dept}</td><td>${this._esc(d.label)}</td><td style="text-align:right;font-weight:600">${Data.fmt(d.montant)}</td></tr>`
        ).join('');
      }
    }
  },

  _caisseCardHTML(c) {
    return `
      <div class="card" data-caisse="${c.k}">
        <div class="card-header">
          <span class="card-title" style="color:${c.color}">
            <i class="ti ${c.icon}"></i> ${c.label}
          </span>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;row-gap:6px;column-gap:12px;font-size:13px;padding:4px 2px 12px">
          <div class="text-muted">Report (veille)</div>           <div style="text-align:right;font-weight:600"      id="pt-rep-${c.k}">0 FCFA</div>
          <div class="text-muted">+ Espèces du jour</div>          <div style="text-align:right;font-weight:600;color:var(--c-bar)" id="pt-in-${c.k}">0 FCFA</div>
          <div class="text-muted">− Dépenses espèces</div>         <div style="text-align:right;font-weight:600;color:var(--c-red)" id="pt-out-${c.k}">0 FCFA</div>
          <div style="font-weight:700;border-top:1px dashed var(--c-border);padding-top:6px">Théorique fin de journée</div>
          <div style="text-align:right;font-weight:800;font-size:16px;color:${c.color};border-top:1px dashed var(--c-border);padding-top:6px" id="pt-th-${c.k}">0 FCFA</div>
        </div>
        <div style="border-top:1px dashed var(--c-border);padding-top:12px">
          <label style="display:block;font-size:11px;color:var(--c-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;font-weight:600">💵 Espèces comptées (${c.label})</label>
          <input type="number" id="pt-cnt-${c.k}" placeholder="0"
                 style="padding:10px 12px;border-radius:8px;border:2px solid ${c.color};background:var(--c-surface);width:100%;font-size:16px;font-weight:700;text-align:right"
                 oninput="Pointage._onCountChange('${c.k}', this.value)">
          <div id="pt-ec-${c.k}" style="margin-top:10px;padding:10px;border-radius:8px;text-align:center;font-size:13px;display:none"></div>
        </div>
      </div>`;
  },

  _renderCaisse(k) {
    const date = this._state.date || document.getElementById('pt-date')?.value || Data.today();
    const report  = Data.cashCarryover(date, k);
    const espIn   = Data.cashInOnDate(date, k);
    const espOut  = Data.cashOutOnDate(date, k);
    const theo    = report + espIn - espOut;

    this._set(`pt-rep-${k}`,  Data.fmt(report));
    this._set(`pt-in-${k}`,   Data.fmt(espIn));
    this._set(`pt-out-${k}`,  Data.fmt(espOut));
    this._set(`pt-th-${k}`,   Data.fmt(theo));
    this._set(`pt-end-${k}`,  Data.fmt(theo));
    this._set(`pt-sub-${k}`,  `Report : ${Data.fmt(report)}`);

    // Restaurer la valeur comptée si déjà saisie
    const cntEl = document.getElementById(`pt-cnt-${k}`);
    if (cntEl && this._state.counts[k] !== undefined && cntEl.value !== String(this._state.counts[k])) {
      cntEl.value = this._state.counts[k] ?? '';
    }

    // Écart si comptage saisi
    const ecBox = document.getElementById(`pt-ec-${k}`);
    if (!ecBox) return;
    const cntRaw = this._state.counts[k];
    if (cntRaw === '' || cntRaw == null) { ecBox.style.display = 'none'; return; }
    const cnt = parseFloat(cntRaw);
    if (!isFinite(cnt)) { ecBox.style.display = 'none'; return; }

    const ecart = cnt - theo;
    ecBox.style.display = 'block';
    if (Math.abs(ecart) < 1) {
      ecBox.style.background = 'color-mix(in srgb, var(--c-bar) 15%, transparent)';
      ecBox.style.border = '1px solid var(--c-bar)';
      ecBox.innerHTML = `<b style="color:var(--c-bar)">✅ Caisse juste</b> — 0 FCFA d'écart`;
    } else if (ecart > 0) {
      ecBox.style.background = 'color-mix(in srgb, var(--c-amber) 15%, transparent)';
      ecBox.style.border = '1px solid var(--c-amber)';
      ecBox.innerHTML = `<b style="color:var(--c-amber)">➕ Excédent</b> de ${Data.fmt(ecart)}`;
    } else {
      ecBox.style.background = 'color-mix(in srgb, var(--c-red) 15%, transparent)';
      ecBox.style.border = '1px solid var(--c-red)';
      ecBox.innerHTML = `<b style="color:var(--c-red)">⚠️ Manque</b> de ${Data.fmt(Math.abs(ecart))}`;
    }
  },

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  _esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },
};
