-- ============================================================
-- MEIJI — SÉCURISATION DES DONNÉES (à exécuter UNE FOIS)
-- ------------------------------------------------------------
-- Problème corrigé : la clé anon est publique (app GitHub Pages) et les
-- inscriptions email sont ouvertes (nécessaire à la page Utilisateurs).
-- Avant ce script, N'IMPORTE QUI pouvait donc créer un compte, recevoir
-- un profil « serveur » automatique, et lire/écrire TOUTES les données
-- (app_state, journees, journee_deps) car les policies acceptaient tout
-- utilisateur « authenticated ».
--
-- Après ce script :
--   1. Un compte qui s'inscrit n'obtient un profil QUE s'il a été invité
--      au préalable par un admin (table invitations, remplie par la page
--      Utilisateurs de l'app). Sans profil → aucune donnée accessible et
--      l'app le déconnecte (« Profil introuvable »).
--   2. Les policies des tables de données exigent un profil existant,
--      plus seulement un jeton authentifié.
--
-- Sûr à relancer (CREATE OR REPLACE + DROP POLICY IF EXISTS).
-- Ne touche pas aux comptes/profils existants.
-- ============================================================

-- ---------- 1) Un profil est-il associé à l'utilisateur courant ? ----------
-- SECURITY DEFINER : lit profiles sans déclencher sa propre RLS.
CREATE OR REPLACE FUNCTION public.has_profile()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid());
$$;

-- ---------- 2) Invitations (pré-approbation des comptes) ----------
CREATE TABLE IF NOT EXISTS public.invitations (
  email      TEXT PRIMARY KEY,
  nom        TEXT,
  role       TEXT NOT NULL DEFAULT 'serveur'
             CHECK (role IN ('admin','responsable','caissier','serveur')),
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin manage invitations" ON public.invitations;
CREATE POLICY "admin manage invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- 3) Trigger d'inscription : profil UNIQUEMENT si invité ----------
-- Remplace la version qui donnait un profil « serveur » à tout inscrit.
-- Un inscrit non invité existe dans auth.users mais reste inerte :
-- pas de profil → pas d'accès aux données, l'app le déconnecte.
-- (Un admin peut supprimer ces comptes dans Authentication → Users.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT * INTO inv FROM public.invitations WHERE email = NEW.email;
  IF FOUND THEN
    INSERT INTO public.profiles (id, email, nom, role)
    VALUES (NEW.id, NEW.email, inv.nom, inv.role);
    DELETE FROM public.invitations WHERE email = NEW.email;
  END IF;
  RETURN NEW;
END;
$$;

-- (le trigger on_auth_user_created existant pointe déjà sur cette fonction ;
--  s'il n'existe pas encore, le créer :)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ---------- 4) Durcissement des policies des tables de données ----------
-- Avant : USING (true) pour tout « authenticated ».
-- Après : il faut un profil créé par un admin.

-- app_state
DROP POLICY IF EXISTS "auth read app_state"  ON public.app_state;
DROP POLICY IF EXISTS "auth write app_state" ON public.app_state;
CREATE POLICY "auth read app_state"  ON public.app_state
  FOR SELECT TO authenticated USING (public.has_profile());
CREATE POLICY "auth write app_state" ON public.app_state
  FOR ALL TO authenticated
  USING (public.has_profile()) WITH CHECK (public.has_profile());

-- journees
DROP POLICY IF EXISTS "auth read journees"  ON public.journees;
DROP POLICY IF EXISTS "auth write journees" ON public.journees;
CREATE POLICY "auth read journees"  ON public.journees
  FOR SELECT TO authenticated USING (public.has_profile());
CREATE POLICY "auth write journees" ON public.journees
  FOR ALL TO authenticated
  USING (public.has_profile()) WITH CHECK (public.has_profile());

-- journee_deps
DROP POLICY IF EXISTS "auth read deps"  ON public.journee_deps;
DROP POLICY IF EXISTS "auth write deps" ON public.journee_deps;
CREATE POLICY "auth read deps"  ON public.journee_deps
  FOR SELECT TO authenticated USING (public.has_profile());
CREATE POLICY "auth write deps" ON public.journee_deps
  FOR ALL TO authenticated
  USING (public.has_profile()) WITH CHECK (public.has_profile());

-- ---------- 5) Vérification ----------
-- Chaque table doit lister ses policies avec « has_profile() » dans qual :
SELECT tablename, policyname, qual
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('app_state','journees','journee_deps','invitations')
 ORDER BY tablename, policyname;
