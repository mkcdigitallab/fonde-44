import { query } from "../_lib/db.js";
import { json, methodNotAllowed } from "../_lib/http.js";
import { listProducts } from "../catalog/product-repository.js";
import { ChangeProductImage } from "../media/change-product-image.js";

export default async function products(req, res) {
  if (req.method === "GET") return json(res, 200, { data: await listProducts() });
  if (req.method === "PATCH") {
    const { id, imageUrl, imageData } = req.body || {};
    if (!id) return json(res, 422, { error: "Produit requis." });
    if (!imageUrl && !imageData) return json(res, 422, { error: "Une image ou une URL est requise." });
    try {
      await new ChangeProductImage().execute({ productId: id, imageUrl, imageData });
      return json(res, 200, { data: await listProducts() });
    } catch (error) {
      const status = error.code === "PRODUCT_NOT_FOUND" ? 404 : error.code === "INVALID_IMAGE" ? 422 : 500;
      return json(res, status, { error: error.message || "Impossible de modifier l'image." });
    }
  }
  return methodNotAllowed(res, ["GET", "PATCH"]);
}
