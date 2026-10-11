// À valider avec un événement de test réel sur un déploiement d'aperçu Vercel avant d'activer les paiements.
import { createHmac, timingSafeEqual } from "node:crypto";
import { query } from "../../_lib/db.js";

function verify(signature, rawBody, secret) {
  if (!signature || !secret) return false;
  const parts = String(signature).split(",");
  const timestamp = parts.find(x => x.startsWith("t="))?.slice(2);
  const signatures = parts.filter(x => x.startsWith("v1=")).map(x => x.slice(3));
  if (!timestamp || Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(timestamp + rawBody).digest("hex");
  return signatures.some(value => value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected)));
}

function firstDefined(...values) { return values.find(value => value !== undefined && value !== null && value !== ""); }

export async function POST(request) {
  const secret = process.env.WAVE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "webhook_disabled" }, { status: 503 });
  const rawBody = await request.text();
  if (!verify(request.headers.get("wave-signature"), rawBody, secret)) return Response.json({ error: "invalid_webhook" }, { status: 401 });

  let event;
  try { event = JSON.parse(rawBody); } catch { return Response.json({ error: "invalid_event" }, { status: 400 }); }
  if (!event?.id) return Response.json({ error: "invalid_event" }, { status: 400 });

  if (event.type === "checkout.session.completed" && event.data?.payment_status === "succeeded") {
    const reference = String(firstDefined(event.data.client_reference, event.data.clientReference) || "");
    const payloadAmount = firstDefined(event.data.amount, event.data.amount_xof, event.data.payment?.amount);
    const payloadCurrency = firstDefined(event.data.currency, event.data.payment?.currency);
    if (payloadAmount !== undefined || payloadCurrency !== undefined) {
      const payment = await query("select public_id, amount from orders.payments where public_id=$1 and status='pending'", [reference]);
      if (!payment.rows[0]) return Response.json({ received: true });
      const amount = Number(payloadAmount);
      const currency = String(payloadCurrency || "XOF").toUpperCase();
      if (!Number.isInteger(amount) || amount !== Number(payment.rows[0].amount) || currency !== "XOF") {
        await query("insert into admin.audit_log(action,target,details) values($1,$2,$3)", ["payment.webhook_amount_mismatch", reference || null, JSON.stringify({ provider: "wave" })]);
        return Response.json({ error: "payment_mismatch" }, { status: 409 });
      }
    }
    await query(
      "update orders.payments set status='paid',paid_at=now(),provider_reference=$2 where public_id=$1 and status='pending'",
      [reference, event.data.id]
    );
  }
  return Response.json({ received: true });
}
