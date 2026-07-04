/**
 * app-db.js — Couche d'accès Supabase générique (table app_state).
 *
 * Chaque module stocke toute sa state sous une clé unique (= ancien STORAGE_KEY).
 * Les écritures sont aussi miroitées dans localStorage : backup local + permet
 * la migration auto au 1er chargement sur Supabase (cloud-vide → on pousse le local).
 */

const AppDB = {
  TABLE: 'app_state',

  // Dernière erreur cloud rencontrée (lecture/écriture). Permet à l'UI
  // d'afficher un état de synchro fiable au lieu d'échouer en silence.
  lastError: null,
  // Hook optionnel branché par main.js pour remonter les erreurs à l'écran.
  onError: null,

  // Écritures cloud en cours (save() lancé, upsert pas encore terminé).
  // refreshFromCloud() s'en sert pour ne PAS relire le cloud pendant qu'une
  // écriture est en vol : la lecture reviendrait avec l'ancienne version et
  // écraserait en mémoire les données tout juste validées.
  _pendingWrites: 0,
  // Clés dont l'envoi cloud a échoué (offline, RLS…) : le localStorage est
  // alors plus récent que le cloud → interdire le refresh tant que ce retard
  // n'est pas rattrapé, sinon les saisies locales disparaîtraient.
  _dirtyKeys: {},
  // Timestamp de la dernière écriture locale (localStorage).
  lastWriteAt: 0,

  hasPendingWrites() {
    return this._pendingWrites > 0 || Object.keys(this._dirtyKeys).length > 0;
  },

  // Rejoue vers le cloud les écritures locales qui avaient échoué.
  // Retourne true si tout est rattrapé (plus aucune clé en retard).
  async flushDirty() {
    if (!this.enabled()) return Object.keys(this._dirtyKeys).length === 0;
    for (const key of Object.keys(this._dirtyKeys)) {
      const local = this._localGet(key);
      if (local === undefined || await this._cloudSet(key, local)) {
        delete this._dirtyKeys[key];
      }
    }
    return Object.keys(this._dirtyKeys).length === 0;
  },

  enabled() {
    return typeof Auth !== 'undefined'
        && Auth.client
        && Auth.profile
        && typeof Config !== 'undefined'
        && Config.isAuthEnabled();
  },

  // Centralise le report d'erreur : console + state + toast éventuel.
  _report(op, key, error) {
    this.lastError = { op, key, message: error?.message || String(error), at: Date.now() };
    console.error(`[AppDB] ${op} ${key}:`, error);
    if (typeof this.onError === 'function') {
      try { this.onError(this.lastError); } catch {}
    }
  },

  // Vérifie que la table cloud est accessible (existe + RLS OK) en écriture.
  // Retourne { ok:true } ou { ok:false, reason, message } pour un affichage clair.
  async healthCheck() {
    if (!this.enabled()) return { ok: false, reason: 'disabled', message: 'Mode public (pas connecté au cloud).' };
    // 1) Lecture : la table app_state existe-t-elle et est-elle lisible ?
    const probeKey = '__healthcheck__';
    const { error: readErr } = await Auth.client
      .from(this.TABLE).select('key').eq('key', probeKey).maybeSingle();
    if (readErr) return this._diagnose(this.TABLE, readErr);
    // 2) Écriture : peut-on réellement écrire (RLS write) ?
    const { error: writeErr } = await Auth.client.from(this.TABLE).upsert(
      { key: probeKey, data: { ts: Date.now() }, updated_at: new Date().toISOString(),
        updated_by: Auth.user?.id || null }, { onConflict: 'key' });
    if (writeErr) return this._diagnose(this.TABLE, writeErr);
    return { ok: true };
  },

  // Traduit une erreur Supabase brute en message clair pour l'utilisateur.
  _diagnose(table, error) {
    const msg  = (error?.message || '').toLowerCase();
    const code = error?.code || '';
    if (msg.includes('does not exist') || msg.includes('not find the table')
        || code === 'PGRST205' || code === '42P01') {
      return { ok: false, reason: 'missing-table',
        message: `La table « ${table} » n'existe pas dans Supabase. Exécute le script SQL (voir SUPABASE_SETUP.md) une fois dans le SQL Editor.` };
    }
    if (msg.includes('row-level security') || msg.includes('permission') || code === '42501') {
      return { ok: false, reason: 'rls',
        message: `Accès refusé sur « ${table} » (politique RLS). Vérifie les policies du script SQL.` };
    }
    return { ok: false, reason: 'error', message: error?.message || 'Erreur de connexion au cloud.' };
  },

  // Charge cloud si dispo, sinon local. Auto-migre local → cloud si cloud vide.
  // Retourne `undefined` si rien à hydrater.
  async load(key) {
    if (this.enabled()) {
      const cloud = await this._cloudGet(key);
      if (cloud !== undefined) return cloud;
      const local = this._localGet(key);
      if (local !== undefined) {
        // 1ère utilisation Supabase : on remonte la state locale dans le cloud.
        await this._cloudSet(key, local);
        return local;
      }
      return undefined;
    }
    return this._localGet(key);
  },

  // Écrit local (toujours, comme backup) puis cloud (si dispo). Fire-and-forget côté cloud.
  async save(key, data) {
    this._localSet(key, data);
    this.lastWriteAt = Date.now();
    if (this.enabled()) {
      this._pendingWrites++;
      try {
        const ok = await this._cloudSet(key, data);
        if (ok) delete this._dirtyKeys[key];
        else this._dirtyKeys[key] = true;
      } finally {
        this._pendingWrites--;
        this.lastWriteAt = Date.now();
      }
    }
  },

  _localGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    } catch { return undefined; }
  },
  _localSet(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  },

  async _cloudGet(key) {
    const { data, error } = await Auth.client
      .from(this.TABLE).select('data').eq('key', key).maybeSingle();
    if (error) { this._report('get', key, error); return undefined; }
    return data ? data.data : undefined;
  },
  async _cloudSet(key, value) {
    const row = {
      key, data: value,
      updated_at: new Date().toISOString(),
      updated_by: Auth.user?.id || null,
    };
    const { error } = await Auth.client
      .from(this.TABLE).upsert(row, { onConflict: 'key' });
    if (error) { this._report('set', key, error); return false; }
    return true;
  },
};
