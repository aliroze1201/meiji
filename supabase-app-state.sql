-- ============================================================
-- MEIJI - Migration des modules restants vers Supabase
-- À exécuter UNE FOIS dans Supabase SQL Editor.
-- ============================================================

-- Table générique clé-valeur (1 ligne par module).
-- Chaque module sérialise sa state complète en JSONB.
CREATE TABLE IF NOT EXISTS public.app_state (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users
);

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read app_state"  ON public.app_state;
DROP POLICY IF EXISTS "auth write app_state" ON public.app_state;
CREATE POLICY "auth read app_state"  ON public.app_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write app_state" ON public.app_state FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- Vérification
SELECT key, jsonb_typeof(data) AS type, updated_at FROM public.app_state ORDER BY key;
