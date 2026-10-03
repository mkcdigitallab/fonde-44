import { query } from "./_lib/db.js";
import { requireRole } from "./_lib/auth.js";
import { json, method } from "./_lib/http.js";

const statusLabels = { received:"À préparer", confirmed:"Confirmée", preparing:"À préparer", ready:"Prête", assigned:"À récupérer", out_for_delivery:"En livraison", delivered:"Livrée", cancelled:"Annulée" };

function mapOrder(row) {
  return {
    id: row.public_id,
    client: row.customer_name,
    phone: row.customer_phone,
    address: row.customer_address || "Retrait",
    items: row.items_text,
    amount: Number(row.total),
    status: statusLabels[row.status] || row.status,
    delivery: row.fulfillment === "delivery" ? "Livraison" : "Retrait",
    time: row.scheduled_at ? new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(row.scheduled_at)) : new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(row.created_at)),
    rawStatus: row.status
  };
}

export default async function handler(req,res) {
  if (req.method !== "GET") return method(res, ["GET"]);
  const user = await requireRole(req,res,["mere-fonde","livreur"]);
  if (!user) return;

  const result = await query(`
    select o.public_id,o.customer_name,o.customer_phone,o.customer_address,o.fulfillment,o.status,o.total,o.scheduled_at,o.created_at,
           coalesce(string_agg(oi.quantity || ' × ' || oi.product_name, ' + ' order by oi.id), '') as items_text
    from orders.orders o
    left join orders.order_items oi on oi.order_id=o.id
    where o.status <> 'cancelled'
    group by o.id
    order by coalesce(o.scheduled_at,o.created_at) asc
    limit 100
  `);
  const orders = result.rows.map(mapOrder);
  const today = orders.filter(o => o.rawStatus !== "delivered");
  const deliveries = orders.filter(o => o.delivery === "Livraison" && ["ready","assigned","out_for_delivery"].includes(o.rawStatus)).map(o => ({
    id:o.id, client:o.client, address:o.address, status:o.rawStatus === "out_for_delivery" ? "En route" : o.rawStatus === "assigned" ? "À récupérer" : "À récupérer", time:o.time, items:o.items, amount:o.amount
  }));

  return json(res,200,{ data:{ orders, deliveries, metrics:{ pending:today.filter(o=>["À préparer","Confirmée"].includes(o.status)).length, ready:today.filter(o=>o.status==="Prête").length, todayRevenue:orders.filter(o=>new Date(o.createdAt||Date.now()).toDateString()===new Date().toDateString()).reduce((sum,o)=>sum+o.amount,0) } }});
}
