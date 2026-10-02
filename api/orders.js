import { getPool } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";
import { orderSchema } from "./_lib/validation.js";

const DELIVERY_FEE = 500;
const MIN_DELIVERY_POTS = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  const parsed = orderSchema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 400, { error: "validation_error", details: parsed.error.flatten() });
  const input = parsed.data;
  if (input.fulfillment === "delivery" && input.items.reduce((n, i) => n + i.quantity, 0) < MIN_DELIVERY_POTS) return json(res, 422, { error: "minimum_delivery_quantity", minimum: MIN_DELIVERY_POTS });
  if (input.fulfillment === "delivery" && !input.customer.address) return json(res, 422, { error: "delivery_address_required" });

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const ids = input.items.map(i => i.productId);
    const { rows: products } = await client.query("select id,name,unit,price from products where id=any($1::text[]) and is_active=true", [ids]);
    if (products.length !== ids.length) { await client.query("rollback"); return json(res, 422, { error: "product_unavailable" }); }
    const byId = new Map(products.map(p => [p.id, p]));
    let subtotal = 0;
    const lines = input.items.map(item => {
      const p = byId.get(item.productId), lineTotal = Number(p.price) * item.quantity;
      subtotal += lineTotal;
      return { ...item, name: p.name, unit: p.unit, unitPrice: Number(p.price), lineTotal };
    });
    const delivery = input.fulfillment === "delivery" ? DELIVERY_FEE : 0;
    const total = subtotal + delivery;
    const { rows } = await client.query("insert into orders(customer_name,customer_phone,customer_address,fulfillment,payment_method,subtotal,delivery_fee,total) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,public_id,status,created_at", [input.customer.name,input.customer.phone,input.customer.address || null,input.fulfillment,input.paymentMethod,subtotal,delivery,total]);
    const order = rows[0];
    for (const line of lines) await client.query("insert into order_items(order_id,product_id,product_name,unit,unit_price,quantity,line_total) values($1,$2,$3,$4,$5,$6,$7)", [order.id,line.productId,line.name,line.unit,line.unitPrice,line.quantity,line.lineTotal]);
    await client.query("commit");
    return json(res, 201, { data: { id: order.public_id,status: order.status,createdAt: order.created_at,subtotal,delivery,total,items: lines } });
  } catch (error) {
    await client.query("rollback"); console.error("orders.create", error); return json(res, 500, { error: "order_creation_failed" });
  } finally { client.release(); }
}
