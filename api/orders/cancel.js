import { z } from "zod";
import { getPool } from "../_lib/db.js";
import { getCustomerFromRequest } from "../_lib/customerAuth.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { json, method, parseBody } from "../_lib/http.js";
import { isTrackingDisabled, verifyTrackingToken } from "../_lib/orderTracking.js";

const schema = z.object({
  id: z.string().regex(/^FD-[A-Z0-9]{10}$/),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
}).strict();

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  if (!requireSameOrigin(req, res)) return;

  const limit = await checkRateLimit(`order-cancel:${clientIp(req)}`, 10, 15);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  const parsed = schema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 404, { error: "not_found" });

  const { id, token } = parsed.data;
  let customer = null;
  if (token) {
    try {
      if (!verifyTrackingToken(id, token)) return json(res, 404, { error: "not_found" });
    } catch (error) {
      if (isTrackingDisabled(error)) return json(res, 503, { error: "tracking_disabled" });
      throw error;
    }
  } else {
    customer = await getCustomerFromRequest(req);
    if (!customer) return json(res, 404, { error: "not_found" });
  }

  const client = await getPool().connect();
  try {
    await client.query("begin");

    const result = customer
      ? await client.query("select id,public_id,status from orders.orders where public_id=$1 and customer_id=$2 for update", [id, customer.id])
      : await client.query("select id,public_id,status from orders.orders where public_id=$1 for update", [id]);

    const order = result.rows[0];
    if (!order) {
      await client.query("rollback");
      return json(res, 404, { error: "not_found" });
    }

    const paid = await client.query("select 1 from orders.payments where order_id=$1 and status='paid' limit 1", [order.id]);
    if (order.status !== "received" || paid.rows.length) {
      await client.query("rollback");
      return json(res, 409, { error: "not_cancellable" });
    }

    await client.query("update orders.orders set status='cancelled',updated_at=now() where id=$1 and status='received'", [order.id]);
    await client.query("update orders.payments set status='failed',failure_reason='customer_cancelled' where order_id=$1 and status='pending'", [order.id]);

    await client.query("commit");
    return json(res, 200, { data: { id: order.public_id, status: "cancelled" } });
  } catch (error) {
    await client.query("rollback");
    console.error("orders.cancel", error.message);
    return json(res, 500, { error: "order_cancellation_failed" });
  } finally {
    client.release();
  }
}
