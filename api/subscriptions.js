import { randomBytes, createHash } from "node:crypto";
import { query } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";

function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function token() { return randomBytes(32).toString("hex"); }

export default async function handler(req,res) {
  const body = parseBody(req);
  if (req.method === "POST") {
    const customer = body?.customer || {};
    const items = Array.isArray(body?.items) ? body.items : [];
    const frequency = String(body?.frequency || "daily");
    const schedule = body?.schedule && typeof body.schedule === "object" ? body.schedule : {};
    const fulfillment = body?.fulfillment === "pickup" ? "pickup" : "delivery";
    const deliveryAddress = String(body?.deliveryAddress || "").trim();
    const paymentMethod = "cash";
    if (!customer.name || !customer.phone || !items.length || !["daily","weekly"].includes(frequency) || (fulfillment === "delivery" && !deliveryAddress)) return json(res,422,{error:"invalid_subscription"});
    const managementToken = token();
    const result = await query("insert into orders.subscriptions(public_id,customer_name,customer_phone,frequency,schedule,fulfillment,delivery_address,payment_method,management_token_hash,status,next_run_at) values('SUB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),$1,$2,$3,$4,$5,$6,$7,$8,'active',now()) returning public_id,frequency,status,next_run_at,schedule,fulfillment,delivery_address,payment_method", [String(customer.name).trim(),String(customer.phone).trim(),frequency,JSON.stringify(schedule),fulfillment,deliveryAddress,paymentMethod,hash(managementToken)]);
    const subscription = result.rows[0];
    for (const item of items) {
      await query("insert into orders.subscription_items(subscription_id,product_id,quantity) values((select id from orders.subscriptions where public_id=$1),$2,$3)", [subscription.public_id,String(item.productId),Number(item.quantity)]);
    }
    return json(res,201,{data:{...subscription,managementToken}});
  }
  if (req.method === "PATCH") {
    const id=String(body?.id||""); const managementToken=String(body?.managementToken||""); const status=String(body?.status||"");
    if (!id || !managementToken || !["active","paused","cancelled"].includes(status)) return json(res,422,{error:"invalid_subscription_change"});
    const current=await query("select id from orders.subscriptions where public_id=$1 and management_token_hash=$2",[id,hash(managementToken)]);
    if (!current.rows[0]) return json(res,404,{error:"subscription_not_found"});
    const schedule=body?.schedule && typeof body.schedule==="object" ? body.schedule : {};
    const fulfillment=body?.fulfillment==="pickup" ? "pickup" : "delivery";
    const deliveryAddress=String(body?.deliveryAddress||"").trim();
    if(fulfillment==="delivery" && !deliveryAddress) return json(res,422,{error:"delivery_address_required"});
    const paymentMethod="cash";
    const client=await (await import("./_lib/db.js")).getPool().connect();
    try {
      await client.query("begin");
      await client.query("update orders.subscriptions set status=$3,schedule=$4,fulfillment=$5,delivery_address=$6,payment_method=$7,updated_at=now() where id=$1 and management_token_hash=$2",[current.rows[0].id,hash(managementToken),status,JSON.stringify(schedule),fulfillment,deliveryAddress,paymentMethod]);
      if(Array.isArray(body?.items) && body.items.length){
        await client.query("delete from orders.subscription_items where subscription_id=$1",[current.rows[0].id]);
        for(const item of body.items) await client.query("insert into orders.subscription_items(subscription_id,product_id,quantity) values($1,$2,$3)",[current.rows[0].id,String(item.productId),Number(item.quantity)]);
      }
      const result=await client.query("select public_id,status,frequency,next_run_at,schedule,fulfillment,delivery_address,payment_method from orders.subscriptions where id=$1",[current.rows[0].id]);
      await client.query("commit");
      return json(res,200,{data:result.rows[0]});
    } catch(error) {
      await client.query("rollback");
      console.error("subscriptions.update",error);
      return json(res,500,{error:"subscription_update_failed"});
    } finally { client.release(); }
  }
  if (req.method === "GET") {
    const id=String(req.query?.id||""); const managementToken=String(req.query?.token||"");
    if (!id || !managementToken) return json(res,422,{error:"subscription_credentials_required"});
    const result=await query("select public_id,status,frequency,next_run_at,schedule,fulfillment,delivery_address,payment_method,created_at from orders.subscriptions where public_id=$1 and management_token_hash=$2",[id,hash(managementToken)]);
    return json(res,200,{data:result.rows[0]||null});
  }
  return method(res,["GET","POST","PATCH"]);
}
