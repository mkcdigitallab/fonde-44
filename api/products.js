import { query } from "./_lib/db.js";
import { json, methodNotAllowed } from "./_lib/http.js";

export default async function products(req, res) {
  if (req.method === "GET") {
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
    return json(res, 200, { data: result.rows.map(row => ({ ...row, imageUrl: row.image_url })) });
  }

  if (req.method === "PATCH") {
    const { id, imageUrl } = req.body || {};
    if (!id || typeof imageUrl !== "string" || !/^https?:\\/\\//i.test(imageUrl.trim())) {
      return json(res, 422, { error: "Une URL d'image http(s) est requise." });
    }

    const product = await query("select id from catalog.products where id = $1 and is_active = true", [id]);
    if (!product.rows.length) return json(res, 404, { error: "Produit introuvable." });

    const media = await query(
      `insert into media.assets(storage_key, url, mime_type)
       values ($1, $2, 'image/*')
       returning id`,
      [`catalog/${id}/${Date.now()}`, imageUrl.trim()]
    );

    await query(
      `insert into media.product_media(product_id, media_id, is_primary, sort_order)
       values ($1, $2, true, 0)
       on conflict (product_id) do update set media_id = excluded.media_id, is_primary = true, sort_order = 0`,
      [id, media.rows[0].id]
    );

    await query("update catalog.products set image_url = $2, updated_at = now() where id = $1", [id, imageUrl.trim()]);

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
    return json(res, 200, { data: result.rows.map(row => ({ ...row, imageUrl: row.image_url })) });
  }

  return methodNotAllowed(res, ["GET", "PATCH"]);
}
