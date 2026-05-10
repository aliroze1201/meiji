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
  // BOOTSTRAP : charge tout depuis Supabase, et seed la base si vide
  // =====================================================================
  async bootstrap() {
    if (!this.ready) return false;

    const [jj, dd, cc] = await Promise.all([
      this.loadJournees(),
      this.loadDepenses(),
      this.loadCredits(),
    ]);

    // Seed automatique si la base est vide ET data.js contient des journées seed
    if (jj.length === 0 && Array.isArray(Data.journees) && Data.journees.length > 0) {
      console.log(`Store: seed initial → import de ${Data.journees.length} journées vers Supabase`);
      for (const j of Data.journees) {
        try { await this.upsertJournee(j); } catch (e) { console.warn('seed journée:', e); }
      }
      Data.journees = await this.loadJournees();
    } else {
      Data.journees = jj;
    }

    if (dd.length === 0 && Array.isArray(Data.histDep) && Data.histDep.length > 0) {
      console.log(`Store: seed → import de ${Data.histDep.length} dépenses`);
      for (const d of Data.histDep) {
        try { await this.insertDepense(d); } catch (e) { console.warn('seed dep:', e); }
      }
      Data.histDep = await this.loadDepenses();
    } else {
      Data.histDep = dd;
    }

    if (cc.length === 0 && Array.isArray(Data.credits) && Data.credits.length > 0) {
      console.log(`Store: seed → import de ${Data.credits.length} crédits`);
      for (const c of Data.credits) {
        try { await this.insertCredit(c); } catch (e) { console.warn('seed credit:', e); }
      }
      Data.credits = await this.loadCredits();
    } else {
      Data.credits = cc;
    }

    return true;
  },
};
