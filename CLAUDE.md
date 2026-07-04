# CLAUDE.md — Guide de travail sur l'app MEIJI

> Ce fichier décrit le projet RÉEL : une application de gestion de restaurant
> (pas un site vitrine). Lire aussi `README.md` (structure) et
> `SUPABASE_SETUP.md` (backend) avant toute modification.

## 1. Le projet

**MEIJI** — application web de gestion pour un restaurant à Brazzaville avec
3 caisses : **SUSHI**, **BAR**, **CHICHA**. Utilisateurs : le gérant et ses
employés (rôles admin / responsable / caissier / serveur), surtout sur mobile.
Langue : **français** (UI, commentaires, commits).

- Production : https://aliroze1201.github.io/meiji/ — GitHub Pages, déploie `main` à chaque push.
- Monnaie : FCFA, montants entiers, format `fr-FR` via `Data.fmt()`.

## 2. Stack et contraintes

- **HTML + CSS + JavaScript vanilla. Pas de build, pas de NPM, pas de framework.**
  Chaque page = un objet global dans `meiji-app/js/modules/*.js` (ex. `Depenses`, `Recettes`).
- Backend : Supabase (auth + Postgres/RLS). Wrappers : `AppDB` (table `app_state`,
  un blob JSONB par module) et `JourneesDB` (tables `journees` + `journee_deps`).
- Fallback localStorage complet : l'app doit continuer à fonctionner sans Supabase
  (mode public) — toujours préserver ce chemin.
- CDN épinglés dans `meiji-app/index.html` (jamais `@latest`).

## 3. Règles à respecter absolument

1. **Échapper toute donnée utilisateur** injectée dans du `innerHTML` — texte
   ET attributs — via `Data.esc()` (ou le `_escape()` local du module).
   Attention aux `userId` chaînes (ex. `'pay-1'`) dans les `onclick="…"`.
2. **Jamais d'écrasement des données en mémoire pendant une écriture cloud** :
   `App.refreshFromCloud()` est gardé par `AppDB.hasPendingWrites()` /
   `JourneesDB.hasPendingWrites()`. Toute nouvelle écriture asynchrone vers le
   cloud doit incrémenter/décrémenter ces compteurs.
3. **Sécurité = RLS Supabase, pas l'UI.** Les rôles applicatifs ne gatent que
   l'affichage. Tout durcissement d'accès passe par `supabase-securite.sql`
   (policies `has_profile()`, invitations). Ne jamais réintroduire de policy
   `USING (true)` pour `authenticated`.
4. **Après tout changement JS/CSS : `./scripts/bump-cache.sh`** (ou installer
   le hook : `./scripts/install-pre-commit.sh`). Sinon les navigateurs gardent
   l'ancien code en cache.
5. Utiliser les variables CSS de `meiji-app/css/styles.css` (`--c-*`, `--r-*`,
   `--font-*`) — pas de nouvelles couleurs en dur.
6. Ne pas casser la compatibilité des clés de stockage (`meiji-*` en
   localStorage, clés `app_state`) : elles contiennent les données réelles du
   restaurant. Toute migration doit préserver l'existant (voir
   `Depenses.restore()` pour le modèle seeds/`_seed`).
7. Les montants sont des nombres simples ; arrondir avec `Math.round`.

## 4. Flux de données à connaître

- **Saisie** : brouillons (localStorage, par navigateur) → « Valider » →
  push dans `Data.*` → `persist()` (localStorage + cloud) → `App.renderAll()`.
- **Restauration** : `App.restoreAll()` au démarrage et au retour de focus
  (`refreshFromCloud`, throttlé et gardé). Le cloud est la source de vérité ;
  les seeds de `data.js` ne sont conservés que s'ils n'existent pas côté stockage.
- **IDs** : `Data.newId()` (compteur `nextId`), recalé par
  `Data.bumpNextIdFromAllData()` après restauration.
- **Clôtures mensuelles** : `Clotures.isMonthClosed()/guard()` doivent être
  vérifiés avant toute création/modif/suppression datée.
- **Audit** : toute action de données passe par `Audit.log(action, module, …)`
  dans un try/catch silencieux.

## 5. Vérifications avant livraison

- `node --check` sur chaque fichier JS modifié.
- Tester le parcours réel touché (saisie → valider → recharger la page).
- Vérifier le mode public (sans Supabase) ET le mode connecté si le changement
  touche la persistance.
- `./scripts/bump-cache.sh` lancé, jeton `?v=` mis à jour dans l'index.
- Pas de `console.error` au chargement.

## 6. Git

- Développer sur la branche indiquée par la session (jamais directement `main`).
- Messages de commit en français, préfixe conventionnel (`fix(depenses): …`,
  `feat(stock): …`, `chore(cache): …`).
