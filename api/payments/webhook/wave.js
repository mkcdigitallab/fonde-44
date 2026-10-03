import { createHmac, timingSafeEqual } from "node:crypto";
import { query } from "../../_lib/db.js";
import { json, method } from "../../_lib/http.js";

function verify(signature, rawBody, secret) {
  if (!signature || !secret) return false;
  const parts=String(signature).split(",");
  const timestamp=parts.find(x=>x.startsWith("t="))?.slice(2);
  const signatures=parts.filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));
  if (!timestamp || Math.abs(Math.floor(Date.now()/1000)-Number(timestamp))>300) return false;
  const expected=createHmac("sha256",secret).update(timestamp+rawBody).digest("hex");
  return signatures.some(value => value.length===expected.length && timingSafeEqual(Buffer.from(value),Buffer.from(expected)));
}
export default async function handler(req,res) {
  if(req.method!=="POST") return method(res,["POST"]);
  const raw=req.rawBody || JSON.stringify(req.body || {});
  if(!verify(req.headers["wave-signature"],raw,process.env.WAVE_WEBHOOK_SECRET)) return json(res,401,{error:"invalid_webhook"});
  const event=typeof req.body==="object"?req.body:JSON.parse(raw);
  if(!event?.id) return json(res,400,{error:"invalid_event"});
  if(event.type==="checkout.session.completed" && event.data?.payment_status==="succeeded") {
    await query("update orders.payments set status='paid',paid_at=now(),provider_reference=$2 where public_id=$1 and status='pending'",[event.data.client_reference,event.data.id]);
  }
  return json(res,200,{received:true});
}
