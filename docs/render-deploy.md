# Déployer Fondé 44 sur Render — banc d'essai gratuit

> **Banc d'essai uniquement.** Ne prends pas de vraies commandes sur cette instance gratuite : le service s'endort, la base expire, il n'y a pas de sauvegardes automatiques et le stockage média/paiement n'est pas configuré par défaut.

## 1. Créer les ressources avec le Blueprint

**Ordre important :** cette branche de préparation n'est pas encore la branche de code que le service Render suivra. Fusionne d'abord le commit dans `release/1.0.0-rc1`, puis crée/synchronise le Blueprint depuis cette branche. Avant la fusion, Render ne verrait pas `render.yaml` sur la branche de release et le service n'aurait pas `server/bootstrap-db.mjs` au démarrage.

1. Ouvre le [tableau de bord Render](https://dashboard.render.com/).
2. Choisis **New → Blueprint**.
3. Connecte le dépôt GitHub `mkcdigitallab/fonde-44` si nécessaire.
4. **Attends que cette branche soit fusionnée dans `release/1.0.0-rc1`**, puis sélectionne `release/1.0.0-rc1` comme branche du Blueprint : c'est là que Render doit lire `render.yaml`.
5. Examine les deux ressources déclarées, puis applique le Blueprint : le service web `fonde44` et PostgreSQL `fonde44-db`, tous deux dans la région Frankfurt.
6. Lorsque Render demande les variables `sync: false`, renseigne-les uniquement dans le tableau de bord Render. **Ne mets aucune valeur secrète dans Git.** Les deux secrets générés par Render ne doivent pas être remplacés par des valeurs commitées.

### Où renseigner les variables

Dans le service web `fonde44` : **Environment** (Variables d'environnement).

| Variable | Où / quand la renseigner |
| --- | --- |
| `DATABASE_URL` | Injectée par le Blueprint depuis `fonde44-db` ; ne la remplace pas par l'URL externe. |
| `NODE_ENV`, `NODE_VERSION`, `TRUSTED_PROXY_HOPS` | Définies par le Blueprint. |
| `ORDER_TRACKING_SECRET`, `SUBSCRIPTIONS_CRON_SECRET` | Générées par Render via `generateValue: true`. |
| `PUBLIC_BASE_URL` | Après le premier déploiement, saisis l'URL HTTPS exacte `https://…onrender.com`, sans slash final. |
| `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` | Depuis le client OAuth Google. `VITE_GOOGLE_CLIENT_ID` est lue **à la construction** : après toute modification, redéploie/reconstruis. |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `S3_REGION` | À renseigner seulement après avoir configuré un stockage compatible S3/MinIO. |
| `WAVE_API_KEY`, `WAVE_WEBHOOK_SECRET` | Identifiants fournis par Wave ; laisser non configurés pour le banc d'essai sans paiement. |
| `OM_MERCHANT_CODE`, `OM_CLIENT_ID`, `OM_CLIENT_SECRET`, `OM_WEBHOOK_SECRET`, `OM_SITENAME` | Identifiants Orange Money fournis par le prestataire ; laisser non configurés pour le banc d'essai sans paiement. |
| `S3_AUTO_CREATE_BUCKET` | Fixée à `false` ; le service ne doit pas créer automatiquement le bucket en production. |

Ne partage jamais dans un chat une URL de base de données, un mot de passe, un jeton ou une clé.

## 2. Après le premier déploiement

1. Attends que le service passe à l'état **Live**, puis copie son URL HTTPS `onrender.com`.
2. Dans **Environment** du service `fonde44`, saisis cette URL dans `PUBLIC_BASE_URL`, sans slash final.
3. Dans la console Google Cloud, ouvre le client OAuth Web utilisé par Fondé 44 et ajoute cette origine exacte (par exemple `https://fonde44-xxxx.onrender.com`) aux **origines JavaScript autorisées**. Ne mets pas de chemin `/equipe` dans l'origine.
4. Renseigne `GOOGLE_CLIENT_ID` et `VITE_GOOGLE_CLIENT_ID` dans Render. La valeur VITE doit être présente lors de la construction.
5. Sauvegarde les variables et lance un nouveau déploiement. Vérifie ensuite `/api/health` et le bouton Google.

## 3. Créer le premier superadmin depuis ta machine

Il n'y a pas de terminal sur le serveur gratuit. Génère le code d'activation **depuis ta propre machine**, dans un terminal où le dépôt a été récupéré.

1. Dans Render, ouvre PostgreSQL `fonde44-db` et copie l'**External Database URL** (URL externe), pas l'URL interne.
2. Utilise cette URL avec `?sslmode=require` (ou `&sslmode=require` si l'URL contient déjà des paramètres).
3. Depuis la racine du dépôt, lance localement la commande ci-dessous en remplaçant le texte d'exemple par l'URL externe. Ne colle jamais cette URL dans un chat et ne la committe pas.

```bash
DATABASE_URL='postgresql://UTILISATEUR:MOT_DE_PASSE@HOTE:PORT/BASE?sslmode=require' node server/create-activation-code.mjs --role superadmin
```

Le script affiche un code d'activation, pas un mot de passe et ne crée pas de compte. Ouvre ensuite `https://…onrender.com/equipe` et utilise le parcours d'activation pour créer le compte superadmin. Ne partage pas le code d'activation.

## 4. Limites de l'offre gratuite

- **Service web :** Render met le service en veille après 15 minutes sans requête entrante (ni message WebSocket entrant). La requête suivante provoque un démarrage à froid.
- **PostgreSQL :** la base gratuite expire 30 jours après sa création et devient inaccessible. La documentation Render indique un délai de grâce de **14 jours après l'expiration** pour passer à un plan payant ; passé ce délai, Render supprime la base et ses données.
- **Sauvegardes :** les bases PostgreSQL gratuites ne bénéficient pas des sauvegardes automatiques proposées aux bases payantes. N'utilise pas cette base comme source de données fiable.
- **Terminal :** aucun shell/terminal de serveur n'est disponible pour ce service gratuit ; les opérations d'administration doivent être lancées depuis ta machine.
- **Stockage :** le Blueprint ne crée pas de stockage S3/MinIO. Sans les variables et le bucket configurés, les tests de photos et de vocaux sont à ignorer.
- **Paiements :** aucune transaction réelle. Sans identifiants et webhooks configurés/testés avec les prestataires, Wave et Orange Money restent désactivés.
- **Région :** service et base sont déclarés à Frankfurt. Render ne permet pas de déplacer directement une ressource existante vers une autre région ; il faut créer une nouvelle ressource et migrer.

Références officielles : [offre gratuite Render](https://render.com/docs/free), [Blueprint YAML](https://render.com/docs/blueprint-spec), [variables d'environnement](https://render.com/docs/configure-environment-variables), [régions](https://render.com/docs/regions).

## 5. Passer à une offre payante

Quand tu voudras utiliser Fondé 44 pour de vraies commandes :

1. Choisis les plans adaptés sur la [page des tarifs Render](https://render.com/pricing).
2. Soit modifie les champs `plan` du service web et de PostgreSQL dans `render.yaml`, puis synchronise le Blueprint ; soit change séparément le plan de calcul de chaque ressource dans le tableau de bord Render.
3. Ne supprime ni ne recrée la base sans avoir planifié la migration et vérifié la restauration. Avant l'expiration de la base gratuite, passe à un plan payant ou exporte les données.
4. Configure et teste les sauvegardes/restaurations, le stockage S3 privé, les clés Google, les webhooks et les paiements avant toute ouverture réelle.

Les identifiants de plans évoluent : choisis les valeurs actuelles depuis la page de tarifs, ne copie pas un nom de plan supposé.

## 6. Checklist après déploiement

Cette checklist reprend `docs/production-checklist.md`. Pour ce banc d'essai gratuit, marque les éléments non configurés comme **ignorés**, pas comme réussis.

- [ ] `/api/health` répond en HTTP 200.
- [ ] Catalogue visible.
- [ ] Connexion à `/equipe`.
- [ ] Activation d'un compte personnel via le code généré localement.
- [ ] Inscription d'un client.
- [ ] Bouton Google (uniquement après configuration OAuth et reconstruction).
- [ ] Commande de test en espèces, avec données fictives seulement.
- [ ] Photo d'un produit enregistrée et lisible — **ignorer si le stockage S3/MinIO n'est pas configuré**.
- [ ] Vocal lu dans le dashboard Mère Fondé, y compris sur iPhone — **ignorer si le stockage S3/MinIO n'est pas configuré**.
- [ ] Paiement Wave de test — **ignorer sur le banc d'essai tant que les credentials/webhooks ne sont pas configurés et validés**.
- [ ] Paiement Orange Money de test — **ignorer tant que les credentials/webhooks ne sont pas configurés et validés**.
- [ ] Sauvegarde/restauration de la base — **non disponible en sauvegarde automatique sur le plan gratuit ; avant tout usage réel, mettre en place et tester une sauvegarde externe**.

## En-têtes de sécurité Vercel et Render

`vercel.json` doit rester du JSON strict : n'y ajoute pas de commentaire, car cela pourrait invalider la configuration Vercel. Pour toute modification de la CSP ou des autres en-têtes, garde les valeurs de `vercel.json` synchronisées avec `server/security-headers.mjs`, utilisé par le serveur Render.

## 7. Incertitude sur l'adresse IP derrière les proxies Render

Le [guide officiel Render sur la protection DDoS](https://render.com/articles/how-render-handles-ddos-attacks) indique que les requêtes publiques passent par Cloudflare et les load balancers Render, et recommande de lire `X-Forwarded-For` pour retrouver l'adresse cliente. Il indique aussi que Render transmet `CF-Ray` pour le diagnostic. Le [guide Render consacré à PocketBase](https://render.com/articles/host-pocketbase-on-render) explique que Cloudflare renseigne `CF-Connecting-IP` sur les requêtes publiques.

En revanche, ces pages ne garantissent pas clairement le nombre exact de proxies ni l'ordre complet des valeurs de `X-Forwarded-For` dans tous les cas. Un ancien fil officiel Render rapporte que Render ajoute une adresse à la fin de la chaîne et que l'adresse cliente se trouvait à gauche. Si c'est encore le comportement de la route utilisée, `TRUSTED_PROXY_HOPS=1` choisira le dernier proxy, pas le visiteur. Le code applique la règle demandée (position depuis la droite, défaut 1), mais **il faut confirmer la chaîne réelle dans les journaux/avec Render avant de considérer cette valeur comme validée pour la limitation par IP**. Ne remplace pas ce réglage par une supposition.
