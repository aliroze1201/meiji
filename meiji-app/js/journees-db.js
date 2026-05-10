/**
 * journees-db.js — Couche d'accès Supabase pour les journées (recettes + dépenses détaillées).
 *
 * Tables : public.journees (1 ligne / jour) + public.journee_deps (N lignes / jour).
 * Fallback : si Supabase non configuré ou non connecté, retombe sur localStorage
 * (clé existante 'meiji-user-recs') pour ne rien casser en mode public.
 */

const JourneesDB = {
  TABLE: 'journees',
  DEPS_TABLE: 'journee_deps',
  LS_KEY: 'meiji-user-recs',

  enabled() {
    return typeof Auth !== 'undefined'
        && Auth.client
        && Auth.profile
        && Config.isAuthEnabled();
  },

  // --- Mappage row Supabase <-> objet JS attendu par Data.journees ---
  _rowToJournee(r, deps) {
    return {
      id:   r.date, // la date sert de clé naturelle
      date: r.date,
      userRec: true,
      s: { esp:r.s_esp, chq:r.s_chq, mob:r.s_mob, cred:r.s_cred },
      b: { esp:r.b_esp, chq:r.b_chq, mob:r.b_mob, cred:r.b_cred },
      c: { esp:r.c_esp, chq:r.c_chq, mob:r.c_mob, cred:r.c_cred },
      ds: r.ds, db: r.db, dc: r.dc,
      cs: r.cs, cb: r.cb, cc: r.cc,
      deps: {
        s: (deps || []).filter(d => d.service === 's').sort((a,b)=>a.position-b.position).map(d => ({ label:d.label, montant:d.montant, groupe:d.groupe })),
        b: (deps || []).filter(d => d.service === 'b').sort((a,b)=>a.position-b.position).map(d => ({ label:d.label, montant:d.montant, groupe:d.groupe })),
        c: (deps || []).filter(d => d.service === 'c').sort((a,b)=>a.position-b.position).map(d => ({ label:d.label, montant:d.montant, groupe:d.groupe })),
      },
    };
  },

  _journeeToRow(j) {
    return {
      date: j.date,
      s_esp:+j.s.esp||0, s_chq:+j.s.chq||0, s_mob:+j.s.mob||0, s_cred:+j.s.cred||0,
      b_esp:+j.b.esp||0, b_chq:+j.b.chq||0, b_mob:+j.b.mob||0, b_cred:+j.b.cred||0,
      c_esp:+j.c.esp||0, c_chq:+j.c.chq||0, c_mob:+j.c.mob||0, c_cred:+j.c.cred||0,
      ds:+j.ds||0, db:+j.db||0, dc:+j.dc||0,
      cs:+j.cs||0, cb:+j.cb||0, cc:+j.cc||0,
      updated_by: Auth.user?.id || null,
    };
  },

  // ===== LOAD =====
  async loadAll() {
    if (!this.enabled()) return null;
    const { data: rows, error: e1 } = await Auth.client.from(this.TABLE).select('*').order('date');
    if (e1) { console.error('[JourneesDB] loadAll journees:', e1); return null; }
    const { data: deps, error: e2 } = await Auth.client.from(this.DEPS_TABLE).select('*');
    if (e2) { console.error('[JourneesDB] loadAll deps:', e2); return null; }
    const depsByDate = {};
    (deps || []).forEach(d => { (depsByDate[d.date] = depsByDate[d.date] || []).push(d); });
    return rows.map(r => this._rowToJournee(r, depsByDate[r.date] || []));
  },

  // ===== UPSERT (1 journée) =====
  async upsertOne(j) {
    if (!this.enabled()) return false;
    const row = this._journeeToRow(j);
    const { error: e1 } = await Auth.client.from(this.TABLE).upsert(row, { onConflict: 'date' });
    if (e1) { console.error('[JourneesDB] upsert journee:', e1); return false; }

    // Remplace les dépenses détaillées du jour
    const { error: eDel } = await Auth.client.from(this.DEPS_TABLE).delete().eq('date', j.date);
    if (eDel) { console.error('[JourneesDB] delete deps:', eDel); return false; }

    const depsRows = [];
    ['s','b','c'].forEach(svc => {
      (j.deps?.[svc] || []).forEach((d, idx) => {
        if (!d || (!d.label && !d.montant)) return;
        depsRows.push({
          date: j.date, service: svc,
          label: d.label || '', montant: +d.montant||0,
          groupe: d.groupe || null, position: idx + 1,
        });
      });
    });
    if (depsRows.length) {
      const { error: eIns } = await Auth.client.from(this.DEPS_TABLE).insert(depsRows);
      if (eIns) { console.error('[JourneesDB] insert deps:', eIns); return false; }
    }
    return true;
  },

  // ===== DELETE 1 journée =====
  async deleteByDate(date) {
    if (!this.enabled()) return false;
    const { error } = await Auth.client.from(this.TABLE).delete().eq('date', date);
    if (error) { console.error('[JourneesDB] delete:', error); return false; }
    return true;
  },
};
