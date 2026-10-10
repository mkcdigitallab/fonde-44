# Création des comptes du personnel

Les comptes `superadmin`, `mere-fonde` et `livreur` ne sont plus créés automatiquement par la migration.

Pour générer un code d'activation à usage unique :

    npm run create-activation-code -- --role <superadmin|mere-fonde|livreur> [--days 7]

Le code est affiché une seule fois. Sa valeur en clair n'est jamais enregistrée en base : seul son SHA-256 est stocké. La durée maximale est de 14 jours.

Transmettez le code au membre du personnel concerné afin qu'il utilise `POST /api/auth/activate` avec son nom, son e-mail et son mot de passe. Un rôle ne peut avoir qu'un seul compte actif.

## Ajouter une route

Toute nouvelle route ajoutée dans `api/` doit aussi être enregistrée dans `server/local.mjs`. Après avoir créé le handler, ajoutez son import et la déclaration de route correspondante dans ce serveur local.
