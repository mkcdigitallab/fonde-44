import { getPool } from "../_lib/db.js";
import { findActiveProduct } from "../catalog/product-repository.js";
import { createStorage } from "./storage-factory.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const TYPE_INFO = {
  "image/jpeg": { extension: "jpg", matches: buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { extension: "png", matches: buffer => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) },
  "image/webp": { extension: "webp", matches: buffer => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
  "image/avif": { extension: "avif", matches: buffer => buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(buffer.toString("ascii", 8, 12)) },
};

function detectImageType(buffer) {
  for (const [type, info] of Object.entries(TYPE_INFO)) if (info.matches(buffer)) return type;
  return null;
}

function validateImageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return false;
  if (url.startsWith("/api/media/object?key=catalog/")) return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export class ChangeProductImage {
  constructor({ storage = createStorage() } = {}) { this.storage = storage; }

  async execute({ productId, imageUrl, imageData }) {
    const product = await findActiveProduct(productId);
    if (!product) throw Object.assign(new Error("Produit introuvable."), { code: "PRODUCT_NOT_FOUND" });

    let url = imageUrl?.trim();
    let key = null;
    let mimeType = null;
    let buffer = null;

    if (imageData) {
      const match = String(imageData).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match || !ALLOWED_TYPES.has(match[1])) throw Object.assign(new Error("Format image invalide."), { code: "INVALID_IMAGE" });
      buffer = Buffer.from(match[2], "base64");
      if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw Object.assign(new Error("Image invalide ou trop volumineuse."), { code: "INVALID_IMAGE" });
      const detected = detectImageType(buffer);
      if (!detected || detected !== match[1]) throw Object.assign(new Error("Le contenu de l'image ne correspond pas au type déclaré."), { code: "INVALID_IMAGE" });
      mimeType = detected;
      key = `catalog/${productId}/${Date.now()}.${TYPE_INFO[detected].extension}`;
      const stored = await this.storage.put({ key, buffer, contentType: mimeType });
      url = stored.url || `/api/media/object?key=${encodeURIComponent(key)}`;
    }

    if (!validateImageUrl(url)) throw Object.assign(new Error("URL d'image invalide."), { code: "INVALID_IMAGE" });
    if (!mimeType && url.startsWith("/api/media/object?key=catalog/")) {
      const match = url.match(/key=catalog\/[^&]+\.([A-Za-z0-9]+)$/);
      const extension = match?.[1]?.toLowerCase();
      mimeType = Object.entries(TYPE_INFO).find(([, info]) => info.extension === extension)?.[0] || "image/*";
    }
    if (!mimeType && url.startsWith("https://")) mimeType = "image/*";

    const client = await getPool().connect();
    try {
      await client.query("begin");
      const media = await client.query(
        "insert into media.assets(storage_key, url, mime_type, size_bytes) values ($1,$2,$3,$4) returning id",
        [key, url, mimeType, buffer?.length ?? null]
      );
      await client.query(
        `insert into media.product_media(product_id, media_id, is_primary, sort_order)
         values ($1,$2,true,0)
         on conflict (product_id) do update set media_id=excluded.media_id,is_primary=true,sort_order=0`,
        [productId, media.rows[0].id]
      );
      await client.query("update catalog.products set image_url=$2, updated_at=now() where id=$1", [productId, url]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}
