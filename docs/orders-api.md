# Fondé 44 — API commandes

Toutes les écritures utilisent l'en-tête `Origin` correspondant à l'origine publique autorisée.

## Créer une commande

Le corps respecte strictement `orderSchema` :

```bash
curl -X POST "$BASE_URL/api/orders" \
  -H 'Origin: https://fonde44.example' \
  -H 'Content-Type: application/json' \
  -d '{
    "clientReference": "commande-20261006-001",
    "customer": {
      "name": "Awa Ndiaye",
      "phone": "771234567",
      "location": "",
      "details": "",
      "address": "Pikine"
    },
    "items": [
      { "productId": "fonde", "quantity": 3 }
    ],
    "fulfillment": "pickup",
    "paymentMethod": "cash",
    "orderTiming": "now"
  }'
```

La réponse `201` contient `data.trackingToken`. Une commande déjà existante renvoyée par idempotence contient aussi ce jeton.

## Suivre une commande

```bash
curl "$BASE_URL/api/orders/track?id=FD-XXXXXXXXXX&token=JETON_REÇU"
```

Un jeton invalide et une commande inconnue donnent la même réponse : `404 { "error": "not_found" }`.

## Annuler une commande

```bash
curl -X POST "$BASE_URL/api/orders/cancel" \
  -H 'Origin: https://fonde44.example' \
  -H 'Content-Type: application/json' \
  -d '{"id":"FD-XXXXXXXXXX","token":"JETON_REÇU"}'
```

Un client connecté peut aussi envoyer son `id` avec son cookie de session client, sans jeton.

## Changer un statut — Mère Fondé

```bash
curl -X PATCH "$BASE_URL/api/orders/status" \
  -H 'Origin: https://fonde44.example' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: fonde44_session=...' \
  -d '{"id":"FD-XXXXXXXXXX","status":"preparing"}'
```

En retrait : `received -> preparing -> ready -> delivered`. En livraison : `received -> confirmed -> preparing -> ready -> assigned`, puis le livreur poursuit vers `out_for_delivery -> delivered`.

Mère Fondé et superadmin peuvent annuler depuis `received`, `preparing` ou `ready`, sauf si un paiement est déjà `paid`.


## Annulation avec motif

Mère Fondé ou un superadmin annule avec un motif `out_of_stock`, `unreachable`, `outside_zone`, `closed` ou `other`, et un commentaire facultatif de 140 caractères maximum.

```bash
curl -X PATCH "$BASE_URL/api/orders/status" -H 'Origin: https://fonde44.example' -H 'Content-Type: application/json' -H 'Cookie: fonde44_session=...' -d '{"id":"FD-XXXXXXXXXX","status":"cancelled","reason":"out_of_stock","note":"Produit indisponible aujourd’hui"}'
```

Le suivi renvoie `cancellation` pour une commande annulée ; le champ `note` n’est exposé que pour une annulation du personnel. Une annulation client utilise `customer_request`.

## Commandes d’un client connecté

`GET /api/customer/orders` ajoute `trackingToken` quand le suivi public est configuré. Si le secret de suivi est absent en production, le champ est omis sans faire échouer la route.
