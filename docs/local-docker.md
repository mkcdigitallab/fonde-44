# Développement local avec Docker

## Prérequis

- Docker Engine
- Docker Compose v2

Aucun PostgreSQL local n'est nécessaire : PostgreSQL est fourni par le conteneur.

## Démarrage

Depuis la racine du projet :

```bash
docker compose up --build
```

L'application est disponible sur :

- http://localhost:3000
- API santé : http://localhost:3000/api/health
- Catalogue API : http://localhost:3000/api/products

## Vérifier les conteneurs

```bash
docker compose ps
```

## Lire les logs

```bash
docker compose logs -f
```

## Tester l'API

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/products
```

## Ouvrir PostgreSQL

```bash
docker compose exec postgres psql -U fonde44 -d fonde44
```

Dans psql :

```sql
\dt
SELECT id, name, price, stock_quantity FROM products;
\q
```

## Arrêter

```bash
docker compose down
```

Pour supprimer aussi les données PostgreSQL locales :

```bash
docker compose down -v
```

Cette dernière commande est destructive pour la base locale et permet de rejouer `db/schema.sql` au prochain démarrage.

## Architecture locale

```
Navigateur
    │
    ▼
localhost:3000
    │
    ▼
Vercel CLI (runtime local)
    ├── Vite / React
    └── /api/* → Vercel Functions
                     │
                     ▼
                 PostgreSQL
                 fonde44-postgres
```

Le but est de conserver le même modèle `api/*.js` que celui utilisé par Vercel en production, plutôt que de créer un backend Docker différent.

## Important

Les identifiants PostgreSQL fournis par Compose sont uniquement destinés au développement local. Aucun secret de production ne doit être commité.
