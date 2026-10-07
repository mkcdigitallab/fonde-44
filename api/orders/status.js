import { getPool } from "../_lib/db.js";
import { requireRole, requireSameOrigin } from "../_lib/auth.js";
import { writeAudit } from "../_lib/audit.js";
import { json, method, parseBody } from "../_lib/http.js";

const DELIVERY_TRANSITIONS = {
  "mere-fonde": { received: "confirmed", confirmed: "preparing", preparing: "ready", ready: "assigned" },
  superadmin: { received: "confirmed", confirmed: "preparing", preparing: "ready", ready: "assigned" },
  livreur: { assigned: "out_for_delivery", out_for_delivery: "delivered" },
};
const PICKUP_TRANSITIONS = {
  "mere-fonde": { received: "confirmed", confirmed: "preparing", preparing: "ready", ready: "delivered" },
  superadmin: { received: "confirmed", confirmed: "preparing", preparing: "ready", ready: "delivered" },
};
const CANCELLABLE_STATUSES = new Set(["received", "confirmed", "preparing", "ready"]);

export default async function handler(req,res) {
  if (req.method !== "PATCH") return method(res, ["PATCH"]);
  if (!requireSameOrigin(req,res)) return;
  const user = await requireRole(req,res,["mere-fonde","livreur"], { superadmin: true });
  if (!user) return;

  const body = parseBody(req);
  const id = String(body?.id || "");
  const next = String(body?.status || "");
  if (!id || !next) return json(res,422,{error:"invalid_status_change"});

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const current = await client.query("select id,public_id,status,fulfillment from orders.orders where public_id=$1 for update", [id]);
    if (!current.rows[0]) { await client.query("rollback"); return json(res,404,{error:"order_not_found"}); }

    const order = current.rows[0];
    const previous = order.status;

    if (next === "cancelled") {
      if (!["mere-fonde","superadmin"].includes(user.role) || !CANCELLABLE_STATUSES.has(previous)) {
        await client.query("rollback");
        return json(res,409,{error:"invalid_status_transition"});
      }
      const paid = await client.query("select 1 from orders.payments where order_id=$1 and status='paid' limit 1", [order.id]);
      if (paid.rows.length) {
        await client.query("rollback");
        return json(res,409,{error:"payment_already_paid"});
      }
      const result = await client.query("update orders.orders set status='cancelled',updated_at=now() where id=$1 and status=$2 returning public_id,status", [order.id, previous]);
      if (result.rowCount !== 1) { await client.query("rollback"); return json(res,409,{error:"status_changed_concurrently"}); }
      await client.query("update orders.payments set status='failed',failure_reason='order_cancelled' where order_id=$1 and status='pending'", [order.id]);
      if (user.role === "superadmin") await writeAudit(client, user.id, "order.status_changed", order.public_id, { from: previous, to: "cancelled" });
      await client.query("commit");
      return json(res,200,{data:result.rows[0]});
    }

    const transitions = order.fulfillment === "pickup" ? PICKUP_TRANSITIONS[user.role] : DELIVERY_TRANSITIONS[user.role];
    if (transitions?.[previous] !== next) {
      await client.query("rollback");
      return json(res,409,{error:"invalid_status_transition"});
    }

    const result = await client.query("update orders.orders set status=$2,updated_at=now() where id=$1 and status=$3 returning public_id,status", [order.id,next,previous]);
    if(result.rowCount!==1){await client.query("rollback");return json(res,409,{error:"status_changed_concurrently"});}
    if(next==="delivered") await client.query("update orders.payments set status='paid',paid_at=now() where order_id=$1 and status='pending' and method='cash'",[order.id]);
    if (user.role === "superadmin") await writeAudit(client, user.id, "order.status_changed", order.public_id, { from: previous, to: next });
    await client.query("commit");
    return json(res,200,{data:result.rows[0]});
  } catch(error) {
    await client.query("rollback");
    console.error("orders.status",error.message);
    return json(res,500,{error:"status_update_failed"});
  } finally { client.release(); }
}
