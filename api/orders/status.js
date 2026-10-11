import { z } from "zod";
import { getPool } from "../_lib/db.js";
import { requireRole, requireSameOrigin } from "../_lib/auth.js";
import { writeAudit } from "../_lib/audit.js";
import { json, method, parseBody } from "../_lib/http.js";

const STAFF_PRE_READY_STATUSES = ["received", "confirmed", "preparing", "ready"];

function canStaffAdvanceToReady(previous, next) {
  const previousIndex = STAFF_PRE_READY_STATUSES.indexOf(previous);
  const nextIndex = STAFF_PRE_READY_STATUSES.indexOf(next);
  return previousIndex >= 0 && nextIndex > previousIndex;
}
const CANCELLABLE_STATUSES = new Set(["received", "confirmed", "preparing", "ready"]);
const CANCEL_REASONS = ["out_of_stock", "unreachable", "outside_zone", "closed", "other"];
const statusSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  reason: z.enum(CANCEL_REASONS).optional(),
  note: z.string().max(140).optional(),
}).strict();

export default async function handler(req,res) {
  if (req.method !== "PATCH") return method(res, ["PATCH"]);
  if (!requireSameOrigin(req,res)) return;
  const user = await requireRole(req,res,["mere-fonde","livreur"], { superadmin: true });
  if (!user) return;

  const parsed=statusSchema.safeParse(parseBody(req));
  if(!parsed.success)return json(res,422,{error:"invalid_status_change"});
  const id=parsed.data.id;const next=parsed.data.status;

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
      if(!parsed.data.reason){await client.query("rollback");return json(res,422,{error:"cancel_reason_required"});}const note=typeof parsed.data.note==="string"?parsed.data.note.trim().slice(0,140):null;const result=await client.query("update orders.orders set status='cancelled',cancel_reason=$3,cancel_note=$4,cancelled_by='staff',updated_at=now() where id=$1 and status=$2 returning public_id,status",[order.id,previous,parsed.data.reason,note||null]);
      if (result.rowCount !== 1) { await client.query("rollback"); return json(res,409,{error:"status_changed_concurrently"}); }
      await client.query("update orders.payments set status='failed',failure_reason='order_cancelled' where order_id=$1 and status='pending'", [order.id]);
      if(user.role==="superadmin")await writeAudit(client,user.id,"order.status_changed",order.public_id,{from:previous,to:"cancelled",reason:parsed.data.reason,note});
      await client.query("commit");
      return json(res,200,{data:result.rows[0]});
    }

    let validTransition = false;
    if (["mere-fonde", "superadmin"].includes(user.role)) {
      validTransition = canStaffAdvanceToReady(previous, next);
      if (previous === "ready") {
        validTransition = order.fulfillment === "pickup" ? next === "delivered" : next === "assigned";
      }
    } else if (user.role === "livreur") {
      validTransition = (previous === "assigned" && next === "out_for_delivery") || (previous === "out_for_delivery" && next === "delivered");
    }
    if (!validTransition) {
      await client.query("rollback");
      return json(res, 409, { error: "invalid_status_transition" });
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
