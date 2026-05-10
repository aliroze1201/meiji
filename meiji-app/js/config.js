/**
 * config.js — Configuration de l'application
 *
 * À éditer une seule fois après création du projet Supabase.
 * Voir SUPABASE_SETUP.md pour les instructions complètes.
 */

const Config = {
  supabase: {
    // ▼▼▼ REMPLACE ces 2 valeurs après avoir créé ton projet Supabase ▼▼▼
    url:     'YOUR_SUPABASE_URL',     // ex: 'https://xxxxx.supabase.co'
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // clé "anon public" (Settings → API)
  },
};

Config.isAuthEnabled = () =>
  Config.supabase.url !== 'YOUR_SUPABASE_URL' &&
  Config.supabase.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
