# API superadmin

Toutes les routes ci-dessous exigent une session authentifiée avec le rôle `superadmin`. Les appels POST/PUT/PATCH/DELETE exigent aussi un `Origin` ou, à défaut, un `Referer` correspondant à l'origine de la requête ou à `PUBLIC_BASE_URL`.

## Authentification préalable

La connexion utilise `POST /api/auth/login`. Pour conserver la session dans `cookies.txt` :

```bash
curl -c cookies.txt -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -X POST "http://localhost:3000/api/auth/login" \
  -d '{"email":"SUPERADMIN_EMAIL","password":"SUPERADMIN_PASSWORD","role":"superadmin"}'
```

## GET /api/admin/tables

**Rôle :** superadmin.

**Paramètres :** aucun.

**Réponse :** liste des tables explicitement autorisées avec `schema`, `table`, `rows` et `readOnly: true`.

**Exemple :**
```bash
curl -b cookies.txt "http://localhost:3000/api/admin/tables"
```

## GET /api/admin/table

**Rôle :** superadmin.

**Paramètres :** `name` au format `schema.table`, `page` (défaut 1), `pageSize` (défaut 50, maximum 100).

**Exemple :**
```bash
curl -b cookies.txt "http://localhost:3000/api/admin/table?name=orders.orders&page=1&pageSize=50"
```

L'ordre utilise la clé primaire quand elle existe, sinon `created_at DESC` si la colonne existe.

## GET /api/admin/audit

**Rôle :** superadmin.

**Paramètres :** `page` (défaut 1), `pageSize` (défaut 50, maximum 100).

**Exemple :**
```bash
curl -b cookies.txt "http://localhost:3000/api/admin/audit?page=1&pageSize=50"
```

## POST /api/admin/action

**Rôle :** superadmin.

**Corps strict :**
```json
{"action":"staff.deactivate","params":{"publicId":"USR-XXXXXXXXXX"},"confirm":"DESACTIVER"}
```

**Actions autorisées :**
- `staff.deactivate` : désactive un compte, supprime ses sessions, refuse son propre compte et le dernier superadmin actif.
- `staff.revoke_sessions` : supprime toutes les sessions du compte ciblé.
- `staff.issue_activation_code` : `params.role` vaut `superadmin`, `mere-fonde` ou `livreur`, et `params.days` vaut 1 à 14. Le code est retourné une seule fois et n'est jamais écrit dans l'audit.

**Exemples :**
```bash
curl -b cookies.txt -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -X POST "http://localhost:3000/api/admin/action" \
  -d '{"action":"staff.deactivate","params":{"publicId":"USR-XXXXXXXXXX"},"confirm":"DESACTIVER"}'

curl -b cookies.txt -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -X POST "http://localhost:3000/api/admin/action" \
  -d '{"action":"staff.revoke_sessions","params":{"publicId":"USR-XXXXXXXXXX"},"confirm":""}'

curl -b cookies.txt -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -X POST "http://localhost:3000/api/admin/action" \
  -d '{"action":"staff.issue_activation_code","params":{"role":"superadmin","days":7},"confirm":""}'
```

## Ce que l'API superadmin ne fait volontairement pas

- Pas de SQL libre ou de requête SQL fournie par le client.
- Pas de lecture de `auth.sessions`.
- Pas de lecture de `auth.login_attempts`.
- Les colonnes dont le nom contient `password`, `token`, `secret` ou `code_hash` ont leur valeur remplacée par `[masqué]`.
- Les codes d'activation, mots de passe, jetons et hashes ne sont jamais inscrits dans l'audit.
- Les tables exposées sont en lecture seule ; les écritures passent uniquement par les actions nommées.
