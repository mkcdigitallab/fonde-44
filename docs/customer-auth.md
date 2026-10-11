# Comptes clients

Les comptes clients sont séparés des comptes du personnel. Le cookie client `fonde44_customer` est utilisé uniquement par les routes `/api/customer/*` et n'est jamais interprété par `getSessionUser` ou `requireRole`. Les sessions sont stockées dans `auth.customer_sessions`, avec une durée de 30 jours.

## Routes

Pour les méthodes POST/PATCH/DELETE, l'en-tête `Origin` (ou `Referer` s'il manque) doit correspondre à l'origine de la requête ou à `PUBLIC_BASE_URL`.

### Inscription

```bash
curl -i -b cookies.txt -c cookies.txt -H 'Origin: https://example.com' -H 'Content-Type: application/json' \
  -d '{"displayName":"Awa Ndiaye","email":"awa@example.com","password":"motdepasse123","phone":"771234567"}' \
  https://example.com/api/customer/register
```

Limite : 5 inscriptions par heure et par IP. L'inscription crée une session immédiatement.

### Connexion par mot de passe

```bash
curl -i -b cookies.txt -c cookies.txt -H 'Origin: https://example.com' -H 'Content-Type: application/json' \
  -d '{"email":"awa@example.com","password":"motdepasse123"}' \
  https://example.com/api/customer/login
```

Limites : 10 requêtes / 15 min / IP et 5 / 15 min / email.

### Connexion Google

```bash
curl -i -b cookies.txt -c cookies.txt -H 'Origin: https://example.com' -H 'Content-Type: application/json' \
  -d '{"credential":"GOOGLE_ID_TOKEN"}' \
  https://example.com/api/customer/google
```

Limite : 20 requêtes / 15 min / IP. Le serveur vérifie le jeton avec Google et exige `email_verified=true`.

Un compte Google existant est retrouvé par `google_sub`. Si l'email appartient déjà à un compte mot de passe sans `google_sub`, le serveur ne lie pas automatiquement les deux identités et renvoie `email_exists_use_password`. Cela évite de transformer automatiquement une identité Google en accès à un compte existant sans action explicite du client.

### Déconnexion

```bash
curl -i -b cookies.txt -H 'Origin: https://example.com' -X POST \
  https://example.com/api/customer/logout
```

### Session courante

```bash
curl -i -b cookies.txt https://example.com/api/customer/me
```

### Modifier le profil

```bash
curl -i -b cookies.txt -H 'Origin: https://example.com' -H 'Content-Type: application/json' \
  -X PATCH -d '{"displayName":"Awa Ndiaye","phone":"771234567"}' \
  https://example.com/api/customer/me
```

Seuls `displayName` et `phone` sont modifiables.

### Commandes du client

```bash
curl -i -b cookies.txt https://example.com/api/customer/orders
```

La réponse contient au maximum les 50 commandes les plus récentes et leurs lignes.

### Suppression du compte

```bash
curl -i -b cookies.txt -H 'Origin: https://example.com' -H 'Content-Type: application/json' \
  -X DELETE -d '{"confirm":"SUPPRIMER","password":"motdepasse123"}' \
  https://example.com/api/customer/me
```

Si le compte possède un mot de passe, celui-ci est obligatoire et doit être valide. Les commandes sont conservées et leur `customer_id` devient `NULL`.

## Séparation des sessions

- Personnel : cookie `fonde44_session`, table `auth.sessions`.
- Client : cookie `fonde44_customer`, table `auth.customer_sessions`.
- Un cookie client ne peut pas authentifier une route personnel et inversement.
- Les réponses ne renvoient jamais `password_hash`, `google_sub` ou `token_hash`.

## Limites connues

- Il n'y a pas encore de vérification d'email.
- Il n'y a pas encore de réinitialisation de mot de passe.
- La liaison automatique entre un compte mot de passe et Google est volontairement interdite.


## Interface client

Le compte est facultatif : le parcours de commande reste disponible sans compte. Depuis Profil, un visiteur peut se connecter ou créer un compte. Après une commande invitée, un encart propose de créer un compte pour retrouver ses commandes. Aucune donnée d’identification n’est stockée dans localStorage, sessionStorage ou la console.

## Configurer Google

- Définir GOOGLE_CLIENT_ID côté serveur.
- Définir VITE_GOOGLE_CLIENT_ID à la construction puis relancer npm run build.
- Ajouter les origines JavaScript autorisées dans la console Google.
- En statut En test, ajouter les utilisateurs tests autorisés.
- La CSP de vercel.json autorise les ressources Google Identity Services nécessaires.
- Un compte existant avec mot de passe n’est jamais lié automatiquement à Google.


## Nettoyage du catalogue

Les produits de départ ne fournissent plus d’URL d’image de démonstration. Une photo absente est gérée par l’interface avec un emplacement neutre, sans catalogue local de secours.

En production, les photos envoyées par Mère Fondé sont servies par l’application via des chemins relatifs (`/api/media/object` avec MinIO, ou `/media` avec le stockage local). Le navigateur utilise donc l’origine de l’application (`'self'`) et aucune origine MinIO publique n’est à inventer dans la CSP. Si l’architecture de stockage est un jour exposée directement au navigateur, son origine devra être ajoutée explicitement à `img-src` après configuration réelle.
