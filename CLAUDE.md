# CLAUDE.md — Instructions pour la création du site web

> Ce fichier guide Claude Code dans la création du site web.
> Le logo et la charte graphique sont fournis par le client.
> Lire entièrement avant d'écrire la moindre ligne de code.

---

## 1. Contexte du projet

| Champ | À renseigner |
|---|---|
| **Nom du projet / marque** | _(ex. Restaurant Meiji)_ |
| **Type de site** | _(vitrine / e-commerce / portfolio / SaaS…)_ |
| **Public cible** | _(ex. clients locaux, professionnels B2B…)_ |
| **Langue principale** | _(ex. Français)_ |
| **URL de production prévue** | _(ex. www.meiji-brazza.com)_ |

---

## 2. Assets fournis par le client

> ⚠️ Ne jamais inventer ni remplacer ces éléments. Utiliser uniquement ce qui est fourni.

### 2.1 Logo
- **Fichier(s)** : placer dans `assets/logo/`
- Formats attendus : SVG (prioritaire) + PNG fond transparent
- Variantes à gérer :
  - [ ] Logo principal (couleur)
  - [ ] Logo blanc (pour fonds sombres)
  - [ ] Favicon (`.ico` ou `32×32 PNG`)

### 2.2 Charte graphique
- **Fichier(s)** : placer dans `assets/brand/`  
  _(PDF charte, Figma export, image de référence…)_

Extraire et déclarer dans `styles/tokens.css` :

```css
:root {
  /* ── Couleurs (extraites de la charte) ── */
  --color-primary:    /* couleur principale */;
  --color-secondary:  /* couleur secondaire */;
  --color-accent:     /* couleur d'accent */;
  --color-bg:         /* fond général */;
  --color-surface:    /* fond cartes/sections */;
  --color-text:       /* texte principal */;
  --color-text-muted: /* texte secondaire */;
  --color-border:     /* bordures */;

  /* ── Typographie (extraite de la charte) ── */
  --font-display: /* police titres */;
  --font-body:    /* police corps */;
  --font-mono:    /* police code si besoin */;

  /* ── Espacements ── */
  --spacing-xs:  4px;
  --spacing-sm:  8px;
  --spacing-md:  16px;
  --spacing-lg:  32px;
  --spacing-xl:  64px;
  --spacing-2xl: 128px;

  /* ── Rayons de bordure ── */
  --radius-sm: /* ex. 4px */;
  --radius-md: /* ex. 8px */;
  --radius-lg: /* ex. 16px */;
  --radius-full: 9999px;

  /* ── Ombres ── */
  --shadow-sm: /* ex. 0 1px 3px rgba(0,0,0,.1) */;
  --shadow-md: /* ex. 0 4px 16px rgba(0,0,0,.12) */;
  --shadow-lg: /* ex. 0 16px 48px rgba(0,0,0,.16) */;
}
```

> **Règle absolue** : aucune couleur, police ou taille ne doit être codée en dur dans les composants.
> Tout passe par les variables CSS ci-dessus.

---

## 3. Stack technique

### Choix par défaut (modifier si besoin)
```
HTML5 sémantique + CSS (tokens) + JavaScript vanilla
```

### Alternatives acceptées
- React + Tailwind CSS (si SPA complexe)
- Next.js (si SEO critique + rendu serveur)
- Astro (si site statique performant)

### Contraintes techniques
- [ ] Aucun framework CSS imposé (Bootstrap interdit sauf demande)
- [ ] Pas de dépendances inutiles — chaque package doit être justifié
- [ ] Support navigateurs : Chrome, Firefox, Safari, Edge (2 dernières versions)
- [ ] Mobile-first obligatoire (breakpoints : `sm 480px`, `md 768px`, `lg 1024px`, `xl 1280px`)

---

## 4. Structure de fichiers attendue

```
projet/
├── CLAUDE.md               ← ce fichier
├── index.html              ← page d'accueil
├── assets/
│   ├── logo/               ← fichiers logo fournis
│   │   ├── logo.svg
│   │   ├── logo-white.svg
│   │   └── favicon.ico
│   ├── brand/              ← charte graphique source
│   ├── images/             ← photos et illustrations
│   └── fonts/              ← polices locales si applicable
├── styles/
│   ├── tokens.css          ← variables CSS (couleurs, typo, espacements)
│   ├── global.css          ← reset + styles de base
│   ├── components.css      ← boutons, cartes, formulaires…
│   └── pages/              ← styles spécifiques par page
├── scripts/
│   ├── main.js             ← logique principale
│   └── components/         ← modules JS réutilisables
└── pages/                  ← pages secondaires HTML
```

---

## 5. Pages à créer

> Cocher et décrire chaque page nécessaire.

- [ ] **Accueil** (`index.html`) — hero, accroche principale, CTA
- [ ] **À propos** — histoire, équipe, valeurs
- [ ] **Services / Offres** — liste des prestations ou produits
- [ ] **Galerie / Portfolio** — photos, réalisations
- [ ] **Contact** — formulaire, carte, coordonnées
- [ ] **Mentions légales** — obligatoire
- [ ] _(Ajouter d'autres pages selon le projet)_

---

## 6. Composants réutilisables à créer

Construire ces composants **avant** les pages, en cohérence parfaite avec la charte :

### Navigation
- Logo cliquable (retour accueil)
- Liens de navigation (actif = state visuel distinct)
- Menu hamburger responsive (mobile)
- Comportement au scroll : _(fond transparent → fond plein / sticky…)_

### Pied de page
- Logo + slogan
- Liens rapides
- Réseaux sociaux
- Copyright dynamique (année auto)

### Boutons
```css
/* Dériver de la charte — ex. : */
.btn-primary   { /* couleur primaire, texte contrastant */ }
.btn-secondary { /* bordure, fond transparent */ }
.btn-ghost     { /* texte seul, underline au hover */ }
```

### Cartes
- Carte service / produit
- Carte témoignage
- Carte membre d'équipe

### Formulaire de contact
- Champs : Nom, Email, Sujet, Message
- Validation HTML5 + retour visuel d'erreur
- État de succès après envoi

---

## 7. Règles de design — fidélité à la charte

### Ce que Claude doit faire
- ✅ Extraire les couleurs exactes depuis les fichiers fournis
- ✅ Respecter la hiérarchie typographique de la charte
- ✅ Reproduire le style des composants tels qu'ils apparaissent dans la charte
- ✅ Utiliser le logo dans toutes ses variantes selon le fond (clair/sombre)
- ✅ Appliquer les proportions, marges et espacements de la charte
- ✅ Animer de façon subtile et cohérente avec le ton de la marque

### Ce que Claude ne doit jamais faire
- ❌ Inventer une couleur absente de la charte
- ❌ Remplacer ou recréer le logo
- ❌ Utiliser une police non présente dans la charte
- ❌ Appliquer un style "générique IA" (gradients violet/bleu, Inter, Roboto…)
- ❌ Coder des valeurs en dur dans les composants (toujours utiliser les tokens)
- ❌ Ignorer les breakpoints mobiles

---

## 8. Performance & qualité

### Cibles
| Métrique | Cible |
|---|---|
| Lighthouse Performance | ≥ 90 |
| Lighthouse Accessibilité | ≥ 90 |
| Lighthouse SEO | ≥ 90 |
| First Contentful Paint | < 1.5 s |
| Cumulative Layout Shift | < 0.1 |

### Obligations
- Images : formats WebP + attributs `width`, `height`, `alt` obligatoires
- `loading="lazy"` sur toutes les images sous la ligne de flottaison
- Balises sémantiques : `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Contraste texte/fond ≥ 4.5:1 (WCAG AA)
- Tous les liens et boutons accessibles au clavier (`:focus-visible`)
- `<title>` et `<meta description>` uniques par page

---

## 9. SEO de base

Dans chaque page HTML :
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nom du site — Description courte</title>
  <meta name="description" content="Description unique de la page (< 160 caractères)" />
  <meta property="og:title"       content="..." />
  <meta property="og:description" content="..." />
  <meta property="og:image"       content="assets/images/og-image.jpg" />
  <meta property="og:type"        content="website" />
  <link rel="canonical" href="https://www.exemple.com/page" />
  <link rel="icon" href="assets/logo/favicon.ico" />
</head>
```

---

## 10. Workflow de développement

### Ordre de travail recommandé

```
1. Lire ce fichier en entier
2. Analyser les assets (logo + charte graphique)
3. Déclarer tous les tokens dans styles/tokens.css
4. Créer styles/global.css (reset + base)
5. Construire les composants réutilisables (nav, footer, boutons, cartes)
6. Construire les pages dans l'ordre listé en §5
7. Tester responsive (mobile → desktop)
8. Vérifier accessibilité et performance
9. Relecture finale charte : cohérence visuelle sur toutes les pages
```

### À chaque composant ou page
- Vérifier la cohérence avec la charte avant de passer au suivant
- Corriger immédiatement toute déviation plutôt que de continuer

---

## 11. Contenu textuel

> Le contenu sera fourni par le client. En attendant :
- Utiliser des **placeholders réalistes** en français (pas de Lorem ipsum générique)
- Indiquer clairement `<!-- CONTENU CLIENT À REMPLACER -->` dans le HTML
- Ne jamais inventer des informations sur la marque (prix, adresses, téléphones…)

---

## 12. Livraison

### Checklist avant remise
- [ ] Tous les tokens CSS déclarés et utilisés partout
- [ ] Logo et favicon intégrés correctement
- [ ] Responsive testé sur 320px, 768px, 1280px
- [ ] Formulaire de contact fonctionnel (validation)
- [ ] Aucune image sans attribut `alt`
- [ ] Aucune couleur en dur dans les composants
- [ ] `<title>` et `<meta description>` sur chaque page
- [ ] Code propre, indenté, commenté aux endroits non évidents
- [ ] Aucune console error au chargement

---

*CLAUDE.md — Version 1.0 · À mettre à jour à chaque évolution du projet.*
