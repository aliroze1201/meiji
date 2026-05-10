/**
 * config.js — Configuration de l'application
 *
 * À éditer une seule fois après création du projet Supabase.
 * Voir SUPABASE_SETUP.md pour les instructions complètes.
 */

const Config = {
  supabase: {
    url:     'https://gtvyfuinbfisblhluxfu.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dnlmdWluYmZpc2JsaGx1eGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjA1NDYsImV4cCI6MjA5MzkzNjU0Nn0.emWSp6quoCJNuuyo9RavqWYe-AwUur_AbYT-4yfqHPo',
  },
};

Config.isAuthEnabled = () =>
  Config.supabase.url !== 'YOUR_SUPABASE_URL' &&
  Config.supabase.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
