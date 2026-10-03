# Fondé 44

Application mobile-first de découverte et de commande pour Fondé 44.

## Parcours client

- `/q` : entrée QR officielle.
- `/q?source=emballage` : attribution de la source du QR.
- Découverte sans compte.
- Catalogue chargé depuis PostgreSQL.
- Catalogue → produit → panier → checkout.
- Livraison à **500 FCFA** à partir de **3 pots** de fondé/thiakry.
- Retrait gratuit.
- Nom, téléphone et adresse collectés au moment de la commande.
- Commande enregistrée dans PostgreSQL avec référence publique `FD-...`.
- Protection contre le double envoi grâce à une référence client idempotente.
- Historique local des commandes pour retrouver et recommander rapidement.
- Commande vocale via Web Speech API si le navigateur la supporte.
- Événements/cérémonies enregistrés dans PostgreSQL.
- Mode clair / sombre.
- PWA installable.

## Prix de référence

- Fondé : **200 FCFA / pot**
- Thiakry : **300 FCFA / pot**
- Poudre de mil : **1 500 FCFA / kg**
- Livraison : **500 FCFA**, uniquement à partir de 3 pots de fondé/thiakry.

Les prix utilisés lors d'une commande sont toujours relus depuis PostgreSQL côté serveur.

## Architecture

```text
React / Vite
    │
    ├── catalogue → GET /api/products
    ├── commande  → POST /api/orders
    └── événement → POST /api/events
                         │
                         ▼
                    PostgreSQL
```

Le navigateur conserve uniquement les éléments utiles à l'expérience client (panier, profil local, historique local). PostgreSQL est la source de vérité pour le catalogue et les commandes.

## Développement avec Docker

Pré-requis : Docker Engine + Docker Compose v2.

```bash
docker compose up --build
```

Puis :
- Application : http://localhost:3000
- Santé API : http://localhost:3000/api/health
- Catalogue : http://localhost:3000/api/products
- PostgreSQL : port `5433`

Vérifications :
```bash
docker compose ps
curl http://localhost:3000/api/health
curl http://localhost:3000/api/products
```

Pour repartir avec une base locale propre :
```bash
docker compose down -v
docker compose up --build
```

## Développement sans Docker

```bash
npm install
npm run dev
npm run build
npm run preview
```

Le mode Vite seul sert le frontend. Pour tester les API localement, utiliser le stack Docker.

## WhatsApp

Si `VITE_WHATSAPP_PHONE` est configuré, un récapitulatif de commande peut être ouvert dans WhatsApp après l'enregistrement de la commande.

Aucun secret de production ne doit être commité.

## Paiement

Le checkout enregistre le mode souhaité (`Espèces`, `Wave` ou `Orange Money`). Le paiement mobile n'est **pas encore capturé automatiquement** : aucune commande ne doit être présentée comme payée tant qu'un fournisseur et ses webhooks n'ont pas été intégrés.

## Avant production

- configurer PostgreSQL de production ;
- exécuter les migrations SQL ;
- configurer `VITE_WHATSAPP_PHONE` si nécessaire ;
- intégrer et vérifier le fournisseur de paiement ;
- ajouter authentification et espaces Mère Fondé / Livreur ;
- ajouter la gestion réelle du stock ;
- vérifier le parcours mobile sur appareils réels ;
- configurer domaine, monitoring et sauvegardes.

## Limites volontairement explicites

Cette version est le socle client/full-stack. Elle ne prétend pas encore remplacer un système métier complet : paiement automatisé, stock transactionnel, comptes/roles, dispatch livraison et comptabilité restent des modules à construire.