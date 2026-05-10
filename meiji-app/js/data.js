/**
 * data.js — Données globales MEIJI
 * Toutes les données partagées entre les modules
 */

const Data = {

  // ===================== JOURNÉES =====================
  journees: [
    {id:1,date:'2026-05-01',s:{esp:1971850,chq:0,mob:58000,cred:0},b:{esp:642900,chq:0,mob:0,cred:0},c:{esp:180000,chq:0,mob:0,cred:0},ds:301366,db:160100,dc:0,cs:1612484,cb:482800,cc:180000,deps:{s:[{label:'dep total',montant:221366},{label:'employer cuisinier prime 1er mai',montant:80000}],b:[{label:'dep total',montant:60100},{label:'paiement jour ferirer 1er mai',montant:100000}],c:[]}},
    {id:2,date:'2026-05-02',s:{esp:2028620,chq:0,mob:0,cred:0},b:{esp:922000,chq:0,mob:0,cred:0},c:{esp:180000,chq:0,mob:0,cred:0},ds:758400,db:449760,dc:0,cs:2882704,cb:955040,cc:360000,deps:{s:[{label:'TOTAL DEP CUISINE',montant:670000},{label:'KOSSI',montant:8000},{label:'GAZOIL',montant:5000},{label:'FOURNITURE DE BUREAU',montant:25400},{label:'RETOUR CLIENT',montant:50000}],b:[{label:'TOTAL DEP',montant:449760}],c:[]}},
    {id:3,date:'2026-05-03',s:{esp:1621040,chq:0,mob:0,cred:0},b:{esp:571740,chq:0,mob:8000,cred:0},c:{esp:172500,chq:0,mob:0,cred:0},ds:363873,db:282500,dc:0,cs:4139871,cb:1236280,cc:532500,deps:{s:[{label:'dep total',montant:258873},{label:'offert client',montant:5000},{label:'AVC SALAIRE AVRIL INFOGRAPHE',montant:100000}],b:[{label:'dep total bar',montant:262500},{label:'CARBURANT',montant:20000}],c:[]}},
    {id:4,date:'2026-05-05',s:{esp:1177500,chq:0,mob:45000,cred:0},b:{esp:499500,chq:0,mob:0,cred:100000},c:{esp:75000,chq:0,mob:0,cred:0},ds:1002500,db:605000,dc:0,cs:4269871,cb:1030780,cc:607500,deps:{s:[{label:'depense sushi',montant:930000},{label:'depense moustapha',montant:54000},{label:'carnet de bon',montant:10000},{label:'perte client',montant:8500}],b:[{label:'depense bar',montant:520000},{label:'offert client',montant:4000},{label:'main doeuvre',montant:25000},{label:'plomberie',montant:38000},{label:'carnet de bon',montant:10000},{label:'offert client',montant:8000}],c:[]}},
    {id:5,date:'2026-05-06',s:{esp:1692960,chq:0,mob:18500,cred:0},b:{esp:737790,chq:0,mob:0,cred:0},c:{esp:164250,chq:0,mob:0,cred:0},ds:500823,db:312000,dc:60000,cs:5443508,cb:1456570,cc:711750,deps:{s:[{label:'depense tot sushi',montant:266823},{label:'achat carotte',montant:10000},{label:'administration police brazza',montant:50000},{label:'sejour chris',montant:75000},{label:'medicament ndaw',montant:5000},{label:'offert client',montant:2000},{label:'depense perso moustapha celio',montant:92000}],b:[{label:'depense bar',montant:200000},{label:'transport employe',montant:30000},{label:'offert client',montant:7000},{label:'infographe',montant:75000}],c:[{label:'achat tabac',montant:60000}]}},
    {id:6,date:'2026-05-07',s:{esp:1177000,chq:0,mob:12000,cred:0},b:{esp:438000,chq:0,mob:0,cred:0},c:{esp:142500,chq:0,mob:0,cred:0},ds:1027260,db:315000,dc:0,cs:5581248,cb:1679570,cc:854250,deps:{s:[{label:'depense sushi',montant:474260},{label:'offert client',montant:13000},{label:'carte de sejou',montant:520000},{label:'Divers',montant:20000}],b:[{label:'depense bar',montant:290000},{label:'offert client',montant:12000},{label:'taxi',montant:11000},{label:'ofert client',montant:2000}],c:[]}},
    {id:7,date:'2026-05-08',s:{esp:2474470,chq:0,mob:0,cred:240000},b:{esp:764000,chq:0,mob:0,cred:0},c:{esp:180300,chq:0,mob:0,cred:0},ds:894000,db:510500,dc:200000,cs:6921718,cb:1933070,cc:834550,deps:{s:[{label:'depense sushi',montant:640000},{label:'achat tenu philipine',montant:100000},{label:'achat petit dej employe',montant:46000},{label:'offert client',montant:18500},{label:'depense diver cable + porte qrcode',montant:50000},{label:'transport technicien',montant:10000},{label:'offert client',montant:9500},{label:'logiciel',montant:20000}],b:[{label:'achat 2 ventillo + baffle',montant:290000},{label:'transport personnelle',montant:20000},{label:'depense bar',montant:180000},{label:'offert client',montant:4000},{label:'transport',montant:16500}],c:[{label:'achat tabac',montant:200000}]}},
    {id:8,date:'2026-05-09',s:{esp:2483410,chq:0,mob:91700,cred:0},b:{esp:909510,chq:0,mob:0,cred:0},c:{esp:142650,chq:0,mob:0,cred:0},ds:675000,db:243500,dc:0,cs:8638428,cb:2599080,cc:977200,deps:{s:[{label:'tot dep (achat saumon)',montant:585000},{label:'taxi emp cuisine',montant:15000},{label:'billet avion christ',montant:45000},{label:'offert client',montant:2000},{label:'offert client',montant:28000}],b:[{label:'taxi serveuse et bar',montant:30000},{label:'logement christ info',montant:30000},{label:'dep bar',montant:183500}],c:[]}},
  ],

  // ===================== DÉPENSES HISTORIQUES =====================
  histDep: [],

  // ===================== CATÉGORIES =====================
  categories: [
    {id:1,nom:'Matières premières',type:'dep',color:'#185FA5',dept:'SUSHI',desc:'Poisson, riz, légumes...'},
    {id:2,nom:'Boissons',type:'dep',color:'#0F6E56',dept:'BAR',desc:'Alcools, softs, vins...'},
    {id:3,nom:'Personnel',type:'dep',color:'#A32D2D',dept:'all',desc:'Salaires, avances, primes...'},
    {id:4,nom:'Transport',type:'dep',color:'#BA7517',dept:'all',desc:'Taxi, gazoil...'},
    {id:5,nom:'Entretien',type:'dep',color:'#534AB7',dept:'all',desc:'Nettoyage, réparations...'},
    {id:6,nom:'Équipement',type:'dep',color:'#3B6D11',dept:'all',desc:'Clim, matériel...'},
    {id:7,nom:'Fournitures',type:'dep',color:'#854F0B',dept:'all',desc:'Papier, emballages...'},
    {id:8,nom:'Commercial',type:'dep',color:'#993556',dept:'all',desc:'Offerts, remises, pub...'},
    {id:9,nom:'Salaires',type:'dep',color:'#791F1F',dept:'all',desc:'Salaires mensuels'},
    {id:10,nom:'Loyer',type:'dep',color:'#3C3489',dept:'all',desc:'Loyer local'},
    {id:11,nom:'Chicha',type:'dep',color:'#BA7517',dept:'CHICHA',desc:'Dépenses chicha'},
    {id:12,nom:'Autres',type:'dep',color:'#5F5E5A',dept:'all',desc:'Divers'},
    {id:13,nom:'Ventes SUSHI',type:'rec',color:'#185FA5',dept:'SUSHI',desc:'CA restauration japonaise'},
    {id:14,nom:'Ventes BAR',type:'rec',color:'#0F6E56',dept:'BAR',desc:'CA boissons et cocktails'},
    {id:15,nom:'Ventes CHICHA',type:'rec',color:'#BA7517',dept:'CHICHA',desc:'CA chicha'},
    {id:16,nom:'Événements',type:'rec',color:'#3C3489',dept:'all',desc:'Soirées privées'},
  ],

  // ===================== EMPLOYÉS =====================
  employes: [
    {nom:'BANZOUZI PRECIEUSE',poste:'SERVEUR',dept:'BAR',brut:100000,prime:0,avance:0,net:100000},
    {nom:'NGOTENI SAIRAH',poste:'SERVEUR',dept:'BAR',brut:100000,prime:0,avance:0,net:100000},
    {nom:'ITOUA SCHEKINA',poste:'SERVEUR',dept:'BAR',brut:60000,prime:0,avance:0,net:60000},
    {nom:'BOCARDI FREDERIC',poste:'SERVEUR',dept:'BAR',brut:60000,prime:0,avance:0,net:60000},
    {nom:'SITA ROSCA',poste:'SERVEUR',dept:'BAR',brut:60000,prime:0,avance:0,net:60000},
    {nom:'ETANIEKE SEBASTIEN',poste:'SERVEUR',dept:'BAR',brut:175000,prime:0,avance:0,net:175000},
    {nom:'OKOUBA REDDY',poste:'BAR',dept:'BAR',brut:300000,prime:0,avance:0,net:300000},
    {nom:'TOWDAY SHING',poste:'BAR',dept:'BAR',brut:125000,prime:0,avance:0,net:125000},
    {nom:'TCHISSANBO ALEX',poste:'CHICHA',dept:'CHICHA',brut:150000,prime:0,avance:0,net:150000},
    {nom:'PELITO CHRISTOPHER',poste:'SUSHI',dept:'RESTAURANT',brut:1280000,prime:0,avance:0,net:1280000},
    {nom:'BIANG FRANCIS',poste:'SUSHI',dept:'RESTAURANT',brut:1400000,prime:0,avance:0,net:1400000},
    {nom:'JAMES KING',poste:'SUSHI',dept:'RESTAURANT',brut:1045000,prime:0,avance:0,net:1045000},
    {nom:'KOSSI FREITAS KEKELI',poste:'SERVEUR',dept:'RESTAURANT',brut:650000,prime:0,avance:0,net:650000},
    {nom:'KHASSIM',poste:'SERVEUR',dept:'RESTAURANT',brut:500000,prime:0,avance:0,net:500000},
    {nom:'BOUBACAR MBACKE',poste:'CUISINE',dept:'RESTAURANT',brut:500000,prime:0,avance:0,net:500000},
    {nom:'DIATTA RICHARD',poste:'CUISINE',dept:'RESTAURANT',brut:250000,prime:0,avance:0,net:250000},
    {nom:'MOBEY CHRIST',poste:'CUISINE',dept:'RESTAURANT',brut:110000,prime:0,avance:0,net:110000},
    {nom:'LOUSSAKOU ELI',poste:'CUISINE',dept:'RESTAURANT',brut:70000,prime:0,avance:0,net:70000},
    {nom:'NDAO ALIOU',poste:'SUPERVISEUR',dept:'RESTAURANT',brut:250000,prime:0,avance:0,net:250000},
    {nom:'KOBOMA DJAMAL',poste:'ENTRETIEN',dept:'RESTAURANT',brut:60000,prime:0,avance:0,net:60000},
    {nom:'BALENDA RICH',poste:'ENTRETIEN',dept:'RESTAURANT',brut:60000,prime:0,avance:0,net:60000},
  ],

  // ===================== COMPTES EMPLOYÉS =====================
  compteEmp: { CHRIST: [], FRANCIS: [], KING: [] },

  // ===================== CRÉDITS CLIENTS =====================
  credits: [
    {id:1,date:'2026-05-05',ticket:'65063725',client:'NANCY',dept:'BAR',montant:100000,statut:'ouvert'},
    {id:2,date:'2026-05-08',ticket:'1188',client:'RAAD',dept:'SUSHI',montant:240000,statut:'ouvert'},
  ],

  // ===================== FOURNISSEURS =====================
  fournisseurs: [],

  // ===================== CHEQUES (suivi bancaire) =====================
  cheques: [],

  // ===================== BANQUE / MOBILE =====================
  soldes: {
    banque: { montant: 0, date: null },
    mobile: { montant: 0, date: null }
  },
  mvtsBanque: [],
  mvtsMobile: [],

  // ===================== COMPTEUR ID =====================
  nextId: 1000,
  newId() { return this.nextId++; },

  // ===================== HELPERS =====================
  caisse(j, k) {
    const d = j[k];
    return (d.esp || 0) + (d.chq || 0) + (d.mob || 0) + (d.cred || 0);
  },

  caTotal(j) {
    return this.caisse(j, 's') + this.caisse(j, 'b') + this.caisse(j, 'c');
  },

  depTotal(j) {
    return (j.ds || 0) + (j.db || 0) + (j.dc || 0);
  },

  getAllDeps() {
    const all = this.histDep.map(d => ({ ...d }));
    this.journees.forEach(j => {
      if (!j.deps) return;
      ['s', 'b', 'c'].forEach(dk => {
        const dept = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' }[dk];
        (j.deps[dk] || []).forEach(d => all.push({
          date: j.date, dept, label: d.label, groupe: d.groupe, montant: d.montant
        }));
      });
    });
    return all;
  },

  getGroupe(label) {
    const u = label.toUpperCase();
    const G = {
      'Matières premières': ['SAUMON','GAMBAS','VIANDE','POULET','BOEUF','POISSON','CREVETTE','THON','LANGOUSTE','LEGUME','LÉGUME','LÉGUMES','CAROTTE','LAITUE','SALADE','ICEBERG','CHAMPIGNON','AVOCAT','OIGNON','AIL','RIZ','GALETTE','UDON','FARINE','SUCRE','VINAIGRE','SOY','SOJA','SAUCE','CHILI','HUILE','BEURRE','LAIT','KIRI','MOZZARELLA','FROMAGE','PANKO','ARACHIDE','VERMICELLE','HONDASHI','FILET','FILLET'],
      'Boissons': ['ALCOOL','BOISSON','PERRIER','COCA','SPRITE','REDBULL','RED BULL','DON JULIO','MOET','CHAMPAGNE','HENNESSY','PROSECCO','VODKA','VOTCKA','BACARDI','AMEROTTO','BELVEDERE','PORTO','MOUTON','SANCERRE','SAUVIGNON','JUS','PASSION','FRAISE','SIROP','CREME DE','CITRON','ANANAS','FRUIT','GINGEMBRE','MENTHE','CAVE A VIN','NESPRESSO'],
      'Personnel': ['SALAIRE','AVANCE','AVC SALI','JOURNALIER','OVERTIME','SERVEUSE','BARMAN','CHICHAMAN','MOUSTAPHA','PRIME','RATION','MOMO','KOSSI','PERSONNEL','1ER MAI'],
      'Transport': ['TRANSPORT','TAXI','KAVAKI','GAZOIL','GASOIL','CARBURANT','VIDANGE','GRAISSE'],
      'Entretien': ['ENTRETIEN','PLOMBERIE','ELECTRICIEN','PEINTRE','LIQUIDE VAISSELLE','JAVEL','SAC POUBELLE','GANT','GLACON','GLAÇON'],
      'Équipement': ['CLIM','CLIMATISEUR','REGULATEUR','HISTER','MAIN DOEUVRE','BUROTOP','KIT CLIM','TECH'],
      'Fournitures': ['PAPIER','SOPALIN','RAMETTE','EMBALLAGE','BOL','CUILL','PAILLE','ASSIETTE','CARNET','FOURNITURE'],
      'Commercial': ['OFFERT','REMISE','RETOUR CLIENT','COMMUNITY MANAGEMENT','INFOGRAPHE','PORTABLE'],
      'Salaires': ['SALAIRE AVRIL'],
      'Loyer': ['LOYER','LOCATION'],
      'Chicha': ['CHICHA','SHISHA'],
    };
    for (const g in G) {
      if (G[g].some(k => u.includes(k))) return g;
    }
    return 'Autres';
  },

  getCatColors() {
    const map = {};
    this.categories.forEach(c => map[c.nom] = c.color);
    return map;
  },

  // Formats
  fmt(n) { return Math.round(n).toLocaleString('fr-FR') + ' FCFA'; },
  fmts(n) { return n ? Math.round(n).toLocaleString('fr-FR') : '0'; },
  fmtD(d) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'}); }
    catch(e) { return d; }
  },
  fmtDs(d) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {day:'2-digit',month:'short'}); }
    catch(e) { return d; }
  },

  today() { return new Date().toISOString().split('T')[0]; },
};

// Initialiser les groupes des dépenses historiques
Data.histDep.forEach(d => { d.groupe = Data.getGroupe(d.label); });
