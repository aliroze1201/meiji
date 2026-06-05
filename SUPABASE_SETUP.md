# 🔐 Configuration de l'authentification Supabase

L'application MEIJI supporte une authentification multi-utilisateur avec 4 rôles :
- **admin** : accès complet, peut gérer les utilisateurs
- **responsable** : accès complet sauf gestion des utilisateurs
- **caissier** : Tableau de bord, Pointage, Recettes, Dépenses
- **serveur** : Tableau de bord et Recettes uniquement (saisie des ventes)

Tant que Supabase n'est pas configuré, l'app reste accessible **sans login** (mode public).

---

## ⚠️ IMPORTANT — Synchronisation entre appareils

Pour que tes données (recettes, dépenses, etc.) soient **à jour sur tous tes
appareils**, il ne suffit pas de pouvoir te connecter. Il faut aussi avoir créé
les **tables de données** dans Supabase.

> Si tu te connectes correctement mais que **rien ne se synchronise** entre
> ton téléphone et ton ordinateur, c'est presque toujours que ces tables
> n'ont jamais été créées. Tes données restent alors seulement dans le
> navigateur de l'appareil courant.

**Solution (à faire une seule fois)** : ouvre Supabase → **SQL Editor** →
*New query*, colle le contenu du fichier [`supabase-tables.sql`](supabase-tables.sql)
puis clique **Run**. La requête de vérification en bas doit lister 3 tables :
`app_state`, `journee_deps`, `journees`.

Au prochain chargement de l'app, l'icône de synchro (☁️ en haut à droite)
devient **verte** = cloud OK. Si elle est **rouge**, un message t'indique
précisément ce qui manque.

## 📌 À savoir : pas besoin de vrais emails pour vos collègues

L'app utilise des **identifiants simples** (ex: `ali`, `marie`, `jean`), pas des emails.
En interne, le code ajoute automatiquement `@meiji.local` pour le stockage Supabase
(voir `meiji-app/js/auth.js`), mais vos collègues ne voient jamais d'email :
ils se connectent avec leur identifiant + mot de passe.

Conséquence : la **section 6** ci-dessous (désactiver "Confirm email" + garder
"Email Signups" activés) est **obligatoire** pour que ça marche.

## 1. Créer un projet Supabase (gratuit)

1. Va sur [https://supabase.com](https://supabase.com) et crée un compte
2. Crée un nouveau projet (région la plus proche, ex: `eu-west-3`)
3. Note bien le **mot de passe de la base** (à conserver)

## 2. Exécuter le script SQL

Dans Supabase → **SQL Editor** → "New query", colle ce script et clique **Run** :

```sql
-- Table des profils utilisateurs (lié à auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nom TEXT,
  role TEXT NOT NULL DEFAULT 'serveur'
       CHECK (role IN ('admin','responsable','caissier','serveur')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS : chaque utilisateur lit son profil ; les admins lisent/modifient tout
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Fonction SECURITY DEFINER pour vérifier le rôle sans déclencher la RLS
-- de la table profiles elle-même (sinon erreur récursion 42P17).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- Trigger : créer automatiquement un profil quand un user s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'serveur');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Migration depuis l'ancienne version (3 rôles)

Si la table `profiles` existe déjà avec l'ancien CHECK (`admin`/`gerant`/`caissier`),
exécute ceci pour ajouter `responsable` et `serveur` :

```sql
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','responsable','caissier','serveur'));

-- Optionnel : renommer les anciens "gerant" en "responsable"
UPDATE profiles SET role = 'responsable' WHERE role = 'gerant';
```

## 3. Créer le premier compte admin

1. Dans Supabase → **Authentication** → **Users** → "Add user" → "Create new user"
2. Champ **Email** : tape un identifiant suivi de `@meiji.local`
   → ex: `ali@meiji.local` (l'app affichera juste `ali` au login)
3. Mot de passe (à mémoriser)
4. Coche **"Auto Confirm User"** ✅ pour bypasser la vérification email
   (obligatoire — sinon Supabase enverra un email à une adresse qui n'existe pas)
5. Crée l'utilisateur

6. Dans **SQL Editor**, lance :
```sql
UPDATE profiles SET role = 'admin', nom = 'Mon Nom' WHERE email = 'ali@meiji.local';
```

## 4. Récupérer les clés d'API

Dans Supabase → **Project Settings** (engrenage en bas) → **API** :
- Copie **Project URL** (ex: `https://xxxxx.supabase.co`)
- Copie **anon / public key** (longue chaîne `eyJhbGc...`)

## 5. Configurer l'app

Édite `meiji-app/js/config.js` :

```js
const Config = {
  supabase: {
    url:     'https://xxxxx.supabase.co',
    anonKey: 'eyJhbGc...',
  },
};
```

Commit + push sur `main` → GitHub Pages redéploiera automatiquement.

## 6. Réglages indispensables côté Supabase (sans email)

Pour que l'app fonctionne avec des identifiants `@meiji.local` (pas de vrais emails),
ajuste **Authentication → Providers → Email** :

| Réglage | Valeur | Pourquoi |
|---|---|---|
| **Enable Email Signups** | ✅ **activé** | Permet à la page Utilisateurs de créer des comptes. Si tu désactives, le formulaire renverra "Inscriptions désactivées" et tu seras forcé de tout faire à la main dans le dashboard Supabase. |
| **Confirm email** | ❌ **désactivé** | Sinon Supabase tente d'envoyer un email de confirmation à `marie@meiji.local` — adresse inexistante → ta collègue ne peut jamais se connecter. |
| **Secure email change** | ❌ désactivé | Idem — pas d'email réel pour confirmer. |

> 🔒 **Sécurité** : avec "Email Signups" activé, n'importe qui qui connaît
> l'URL Supabase peut techniquement créer un compte avec rôle `serveur`
> (rôle par défaut du trigger). Il faudra ensuite que l'admin lui donne
> un meilleur rôle pour qu'il puisse faire quoi que ce soit. Tu peux aussi
> garder l'option désactivée et créer chaque compte manuellement dans le
> dashboard Supabase (voir §7 ci-dessous, méthode A).

## 7. Ajouter des utilisateurs (vos collègues)

### Méthode A — Depuis l'app (recommandée, plus rapide)

1. Connecte-toi en admin
2. Va dans la page **Utilisateurs** (visible seulement aux admins)
3. Remplis le formulaire :
   - **Identifiant** : juste un nom court (ex: `marie`, `jean.p`) — pas d'email à demander
   - **Mot de passe** : minimum 6 caractères (transmets-le à ton collègue de vive voix / SMS)
   - **Nom complet** : "Prénom Nom"
   - **Rôle** : serveur / caissier / responsable / admin
4. Clique **Créer le compte**
5. Donne à ton collègue son identifiant + mot de passe — il se connecte sur le site

Cette méthode requiert que **§6 ci-dessus soit configuré** (Signups activés + Confirm email désactivé).

### Méthode B — Depuis le dashboard Supabase (fallback)

Si tu préfères garder "Email Signups" désactivé pour la sécurité :

1. **Authentication** → **Users** → "Add user" → "Create new user"
2. **Email** : `identifiant@meiji.local` (ex: `marie@meiji.local`)
3. **Mot de passe** + ✅ **"Auto Confirm User"** (obligatoire)
4. Dans **SQL Editor** :
```sql
UPDATE profiles
   SET role = 'caissier',           -- ou 'admin' / 'responsable' / 'serveur'
       nom  = 'Prénom Nom'
 WHERE email = 'marie@meiji.local';
```

Ton collègue se connecte ensuite avec juste `marie` (pas le `@meiji.local`) + son mot de passe.

### Récap des accès par rôle

| Module              | admin | responsable | caissier | serveur |
|---------------------|:-----:|:-----------:|:--------:|:-------:|
| Tableau de bord     |  ✅   |     ✅      |    ✅    |   ✅    |
| Pointage            |  ✅   |     ✅      |    ✅    |   —     |
| Recettes            |  ✅   |     ✅      |    ✅    |   ✅    |
| Dépenses            |  ✅   |     ✅      |    ✅    |   —     |
| Analyse / Bilan     |  ✅   |     ✅      |    —     |   —     |
| Banque / Mobile $   |  ✅   |     ✅      |    —     |   —     |
| Catégories          |  ✅   |     ✅      |    —     |   —     |
| Employés / Crédits  |  ✅   |     ✅      |    —     |   —     |
| Fournisseurs        |  ✅   |     ✅      |    —     |   —     |
| Gestion utilisateurs|  ✅   |     —       |    —     |   —     |

## Sécurité

⚠️ Sur GitHub Pages, l'app est entièrement client-side. La clé `anon` peut être lue dans le navigateur — c'est normal, elle n'a que les permissions définies par les RLS Supabase. Un utilisateur malicieux pourrait :
- Tenter de lire/modifier la table `profiles` (bloqué par RLS)
- Utiliser les identifiants Auth de quelqu'un (même protection que tout site web)

Pour un vrai contrôle des données métier, il faudrait stocker les recettes/dépenses dans Supabase aussi.
