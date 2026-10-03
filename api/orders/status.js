import { query } from "../_lib/db.js";
import { requireRole } from "../_lib/auth.js";
import { json, method, parseBody } from "../_lib/http.js";

const allowed = {
  "mere-fonde": { received:"confirmed", confirmed:"preparing", preparing:"ready", ready:"assigned" },
  "livreur": { assigned:"out_for_delivery", out_for_delivery:"delivered" }
};

export default async function handler(req,res) {
  if (req.method !== "PATCH") return method(res, ["PATCH"]);
  const user = await requireRole(req,res,["mere-fonde","livreur"]);
  if (!user) return;
  const body = parseBody(req);
  const id = String(body?.id || "");
  const next = String(body?.status || "");
  if (!id || !next) return json(res,422,{error:"invalid_status_change"});

  const current = await query("select id,status from orders.orders where public_id=$1", [id]);
  if (!current.rows[0]) return json(res,404,{error:"order_not_found"});
  const previous = current.rows[0].status;
  if (allowed[user.role]?.[previous] !== next) return json(res,409,{error:"invalid_status_transition"});
  const result = await query("update orders.orders set status=$2,updated_at=now() where id=$1 returning public_id,status", [current.rows[0].id,next]);
  return json(res,200,{data:result.rows[0]});
}
