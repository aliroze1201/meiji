/**
 * store.js — Couche de persistance Supabase pour MEIJI
 *
 * Remplace le localStorage pour les modules Journées / Dépenses / Crédits.
 * Toutes les méthodes sont async. Auth doit être initialisé avant.
 */

const Store = {
  client: null,
  ready: false,

  init() {
    if (typeof Auth === 'undefined' || !Auth.client) {
      console.warn('Store: Auth non initialisé — fallback en mode local');
      return false;
    }
    this.client = Auth.client;
    this.ready = true;
    return true;
  },

  // =====================================================================
  // JOURNÉES
  // =====================================================================
  async loadJournees() {
    const { data, error } = await this.client
      .from('meiji_journees').select('*').order('date');
    if (error) throw error;
    return (data || []).map(this._jFromDb);
  },

  async upsertJournee(j) {
    const row = this._jToDb(j);
    const { data, error } = await this.client
      .from('meiji_journees').upsert(row, { onConflict: 'date' })
      .select().single();
    if (error) throw error;
    return this._jFromDb(data);
  },

  async deleteJournee(id) {
    const { error } = await this.client
      .from('meiji_journees').delete().eq('id', id);
    if (error) throw error;
  },

  _jToDb(j) {
    const row = {
      date: j.date,
      s_esp: j.s.esp||0, s_chq: j.s.chq||0, s_mob: j.s.mob||0, s_cred: j.s.cred||0,
      b_esp: j.b.esp||0, b_chq: j.b.chq||0, b_mob: j.b.mob||0, b_cred: j.b.cred||0,
      c_esp: j.c.esp||0, c_chq: j.c.chq||0, c_mob: j.c.mob||0, c_cred: j.c.cred||0,
      ds: j.ds||0, db: j.db||0, dc: j.dc||0,
      cs: j.cs||0, cb: j.cb||0, cc: j.cc||0,
      deps: j.deps || {s:[],b:[],c:[]},
      updated_at: new Date().toISOString(),
    };
    return row;
  },

  _jFromDb(r) {
    return {
      id: r.id,
      date: r.date,
      s: { esp: r.s_esp||0, chq: r.s_chq||0, mob: r.s_mob||0, cred: r.s_cred||0 },
      b: { esp: r.b_esp||0, chq: r.b_chq||0, mob: r.b_mob||0, cred: r.b_cred||0 },
      c: { esp: r.c_esp||0, chq: r.c_chq||0, mob: r.c_mob||0, cred: r.c_cred||0 },
      ds: r.ds||0, db: r.db||0, dc: r.dc||0,
      cs: r.cs||0, cb: r.cb||0, cc: r.cc||0,
      deps: r.deps || {s:[],b:[],c:[]},
    };
  },

  // =====================================================================
  // DÉPENSES libres
  // =====================================================================
  async loadDepenses() {
    const { data, error } = await this.client
      .from('meiji_depenses').select('*').order('date');
    if (error) throw error;
    return (data || []).map(this._dFromDb);
  },

  async insertDepense(d) {
    const { data, error } = await this.client
      .from('meiji_depenses').insert(this._dToDb(d)).select().single();
    if (error) throw error;
    return this._dFromDb(data);
  },

  async updateDepense(id, d) {
    const { data, error } = await this.client
      .from('meiji_depenses').update(this._dToDb(d)).eq('id', id)
      .select().single();
    if (error) throw error;
    return this._dFromDb(data);
  },

  async deleteDepense(id) {
    const { error } = await this.client
      .from('meiji_depenses').delete().eq('id', id);
    if (error) throw error;
  },

  _dToDb(d) {
    return {
      date: d.date,
      dept: d.dept,
      label: d.label || null,
      groupe: d.groupe || null,
      qte: d.qte != null && d.qte !== '' ? Number(d.qte) : null,
      prix: d.prix != null && d.prix !== '' ? Number(d.prix) : null,
      montant: Math.round(Number(d.montant) || 0),
      observation: d.observation || null,
    };
  },

  _dFromDb(r) {
    return {
      userId: r.id,
      id: r.id,
      date: r.date,
      dept: r.dept,
      label: r.label,
      groupe: r.groupe || r.label,
      qte: r.qte,
      prix: r.prix,
      montant: r.montant,
      observation: r.observation,
    };
  },

  // =====================================================================
  // CRÉDITS clients
  // =====================================================================
  async loadCredits() {
    const { data, error } = await this.client
      .from('meiji_credits').select('*').order('date');
    if (error) throw error;
    return (data || []).map(this._cFromDb);
  },

  async insertCredit(c) {
    const { data, error } = await this.client
      .from('meiji_credits').insert(this._cToDb(c)).select().single();
    if (error) throw error;
    return this._cFromDb(data);
  },

  async updateCredit(id, c) {
    const { data, error } = await this.client
      .from('meiji_credits').update(this._cToDb(c)).eq('id', id)
      .select().single();
    if (error) throw error;
    return this._cFromDb(data);
  },

  async deleteCredit(id) {
    const { error } = await this.client
      .from('meiji_credits').delete().eq('id', id);
    if (error) throw error;
  },

  _cToDb(c) {
    return {
      date: c.date,
      ticket: c.ticket || null,
      client: c.client,
      dept: c.dept,
      montant: Math.round(Number(c.montant) || 0),
      statut: c.statut || 'ouvert',
      date_reg: c.dateReg || null,
      mode_reg: c.modeReg || null,
    };
  },

  _cFromDb(r) {
    return {
      id: r.id,
      date: r.date,
      ticket: r.ticket,
      client: r.client,
      dept: r.dept,
      montant: r.montant,
      statut: r.statut,
      dateReg: r.date_reg,
      modeReg: r.mode_reg,
    };
  },

  // =====================================================================
  // EMPLOYÉS
  // =====================================================================
  async loadEmployes() {
    const { data, error } = await this.client
      .from('meiji_employes').select('*').order('id');
    if (error) throw error;
    return (data || []).map(this._eFromDb);
  },
  async insertEmploye(e) {
    const { data, error } = await this.client
      .from('meiji_employes').insert(this._eToDb(e)).select().single();
    if (error) throw error;
    return this._eFromDb(data);
  },
  async updateEmploye(id, e) {
    const { data, error } = await this.client
      .from('meiji_employes').update(this._eToDb(e)).eq('id', id).select().single();
    if (error) throw error;
    return this._eFromDb(data);
  },
  async deleteEmploye(id) {
    const { error } = await this.client.from('meiji_employes').delete().eq('id', id);
    if (error) throw error;
  },
  _eToDb(e) { return { nom: e.nom, poste: e.poste||null, dept: e.dept||null, brut: e.brut||0, prime: e.prime||0, avance: e.avance||0, net: e.net||0 }; },
  _eFromDb(r) { return { id: r.id, nom: r.nom, poste: r.poste, dept: r.dept, brut: r.brut, prime: r.prime, avance: r.avance, net: r.net }; },

  // =====================================================================
  // CHÈQUES
  // =====================================================================
  async loadCheques() {
    const { data, error } = await this.client
      .from('meiji_cheques').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(this._chFromDb);
  },
  async insertCheque(c) {
    const { data, error } = await this.client
      .from('meiji_cheques').insert(this._chToDb(c)).select().single();
    if (error) throw error;
    return this._chFromDb(data);
  },
  async updateCheque(id, c) {
    const { data, error } = await this.client
      .from('meiji_cheques').update(this._chToDb(c)).eq('id', id).select().single();
    if (error) throw error;
    return this._chFromDb(data);
  },
  async deleteCheque(id) {
    const { error } = await this.client.from('meiji_cheques').delete().eq('id', id);
    if (error) throw error;
  },
  _chToDb(c) {
    return {
      date: c.date || null, dept: c.dept || null,
      numero: c.numero || null, banque: c.banque || null,
      tireur: c.tireur || null, montant: c.montant || 0,
      notes: c.notes || null,
      statut: c.statut || 'attente',
      date_depot: c.dateDepot || null,
      date_encaissement: c.dateEncaissement || null,
    };
  },
  _chFromDb(r) {
    return {
      id: r.id, date: r.date, dept: r.dept,
      numero: r.numero, banque: r.banque, tireur: r.tireur,
      montant: r.montant, notes: r.notes,
      statut: r.statut, dateDepot: r.date_depot, dateEncaissement: r.date_encaissement,
    };
  },

  // =====================================================================
  // SOLDES (banque / mobile) + MOUVEMENTS
  // =====================================================================
  async loadSoldes() {
    const { data, error } = await this.client.from('meiji_solde').select('*');
    if (error) throw error;
    const out = { banque: { montant: 0, date: null }, mobile: { montant: 0, date: null } };
    (data || []).forEach(r => { out[r.type] = { montant: r.montant, date: r.date_str }; });
    return out;
  },
  async upsertSolde(type, montant, dateStr) {
    const { error } = await this.client.from('meiji_solde')
      .upsert({ type, montant, date_str: dateStr, updated_at: new Date().toISOString() }, { onConflict: 'type' });
    if (error) throw error;
  },
  async loadMvts(type) {
    const { data, error } = await this.client.from('meiji_mvts')
      .select('*').eq('type', type).order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(this._mvFromDb);
  },
  async insertMvt(type, m) {
    const row = this._mvToDb(type, m);
    const { data, error } = await this.client.from('meiji_mvts')
      .insert(row).select().single();
    if (error) throw error;
    return this._mvFromDb(data);
  },
  async deleteMvt(id) {
    const { error } = await this.client.from('meiji_mvts').delete().eq('id', id);
    if (error) throw error;
  },
  _mvToDb(type, m) {
    return {
      type, date: m.date || null, lib: m.lib || null, op: m.op || null,
      mnt: m.mnt || 0, mvt_type: m.type, ref: m.ref || null,
    };
  },
  _mvFromDb(r) {
    return { id: r.id, date: r.date, lib: r.lib, op: r.op, mnt: r.mnt, type: r.mvt_type, ref: r.ref };
  },

  // =====================================================================
  // FOURNISSEURS
  // =====================================================================
  async loadFournisseurs() {
    const { data, error } = await this.client
      .from('meiji_fournisseurs').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(this._fFromDb);
  },
  async insertFournisseur(f) {
    const { data, error } = await this.client
      .from('meiji_fournisseurs').insert(this._fToDb(f)).select().single();
    if (error) throw error;
    return this._fFromDb(data);
  },
  async deleteFournisseur(id) {
    const { error } = await this.client.from('meiji_fournisseurs').delete().eq('id', id);
    if (error) throw error;
  },
  _fToDb(f) {
    return {
      date: f.date || null, four: f.four || null, num: f.num || null,
      ech: f.ech || null, lib: f.lib || null,
      deb: f.deb || 0, cred: f.cred || 0, solde: f.solde || 0,
      obs: f.obs || null,
    };
  },
  _fFromDb(r) {
    return {
      id: r.id, date: r.date, four: r.four, num: r.num, ech: r.ech, lib: r.lib,
      deb: r.deb, cred: r.cred, solde: r.solde, obs: r.obs,
    };
  },

  // =====================================================================
  // CATÉGORIES
  // =====================================================================
  async loadCategories() {
    const { data, error } = await this.client.from('meiji_categories').select('*').order('id');
    if (error) throw error;
    return (data || []).map(this._catFromDb);
  },
  async insertCategorie(c) {
    const { data, error } = await this.client.from('meiji_categories')
      .insert(this._catToDb(c)).select().single();
    if (error) throw error;
    return this._catFromDb(data);
  },
  async updateCategorie(id, c) {
    const { data, error } = await this.client.from('meiji_categories')
      .update(this._catToDb(c)).eq('id', id).select().single();
    if (error) throw error;
    return this._catFromDb(data);
  },
  async deleteCategorie(id) {
    const { error } = await this.client.from('meiji_categories').delete().eq('id', id);
    if (error) throw error;
  },
  _catToDb(c) { return { nom: c.nom, type: c.type, color: c.color || null, dept: c.dept || null, desc_text: c.desc || null }; },
  _catFromDb(r) { return { id: r.id, nom: r.nom, type: r.type, color: r.color, dept: r.dept, desc: r.desc_text }; },

  // =====================================================================
  // POINTAGE
  // =====================================================================
  async upsertPointage(date, compte, ecart) {
    const { error } = await this.client.from('meiji_pointage')
      .upsert({ date, compte, ecart, updated_at: new Date().toISOString() }, { onConflict: 'date' });
    if (error) throw error;
  },
  async loadPointage(date) {
    const { data, error } = await this.client.from('meiji_pointage')
      .select('*').eq('date', date).maybeSingle();
    if (error) throw error;
    return data || null;
  },

  // =====================================================================
  // BOOTSTRAP : charge tout depuis Supabase, et seed la base si vide
  // =====================================================================
  async bootstrap() {
    if (!this.ready) return false;

    // Charge chaque entité indépendamment : si une table manque ou échoue,
    // les autres restent disponibles.
    const safeLoad = async (name, fn, fallback) => {
      try { return await fn(); }
      catch (e) { console.warn(`Store.${name} échoué :`, e.message || e); return fallback; }
    };
    const [jj, dd, cc, ee, ch, soldes, mvB, mvM, fo, cats] = await Promise.all([
      safeLoad('loadJournees',     () => this.loadJournees(),       null),
      safeLoad('loadDepenses',     () => this.loadDepenses(),       null),
      safeLoad('loadCredits',      () => this.loadCredits(),        null),
      safeLoad('loadEmployes',     () => this.loadEmployes(),       null),
      safeLoad('loadCheques',      () => this.loadCheques(),        null),
      safeLoad('loadSoldes',       () => this.loadSoldes(),         null),
      safeLoad('loadMvts(banque)', () => this.loadMvts('banque'),   null),
      safeLoad('loadMvts(mobile)', () => this.loadMvts('mobile'),   null),
      safeLoad('loadFournisseurs', () => this.loadFournisseurs(),   null),
      safeLoad('loadCategories',   () => this.loadCategories(),     null),
    ]);

    // === SEED journées si DB vide ===
    if (jj && jj.length === 0 && Array.isArray(Data.journees) && Data.journees.length > 0) {
      console.log(`Store: seed → ${Data.journees.length} journées`);
      for (const j of Data.journees) {
        try { await this.upsertJournee(j); } catch (e) { console.warn('seed journée:', e); }
      }
      const reloaded = await safeLoad('reload journees', () => this.loadJournees(), null);
      if (reloaded) Data.journees = reloaded;
    } else if (jj) {
      Data.journees = jj;
    }

    if (dd && dd.length === 0 && Array.isArray(Data.histDep) && Data.histDep.length > 0) {
      console.log(`Store: seed → ${Data.histDep.length} dépenses`);
      for (const d of Data.histDep) {
        try { await this.insertDepense(d); } catch (e) { console.warn('seed dep:', e); }
      }
      const reloaded = await safeLoad('reload deps', () => this.loadDepenses(), null);
      if (reloaded) Data.histDep = reloaded;
    } else if (dd) {
      Data.histDep = dd;
    }

    if (cc && cc.length === 0 && Array.isArray(Data.credits) && Data.credits.length > 0) {
      console.log(`Store: seed → ${Data.credits.length} crédits`);
      for (const c of Data.credits) {
        try { await this.insertCredit(c); } catch (e) { console.warn('seed credit:', e); }
      }
      const reloaded = await safeLoad('reload credits', () => this.loadCredits(), null);
      if (reloaded) Data.credits = reloaded;
    } else if (cc) {
      Data.credits = cc;
    }

    if (ee && ee.length === 0 && Array.isArray(Data.employes) && Data.employes.length > 0) {
      console.log(`Store: seed → ${Data.employes.length} employés`);
      for (const e of Data.employes) {
        try { await this.insertEmploye(e); } catch (err) { console.warn('seed emp:', err); }
      }
      const reloaded = await safeLoad('reload emp', () => this.loadEmployes(), null);
      if (reloaded) Data.employes = reloaded;
    } else if (ee) {
      Data.employes = ee;
    }

    if (cats && cats.length === 0 && Array.isArray(Data.categories) && Data.categories.length > 0) {
      console.log(`Store: seed → ${Data.categories.length} catégories`);
      for (const c of Data.categories) {
        try { await this.insertCategorie(c); } catch (err) { console.warn('seed cat:', err); }
      }
      const reloaded = await safeLoad('reload cats', () => this.loadCategories(), null);
      if (reloaded) Data.categories = reloaded;
    } else if (cats) {
      Data.categories = cats;
    }

    if (ch)     Data.cheques      = ch;
    if (soldes) Data.soldes       = soldes;
    if (mvB)    Data.mvtsBanque   = mvB;
    if (mvM)    Data.mvtsMobile   = mvM;
    if (fo)     Data.fournisseurs = fo;

    return true;
  },
};
