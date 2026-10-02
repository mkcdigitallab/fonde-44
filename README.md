# Fondé 44

MVP client mobile-first pour le lancement de Fondé 44 : découverte par QR, catalogue, panier, commande, historique et PWA.

## Parcours public

- `/q` : entrée QR officielle.
- `/q?source=emballage` : suivi de la source du QR.
- Découverte sans compte.
- Catalogue → produit → panier.
- Livraison débloquée à partir de **3 pots**.
- Checkout avec nom, téléphone, adresse si livraison et mode de paiement.
- Commande persistée localement sur l’appareil.
- Historique et recommandation.
- Commande vocale via Web Speech API si le navigateur la supporte.
- Partage du lien QR.
- Mode clair / sombre.
- PWA installable.

## Prix

- Fondé : 200 FCFA / pot
- Thiakry : 300 FCFA / pot
- Poudre de mil : 1 500 FCFA / kg
- Livraison : 500 FCFA à partir de 3 pots

## WhatsApp

Le récapitulatif peut être envoyé à Mère Fondé si la variable Vercel suivante est configurée :

```
VITE_WHATSAPP_PHONE=221XXXXXXXXX
```

Ne jamais mettre un secret dans le dépôt.

## Lancer et vérifier

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Déploiement

Projet Vite compatible Vercel. Avant le lancement public, configurer `VITE_WHATSAPP_PHONE`, vérifier le domaine et tester le parcours mobile.

## Limites MVP explicites

Les commandes sont encore stockées dans le navigateur. Cette étape permet un lancement de vitrine/commande assistée mais n'est pas encore un backend transactionnel. La phase suivante branche PostgreSQL, authentification, paiement Wave/Orange Money, notifications, stock, comptabilité, espace Mère Fondé et espace Livreur.
