import { query } from "./_lib/db.js";
import fs from "node:fs/promises";
import path from "node:path";
import { json, methodNotAllowed } from "./_lib/http.js";

async function listProducts() {
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

export default async function products(req, res) {
  if (req.method === "GET") {
    return json(res, 200, { data: await listProducts() });
  }

  if (req.method === "PATCH") {
    const { id, imageUrl, imageData } = req.body || {};
    if (!id) return json(res, 422, { error: "Produit requis." });
    if (!imageUrl && !imageData) return json(res, 422, { error: "Une image ou une URL est requise." });

    const product = await query("select id from catalog.products where id = $1 and is_active = true", [id]);
    if (!product.rows.length) return json(res, 404, { error: "Produit introuvable." });

    let finalImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
    let storageKey = `catalog/${id}/${Date.now()}`;
    let mimeType = "image/*";

    if (imageData) {
      if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
        return json(res, 422, { error: "Format d'image invalide." });
      }
      if (imageData.length > 7_000_000) {
        return json(res, 413, { error: "Image trop volumineuse (maximum 5 Mo)." });
      }
      const match = imageData.match(/^data:(image\\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) return json(res, 422, { error: "Image invalide." });
      mimeType = match[1];
      const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
      storageKey = `catalog/${id}/${Date.now()}.${extension}`;
      const root = process.env.MEDIA_DIR || path.resolve(process.cwd(), "storage/media");
      const target = path.join(root, storageKey);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, Buffer.from(match[2], "base64"));
      finalImageUrl = `/media/${storageKey}`;
    }

    if (finalImageUrl && !imageData && !/^https?:\\/\\//i.test(finalImageUrl)) {
      return json(res, 422, { error: "L'URL doit commencer par http(s)." });
    }

    const media = await query(
      `insert into media.assets(storage_key, url, mime_type)
       values ($1, $2, $3)
       returning id`,
      [storageKey, finalImageUrl, mimeType]
    );

    await query(
      `insert into media.product_media(product_id, media_id, is_primary, sort_order)
       values ($1, $2, true, 0)
       on conflict (product_id) do update
       set media_id = excluded.media_id, is_primary = true, sort_order = 0`,
      [id, media.rows[0].id]
    );

    await query("update catalog.products set image_url = $2, updated_at = now() where id = $1", [id, finalImageUrl]);

    return json(res, 200, { data: await listProducts() });
  }

  return methodNotAllowed(res, ["GET", "PATCH"]);
}
