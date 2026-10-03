import { query } from "./_lib/db.js";
import { json, method } from "./_lib/http.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, ["GET"]);
  try {
    const { rows } = await query("select id,name,unit,price,badge,subtitle,description,image_url as image,is_active from products where is_active=true order by sort_order,name");
    return json(res, 200, { data: rows });
  } catch (error) { console.error("products.list", error); return json(res, 503, { error: "database_unavailable" }); }
}
