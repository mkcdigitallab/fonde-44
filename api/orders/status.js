import { getPool } from "../_lib/db.js";
import { requireRole, requireSameOrigin } from "../_lib/auth.js";
import { json, method, parseBody } from "../_lib/http.js";

const allowed = {
  "mere-fonde": { received:"confirmed", confirmed:"preparing", preparing:"ready", ready:"assigned" },
  "livreur": { assigned:"out_for_delivery", out_for_delivery:"delivered" }
};

export default async function handler(req,res) {
  if (req.method !== "PATCH") return method(res, ["PATCH"]);
  if (!requireSameOrigin(req,res)) return;
  const user = await requireRole(req,res,["mere-fonde","livreur"]);
  if (!user) return;
  const body = parseBody(req);
  const id = String(body?.id || "");
  const next = String(body?.status || "");
  if (!id || !next) return json(res,422,{error:"invalid_status_change"});

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const current = await client.query("select id,status from orders.orders where public_id=$1 for update", [id]);
  if (!current.rows[0]) { await client.query("rollback"); return json(res,404,{error:"order_not_found"}); }
  const previous = current.rows[0].status;
  if (allowed[user.role]?.[previous] !== next) { await client.query("rollback"); return json(res,409,{error:"invalid_status_transition"}); }
  const result = await client.query("update orders.orders set status=$2,updated_at=now() where id=$1 and status=$3 returning public_id,status", [current.rows[0].id,next,previous]);
  if(result.rowCount!==1){await client.query("rollback");return json(res,409,{error:"status_changed_concurrently"});}
  if(next==="delivered") await client.query("update orders.payments set status='paid',paid_at=now() where order_id=$1 and status='pending' and method='cash'",[current.rows[0].id]);
  await client.query("commit");
  return json(res,200,{data:result.rows[0]});
  } catch(error) {
    await client.query("rollback");
    console.error("orders.status",error.message);
    return json(res,500,{error:"status_update_failed"});
  } finally { client.release(); }
}
