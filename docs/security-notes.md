# Fondé 44 — règles de sécurité API

## Paiements
- La création de paiement exige une origine de requête valide et est limitée à 20 requêtes par 15 minutes et par IP.
- Un paiement espèces reste `pending` lors de sa création. Il devient `paid` uniquement quand la commande passe à `delivered`.
- Une commande déjà payée est refusée. Un paiement `pending` de la même méthode est réutilisé ; un paiement `pending` d'une autre méthode est marqué `failed` avec `replaced` avant la création du nouveau paiement.
- La consultation d'un paiement par référence est limitée à 60 requêtes par 15 minutes et par IP.

## Statuts de commande
Les transitions de statut utilisent une garde de course (`where status = précédent`) dans une transaction. Une transition concurrente répond `409`. Une commande livrée marque les paiements espèces encore `pending` comme payés dans la même transaction.

## Limites et origine
Les écritures anonymes sont protégées par `requireSameOrigin` et un rate limit : commandes 10 / 15 min / IP, demandes vocales 5 / 15 min / IP, événements 5 / heure / IP, abonnements 5 / heure / IP. Les écritures du personnel protégées par rôle appliquent aussi le contrôle d'origine : statut commande, modification produit, traitement des demandes vocales, déconnexion et actions superadmin. Les webhooks de paiement et la route cron des abonnements restent exclus de ce contrôle.

## Abonnements
Les créations et modifications valident strictement le client, le téléphone sénégalais, les produits actifs, les quantités, la fréquence, le mode de retrait/livraison, l'adresse et une configuration `schedule` de moins de 2 Ko. La création et les lignes d'abonnement sont enregistrées dans une seule transaction. Le jeton de gestion reste stocké uniquement sous forme de hash.

## Sessions client
Lors de la création d'une session client, les sessions expirées sont supprimées avant l'insertion de la nouvelle session.

## Jetons de suivi de commande
- Le jeton est un HMAC-SHA256 de `track:` + `public_id`, avec `ORDER_TRACKING_SECRET`, encodé en base64url.
- Le serveur compare les jetons avec `timingSafeEqual`. Le secret n'est jamais exposé ni stocké dans la base.
- En production, l'absence de `ORDER_TRACKING_SECRET` désactive le suivi avec `503 tracking_disabled`.
- Le suivi ne renvoie ni téléphone, ni adresse, ni nom du client.

## Lacunes connues
- **Orange Money** : le webhook doit encore être validé précisément avec la documentation officielle du fournisseur.
- **Demandes d'événement** : Mère Fondé ne dispose pas encore d'une lecture dédiée des demandes d'événement.
