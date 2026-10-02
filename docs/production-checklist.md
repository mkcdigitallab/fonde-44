# Fondé 44 — checklist production

## Requis avant ouverture publique

1. Créer une base PostgreSQL managée.
2. Exécuter db/schema.sql.
3. Configurer DATABASE_URL côté Vercel uniquement.
4. Configurer VITE_WHATSAPP_PHONE côté Vercel si WhatsApp est souhaité.
5. Vérifier GET /api/health.
6. Vérifier GET /api/products.
7. Tester une commande réelle en environnement de test.
8. Vérifier qu'une commande de moins de 3 pots ne peut pas être livrée.
9. Vérifier retrait, livraison et événements.
10. Ajouter l'authentification OTP avant d'exposer les espaces opérationnels.

## Important

Le frontend ne contient aucune clé PostgreSQL. Le montant final d'une commande est calculé côté serveur à partir du catalogue PostgreSQL.

Les paiements Wave/Orange Money ne sont pas déclarés comme « réels » tant que leurs credentials et leurs callbacks/signatures n'ont pas été configurés et testés avec leurs fournisseurs.
