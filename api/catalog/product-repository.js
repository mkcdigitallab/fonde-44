import { query } from "../_lib/db.js";

export async function findActiveProduct(id) {
  const result = await query("select id, name from catalog.products where id = $1 and is_active = true", [id]);
  return result.rows[0] || null;
}

export async function listProducts() {
  const result = await query(`
    select p.id, p.name, p.unit, p.price, p.badge, p.subtitle, p.description,
           coalesce(a.url, p.image_url) as image_url,
           p.sort_order, p.is_active
    from catalog.products p
    left join media.product_media pm on pm.product_id = p.id and pm.is_primary = true
    left join media.assets a on a.id = pm.media_id
    where p.is_active = true
    order by p.sort_order asc, p.name asc
  `);
  return result.rows.map(row => ({ ...row, imageUrl: row.image_url }));
}
