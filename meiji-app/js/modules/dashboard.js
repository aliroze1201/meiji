/**
 * modules/dashboard.js — Tableau de bord
 */

const Dashboard = {
  render() {
    const jj = App.filterJournees();
    const label = App.getPeriodLabel();
    const pl = document.getElementById('period-label');
    if (pl) pl.textContent = label;

    const allDeps = Data.getAllDeps();
    const totCA = jj.reduce((s,j) => s + Data.caTotal(j), 0);
    const totDep = allDeps.reduce((s,d) => s + d.montant, 0);
    const net = totCA - totDep;
    const credO = Data.credits.filter(c => c.statut === 'ouvert');
    const credMnt = credO.reduce((s,c) => s + c.montant, 0);

    // KPIs
    this._set('d-ca', Data.fmt(totCA));
    this._set('d-ca-nb', jj.length + ' journée' + (jj.length > 1 ? 's' : ''));
    this._set('d-charges', Data.fmt(totDep));
    const nel = document.getElementById('d-net');
    if (nel) {
      nel.textContent = Data.fmt(net);
      nel.style.color = net >= 0 ? 'var(--c-bar)' : 'var(--c-red)';
    }
    this._set('d-cred', Data.fmt(credMnt));
    this._set('d-cred-nb', credO.length + ' client' + (credO.length > 1 ? 's' : ''));

    // Caisses
    this._setCaisse('cs', 's', jj);
    this._setCaisse('cb', 'b', jj);
    this._setCaisse('cc', 'c', jj);

    // Soldes
    this._set('d-banque', Data.fmt(Data.soldes.banque.montant));
    this._set('d-banque-date', Data.soldes.banque.date ? 'Mis à jour le ' + Data.soldes.banque.date : 'Non renseigné');
    this._set('d-mobile', Data.fmt(Data.soldes.mobile.montant));
    this._set('d-mobile-date', Data.soldes.mobile.date ? 'Mis à jour le ' + Data.soldes.mobile.date : 'Non renseigné');

    // Graphiques
    Charts.renderBarChart('bar-chart', jj);
    Charts.renderDonutCA('donut-ca', 'donut-ca-legend', jj);
    Charts.renderCompareChart('compare-chart', jj);
    Charts.renderDonutPay('donut-pay', 'donut-pay-legend', jj);
    Charts.renderProgressBars('charges-bars', allDeps);
  },

  _set(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  _setCaisse(pfx, k, jj) {
    const total = jj.reduce((s,j) => s + Data.caisse(j, k), 0);
    this._set('dash-' + pfx, Data.fmt(total));
    this._set('dash-' + pfx + '-esp', Data.fmts(jj.reduce((s,j) => s + j[k].esp, 0)) + ' FCFA');
    this._set('dash-' + pfx + '-chq', Data.fmts(jj.reduce((s,j) => s + j[k].chq, 0)) + ' FCFA');
    this._set('dash-' + pfx + '-mob', Data.fmts(jj.reduce((s,j) => s + j[k].mob, 0)) + ' FCFA');
    this._set('dash-' + pfx + '-cred', Data.fmts(jj.reduce((s,j) => s + j[k].cred, 0)) + ' FCFA');
    const last = jj[0];
    const resteKey = { cs: 'cs', cb: 'cb', cc: 'cc' }[pfx];
    this._set('dash-' + pfx + '-reste', Data.fmts(last ? (last[resteKey] || 0) : 0) + ' FCFA');
  },
};
