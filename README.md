# 🍣 MEIJI — Gestion Restaurant

Application web de gestion pour le restaurant MEIJI (SUSHI · BAR · CHICHA).
Multi-utilisateurs, multi-postes, données synchronisées via **Supabase**.

Site déployé : https://aliroze1201.github.io/meiji/ (redirige vers `meiji-app/`).

## Stack

- Front : HTML + CSS + JavaScript vanilla (pas de build, pas de Node).
- Backend : [Supabase](https://supabase.com) (auth + Postgres avec RLS).
- Graphiques : Chart.js 4. Export Excel : SheetJS (xlsx).
- Hébergement : GitHub Pages (branche `main`).

## Structure

```
meiji-app/                       ← APP servie par GitHub Pages
├── index.html                   ← shell HTML, charge tous les scripts
├── css/styles.css               ← styles (variables CSS, dark mode)
└── js/
    ├── config.js                ← URL + clé Supabase publique
    ├── auth.js                  ← login, rôles (admin/responsable/caissier/serveur)
    ├── data.js                  ← Data.* — seeds + helpers (format, dates, getGroupe…)
    ├── journees-db.js           ← wrapper Supabase pour journees + journee_deps
    ├── app-db.js                ← wrapper Supabase générique (table app_state JSONB)
    ├── charts.js                ← Chart.js
    ├── main.js                  ← bootstrap, navigation, renderAll
    └── modules/                 ← un fichier par page
        ├── dashboard.js
        ├── pointage.js          ← cash count (form local, par navigateur)
        ├── recettes.js          ← journées CA (validation, brouillons)
        ├── depenses.js          ← dépenses hors-journée
        ├── analyse.js           ← analyse charges par groupe
        ├── banque.js, mobile.js
        ├── suivi.js             ← chèques
        ├── categories.js, employes.js, comptes-emp.js
        ├── credits.js, fournisseurs.js, bilan.js
        └── utilisateurs.js      ← admin users (visible seul aux admins)

supabase-journees.sql            ← schéma + RLS + seed des journées
supabase-app-state.sql           ← schéma + RLS de la table générique app_state
SUPABASE_SETUP.md                ← guide complet : créer projet, users, RLS
```

## Données dans Supabase

| Table | Contenu | Wrapper JS |
|---|---|---|
| `profiles` | rôles utilisateurs (admin/responsable/caissier/serveur) | `Auth` (auth.js) |
| `journees` (1 ligne/jour) + `journee_deps` (N) | recettes journalières + dépenses détaillées par service | `JourneesDB` (journees-db.js) |
| `app_state(key, data JSONB)` | un blob par module : banque, mobile, crédits, chèques, employés, dépenses hors-journée | `AppDB` (app-db.js) |

Ce qui **reste en localStorage** (par design) :
- **drafts** recettes/dépenses — saisies en cours, par navigateur ;
- **pointage** — état du formulaire de comptage, par navigateur ;
- **thème** clair/sombre.

## Démarrage local

```bash
# Servir le sous-dossier meiji-app/ avec n'importe quel serveur statique :
cd meiji-app
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Aucun build, aucune dépendance NPM. Les scripts externes (Chart.js, SheetJS, Supabase JS, Tabler Icons) sont chargés via CDN dans `meiji-app/index.html`.

## Configuration Supabase

Voir [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) pour les étapes complètes :
1. Créer un projet Supabase gratuit.
2. Exécuter dans l'ordre dans le SQL Editor :
   - le bloc « 2. Exécuter le script SQL » de SUPABASE_SETUP.md (profiles + auth);
   - `supabase-journees.sql` (tables journees + journee_deps + données seed);
   - `supabase-app-state.sql` (table générique).
3. Renseigner `meiji-app/js/config.js` avec l'URL projet + clé anon.
4. Créer le 1er compte admin dans **Authentication → Users**, puis :
   ```sql
   UPDATE profiles SET role='admin', nom='Mon Nom' WHERE email='moi@exemple.com';
   ```

## Ajouter un utilisateur

Via la page **Utilisateurs** (visible aux admins seulement). Saisir email/mot de passe + rôle. Le profil est créé automatiquement par trigger Supabase.

## Workflow de développement

- Branche de travail : voir `CLAUDE.md` pour la convention.
- GitHub Pages déploie depuis `main` à chaque push.
- Cache-bust : bump le `?v=...` à la fin de chaque `<script>`/`<link>` dans `meiji-app/index.html` pour forcer le refresh côté navigateur.

## Sécurité (à savoir)

L'app est 100% client-side. La clé `anon` Supabase est visible dans le navigateur — c'est normal, la sécurité est assurée par les policies RLS. Les rôles applicatifs (caissier, serveur…) gatent l'UI, pas la base : un utilisateur malveillant authentifié pourrait écrire ce que les RLS lui autorisent. Pour durcir, il faudrait passer par des fonctions Postgres `SECURITY DEFINER` ou un backend.

## Réveiller un projet Supabase en pause

Sur l'offre gratuite, un projet inactif >7 jours est pausé → DNS ne répond plus, le site affiche « erreur réseau ». Aller dans le dashboard Supabase et cliquer **Restore project**.
