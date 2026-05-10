# 🔐 Configuration de l'authentification Supabase

L'application MEIJI supporte une authentification multi-utilisateur avec 4 rôles :
- **admin** : accès complet, peut gérer les utilisateurs
- **responsable** : accès complet sauf gestion des utilisateurs
- **caissier** : Tableau de bord, Pointage, Recettes, Dépenses
- **serveur** : Tableau de bord et Recettes uniquement (saisie des ventes)

Tant que Supabase n'est pas configuré, l'app reste accessible **sans login** (mode public).

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

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

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
2. Email + mot de passe (à mémoriser)
3. Coche "Auto Confirm User" pour bypasser la vérification email
4. Crée l'utilisateur

5. Dans **SQL Editor**, lance :
```sql
UPDATE profiles SET role = 'admin', nom = 'Mon Nom' WHERE email = 'ton.email@exemple.com';
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

## 6. Désactiver l'inscription publique (recommandé)

Dans Supabase → **Authentication** → **Providers** → **Email** : décoche "Enable Email Signups" pour empêcher n'importe qui de s'inscrire. Seul l'admin pourra créer des comptes via Authentication → Users.

## 7. Ajouter des utilisateurs

Pour chaque membre de l'équipe :
1. **Authentication** → **Users** → "Add user" (avec "Auto Confirm User")
2. Puis dans **SQL Editor** :
```sql
UPDATE profiles
   SET role = 'caissier',           -- ou 'admin' / 'responsable' / 'serveur'
       nom  = 'Prénom Nom'
 WHERE email = 'user@exemple.com';
```

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
