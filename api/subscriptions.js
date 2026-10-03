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
    if (!customer.name || !customer.phone || !items.length || !["daily","weekly"].includes(frequency)) return json(res,422,{error:"invalid_subscription"});
    const managementToken = token();
    const result = await query("insert into orders.subscriptions(public_id,customer_name,customer_phone,frequency,management_token_hash,status,next_run_at) values('SUB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),$1,$2,$3,$4,'active',now()) returning public_id,frequency,status,next_run_at", [String(customer.name).trim(),String(customer.phone).trim(),frequency,hash(managementToken)]);
    const subscription = result.rows[0];
    for (const item of items) {
      await query("insert into orders.subscription_items(subscription_id,product_id,quantity) values((select id from orders.subscriptions where public_id=$1),$2,$3)", [subscription.public_id,String(item.productId),Number(item.quantity)]);
    }
    return json(res,201,{data:{...subscription,managementToken}});
  }
  if (req.method === "PATCH") {
    const id=String(body?.id||""); const managementToken=String(body?.managementToken||""); const status=String(body?.status||"");
    if (!id || !managementToken || !["active","paused","cancelled"].includes(status)) return json(res,422,{error:"invalid_subscription_change"});
    const result=await query("update orders.subscriptions set status=$3,updated_at=now() where public_id=$1 and management_token_hash=$2 returning public_id,status,frequency,next_run_at",[id,hash(managementToken),status]);
    if (!result.rows[0]) return json(res,404,{error:"subscription_not_found"});
    return json(res,200,{data:result.rows[0]});
  }
  if (req.method === "GET") {
    const id=String(req.query?.id||""); const managementToken=String(req.query?.token||"");
    if (!id || !managementToken) return json(res,422,{error:"subscription_credentials_required"});
    const result=await query("select public_id,status,frequency,next_run_at,created_at from orders.subscriptions where public_id=$1 and management_token_hash=$2",[id,hash(managementToken)]);
    return json(res,200,{data:result.rows[0]||null});
  }
  return method(res,["GET","POST","PATCH"]);
}
