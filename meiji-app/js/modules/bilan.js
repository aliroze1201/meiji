/**
 * bilan.js — Bilan comptable.
 */

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

    const masse = (Data.employes || []).reduce((s, e) => s + (Number(e.net) || 0), 0);
    const salEl = document.getElementById('bi-salaires');
    if (salEl) salEl.textContent = Data.fmt(masse) + ' FCFA';

    const rnel = document.getElementById('bi-rn');
    if (rnel) { rnel.textContent = Data.fmt(rn); rnel.style.color = rn >= 0 ? '#0F6E56' : '#A32D2D'; }
  },
};
