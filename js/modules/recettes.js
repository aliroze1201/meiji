/**
 * modules/recettes.js — Recettes CA
 */

const Recettes = {
  render() {
    const jj = App.filterJournees();
    const totS = jj.reduce((s, j) => s + Data.caisse(j, 's'), 0);
    const totB = jj.reduce((s, j) => s + Data.caisse(j, 'b'), 0);
    const totC = jj.reduce((s, j) => s + Data.caisse(j, 'c'), 0);
    const totEsp = jj.reduce((s, j) => s + j.s.esp + j.b.esp + j.c.esp, 0);
    const totChq = jj.reduce((s, j) => s + j.s.chq + j.b.chq + j.c.chq, 0);
    const totMob = jj.reduce((s, j) => s + j.s.mob + j.b.mob + j.c.mob + j.s.cred + j.b.cred + j.c.cred, 0);

    this._set('r-s', Data.fmt(totS));
    this._set('r-b', Data.fmt(totB));
    this._set('r-c', Data.fmt(totC));
    this._set('r-esp', Data.fmt(totEsp));
    this._set('r-chq', Data.fmt(totChq));
    this._set('r-mob', Data.fmt(totMob));

    const tb = document.getElementById('rec-table');
    if (!tb) return;
    if (!jj.length) { tb.innerHTML = '<tr><td colspan="6" class="empty">Aucune journée</td></tr>'; return; }
    tb.innerHTML = jj.map(j => {
      const s = Data.caisse(j, 's'), b = Data.caisse(j, 'b'), c = Data.caisse(j, 'c');
      const total = s + b + c;
      const paiements = [
        j.s.esp + j.b.esp + j.c.esp ? '💵' : '',
        j.s.chq + j.b.chq + j.c.chq ? '📄' : '',
        j.s.mob + j.b.mob + j.c.mob ? '📱' : '',
        j.s.cred + j.b.cred + j.c.cred ? '🔖' : '',
      ].filter(Boolean).join(' ');
      return `<tr>
        <td>${Data.fmtD(j.date)}</td>
        <td style="text-align:right">${Data.fmts(s)}</td>
        <td style="text-align:right">${Data.fmts(b)}</td>
        <td style="text-align:right">${Data.fmts(c)}</td>
        <td style="text-align:right;font-weight:700">${Data.fmts(total)}</td>
        <td>${paiements}</td>
      </tr>`;
    }).join('');
  },

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },
};
