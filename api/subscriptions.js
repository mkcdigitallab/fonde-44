import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { getPool, query } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";
import { requireSameOrigin } from "./_lib/auth.js";
import { checkRateLimit, clientIp } from "./_lib/rateLimit.js";

function hash(value){return createHash("sha256").update(value).digest("hex");}
function token(){return randomBytes(32).toString("hex");}
const phoneSchema=z.string().trim().regex(/^(?:\+221|221)?7[05678]\d{7}$/,"invalid_senegal_phone");
const scheduleSchema=z.record(z.unknown()).refine(value=>JSON.stringify(value).length<2048,"schedule_too_large");
const itemSchema=z.object({productId:z.string().trim().min(1).max(80),quantity:z.number().int().min(1).max(50)}).strict();
const customerSchema=z.object({name:z.string().trim().min(2).max(100),phone:phoneSchema}).strict();
const baseSchema=z.object({customer:customerSchema,items:z.array(itemSchema).min(1).max(10),frequency:z.enum(["daily","weekly"]),fulfillment:z.enum(["delivery","pickup"]),deliveryAddress:z.string().trim().max(300),schedule:scheduleSchema}).strict();
const createSchema=baseSchema.refine(v=>v.fulfillment!=="delivery"||v.deliveryAddress.length>0,"delivery_address_required");
const patchSchema=baseSchema.extend({id:z.string().trim().min(1).max(80),managementToken:z.string().min(1).max(128),status:z.enum(["active","paused","cancelled"])}).strict().refine(v=>v.fulfillment!=="delivery"||v.deliveryAddress.length>0,"delivery_address_required");

async function validateProducts(client,items){
  const ids=[...new Set(items.map(item=>item.productId))];
  const result=await client.query("select id from catalog.products where id=any($1::text[]) and is_active=true",[ids]);
  return result.rows.length===ids.length;
}

export default async function handler(req,res){
  if(req.method==="GET"){
    const id=String(req.query?.id||"");const managementToken=String(req.query?.token||"");
    if(!id||!managementToken)return json(res,422,{error:"subscription_credentials_required"});
    const result=await query("select public_id,status,frequency,next_run_at,schedule,fulfillment,delivery_address,payment_method,created_at from orders.subscriptions where public_id=$1 and management_token_hash=$2",[id,hash(managementToken)]);
    return json(res,200,{data:result.rows[0]||null});
  }
  if(req.method!=="POST"&&req.method!=="PATCH")return method(res,["GET","POST","PATCH"]);
  if(!requireSameOrigin(req,res))return;
  const limit=await checkRateLimit("subscriptions:"+clientIp(req),5,60);
  if(!limit.allowed){res.setHeader("Retry-After",String(limit.retryAfterSeconds));return json(res,429,{error:"rate_limited"});}
  const parsed=(req.method==="POST"?createSchema:patchSchema).safeParse(parseBody(req));
  if(!parsed.success)return json(res,400,{error:"validation_error",details:parsed.error.flatten()});
  const input=parsed.data;
  const client=await getPool().connect();
  try{
    await client.query("begin");
    if(!(await validateProducts(client,input.items))){await client.query("rollback");return json(res,422,{error:"invalid_product"});}
    const paymentMethod="cash";
    if(req.method==="POST"){
      const managementToken=token();
      const result=await client.query("insert into orders.subscriptions(public_id,customer_name,customer_phone,frequency,schedule,fulfillment,delivery_address,payment_method,management_token_hash,status,next_run_at) values('SUB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),$1,$2,$3,$4,$5,$6,$7,$8,'active',now()) returning public_id,frequency,status,next_run_at,schedule,fulfillment,delivery_address,payment_method",[input.customer.name,input.customer.phone,input.frequency,JSON.stringify(input.schedule),input.fulfillment,input.deliveryAddress,paymentMethod,hash(managementToken)]);
      const subscription=result.rows[0];
      for(const item of input.items)await client.query("insert into orders.subscription_items(subscription_id,product_id,quantity) values((select id from orders.subscriptions where public_id=$1),$2,$3)",[subscription.public_id,item.productId,item.quantity]);
      await client.query("commit");
      return json(res,201,{data:{...subscription,managementToken}});
    }
    const current=await client.query("select id from orders.subscriptions where public_id=$1 and management_token_hash=$2 for update",[input.id,hash(input.managementToken)]);
    if(!current.rows[0]){await client.query("rollback");return json(res,404,{error:"subscription_not_found"});}
    await client.query("update orders.subscriptions set customer_name=$3,customer_phone=$4,frequency=$5,schedule=$6,fulfillment=$7,delivery_address=$8,payment_method=$9,status=$10,updated_at=now() where id=$1 and management_token_hash=$2",[current.rows[0].id,hash(input.managementToken),input.customer.name,input.customer.phone,input.frequency,JSON.stringify(input.schedule),input.fulfillment,input.deliveryAddress,paymentMethod,input.status]);
    await client.query("delete from orders.subscription_items where subscription_id=$1",[current.rows[0].id]);
    for(const item of input.items)await client.query("insert into orders.subscription_items(subscription_id,product_id,quantity) values($1,$2,$3)",[current.rows[0].id,item.productId,item.quantity]);
    const result=await client.query("select public_id,status,frequency,next_run_at,schedule,fulfillment,delivery_address,payment_method,created_at from orders.subscriptions where id=$1",[current.rows[0].id]);
    await client.query("commit");
    return json(res,200,{data:result.rows[0]});
  }catch(error){
    await client.query("rollback");
    console.error("subscriptions",error.message);
    return json(res,500,{error:"subscription_failed"});
  }finally{client.release();}
}
