import { getPool } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";
import { orderSchema } from "./_lib/validation.js";
import { getCustomerFromRequest } from "./_lib/customerAuth.js";

const DELIVERY_FEE = 0;
const MIN_DELIVERY_POTS = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);

  const parsed = orderSchema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 400, { error: "validation_error", details: parsed.error.flatten() });

  const input = parsed.data;
  const customer = await getCustomerFromRequest(req);
  if (input.orderTiming === "scheduled") {
    if (!input.scheduledAt || Number.isNaN(Date.parse(input.scheduledAt)) || Date.parse(input.scheduledAt) <= Date.now()) {
      return json(res, 422, { error: "invalid_schedule" });
    }
  }
  const client = await getPool().connect();

  try {
    await client.query("begin");

    const existing = await client.query(
      "select id,public_id,status,created_at,subtotal,delivery_fee,total,fulfillment,customer_name,customer_phone,customer_address,payment_method,order_timing,scheduled_at from orders.orders where client_reference=$1 limit 1",
      [input.clientReference],
    );

    if (existing.rows[0]) {
      const saved = existing.rows[0];
      const { rows: savedItems } = await client.query(
        "select product_id,product_name,unit,unit_price,quantity,line_total from orders.order_items where order_id=$1 order by id",
        [saved.id],
      );
      await client.query("rollback");
      return json(res, 200, {
        data: {
          id: saved.public_id,
          status: saved.status,
          createdAt: saved.created_at,
          subtotal: saved.subtotal,
          delivery: saved.delivery_fee,
          total: saved.total,
          items: savedItems.map(item => ({
            productId:item.product_id,name:item.product_name,unit:item.unit,
            unitPrice:Number(item.unit_price),quantity:item.quantity,lineTotal:Number(item.line_total),
          })),
        },
        duplicate: true,
      });
    }

    const ids = [...new Set(input.items.map(item => item.productId))];
    const { rows: products } = await client.query(
      "select id,name,unit,price from catalog.products where id=any($1::text[]) and is_active=true",
      [ids],
    );

    if (products.length !== ids.length) {
      await client.query("rollback");
      return json(res, 422, { error: "product_unavailable" });
    }

    const byId = new Map(products.map(product => [product.id, product]));
    const lines = input.items.map(item => {
      const product = byId.get(item.productId);
      const unitPrice = Number(product.price);
      return {
        productId: item.productId,
        name: product.name,
        unit: product.unit,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const potQuantity = lines.reduce(
      (total, line) => total + (line.unit === "pot" ? line.quantity : 0),
      0,
    );

    if (input.fulfillment === "delivery" && potQuantity < MIN_DELIVERY_POTS) {
      await client.query("rollback");
      return json(res, 422, {
        error: "minimum_delivery_quantity",
        minimum: MIN_DELIVERY_POTS,
      });
    }

    if (input.fulfillment === "delivery" && !input.customer.address) {
      await client.query("rollback");
      return json(res, 422, { error: "delivery_address_required" });
    }

    const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
    const delivery = input.fulfillment === "delivery" ? DELIVERY_FEE : 0;
    const total = subtotal + delivery;

    const { rows } = await client.query(
      "insert into orders.orders(client_reference,customer_id,customer_name,customer_phone,customer_address,fulfillment,payment_method,order_timing,scheduled_at,subtotal,delivery_fee,total) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (client_reference) where client_reference is not null do nothing returning id,public_id,status,created_at",
      [
        input.clientReference,
        customer?.id || null,
        input.customer.name,
        input.customer.phone,
        input.customer.address || null,
        input.fulfillment,
        input.paymentMethod,
        input.orderTiming,
        input.scheduledAt || null,
        subtotal,
        delivery,
        total,
      ],
    );

    if (!rows[0]) {
      const { rows: concurrent } = await client.query(
        "select id,public_id,status,created_at,subtotal,delivery_fee,total from orders.orders where client_reference=$1 limit 1",
        [input.clientReference],
      );
      const saved = concurrent[0];
      if (!saved) throw new Error("order_idempotency_conflict");
      const { rows: savedItems } = await client.query(
        "select product_id,product_name,unit,unit_price,quantity,line_total from orders.order_items where order_id=$1 order by id",
        [saved.id],
      );
      await client.query("rollback");
      return json(res, 200, {
        data: {
          id: saved.public_id,
          status: saved.status,
          createdAt: saved.created_at,
          subtotal: saved.subtotal,
          delivery: saved.delivery_fee,
          total: saved.total,
          items: savedItems.map(item => ({
            productId:item.product_id,name:item.product_name,unit:item.unit,
            unitPrice:Number(item.unit_price),quantity:item.quantity,lineTotal:Number(item.line_total),
          })),
        },
        duplicate: true,
      });
    }

    const order = rows[0];

    for (const line of lines) {
      await client.query(
        "insert into orders.order_items(order_id,product_id,product_name,unit,unit_price,quantity,line_total) values($1,$2,$3,$4,$5,$6,$7)",
        [
          order.id,
          line.productId,
          line.name,
          line.unit,
          line.unitPrice,
          line.quantity,
          line.lineTotal,
        ],
      );
    }

    await client.query("commit");

    return json(res, 201, {
      data: {
        id: order.public_id,
        status: order.status,
        createdAt: order.created_at,
        subtotal,
        delivery,
        total,
        items: lines,
      },
    });
  } catch (error) {
    await client.query("rollback");
    console.error("orders.create", error);
    return json(res, 500, { error: "order_creation_failed" });
  } finally {
    client.release();
  }
}
