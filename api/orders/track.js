import { getPool } from "../_lib/db.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { json, method } from "../_lib/http.js";
import { isTrackingDisabled, verifyTrackingToken } from "../_lib/orderTracking.js";

const PUBLIC_ID = /^FD-[A-Z0-9]{10}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, ["GET"]);
  res.setHeader("Cache-Control", "no-store");

  const limit = await checkRateLimit(`order-track:${clientIp(req)}`, 200, 15);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  const id = String(req.query?.id || "").trim().toUpperCase();
  const token = String(req.query?.token || "").trim();
  if (!PUBLIC_ID.test(id) || !TOKEN.test(token)) return json(res, 404, { error: "not_found" });

  try {
    if (!verifyTrackingToken(id, token)) return json(res, 404, { error: "not_found" });

    const result = await getPool().query(
      `select o.id,o.public_id,o.status,o.fulfillment,o.payment_method,o.total,o.created_at,o.scheduled_at,o.cancelled_by,o.cancel_reason,o.cancel_note,
              (select p.status from orders.payments p where p.order_id=o.id order by p.created_at desc,p.id desc limit 1) as payment_status,
              coalesce(json_agg(json_build_object('name',oi.product_name,'quantity',oi.quantity) order by oi.id) filter (where oi.id is not null),'[]'::json) as items
         from orders.orders o
         left join orders.order_items oi on oi.order_id=o.id
        where o.public_id=$1
        group by o.id`,
      [id],
    );

    const order = result.rows[0];
    if (!order) return json(res, 404, { error: "not_found" });

    return json(res, 200, {
      data: {
        id: order.public_id,
        status: order.status,
        fulfillment: order.fulfillment,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status || null,
        total: Number(order.total),
        createdAt: order.created_at,
        scheduledAt: order.scheduled_at,
        items:order.items,cancellation:order.status==='cancelled'?{by:order.cancelled_by,reason:order.cancel_reason,...(order.cancelled_by==='staff'&&order.cancel_note?{note:order.cancel_note}:{})}:null,cancellable: order.status === "received" && order.payment_status !== "paid",
      },
    });
  } catch (error) {
    if (isTrackingDisabled(error)) return json(res, 503, { error: "tracking_disabled" });
    console.error("orders.track", error.message);
    return json(res, 500, { error: "order_tracking_failed" });
  }
}
