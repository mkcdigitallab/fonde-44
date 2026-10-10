import { randomUUID } from "node:crypto";
import { getPool, query } from "./_lib/db.js";
import { requireSameOrigin } from "./_lib/auth.js";
import { checkRateLimit, clientIp } from "./_lib/rateLimit.js";
import { z } from "zod";
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
  if (req.method === "GET") {
    const ref=String(req.query?.ref||"");
    if(!ref) return json(res,422,{error:"payment_reference_required"});
    const limit=await checkRateLimit("payments:get:"+clientIp(req),60,15);
    if(!limit.allowed){res.setHeader("Retry-After",String(limit.retryAfterSeconds));return json(res,429,{error:"rate_limited"});}
    const result=await query("select p.public_id,p.status,p.payment_url,o.public_id as order_id,o.total from orders.payments p join orders.orders o on o.id=p.order_id where p.public_id=$1",[ref]);
    return json(res,200,{data:result.rows[0]||null});
  }
  if (req.method !== "POST") return method(res,["GET","POST"]);
  if(!requireSameOrigin(req,res))return;
  const limit=await checkRateLimit("payments:"+clientIp(req),20,15);
  if(!limit.allowed){res.setHeader("Retry-After",String(limit.retryAfterSeconds));return json(res,429,{error:"rate_limited"});}
  const parsed=z.object({orderId:z.string().trim().min(6).max(40),paymentMethod:z.enum(["cash","wave","orange_money"])}).strict().safeParse(parseBody(req));
  if(!parsed.success)return json(res,400,{error:"validation_error",details:parsed.error.flatten()});
  const {orderId,paymentMethod:methodName}=parsed.data;
  const client=await getPool().connect();
  try{
    await client.query("begin");
    const order=await client.query("select id,public_id,total from orders.orders where public_id=$1 for update",[orderId]);
    if(!order.rows[0]){await client.query("rollback");return json(res,404,{error:"order_not_found"});}
    const saved=order.rows[0];
    const existing=await client.query("select id,public_id,status,method,amount,payment_url,provider_reference from orders.payments where order_id=$1 order by id desc for update",[saved.id]);
    const paid=existing.rows.find(row=>row.status==="paid");
    if(paid){await client.query("rollback");return json(res,409,{error:"already_paid"});}
    const samePending=existing.rows.find(row=>row.status==="pending"&&row.method===methodName);
    if(samePending){await client.query("rollback");return json(res,200,{data:{...samePending,reference:samePending.public_id}});}
    for(const row of existing.rows.filter(row=>row.status==="pending"&&row.method!==methodName))await client.query("update orders.payments set status='failed',failure_reason='replaced' where id=$1",[row.id]);
    const ref="PAY-"+randomUUID().replaceAll("-","").slice(0,16).toUpperCase();
    const p=provider(methodName);
    if(!p.enabled){await client.query("rollback");return json(res,503,{error:"payment_provider_not_configured",provider:methodName});}
    const payment={...(await client.query("insert into orders.payments(public_id,order_id,provider,method,amount,status,provider_reference) values($1,$2,$3,$4,$5,'pending',$6) returning public_id,status,amount,method,provider_reference",[ref,saved.id,methodName,methodName,Number(saved.total),ref])).rows[0],reference:ref};
    if(methodName==="cash"){await client.query("commit");return json(res,201,{data:{...payment,status:"pending"}});}
    try{
      const paymentUrl=await createMobilePayment(methodName,payment,req);
      await client.query("update orders.payments set payment_url=$2 where public_id=$1",[ref,paymentUrl]);
      await client.query("commit");
      return json(res,201,{data:{...payment,status:"pending",paymentUrl}});
    }catch(error){
      await client.query("update orders.payments set status='failed',failure_reason=$2 where public_id=$1",[ref,String(error.message||"provider_error")]);
      await client.query("commit");
      return json(res,502,{error:"payment_provider_error"});
    }
  }catch(error){
    await client.query("rollback");
    console.error("payments.create",error.message);
    return json(res,500,{error:"payment_creation_failed"});
  }finally{client.release();}
}
