/**
 * app-db.js — Couche d'accès Supabase générique (table app_state).
 *
 * Chaque module stocke toute sa state sous une clé unique (= ancien STORAGE_KEY).
 * Les écritures sont aussi miroitées dans localStorage : backup local + permet
 * la migration auto au 1er chargement sur Supabase (cloud-vide → on pousse le local).
 */

const AppDB = {
  TABLE: 'app_state',

  enabled() {
    return typeof Auth !== 'undefined'
        && Auth.client
        && Auth.profile
        && typeof Config !== 'undefined'
        && Config.isAuthEnabled();
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
    if (this.enabled()) {
      await this._cloudSet(key, data);
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
    if (error) { console.error('[AppDB] get '+key+':', error); return undefined; }
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
    if (error) console.error('[AppDB] set '+key+':', error);
  },
};
