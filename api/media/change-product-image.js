import fs from "node:fs/promises";
import path from "node:path";
import { query } from "../_lib/db.js";
import { findActiveProduct } from "../catalog/product-repository.js";
import { MinioMediaStorage } from "./minio-media-storage.js";
import { MediaStorage } from "./media-storage.js";

export class ChangeProductImage {
  constructor({ storage = createStorage() } = {}) { this.storage = storage; }

  async execute({ productId, imageUrl, imageData }) {
    const product = await findActiveProduct(productId);
    if (!product) throw Object.assign(new Error("Produit introuvable."), { code: "PRODUCT_NOT_FOUND" });

    let url = imageUrl?.trim();
    let key = `catalog/${productId}/${Date.now()}`;
    let mimeType = "image/*";
    let buffer;

    if (imageData) {
      const match = imageData.match(/^data:(image\\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match || imageData.length > 7_000_000) {
        throw Object.assign(new Error("Image invalide ou trop volumineuse (maximum 5 Mo)."), { code: "INVALID_IMAGE" });
      }
      mimeType = match[1];
      key += "." + mimeType.split("/")[1].replace("jpeg", "jpg");
      buffer = Buffer.from(match[2], "base64");
      const stored = await this.storage.put({ key, buffer, contentType: mimeType });
      url = stored.url || `/media/${stored.key}`;
    }

    if (!url) throw Object.assign(new Error("Une image est requise."), { code: "INVALID_IMAGE" });

    const media = await query(
      "insert into media.assets(storage_key, url, mime_type, size_bytes) values ($1,$2,$3,$4) returning id",
      [key, url, mimeType, buffer?.length ?? null]
    );
    await query(
      `insert into media.product_media(product_id, media_id, is_primary, sort_order)
       values ($1,$2,true,0)
       on conflict (product_id) do update set media_id=excluded.media_id,is_primary=true,sort_order=0`,
      [productId, media.rows[0].id]
    );
    await query("update catalog.products set image_url=$2, updated_at=now() where id=$1", [productId, url]);
  }
}

function createStorage() {
  if (process.env.MINIO_ENDPOINT && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY) {
    return new MinioMediaStorage({
      endpoint: process.env.MINIO_ENDPOINT,
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
      bucket: process.env.MINIO_BUCKET || "fonde44"
    });
  }
  return new LocalMediaStorage();
}

class LocalMediaStorage extends MediaStorage {
  async put({ key, buffer }) {
    const root = process.env.MEDIA_DIR || path.resolve(process.cwd(), "storage/media");
    const target = path.join(root, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    return { key };
  }
}
