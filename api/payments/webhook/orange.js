import { query } from "../../_lib/db.js";
import { json, method } from "../../_lib/http.js";
export default async function handler(req,res) {
  if(req.method!=="POST") return method(res,["POST"]);
  const expected=process.env.OM_WEBHOOK_SECRET;
  const provided=req.headers.authorization?.replace(/^Bearer\s+/i,"");
  if(expected && provided!==expected) return json(res,401,{error:"invalid_webhook"});
  const body=req.body || {};
  const reference=String(body.reference || body.transactionReference || body.orderReference || "");
  const status=String(body.status || body.paymentStatus || "").toLowerCase();
  if(reference && ["success","succeeded","paid","successful"].includes(status)) {
    await query("update orders.payments set status='paid',paid_at=now(),provider_reference=coalesce($2,provider_reference) where public_id=$1 and status='pending'",[reference,String(body.transactionId||body.transactionReference||"")]);
  } else if(reference && ["failed","cancelled","canceled"].includes(status)) {
    await query("update orders.payments set status='failed',failure_reason=$2 where public_id=$1 and status='pending'",[reference,status]);
  }
  return json(res,200,{received:true});
}
