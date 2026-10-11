# Fondé 44 — Frontend

Cette version reconstruit l'expérience **Client** de Fondé 44 en mobile-first avec des données mockées réalistes.

## Parcours inclus

- Accueil
- Catalogue / recherche
- Fiche produit
- Ma commande avec quantités
- Minimum livraison de 3 pots
- Livraison / retrait
- Adresse
- Paiement Wave / Orange Money / espèces
- Confirmation
- Suivi de commande
- Historique
- Recommande
- Profil
- Adresse principale
- Abonnement matin + soir
- Demande événement
- Entrée commande vocale (interface préparée, traitement à connecter au backend)

## Prix mockés

- Fondé : 200 FCFA / pot
- Thiakry : 300 FCFA / pot
- Poudre de mil : 1 500 FCFA / kg

Les images utilisées sont des photos distantes Unsplash à remplacer par des assets validés/licenciés pour la production.

## Lancer

```bash
npm install
npm run dev
```

Puis ouvrir l'URL affichée par Vite.


## Espaces métier

Le frontend prépare trois espaces cohérents autour du même métier :

- **Client** : découvrir, commander, payer, suivre et recommander.
- **Mère Fondé** : piloter les commandes, la production, les livraisons, le stock et la trésorerie.
- **Livreur** : récupérer une mission, suivre son étape, livrer et clôturer.

Les données restent mockées côté frontend. L'authentification, les commandes persistées, les paiements, les notifications, le stock, la comptabilité et les règles métier définitives seront branchés au backend.
