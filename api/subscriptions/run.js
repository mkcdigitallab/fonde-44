import { createHash } from "node:crypto";
import { query } from "../_lib/db.js";
import { json, method } from "../_lib/http.js";

function dueDays(schedule) {
  const days = Array.isArray(schedule?.days) && schedule.days.length ? schedule.days.map(Number) : [0,1,2,3,4,5,6];
  return days;
}
function slotTimes(schedule) {
  const slots = Array.isArray(schedule?.slots) && schedule.slots.length ? schedule.slots : ["matin"];
  return slots.map(slot => slot === "soir" ? "18:00" : "08:00");
}
function refFor(subscription, date, slot) {
  return "SUB-" + subscription.public_id + "-" + date + "-" + slot;
}
export default async function handler(req,res) {
  if(req.method!=="POST") return method(res,["POST"]);
  const secret=req.headers.authorization?.replace(/^Bearer\s+/i,"");
  if(!process.env.SUBSCRIPTIONS_CRON_SECRET || secret!==process.env.SUBSCRIPTIONS_CRON_SECRET) return json(res,401,{error:"unauthorized"});
  const due=await query("select * from orders.subscriptions where status='active' and next_run_at<=now() order by next_run_at asc limit 50");
  let generated=0;
  for(const sub of due.rows){
    const schedule=sub.schedule || {};
    const now=new Date();
    if(!dueDays(schedule).includes(now.getDay())) {
      await query("update orders.subscriptions set next_run_at=now()+interval '1 day',updated_at=now() where id=$1",[sub.id]);
      continue;
    }
    for(const time of slotTimes(schedule)){
      const scheduled=new Date(now);
      const [hours,minutes]=time.split(":").map(Number);
      scheduled.setHours(hours,minutes,0,0);
      if(scheduled <= now) scheduled.setDate(scheduled.getDate()+1);
      const slot=time==="18:00"?"soir":"matin";
      const items=await query("select si.product_id,si.quantity,p.name,p.unit,p.price from orders.subscription_items si join catalog.products p on p.id=si.product_id where si.subscription_id=$1 and p.is_active=true",[sub.id]);
      if(!items.rows.length) continue;
      const lines=items.rows.map(x=>({productId:x.product_id,name:x.name,unit:x.unit,unitPrice:Number(x.price),quantity:x.quantity,lineTotal:Number(x.price)*x.quantity}));
      const subtotal=lines.reduce((sum,x)=>sum+x.lineTotal,0);
      const potQuantity=lines.filter(x=>x.unit==="pot").reduce((sum,x)=>sum+x.quantity,0);
      if(sub.fulfillment==="delivery" && potQuantity<3) continue;
      const reference=refFor(sub,scheduled.toISOString().slice(0,10),slot);
      const inserted=await query("insert into orders.orders(client_reference,customer_name,customer_phone,customer_address,fulfillment,payment_method,order_timing,scheduled_at,subtotal,delivery_fee,total) values($1,$2,$3,$4,$5,$6,'scheduled',$7,$8,0,$8) on conflict(client_reference) where client_reference is not null do nothing returning id,public_id",[reference,sub.customer_name,sub.customer_phone,sub.delivery_address,sub.fulfillment,sub.payment_method,scheduled.toISOString(),subtotal]);
      if(!inserted.rows[0]) continue;
      for(const line of lines) await query("insert into orders.order_items(order_id,product_id,product_name,unit,unit_price,quantity,line_total) values($1,$2,$3,$4,$5,$6,$7)",[inserted.rows[0].id,line.productId,line.name,line.unit,line.unitPrice,line.quantity,line.lineTotal]);
      generated++;
    }
    await query("update orders.subscriptions set next_run_at=case when frequency='weekly' then now()+interval '7 days' else now()+interval '1 day' end,updated_at=now() where id=$1",[sub.id]);
  }
  return json(res,200,{data:{generated}});
}
