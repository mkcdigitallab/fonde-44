# Fondé 44 — nettoyage manuel des données de démonstration

Ces commandes concernent une base existante. **Faites une sauvegarde PostgreSQL avant de les exécuter.** Elles ne sont pas exécutées automatiquement par l’application.

## Nettoyer les anciennes images Unsplash

```sql
update catalog.products set image_url = null where image_url like '%images.unsplash.com%';
delete from media.product_media where media_id in (select id from media.assets where url like '%images.unsplash.com%');
delete from media.assets where url like '%images.unsplash.com%';
update catalog.products set is_active = false where id = 'poudre';
```

- La première ligne retire les anciennes URLs de démonstration du catalogue.
- La deuxième supprime les associations entre produits et médias Unsplash.
- La troisième supprime les fichiers/métadonnées médias Unsplash restants.
- La quatrième désactive le produit `poudre` sans supprimer ses données.

## Vérifier après nettoyage

```sql
select id, name, image_url, is_active from catalog.products order by sort_order, name;
select count(*) as unsplash_products from catalog.products where image_url like '%images.unsplash.com%';
select count(*) as unsplash_assets from media.assets where url like '%images.unsplash.com%';
select id, name, is_active from catalog.products where id = 'poudre';
```

Les deux compteurs Unsplash doivent être à `0` après nettoyage. Le produit `poudre` doit être présent mais `is_active = false`.
