import { randomUUID } from "node:crypto";
import { query } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";

function provider(name) {
  if (name === "cash") return { name, enabled:true };
  if (name === "orange_money") return { name, enabled:Boolean(process.env.OM_MERCHANT_CODE && process.env.OM_CLIENT_ID && process.env.OM_CLIENT_SECRET) };
  if (name === "wave") return { name, enabled:Boolean(process.env.WAVE_API_KEY) };
  return { name, enabled:false };
}

async function createMobilePayment(methodName, payment, req) {
  if (methodName === "orange_money") {
    const base = process.env.OM_API_BASE_URL || "https://api.orange-sonatel.com";
    const tokenResponse = await fetch(base + "/oauth/token", {
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Basic " + Buffer.from(process.env.OM_CLIENT_ID + ":" + process.env.OM_CLIENT_SECRET).toString("base64")},
      body:"grant_type=client_credentials"
    });
    if (!tokenResponse.ok) throw new Error("orange_token_failed");
    const token = (await tokenResponse.json()).access_token;
    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
    const response = await fetch(base + "/v1/onlinePayment/prepare", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
      body:JSON.stringify({merchantCode:Number(process.env.OM_MERCHANT_CODE),sitename:process.env.OM_SITENAME||"Fondé 44",amount:Number(payment.amount),reference:payment.reference,urls:{cancelUrl:baseUrl+"/?payment=cancelled",successUrl:baseUrl+"/?payment=success&ref="+payment.reference,callbackUrl:baseUrl+"/api/payments/webhook/orange"}})
    });
    if (!response.ok) throw new Error("orange_payment_prepare_failed");
    const data=await response.json();
    return data.paymentUrl;
  }
  if (methodName === "wave") {
    const baseUrl = process.env.WAVE_API_URL || "https://api.wave.com/v1/checkout/sessions";
    const publicBase = process.env.PUBLIC_BASE_URL || `http://${req.headers.host}`;
    const response = await fetch(baseUrl, {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.WAVE_API_KEY},
      body:JSON.stringify({
        amount:String(payment.amount),
        currency:"XOF",
        client_reference:payment.reference,
        success_url:publicBase+"/?payment=success&ref="+encodeURIComponent(payment.reference),
        error_url:publicBase+"/?payment=cancelled&ref="+encodeURIComponent(payment.reference)
      })
    });
    if (!response.ok) throw new Error("wave_payment_prepare_failed");
    const data=await response.json();
    return data.wave_launch_url || data.payment_url || data.checkout_url || data.url;
  }
  throw new Error("unsupported_provider");
}

export default async function handler(req,res) {
  if (req.method !== "POST") return method(res,["POST"]);
  const body=parseBody(req); const orderId=String(body?.orderId||""); const methodName=String(body?.paymentMethod||"");
  const order=await query("select id,public_id,total,payment_method from orders.orders where public_id=$1",[orderId]);
  if (!order.rows[0]) return json(res,404,{error:"order_not_found"});
  const saved=order.rows[0];
  const ref="PAY-"+randomUUID().replaceAll("-","").slice(0,16).toUpperCase();
  const p=provider(methodName);
  if (!p.enabled) return json(res,503,{error:"payment_provider_not_configured",provider:methodName});
  const payment=(await query("insert into orders.payments(public_id,order_id,provider,method,amount,status,provider_reference) values($1,$2,$3,$4,$5,'pending',$6) returning public_id,status,amount",[ref,saved.id,methodName,methodName,Number(saved.total),ref])).rows[0];
  if (methodName==="cash") {
    await query("update orders.payments set status='paid',paid_at=now() where id=(select id from orders.payments where public_id=$1)",[ref]);
    return json(res,200,{data:{...payment,status:"paid"}});
  }
  try {
    const paymentUrl=await createMobilePayment(methodName,payment,req);
    await query("update orders.payments set payment_url=$2 where public_id=$1",[ref,paymentUrl]);
    return json(res,200,{data:{...payment,status:"pending",paymentUrl}});
  } catch(error) {
    await query("update orders.payments set status='failed',failure_reason=$2 where public_id=$1",[ref,String(error.message||"provider_error")]);
    return json(res,502,{error:"payment_provider_error"});
  }
}
