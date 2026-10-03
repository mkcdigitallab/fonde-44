import fs from "node:fs/promises";
import path from "node:path";
import { query } from "../_lib/db.js";
import { findActiveProduct } from "../catalog/product-repository.js";
import { MediaStorage } from "./media-storage.js";

export class ChangeProductImage {
  constructor({ storage = new LocalMediaStorage() } = {}) { this.storage = storage; }

  async execute({ productId, imageUrl, imageData }) {
    const product = await findActiveProduct(productId);
    if (!product) { const error = new Error("Produit introuvable."); error.code = "PRODUCT_NOT_FOUND"; throw error; }

    let url = imageUrl?.trim();
    let key = `catalog/${productId}/${Date.now()}`;
    let mimeType = "image/*";
    let buffer;

    if (imageData) {
      const match = imageData.match(/^data:(image\\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) { const error = new Error("Format d'image invalide."); error.code = "INVALID_IMAGE"; throw error; }
      if (imageData.length > 7_000_000) { const error = new Error("Image trop volumineuse (maximum 5 Mo)."); error.code = "INVALID_IMAGE"; throw error; }
      mimeType = match[1];
      key += "." + mimeType.split("/")[1].replace("jpeg", "jpg");
      buffer = Buffer.from(match[2], "base64");
      const root = process.env.MEDIA_DIR || path.resolve(process.cwd(), "storage/media");
      const target = path.join(root, key);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, buffer);
      url = "/media/" + key;
    }

    if (!url) { const error = new Error("Une image est requise."); error.code = "INVALID_IMAGE"; throw error; }

    const media = await query("insert into media.assets(storage_key, url, mime_type, size_bytes) values ($1,$2,$3,$4) returning id", [key,url,mimeType,buffer?.length ?? null]);
    await query(`insert into media.product_media(product_id, media_id, is_primary, sort_order) values ($1,$2,true,0)
      on conflict (product_id) do update set media_id=excluded.media_id,is_primary=true,sort_order=0`, [productId,media.rows[0].id]);
    await query("update catalog.products set image_url=$2, updated_at=now() where id=$1",[productId,url]);
  }
}

class LocalMediaStorage extends MediaStorage {}
