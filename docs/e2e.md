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

## Vérifier le stockage média et les vocaux

L'E2E vérifie que `GET /api/config` fournit un booléen `voice`, qu'un visiteur non authentifié ne peut pas lire un objet sous `voice/`, et que l'envoi vocal retourne `503 voice_storage_not_configured` lorsque `voice=false`. Lorsque `voice=true`, l'E2E saute l'envoi d'un vrai objet pour ne pas écrire dans le stockage d'un environnement partagé.

Le test d'intégration S3 écrit, relit, teste l'accès anonyme puis supprime un objet temporaire :

```bash
npm run test:storage
```

Ce test nécessite `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY` et `MINIO_SECRET_KEY`, ainsi qu'un bucket déjà créé. Il ne doit pas être lancé avec des identifiants d'un environnement partagé sans autorisation.

### Vérification manuelle des trois comportements média

À réaliser sur une instance locale ou de test avec un compte Mère Fondé activé. Remplacez les valeurs entre chevrons par les identifiants d'objets et de session de test ; ne partagez jamais les cookies de session.

1. **Photo publique et cache long** : choisissez une clé réelle de photo du catalogue, par exemple `catalog/<photo-de-test>.webp`, puis ouvrez `/api/media/object?key=catalog/<photo-de-test>.webp` dans une fenêtre privée. La réponse doit être `200` et l'en-tête `Cache-Control` doit contenir `public, max-age=31536000, immutable`.
2. **Vocal protégé** : ouvrez `/api/media/object?key=voice/<vocal-de-test>.webm` sans être connecté. La réponse doit être `401`. Connectez-vous ensuite à l'espace équipe avec un compte de rôle `mere-fonde` ou `superadmin), puis ouvrez la même URL : la lecture doit être autorisée. Un autre rôle du personnel ne doit pas avoir accès au vocal.
3. **Lecture partielle audio** : avec la session autorisée, envoyez une requête `GET` sur le vocal avec l'en-tête `Range: bytes=0-99`. La réponse attendue est `206 Partial Content`, avec `Accept-Ranges: bytes` et un en-tête `Content-Range` commençant par `bytes 0-99/`.

Exemple de contrôle des en-têtes d'une photo (aucun cookie nécessaire) :

```bash
curl -sS -D - -o /dev/null 'http://localhost:3000/api/media/object?key=catalog/<photo-de-test>.webp'
```

Les vérifications manuelles ci-dessus ne sont pas déclarées réussies tant qu'elles n'ont pas été exécutées sur un environnement disposant d'une photo, d'un vocal et d'un compte de test.


### Parcours vocal client et suivi

Lorsque `GET /api/config` renvoie `voice: true`, le test E2E envoie un court data URL `audio/webm` factice. Il vérifie le refus d'un téléphone absent (`422`), l'envoi avec téléphone (`201`), le suivi `sent`, un jeton invalide masqué par `404), puis, si `E2E_MERE_EMAIL` et `E2E_MERE_PASSWORD` sont configurés, la présence du numéro dans la boîte Mère Fondé, le passage à `heard) et le suivi correspondant. Sans stockage activé, le parcours vocal vérifie le refus `503`.

Pour activer les vocaux sur un environnement local de développement sans S3, définir `VOICE_ALLOW_LOCAL=true`. Cette option est ignorée en production. Le suivi public est limité à 200 requêtes par IP sur 15 minutes et ne renvoie que `{ "status": "sent" | "heard" | "processed" }` en succès, avec `Cache-Control: no-store`.
