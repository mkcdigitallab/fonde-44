import { query } from "../_lib/db.js";
import { json, method } from "../_lib/http.js";
import { requireCustomer } from "../_lib/customerAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, ["GET"]);
  const customer = await requireCustomer(req, res);
  if (!customer) return;

  const result = await query(
    `select o.public_id,o.status,o.total,o.created_at,
            coalesce(json_agg(json_build_object('name',oi.product_name,'quantity',oi.quantity,'price',oi.unit_price) order by oi.id) filter (where oi.id is not null),'[]'::json) as lines
       from orders.orders o
       left join orders.order_items oi on oi.order_id=o.id
      where o.customer_id=$1
      group by o.id
      order by o.created_at desc
      limit 50`,
    [customer.id],
  );
  return json(res,200,{data:result.rows.map(row=>({id:row.public_id,status:row.status,total:Number(row.total),date:row.created_at,lines:row.lines}))});
}
