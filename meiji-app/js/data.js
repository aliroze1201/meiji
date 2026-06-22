/**
 * data.js — Données globales MEIJI
 * Toutes les données partagées entre les modules
 */

const Data = {

  // ===================== JOURNÉES =====================
  journees: [
    {id:1,date:'2026-04-19',s:{esp:5646000,chq:0,mob:93500,cred:0},b:{esp:1692000,chq:0,mob:0,cred:0},c:{esp:1090000,chq:0,mob:0,cred:0},ds:5235574,db:490100,dc:0,cs:410426,cb:1201900,cc:1090000,deps:{s:[],b:[],c:[]}},
    {id:2,date:'2026-04-21',s:{esp:822500,chq:0,mob:0,cred:0},b:{esp:181000,chq:0,mob:0,cred:0},c:{esp:60000,chq:0,mob:0,cred:0},ds:407998,db:334436,dc:0,cs:824928,cb:1048464,cc:1150000,deps:{s:[],b:[],c:[]}},
    {id:3,date:'2026-04-22',s:{esp:1133500,chq:0,mob:0,cred:0},b:{esp:536000,chq:0,mob:0,cred:0},c:{esp:187500,chq:0,mob:0,cred:0},ds:1215543,db:141306,dc:0,cs:1133500,cb:536000,cc:187500,deps:{s:[],b:[],c:[]}},
    {id:4,date:'2026-04-23',s:{esp:1005500,chq:0,mob:90000,cred:0},b:{esp:284000,chq:0,mob:0,cred:0},c:{esp:75000,chq:0,mob:0,cred:0},ds:359233,db:717380,dc:0,cs:1095500,cb:284000,cc:75000,deps:{s:[],b:[],c:[]}},
    {id:5,date:'2026-04-24',s:{esp:2089950,chq:0,mob:0,cred:0},b:{esp:523400,chq:0,mob:0,cred:0},c:{esp:67500,chq:0,mob:0,cred:0},ds:1167922,db:178950,dc:0,cs:2089950,cb:523400,cc:67500,deps:{s:[],b:[],c:[]}},
    {id:6,date:'2026-04-25',s:{esp:1669000,chq:0,mob:0,cred:0},b:{esp:888400,chq:0,mob:0,cred:0},c:{esp:225000,chq:0,mob:0,cred:0},ds:420777,db:370803,dc:0,cs:1669000,cb:888400,cc:225000,deps:{s:[],b:[],c:[]}},
    {id:7,date:'2026-04-26',s:{esp:1991490,chq:0,mob:0,cred:0},b:{esp:462160,chq:0,mob:0,cred:0},c:{esp:75000,chq:0,mob:0,cred:0},ds:592000,db:591000,dc:0,cs:1991490,cb:462160,cc:75000,deps:{s:[],b:[],c:[]}},
    {id:8,date:'2026-04-28',s:{esp:1056350,chq:0,mob:0,cred:0},b:{esp:411100,chq:0,mob:0,cred:0},c:{esp:120000,chq:0,mob:0,cred:0},ds:1123345,db:375585,dc:0,cs:1056350,cb:411100,cc:120000,deps:{s:[],b:[],c:[]}},
    {id:9,date:'2026-04-29',s:{esp:1189850,chq:0,mob:24000,cred:0},b:{esp:302650,chq:0,mob:0,cred:0},c:{esp:89500,chq:0,mob:0,cred:0},ds:404400,db:134950,dc:15000,cs:1213850,cb:302650,cc:89500,deps:{s:[],b:[],c:[]}},
    {id:10,date:'2026-04-30',s:{esp:1420000,chq:0,mob:0,cred:0},b:{esp:647800,chq:0,mob:0,cred:0},c:{esp:172500,chq:0,mob:0,cred:0},ds:6275239,db:2004300,dc:0,cs:1420000,cb:647800,cc:172500,deps:{s:[],b:[],c:[]}},
    {id:11,date:'2026-05-01',s:{esp:1913850,chq:0,mob:58000,cred:0},b:{esp:642900,chq:0,mob:0,cred:0},c:{esp:180000,chq:0,mob:0,cred:0},ds:301366,db:160100,dc:0,cs:1612484,cb:482800,cc:180000,deps:{s:[],b:[],c:[]}},
    {id:12,date:'2026-05-02',s:{esp:2028620,chq:0,mob:0,cred:0},b:{esp:922000,chq:0,mob:0,cred:0},c:{esp:180000,chq:0,mob:0,cred:0},ds:758400,db:449760,dc:0,cs:2882704,cb:955040,cc:360000,deps:{s:[],b:[],c:[]}},
    {id:13,date:'2026-05-03',s:{esp:1613040,chq:0,mob:8000,cred:0},b:{esp:571740,chq:0,mob:0,cred:0},c:{esp:172500,chq:0,mob:0,cred:0},ds:363873,db:282500,dc:0,cs:1621040,cb:571740,cc:172500,deps:{s:[],b:[],c:[]}},
    {id:14,date:'2026-05-05',s:{esp:1132500,chq:0,mob:45000,cred:0},b:{esp:499500,chq:0,mob:0,cred:0},c:{esp:75000,chq:0,mob:0,cred:0},ds:1002500,db:605000,dc:0,cs:1177500,cb:499500,cc:75000,deps:{s:[],b:[],c:[]}},
  ],

  // ===================== DÉPENSES HISTORIQUES =====================
  histDep: [
    {date:'2026-04-19',dept:'SUSHI',label:'CLIMX2',montant:700000},
    {date:'2026-04-19',dept:'SUSHI',label:'REGULATEUR',montant:1250000},
    {date:'2026-04-19',dept:'SUSHI',label:'MAIN DOEUVRE MONTAGE CLIM',montant:40000},
    {date:'2026-04-19',dept:'SUSHI',label:'AVC SALIARE',montant:340000},
    {date:'2026-04-19',dept:'SUSHI',label:'VIDANGE',montant:130000},
    {date:'2026-04-19',dept:'SUSHI',label:'RATIO ELECTRICIEN',montant:100000},
    {date:'2026-04-19',dept:'SUSHI',label:'SOLDE MD PEINTRE',montant:188000},
    {date:'2026-04-19',dept:'BAR',label:'DEPENSE ALCOOL 19',montant:299000},
    {date:'2026-04-19',dept:'BAR',label:'DON JULIO BLANC X 2',montant:69000},
    {date:'2026-04-19',dept:'BAR',label:'REMISE CLIENT JO',montant:40000},
    {date:'2026-04-19',dept:'BAR',label:'ACHAT FRUIT ET LEGUME',montant:50600},
    {date:'2026-04-21',dept:'SUSHI',label:'GASOIL X3 BIDON',montant:45000},
    {date:'2026-04-21',dept:'SUSHI',label:'GALETTE DE RIZX 6',montant:24000},
    {date:'2026-04-21',dept:'SUSHI',label:'FILLET BOEUF X 3KG',montant:33585},
    {date:'2026-04-21',dept:'SUSHI',label:'BLANC POULET',montant:32700},
    {date:'2026-04-21',dept:'BAR',label:'DON JULIO BRUN X 1',montant:59500},
    {date:'2026-04-21',dept:'BAR',label:'BELL VEDERE PURE X 2',montant:46000},
    {date:'2026-04-30',dept:'SUSHI',label:'SALAIRE AVRIL 26',montant:3725000},
    {date:'2026-04-30',dept:'BAR',label:'SALAIRE AVRIL 26',montant:2425000},
    {date:'2026-04-30',dept:'SUSHI',label:'COMMUNITY MANAGEMENT',montant:125000},
    {date:'2026-04-30',dept:'BAR',label:'LOCATION LOYER',montant:525000},
    {date:'2026-05-01',dept:'SUSHI',label:'EMPLOYER CUISINIER PRIME 1ER MAI',montant:80000},
    {date:'2026-05-02',dept:'SUSHI',label:'ACHAT SAUMON FILET',montant:405825},
    {date:'2026-05-02',dept:'SUSHI',label:'ACHAT GAMBAS',montant:340000},
    {date:'2026-05-02',dept:'BAR',label:'BOISSON',montant:370000},
    {date:'2026-05-02',dept:'BAR',label:'MOET CHADON X3',montant:145500},
    {date:'2026-05-03',dept:'BAR',label:'CAVE A VIN',montant:149000},
    {date:'2026-05-05',dept:'SUSHI',label:'GAZOIL',montant:45000},
    {date:'2026-05-05',dept:'BAR',label:'ACHAT FRUIT ET LEGUME',montant:50600},
    // Avances sur salaire juin 2026
    {userId:'pay-1',date:'2026-06-18',dept:'BAR',label:'Avance BANZOUZI PRECIEUSE',groupe:'Personnel',qte:null,prix:null,montant:30000,observation:'Avance sur salaire BANZOUZI PRECIEUSE (SERVEUR)',paiement:'esp',empNom:'BANZOUZI PRECIEUSE',payType:'avance'},
    {userId:'pay-3',date:'2026-06-18',dept:'BAR',label:'Avance NGOTENI SAIRAH',groupe:'Personnel',qte:null,prix:null,montant:80000,observation:'Avance sur salaire NGOTENI SAIRAH (SERVEUR)',paiement:'esp',empNom:'NGOTENI SAIRAH',payType:'avance'},
    {userId:'pay-5',date:'2026-06-18',dept:'BAR',label:'Avance ETANIEKE SEBASTIEN',groupe:'Personnel',qte:null,prix:null,montant:150000,observation:'Avance sur salaire ETANIEKE SEBASTIEN (SERVEUR)',paiement:'esp',empNom:'ETANIEKE SEBASTIEN',payType:'avance'},
    {userId:'pay-8',date:'2026-06-18',dept:'SUSHI',label:'Avance PELITO CHRISTOPHER',groupe:'Personnel',qte:null,prix:null,montant:1280000,observation:'Avance sur salaire PELITO CHRISTOPHER (SUSHI)',paiement:'esp',empNom:'PELITO CHRISTOPHER',payType:'avance'},
    {userId:'pay-10',date:'2026-06-18',dept:'SUSHI',label:'Avance BIANG FRANCIS',groupe:'Personnel',qte:null,prix:null,montant:400000,observation:'Avance sur salaire BIANG FRANCIS (SUSHI)',paiement:'esp',empNom:'BIANG FRANCIS',payType:'avance'},
    {userId:'pay-11',date:'2026-06-18',dept:'SUSHI',label:'Avance JAMES KING',groupe:'Personnel',qte:null,prix:null,montant:200000,observation:'Avance sur salaire JAMES KING (SUSHI)',paiement:'esp',empNom:'JAMES KING',payType:'avance'},
    {userId:'pay-14',date:'2026-06-18',dept:'SUSHI',label:'Avance DIATTA RICHARD',groupe:'Personnel',qte:null,prix:null,montant:100000,observation:'Avance sur salaire DIATTA RICHARD (CUISINE)',paiement:'esp',empNom:'DIATTA RICHARD',payType:'avance'},
  ],

  // ===================== CATÉGORIES =====================
  categories: [
    {id:1001,nom:'Matières premières',type:'dep',color:'#185FA5',dept:'SUSHI',desc:'Poisson, riz, légumes...'},
    {id:1002,nom:'Boissons',type:'dep',color:'#0F6E56',dept:'BAR',desc:'Alcools, softs, vins...'},
    {id:1003,nom:'Personnel',type:'dep',color:'#A32D2D',dept:'all',desc:'Salaires, avances, primes...'},
    {id:1004,nom:'Transport',type:'dep',color:'#BA7517',dept:'all',desc:'Taxi, gazoil...'},
    {id:1005,nom:'Entretien',type:'dep',color:'#534AB7',dept:'all',desc:'Nettoyage, réparations...'},
    {id:1006,nom:'Équipement',type:'dep',color:'#3B6D11',dept:'all',desc:'Clim, matériel...'},
    {id:1007,nom:'Fournitures',type:'dep',color:'#854F0B',dept:'all',desc:'Papier, emballages...'},
    {id:1008,nom:'Commercial',type:'dep',color:'#993556',dept:'all',desc:'Offerts, remises, pub...'},
    {id:1009,nom:'Salaires',type:'dep',color:'#791F1F',dept:'all',desc:'Salaires mensuels'},
    {id:1010,nom:'Loyer',type:'dep',color:'#3C3489',dept:'all',desc:'Loyer local'},
    {id:1011,nom:'Chicha',type:'dep',color:'#BA7517',dept:'CHICHA',desc:'Dépenses chicha'},
    {id:1012,nom:'Autres',type:'dep',color:'#5F5E5A',dept:'all',desc:'Divers'},
    {id:1013,nom:'Ventes SUSHI',type:'rec',color:'#185FA5',dept:'SUSHI',desc:'CA restauration japonaise'},
    {id:1014,nom:'Ventes BAR',type:'rec',color:'#0F6E56',dept:'BAR',desc:'CA boissons et cocktails'},
    {id:1015,nom:'Ventes CHICHA',type:'rec',color:'#BA7517',dept:'CHICHA',desc:'CA chicha'},
    {id:1016,nom:'Événements',type:'rec',color:'#3C3489',dept:'all',desc:'Soirées privées'},
  ],

  // ===================== EMPLOYÉS =====================
  employes: [
    {nom:'BANZOUZI PRECIEUSE',poste:'SERVEUR',dept:'BAR',brut:100000,prime:30000,avance:30000,net:100000,paiements:[{id:'pay-1',date:'2026-06-18',montant:30000,mode:'esp',dept:'BAR',type:'avance'},{id:'pay-2',date:'2026-06-18',montant:30000,mode:'esp',dept:'BAR',type:'prime'}]},
    {nom:'NGOTENI SAIRAH',poste:'SERVEUR',dept:'BAR',brut:100000,prime:80000,avance:80000,net:100000,paiements:[{id:'pay-3',date:'2026-06-18',montant:80000,mode:'esp',dept:'BAR',type:'avance'},{id:'pay-4',date:'2026-06-18',montant:80000,mode:'esp',dept:'BAR',type:'prime'}]},
    {nom:'ITOUA SCHEKINA',poste:'SERVEUR',dept:'BAR',brut:60000,prime:0,avance:0,net:60000,paiements:[]},
    {nom:'BOCARDI FREDERIC',poste:'SERVEUR',dept:'BAR',brut:60000,prime:0,avance:0,net:60000,paiements:[]},
    {nom:'SITA ROSCA',poste:'SERVEUR',dept:'BAR',brut:60000,prime:0,avance:0,net:60000,paiements:[]},
    {nom:'ETANIEKE SEBASTIEN',poste:'SERVEUR',dept:'BAR',brut:175000,prime:150000,avance:150000,net:175000,paiements:[{id:'pay-5',date:'2026-06-18',montant:150000,mode:'esp',dept:'BAR',type:'avance'},{id:'pay-6',date:'2026-06-18',montant:150000,mode:'esp',dept:'BAR',type:'prime'}]},
    {nom:'OKOUBA REDDY',poste:'BAR',dept:'BAR',brut:300000,prime:0,avance:0,net:300000,paiements:[]},
    {nom:'TOWDAY SHING',poste:'BAR',dept:'BAR',brut:125000,prime:25000,avance:0,net:150000,paiements:[{id:'pay-7',date:'2026-06-18',montant:25000,mode:'esp',dept:'BAR',type:'prime'}]},
    {nom:'TCHISSANBO ALEX',poste:'CHICHA',dept:'CHICHA',brut:150000,prime:0,avance:0,net:150000,paiements:[]},
    {nom:'PELITO CHRISTOPHER',poste:'SUSHI',dept:'RESTAURANT',brut:1280000,prime:400000,avance:1280000,net:400000,paiements:[{id:'pay-8',date:'2026-06-18',montant:1280000,mode:'esp',dept:'SUSHI',type:'avance'},{id:'pay-9',date:'2026-06-18',montant:400000,mode:'esp',dept:'SUSHI',type:'prime'}]},
    {nom:'BIANG FRANCIS',poste:'SUSHI',dept:'RESTAURANT',brut:1400000,prime:0,avance:400000,net:1000000,paiements:[{id:'pay-10',date:'2026-06-18',montant:400000,mode:'esp',dept:'SUSHI',type:'avance'}]},
    {nom:'JAMES KING',poste:'SUSHI',dept:'RESTAURANT',brut:1045000,prime:200000,avance:200000,net:1045000,paiements:[{id:'pay-11',date:'2026-06-18',montant:200000,mode:'esp',dept:'SUSHI',type:'avance'},{id:'pay-12',date:'2026-06-18',montant:200000,mode:'esp',dept:'SUSHI',type:'prime'}]},
    {nom:'KOSSI FREITAS KEKELI',poste:'SERVEUR',dept:'RESTAURANT',brut:650000,prime:0,avance:0,net:650000,paiements:[]},
    {nom:'KHASSIM',poste:'SERVEUR',dept:'RESTAURANT',brut:500000,prime:0,avance:0,net:500000,paiements:[]},
    {nom:'BOUBACAR MBACKE',poste:'CUISINE',dept:'RESTAURANT',brut:500000,prime:100000,avance:0,net:600000,paiements:[{id:'pay-13',date:'2026-06-18',montant:100000,mode:'esp',dept:'SUSHI',type:'prime'}]},
    {nom:'DIATTA RICHARD',poste:'CUISINE',dept:'RESTAURANT',brut:250000,prime:100000,avance:100000,net:250000,paiements:[{id:'pay-14',date:'2026-06-18',montant:100000,mode:'esp',dept:'SUSHI',type:'avance'},{id:'pay-15',date:'2026-06-18',montant:100000,mode:'esp',dept:'SUSHI',type:'prime'}]},
    {nom:'MOBEY CHRIST',poste:'CUISINE',dept:'RESTAURANT',brut:110000,prime:0,avance:0,net:110000,paiements:[]},
    {nom:'LOUSSAKOU ELI',poste:'CUISINE',dept:'RESTAURANT',brut:70000,prime:0,avance:0,net:70000,paiements:[]},
    {nom:'NDAO ALIOU',poste:'SUPERVISEUR',dept:'RESTAURANT',brut:250000,prime:0,avance:0,net:250000,paiements:[]},
    {nom:'KOBOMA DJAMAL',poste:'ENTRETIEN',dept:'RESTAURANT',brut:60000,prime:0,avance:0,net:60000,paiements:[]},
    {nom:'BALENDA RICH',poste:'ENTRETIEN',dept:'RESTAURANT',brut:60000,prime:0,avance:0,net:60000,paiements:[]},
  ],

  // ===================== COMPTES EMPLOYÉS =====================
  compteEmp: {},

  // ===================== HISTORIQUE MENSUEL EMPLOYÉS =====================
  // Snapshot pris à chaque clôture du mois sur l'onglet Employés.
  // [{ ym:'YYYY-MM', closedAt, closedBy, employes:[...] }]
  empHistorique: [],

  // ===================== CRÉDITS CLIENTS =====================
  credits: [
    {id:1,date:'2026-04-19',ticket:'193',client:'RAAD',dept:'SUSHI',montant:79000,statut:'ouvert'},
    {id:2,date:'2026-04-19',ticket:'198',client:'ALI ROZE',dept:'SUSHI',montant:14500,statut:'ouvert'},
  ],

  // ===================== ASSOCIÉS =====================
  // Partage du bénéfice BAR + CHICHA entre l'utilisateur et son associé.
  // SUSHI/RESTAURANT reste 100 % à l'utilisateur, hors calcul.
  associes: [
    { id: 1, nom: 'Moi',     part: 50, actif: true },
    { id: 2, nom: 'Associé', part: 50, actif: true },
  ],

  // ===================== PRÉLÈVEMENTS (avances associés) =====================
  prelevements: [],

  // ===================== FOURNISSEURS =====================
  fournisseurs: [],
  fournisseursListe: [],

  // ===================== CHEQUES (suivi bancaire) =====================
  cheques: [],

  // ===================== BANQUE / MOBILE =====================
  soldes: {
    banque: { montant: 0, date: null },
    mobile: { montant: 0, date: null }
  },
  mvtsBanque: [],
  mvtsMobile: [],

  // ===================== LISTES DE RÉFÉRENCE =====================
  // Banques actives (utilisées comme dropdown sur les mouvements bancaires)
  banques: [],            // [{ id, nom, observation, actif }]
  // Opérateurs Mobile Money (MTN, Airtel, Orange...)
  operateursMobile: [],   // [{ id, nom, observation, actif }]

  // ===================== STOCK =====================
  stockArticles: [],
  stockMouvements: [],

  // ===================== FOND DE CAISSE INITIAL (report espèces) =====================
  // Solde d'ouverture par caisse, à partir duquel le cash se cumule jour après jour.
  // Modifiable depuis la page Pointage par admin/responsable.
  fondInit: { s: 0, b: 0, c: 0, date: null },

  // ===================== JOURNAL D'ACTIVITÉS =====================
  activityLog: [],

  // ===================== COMPTEUR ID =====================
  nextId: 2000,
  newId() { return this.nextId++; },

  // Met nextId au-dessus du plus grand id existant dans toutes les collections
  // utilisant Data.newId() (userId ou id). À appeler après restauration des
  // données depuis le serveur pour éviter les collisions d'IDs.
  bumpNextIdFromAllData() {
    let max = this.nextId - 1;
    const scan = (arr, field) => {
      if (!Array.isArray(arr)) return;
      for (const it of arr) {
        const v = it && it[field];
        if (typeof v === 'number' && v > max) max = v;
      }
    };
    scan(this.histDep, 'userId');
    scan(this.credits, 'id');
    scan(this.cheques, 'id');
    scan(this.mvtsBanque, 'id');
    scan(this.mvtsMobile, 'id');
    scan(this.employes, 'userId');
    scan(this.categories, 'id');
    scan(this.stockArticles, 'id');
    scan(this.stockMvts, 'id');
    scan(this.fournisseurs, 'id');
    scan(this.associes, 'id');
    scan(this.prelevements, 'id');
    this.nextId = max + 1;
  },

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

  // ===================== ESPÈCES — REPORT CUMULÉ PAR CAISSE =====================
  // Encaissements espèces d'une caisse sur une date.
  // Inclut aussi les retraits banque/mobile vers cette caisse (type='out',
  // caisse=k) → ils alimentent le cash de la caisse en question.
  cashInOnDate(date, k) {
    const j = this.journees.find(x => x.date === date);
    let total = j ? (j[k]?.esp || 0) : 0;
    if (Array.isArray(this.mvtsBanque)) {
      total += this.mvtsBanque
        .filter(m => m.date === date && m.type === 'out' && m.caisse === k)
        .reduce((s, m) => s + (Number(m.mnt) || 0), 0);
    }
    if (Array.isArray(this.mvtsMobile)) {
      total += this.mvtsMobile
        .filter(m => m.date === date && m.type === 'out' && m.caisse === k)
        .reduce((s, m) => s + (Number(m.mnt) || 0), 0);
    }
    // Remboursements employés en espèces vers cette caisse
    Object.values(this.compteEmp || {}).forEach(arr => {
      total += (arr || [])
        .filter(e => e.date === date && e.type === 'remb' && e.caisse === k)
        .reduce((s, e) => s + (Number(e.cred) || 0), 0);
    });
    return total;
  },
  // Dépenses espèces d'une caisse sur une date.
  // Source unique : getAllDeps() (= histDep + j.deps[]), comme le dashboard.
  // Seules les dépenses dont paiement = 'esp' (par défaut si non renseigné)
  // sont déduites du cumul cash. Les paiements banque/mobile sortent du
  // solde correspondant, pas des espèces.
  cashOutOnDate(date, k) {
    const dept = { s: 'SUSHI', b: 'BAR', c: 'CHICHA' }[k];
    let total = this.getAllDeps()
      .filter(d => d.date === date && d.dept === dept && this.isCashDep(d))
      .reduce((s, d) => s + (d.montant || 0), 0);
    // Prélèvements en espèces : si une caisse précise est renseignée sur
    // le prélèvement (p.caisse = 's'/'b'/'c'), on respecte ce choix.
    // Sinon défaut sur BAR (k === 'b') — pot commun.
    if (Array.isArray(this.prelevements)) {
      total += this.prelevements
        .filter(p => p.date === date && p.paiement === 'esp'
                  && ((p.caisse || 'b') === k))
        .reduce((s, p) => s + (Number(p.montant) || 0), 0);
    }
    // Versements cash → banque/mobile : type='in' avec caisse=k → cash sort
    if (Array.isArray(this.mvtsBanque)) {
      total += this.mvtsBanque
        .filter(m => m.date === date && m.type === 'in' && m.caisse === k)
        .reduce((s, m) => s + (Number(m.mnt) || 0), 0);
    }
    if (Array.isArray(this.mvtsMobile)) {
      total += this.mvtsMobile
        .filter(m => m.date === date && m.type === 'in' && m.caisse === k)
        .reduce((s, m) => s + (Number(m.mnt) || 0), 0);
    }
    // Prêts employés en espèces sortant de cette caisse
    Object.values(this.compteEmp || {}).forEach(arr => {
      total += (arr || [])
        .filter(e => e.date === date && e.type === 'pret' && e.caisse === k)
        .reduce((s, e) => s + (Number(e.deb) || 0), 0);
    });
    return total;
  },

  // Renvoie true si la dépense est payée en espèces.
  // Par défaut (champ paiement absent) → espèces, car à ce jour toutes les
  // dépenses du restaurant sont réglées en cash.
  isCashDep(d) {
    return !d.paiement || d.paiement === 'esp';
  },
  // Toutes les dates portant un mouvement de cash (journée, dépense histo,
  // mouvement banque/mobile lié à une caisse, ou prélèvement). Si on oublie
  // une source ici, les mouvements correspondants ne sont pas pris en compte
  // dans le cumul du jour où ils ont lieu.
  _allCashDates() {
    const set = new Set();
    (this.journees || []).forEach(j => { if (j.date) set.add(j.date); });
    (this.histDep || []).forEach(d => { if (d.date) set.add(d.date); });
    (this.mvtsBanque || []).forEach(m => { if (m.date && m.caisse) set.add(m.date); });
    (this.mvtsMobile || []).forEach(m => { if (m.date && m.caisse) set.add(m.date); });
    (this.prelevements || []).forEach(p => { if (p.date && p.paiement === 'esp') set.add(p.date); });
    Object.values(this.compteEmp || {}).forEach(arr => {
      (arr || []).forEach(e => { if (e.date && e.caisse) set.add(e.date); });
    });
    return [...set].sort();
  },
  // Solde espèces reporté au DÉBUT d'une date pour la caisse k.
  // Règle métier : le bénéfice mensuel est prélevé à la fin de chaque mois,
  // donc le cumul espèces est REMIS À ZÉRO au 1er de chaque mois. Pour une
  // date donnée, on ne cumule que les dates antérieures du MÊME mois.
  // fondInit ne s'applique qu'au mois du seed (mois d'ouverture initial).
  cashCarryover(date, k) {
    const targetMonth = (date || '').slice(0, 7);
    if (!targetMonth) return 0;
    const seedDate  = this.fondInit?.date || null;
    const seedMonth = seedDate ? seedDate.slice(0, 7) : null;

    let bal = (seedMonth === targetMonth) ? (this.fondInit?.[k] || 0) : 0;

    this._allCashDates().forEach(d => {
      if (d >= date) return;
      if (d.slice(0, 7) !== targetMonth) return;          // reset mensuel
      if (seedDate && d < seedDate) return;
      bal += this.cashInOnDate(d, k) - this.cashOutOnDate(d, k);
    });
    return bal;
  },
  // Solde espèces théorique en FIN de journée pour la caisse k
  cashEndOfDay(date, k) {
    return this.cashCarryover(date, k)
         + this.cashInOnDate(date, k)
         - this.cashOutOnDate(date, k);
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

  // ===================== Formats =====================
  // Montant. opts : { currency:true, signed:false }
  //   - currency:false   -> nombre nu (ex. fmts d'origine), retourne '0' si falsy
  //   - signed:true      -> préfixe + / − explicite
  fmt(n, opts) {
    const o = opts || {};
    const currency = o.currency !== false; // par défaut on affiche FCFA
    if (!currency && !n) return '0';
    const v = Math.round(Number(n) || 0);
    const sign = o.signed ? (v > 0 ? '+' : v < 0 ? '−' : '') : '';
    const abs = Math.abs(v).toLocaleString('fr-FR');
    return sign + (o.signed && v !== 0 ? abs : v.toLocaleString('fr-FR')) + (currency ? ' FCFA' : '');
  },
  // Alias historique : montant nu sans devise.
  fmts(n) { return Data.fmt(n, { currency: false }); },

  fmtD(d) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'}); }
    catch(e) { return d; }
  },
  fmtDs(d) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {day:'2-digit',month:'short'}); }
    catch(e) { return d; }
  },

  today() { return new Date().toISOString().split('T')[0]; },

  // Timestamp « date du jour au format fr-FR » — utilisé pour les champs
  // soldeDate des banques / mobile money.
  nowFR() { return new Date().toLocaleDateString('fr-FR'); },
};

// Initialiser les groupes des dépenses historiques
Data.histDep.forEach(d => { d.groupe = Data.getGroupe(d.label); });
