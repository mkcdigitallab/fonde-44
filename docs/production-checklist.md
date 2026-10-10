# Fondé 44 — checklist production

## Variables d'environnement de production

Définir côté déploiement, sans réutiliser les valeurs de développement :

- DATABASE_URL
- PUBLIC_BASE_URL (en HTTPS)
- ORDER_TRACKING_SECRET (obligatoire, au moins 32 octets aléatoires, jamais commité)
- NODE_ENV=production
- MINIO_ENDPOINT
- MINIO_ACCESS_KEY
- MINIO_SECRET_KEY
- MINIO_BUCKET
- S3_REGION
- S3_AUTO_CREATE_BUCKET=false
- GOOGLE_CLIENT_ID
- VITE_GOOGLE_CLIENT_ID
- WAVE_API_KEY
- WAVE_WEBHOOK_SECRET
- OM_* (variables Orange Money requises par le fournisseur)
- SUBSCRIPTIONS_CRON_SECRET
- SUBSCRIPTIONS_ENABLED=false tant que la tâche planifiée de génération des commandes n'est pas configurée

Les abonnements restent désactivés tant qu'une tâche planifiée sécurisée, utilisant `SUBSCRIPTIONS_CRON_SECRET`, n'est pas configurée pour appeler `POST /api/subscriptions/run` et que sa génération de commandes n'a pas été vérifiée. Ne passe `SUBSCRIPTIONS_ENABLED` à `true` qu'après ce contrôle.

Le bucket de production doit rester **privé**. Les images et vocaux passent par l'API média, jamais par une exposition publique directe du bucket.

## Webhooks

Enregistrer auprès des fournisseurs :

- `PUBLIC_BASE_URL + /api/payments/webhook/wave`
- `PUBLIC_BASE_URL + /api/payments/webhook/orange`

Avant activation des paiements, valider les webhooks avec un événement réel de test sur un déploiement d'aperçu Vercel et avec la documentation des fournisseurs.

## Checklist après déploiement

- [ ] Catalogue visible.
- [ ] Photo d'un produit enregistrée et lisible.
- [ ] Commande en espèces.
- [ ] Vocal lu dans le dashboard Mère Fondé, y compris sur iPhone.
- [ ] Connexion `/equipe`.
- [ ] Activation d'un compte personnel.
- [ ] Inscription d'un client.
- [ ] Bouton Google.
- [ ] Paiement Wave de test uniquement si Wave apparaît disponible dans `GET /api/config`.
- [ ] Paiement Orange Money de test uniquement si Orange Money apparaît disponible dans `GET /api/config`.
- [ ] Tâche planifiée de génération des commandes configurée et vérifiée avant d'activer les abonnements.
- [ ] Sauvegarde de la base.

## Sauvegarde et restauration

Mettre en place un `pg_dump` quotidien avec une rétention définie par l'exploitation. Tester régulièrement une restauration réelle sur une base séparée ; une sauvegarde non restaurée n'est pas considérée comme vérifiée.

## Important

Le frontend ne contient aucune clé PostgreSQL. Le montant final d'une commande est calculé côté serveur à partir du catalogue PostgreSQL.

Les paiements Wave/Orange Money ne sont pas déclarés comme « réels » tant que leurs credentials et leurs callbacks/signatures n'ont pas été configurés et testés avec leurs fournisseurs.
