# Stockage durable des médias

Fondé 44 utilise un stockage compatible S3 pour conserver durablement les photos du catalogue et les messages vocaux. Le bucket doit rester privé : les photos du catalogue sont rendues publiques par l'application, tandis que les vocaux passent par une route qui vérifie le rôle du personnel.

Cloudflare R2 et Backblaze B2 sont des exemples de fournisseurs compatibles S3. Vérifiez leurs documentations officielles pour les paramètres exacts de votre compte.

## 1. Créer un bucket privé

1. Créez un bucket dédié à Fondé 44.
2. Désactivez l'accès public au bucket et à ses objets.
3. Créez une clé dédiée à l'application, limitée à ce bucket.
4. Accordez uniquement les permissions objet nécessaires :
   - lecture d'objet (GetObject) ;
   - écriture d'objet (PutObject) ;
   - suppression d'objet (DeleteObject).
5. N'accordez pas de droits d'administration du compte ni de création de bucket à la clé de l'application.
6. Notez l'endpoint S3, la région, le nom du bucket, l'identifiant de clé et le secret.

L'application ne doit pas créer automatiquement le bucket en production. Créez-le dans la console du fournisseur avant de configurer Fondé 44.

## 2. Variables d'environnement

Configurez ces variables dans Render, dans les variables du service web fonde44. Ne les inscrivez jamais dans Git, dans un ticket ou dans une capture d'écran.

- MINIO_ENDPOINT : endpoint S3 fourni par votre fournisseur.
- MINIO_ACCESS_KEY : identifiant de la clé dédiée.
- MINIO_SECRET_KEY : secret associé à cette clé.
- MINIO_BUCKET : nom du bucket privé.
- S3_REGION : région attendue par le fournisseur.
- S3_FORCE_PATH_STYLE : true pour les endpoints qui utilisent une URL de type endpoint/bucket/objet ; false si le fournisseur exige le nom du bucket dans le nom d'hôte.
- S3_AUTO_CREATE_BUCKET : false en production.

Les noms MINIO_* sont conservés pour compatibilité avec la configuration existante ; ils peuvent contenir les paramètres d'un fournisseur compatible S3 autre que MinIO. La fabrique utilise S3_REGION et S3_FORCE_PATH_STYLE. La création automatique du bucket est désactivée en production même si S3_AUTO_CREATE_BUCKET est accidentellement réglé à true.

Après avoir renseigné les variables, redéployez le service. GET /api/config renvoie alors voice: true si les trois variables MINIO_ENDPOINT, MINIO_ACCESS_KEY et MINIO_SECRET_KEY sont définies. Sans elles, voice: false et l'interface masque les options vocales.

## 3. Vérifier le stockage

Utilisez Node.js 20 ou plus récent et installez les dépendances du dépôt :

    npm ci
    npm run test:storage

Le test exige les trois variables MINIO_ENDPOINT, MINIO_ACCESS_KEY et MINIO_SECRET_KEY. Sans configuration, il affiche un FAIL explicite et retourne un code de sortie non nul.

Le test écrit un petit objet temporaire, le relit avec les identifiants configurés, vérifie qu'une lecture anonyme de son URL est refusée, puis supprime l'objet. Il n'affiche aucune clé d'accès ni aucun secret. Lancez-le avec un compte dédié disposant des droits minimaux ci-dessus.

Le test ne crée pas le bucket. Si la suppression échoue, supprimez l'objet temporaire dans la console du fournisseur et corrigez les permissions avant de relancer le test.

## 4. Comportement des médias

- Les objets sous catalog/ sont servis publiquement par /api/media/object avec un cache long.
- Les objets sous voice/ sont accessibles uniquement à un compte de rôle mere-fonde ou superadmin.
- Les requêtes audio avec un en-tête HTTP Range doivent retourner 206 Partial Content et Content-Range.
- Le bucket S3 reste privé ; n'activez pas de politique d'accès anonyme pour publier les photos. L'application joue le rôle de passerelle pour les photos du catalogue.
- Le stockage local est réservé au développement et aux tests. Il n'est pas considéré comme durable sur une instance hébergée éphémère.


## 5. Vocaux en développement local uniquement

Pour développer l'interface vocale sans fournisseur S3, définissez `VOICE_ALLOW_LOCAL=true`. Cette option n'active le stockage local que si `NODE_ENV` est différent de `production`. En production, la variable est ignorée et les vocaux restent désactivés sans configuration S3 persistante. Le stockage local se trouve dans `MEDIA_DIR` (par défaut `storage/media`) et ne doit pas être considéré comme durable sur un hébergement éphémère.
