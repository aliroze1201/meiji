-- ============================================================
-- MEIJI — Tables nécessaires à la SYNCHRONISATION multi-appareils
-- ------------------------------------------------------------
-- À EXÉCUTER UNE SEULE FOIS dans Supabase → SQL Editor → New query → Run.
--
-- Tant que ce script n'est pas exécuté, l'app fonctionne mais tes données
-- restent UNIQUEMENT dans le navigateur de l'appareil courant (pas de synchro).
-- Après exécution, tes saisies sont partagées entre tous tes appareils.
--
-- Ce script est sûr à relancer (IF NOT EXISTS + DROP POLICY IF EXISTS).
-- Il NE contient PAS de données d'exemple : voir supabase-journees.sql pour ça.
-- ============================================================

-- ---------- 1) Table générique clé/valeur (la plupart des modules) ----------
CREATE TABLE IF NOT EXISTS public.app_state (
  key        TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users
);

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
-- ⚠️ Accès réservé aux comptes ayant un PROFIL (créé par un admin), pas à
-- n'importe quel jeton authentifié : la clé anon est publique et les
-- inscriptions email ouvertes. has_profile() est définie dans
-- supabase-securite.sql — exécuter ce fichier AVANT ou APRÈS celui-ci.
CREATE OR REPLACE FUNCTION public.has_profile()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()); $$;

DROP POLICY IF EXISTS "auth read app_state"  ON public.app_state;
DROP POLICY IF EXISTS "auth write app_state" ON public.app_state;
CREATE POLICY "auth read app_state"  ON public.app_state FOR SELECT TO authenticated USING (public.has_profile());
CREATE POLICY "auth write app_state" ON public.app_state FOR ALL    TO authenticated USING (public.has_profile()) WITH CHECK (public.has_profile());

-- ---------- 2) Journées (recettes + dépenses détaillées) ----------
CREATE TABLE IF NOT EXISTS public.journees (
  date DATE PRIMARY KEY,
  s_esp BIGINT NOT NULL DEFAULT 0, s_chq BIGINT NOT NULL DEFAULT 0, s_mob BIGINT NOT NULL DEFAULT 0, s_cred BIGINT NOT NULL DEFAULT 0,
  b_esp BIGINT NOT NULL DEFAULT 0, b_chq BIGINT NOT NULL DEFAULT 0, b_mob BIGINT NOT NULL DEFAULT 0, b_cred BIGINT NOT NULL DEFAULT 0,
  c_esp BIGINT NOT NULL DEFAULT 0, c_chq BIGINT NOT NULL DEFAULT 0, c_mob BIGINT NOT NULL DEFAULT 0, c_cred BIGINT NOT NULL DEFAULT 0,
  ds BIGINT NOT NULL DEFAULT 0, db BIGINT NOT NULL DEFAULT 0, dc BIGINT NOT NULL DEFAULT 0,
  cs BIGINT NOT NULL DEFAULT 0, cb BIGINT NOT NULL DEFAULT 0, cc BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users
);

CREATE TABLE IF NOT EXISTS public.journee_deps (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL REFERENCES public.journees(date) ON DELETE CASCADE,
  service CHAR(1) NOT NULL CHECK (service IN ('s','b','c')),
  label TEXT NOT NULL,
  montant BIGINT NOT NULL DEFAULT 0,
  groupe TEXT,
  position INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS journee_deps_date_idx ON public.journee_deps(date);

ALTER TABLE public.journees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journee_deps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read journees"  ON public.journees;
DROP POLICY IF EXISTS "auth write journees" ON public.journees;
DROP POLICY IF EXISTS "auth read deps"      ON public.journee_deps;
DROP POLICY IF EXISTS "auth write deps"     ON public.journee_deps;
CREATE POLICY "auth read journees"  ON public.journees     FOR SELECT TO authenticated USING (public.has_profile());
CREATE POLICY "auth write journees" ON public.journees     FOR ALL    TO authenticated USING (public.has_profile()) WITH CHECK (public.has_profile());
CREATE POLICY "auth read deps"      ON public.journee_deps FOR SELECT TO authenticated USING (public.has_profile());
CREATE POLICY "auth write deps"     ON public.journee_deps FOR ALL    TO authenticated USING (public.has_profile()) WITH CHECK (public.has_profile());

-- ---------- 3) Vérification ----------
-- Doit lister 3 lignes : app_state, journee_deps, journees
SELECT tablename FROM pg_tables
 WHERE schemaname = 'public' AND tablename IN ('app_state','journees','journee_deps')
 ORDER BY tablename;
