/**
 * fournisseurs.js — Carnet fournisseurs.
 */

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

  save() {
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
    Data.fournisseurs.unshift(f);
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

