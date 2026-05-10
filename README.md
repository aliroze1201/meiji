# 🍣 MEIJI — Application de Gestion Restaurant

Application web complète de gestion pour le restaurant MEIJI (SUSHI · BAR · CHICHA).

## Structure du projet

```
meiji-app/
├── index.html              # Page principale
├── css/
│   └── styles.css          # Tous les styles
├── js/
│   ├── main.js             # Point d'entrée, navigation, init
│   ├── data.js             # Données globales (journées, employés, etc.)
│   ├── charts.js           # Graphiques (Canvas 2D)
│   └── modules/
│       ├── dashboard.js    # Tableau de bord + filtres période
│       ├── journee.js      # Journées quotidiennes
│       ├── depenses.js     # Dépenses + analyse charges
│       ├── banque.js       # Compte bancaire
│       ├── mobile.js       # Mobile Money
│       ├── categories.js   # Gestion des catégories
│       ├── employes.js     # Employés + comptes
│       ├── credits.js      # Crédits clients
│       ├── fournisseurs.js # Fournisseurs
│       └── bilan.js        # Bilan comptable
└── README.md
```

## Fonctionnalités

### Tableau de bord
- Sélection de période : Jour / Mois / Année / Tout
- Caisses SUSHI, BAR, CHICHA avec détail par mode de paiement (Espèces / Chèque / Mobile / Crédit)
- Graphiques : CA par journée, répartition CA, CA vs Charges, modes de paiement
- Solde bancaire et Mobile Money en temps réel

### Journées
- Enregistrement du CA par caisse et par mode de paiement
- Dépenses détaillées avec catégorie, libellé, montant
- Modification et suppression de toute journée

### Finances
- Recettes CA par département
- Dépenses filtrées par département et catégorie
- Analyse des charges regroupées par nature

### Banque & Mobile Money
- Solde actuel mis à jour manuellement
- Historique des mouvements (entrées / sorties)
- Suivi par opérateur / banque

### Gestion
- Catégories personnalisables (recettes + dépenses)
- Fiche employés avec salaires, primes, avances
- Comptes individuels (CHRIST, FRANCIS, KING)
- Crédits clients avec statut ouvert/réglé
- Fournisseurs : BATIMAT, REGAL, ORCA, HUSS NEHME
- Bilan comptable complet

## Démarrage

Ouvrez simplement `index.html` dans un navigateur.
Aucune dépendance externe requise (pas de Node.js, pas de build).

## Améliorations possibles (à demander à Claude Code)

- [ ] Export Excel / CSV des données
- [ ] Sauvegarde localStorage (persistance des données)
- [ ] Export PDF du bilan
- [ ] Ajout de nouveaux employés
- [ ] Alertes crédits clients en retard
- [ ] Graphiques plus avancés (Chart.js)
- [ ] Mode sombre
- [ ] Version mobile responsive
- [ ] Connexion Google Sheets (API)
- [ ] Authentification multi-utilisateur
