// À valider avec un événement de test réel sur un déploiement d'aperçu Vercel avant d'activer les paiements.
// À valider avec la documentation Orange Money avant activation.
import { timingSafeEqual } from "node:crypto";
import { query } from "../../_lib/db.js";

function secureEquals(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request) {
  const expected = process.env.OM_WEBHOOK_SECRET;
  if (!expected) return Response.json({ error: "webhook_disabled" }, { status: 503 });
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secureEquals(provided, expected)) return Response.json({ error: "invalid_webhook" }, { status: 401 });

  const rawBody = await request.text();
  let body;
  try { body = JSON.parse(rawBody); } catch { return Response.json({ error: "invalid_event" }, { status: 400 }); }

  const reference = String(body.reference || body.transactionReference || body.orderReference || "");
  const status = String(body.status || body.paymentStatus || "").toLowerCase();
  if (reference && ["success","succeeded","paid","successful"].includes(status)) {
    await query("update orders.payments set status='paid',paid_at=now(),provider_reference=coalesce($2,provider_reference) where public_id=$1 and status='pending'", [reference, String(body.transactionId || body.transactionReference || "")]);
  } else if (reference && ["failed","cancelled","canceled"].includes(status)) {
    await query("update orders.payments set status='failed',failure_reason=$2 where public_id=$1 and status='pending'", [reference, status]);
  }
  return Response.json({ received: true });
}
