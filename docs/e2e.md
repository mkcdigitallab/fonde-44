# Test de bout en bout Fondé 44

Le script `scripts/e2e.mjs` vérifie le parcours public des commandes et, lorsque les identifiants de personnel sont fournis, les transitions Mère Fondé/livreur, les annulations et les droits.

## Prérequis

- Node.js 20 ou plus récent.
- Une instance Fondé 44 déjà démarrée.
- Une base PostgreSQL compatible avec l'application.
- Aucun compte réel n'est requis pour le parcours public.

Le script **n'exécute aucune création de compte staff** et n'affiche jamais de mot de passe, cookie, jeton de suivi ou email de personnel.

## Usage

Par défaut :

```bash
npm run test:e2e
```

La base de test est :

```text
E2E_BASE_URL=http://localhost:3000
```

Variables optionnelles pour activer les étapes staff :

```text
E2E_BASE_URL
E2E_MERE_EMAIL
E2E_MERE_PASSWORD
E2E_LIVREUR_EMAIL
E2E_LIVREUR_PASSWORD
```

Si les quatre variables staff ne sont pas présentes, le script exécute uniquement les parcours publics et marque les étapes nécessitant le personnel comme `SKIP`.

## Limites et sécurité du test

Le script crée au maximum **6 commandes par exécution**, conformément à la limite applicative de 10 commandes par IP sur 15 minutes. Un HTTP 429 est affiché comme un échec avec le code reçu et le script conserve le résumé final.

Une seconde d'attente est appliquée après chaque changement de statut dont dépend l'étape suivante.

## Nettoyage manuel

Après un test, nettoyer les commandes de test avec :

```sql
delete from orders.orders
where customer_name = 'E2E TEST';
```

Les lignes liées sont supprimées avec les commandes grâce aux suppressions en cascade définies par le schéma.

## Vérification des secrets

Ne placez jamais de secrets dans le dépôt. Les identifiants E2E doivent être fournis uniquement par les variables d'environnement ou les secrets de CI.

Avant de pousser, vérifier notamment :

```bash
git status --short
grep -RInE 'E2E_MERE_PASSWORD|E2E_LIVREUR_PASSWORD|DATABASE_URL=|password[=:]' .env scripts --exclude='*.md'
```

Le workflow CI fourni pour le test PostgreSQL utilise uniquement des valeurs de démonstration locales au job, jamais des secrets réels.
