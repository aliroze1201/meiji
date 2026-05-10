/**
 * modules/pointage.js — Pointage de la journée (cash count)
 *
 * Permet de saisir une date et le fond de caisse, calcule le solde théorique
 * d'espèces qui doit se trouver en caisse, et compare avec le montant
 * physiquement compté pour faire ressortir l'écart.
 */

const Pointage = {
  STORAGE_KEY: 'meiji-pointage',

  init() {
    document.getElementById('btn-pt-load')?.addEventListener('click', () => this.render());
    document.getElementById('btn-pt-verify')?.addEventListener('click', () => this.verify());
    document.getElementById('pt-date')?.addEventListener('change', () => this.render());
    document.getElementById('pt-fond')?.addEventListener('input', () => this.render());

    // Date par défaut = dernière journée saisie ou aujourd'hui
    const dateEl = document.getElementById('pt-date');
    if (dateEl && !dateEl.value) {
      const last = [...(Data.journees || [])].sort((a, b) => b.date.localeCompare(a.date))[0];
      dateEl.value = last ? last.date : Data.today();
    }
    this.restore();
  },

  restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      const dateEl = document.getElementById('pt-date');
      if (saved.date && dateEl) dateEl.value = saved.date;
      const fondEl = document.getElementById('pt-fond');
      if (saved.fond != null && fondEl) fondEl.value = saved.fond;
    } catch (e) { /* noop */ }
    this.render();
  },

  save(extra = {}) {
    const date = document.getElementById('pt-date')?.value || '';
    const fond = parseFloat(document.getElementById('pt-fond')?.value) || 0;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ date, fond, ...extra }));
  },

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  render() {
    const date = document.getElementById('pt-date')?.value;
    const fond = parseFloat(document.getElementById('pt-fond')?.value) || 0;
    const j = (Data.journees || []).find(x => x.date === date);

    const espS = j ? (j.s.esp || 0) : 0;
    const espB = j ? (j.b.esp || 0) : 0;
    const espC = j ? (j.c.esp || 0) : 0;
    const espTot = espS + espB + espC;
    const dep = j ? ((j.ds || 0) + (j.db || 0) + (j.dc || 0)) : 0;
    const theorique = fond + espTot - dep;

    this._set('pt-esp-s', Data.fmt(espS));
    this._set('pt-esp-b', Data.fmt(espB));
    this._set('pt-esp-c', Data.fmt(espC));
    this._set('pt-esp-tot', Data.fmt(espTot));
    this._set('pt-dep', Data.fmt(dep));
    this._set('pt-fond-disp', Data.fmt(fond));
    this._set('pt-theorique', Data.fmt(theorique));

    const tbody = document.getElementById('pt-deps');
    if (tbody) {
      const all = [];
      if (j && j.deps) {
        ['s', 'b', 'c'].forEach(k => {
          const dept = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' }[k];
          (j.deps[k] || []).forEach(d => all.push({ dept, label: d.label, montant: d.montant }));
        });
      }
      if (Data.histDep) {
        Data.histDep.filter(d => d.date === date).forEach(d => all.push(d));
      }
      if (all.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align:center;padding:16px">Aucune dépense saisie ce jour</td></tr>';
      } else {
        tbody.innerHTML = all.map(d =>
          `<tr><td>${d.dept}</td><td>${d.label}</td><td style="text-align:right;font-weight:600">${Data.fmt(d.montant)}</td></tr>`
        ).join('');
      }
    }

    this.save();

    // Si on a déjà compté, recalculer l'écart
    const compteEl = document.getElementById('pt-compte');
    if (compteEl && compteEl.value) this.verify();
  },

  verify() {
    const compte = parseFloat(document.getElementById('pt-compte')?.value);
    const result = document.getElementById('pt-result');
    if (isNaN(compte) || !result) return;

    const theoriqueText = document.getElementById('pt-theorique')?.textContent || '0';
    const theorique = parseFloat(theoriqueText.replace(/[^\d-]/g, '')) || 0;
    const ecart = compte - theorique;

    result.style.display = 'block';
    const label = document.getElementById('pt-result-label');
    const amount = document.getElementById('pt-result-amount');
    const msg = document.getElementById('pt-result-msg');

    if (Math.abs(ecart) < 1) {
      result.style.background = 'color-mix(in srgb, var(--c-bar) 15%, transparent)';
      result.style.border = '1px solid var(--c-bar)';
      if (label) { label.textContent = '✅ Caisse juste'; label.style.color = 'var(--c-bar)'; }
      if (amount) { amount.textContent = '0 FCFA d\'écart'; amount.style.color = 'var(--c-bar)'; }
      if (msg) msg.textContent = 'Le montant compté correspond exactement au solde théorique.';
    } else if (ecart > 0) {
      result.style.background = 'color-mix(in srgb, var(--c-amber) 15%, transparent)';
      result.style.border = '1px solid var(--c-amber)';
      if (label) { label.textContent = '➕ Excédent en caisse'; label.style.color = 'var(--c-amber)'; }
      if (amount) { amount.textContent = '+' + Data.fmt(ecart); amount.style.color = 'var(--c-amber)'; }
      if (msg) msg.textContent = 'Vous avez ' + Data.fmt(ecart) + ' de plus que le solde théorique.';
    } else {
      result.style.background = 'color-mix(in srgb, var(--c-red) 15%, transparent)';
      result.style.border = '1px solid var(--c-red)';
      if (label) { label.textContent = '⚠️ Manque en caisse'; label.style.color = 'var(--c-red)'; }
      if (amount) { amount.textContent = Data.fmt(ecart); amount.style.color = 'var(--c-red)'; }
      if (msg) msg.textContent = 'Il manque ' + Data.fmt(Math.abs(ecart)) + ' par rapport au solde théorique.';
    }

    this.save({ compte, ecart });
  },
};
