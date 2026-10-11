import { OAuth2Client } from "google-auth-library";
import { query } from "../_lib/db.js";
import { json, method, parseBody } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { createCustomerSession, setCustomerCookie } from "../_lib/customerAuth.js";
import { z } from "zod";

const schema = z.object({ credential: z.string().min(1).max(10000) }).strict();

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  if (!requireSameOrigin(req, res)) return;
  if (!process.env.GOOGLE_CLIENT_ID) return json(res, 503, { error: "google_not_configured" });

  const limit = await checkRateLimit(`customer-google:ip:${clientIp(req)}`, 20, 15);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  const parsed = schema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 400, { error: "validation_error", details: parsed.error.flatten() });

  let payload;
  try {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken:parsed.data.credential, audience:process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return json(res, 401, { error: "invalid_google_credential" });
  }

  if (!payload?.email || payload.email_verified !== true || !payload.sub) {
    return json(res, 401, { error: "invalid_google_credential" });
  }

  const email = payload.email.toLowerCase();
  const byGoogle = await query("select id,public_id,email,display_name,phone,password_hash,google_sub from auth.customers where google_sub=$1 and is_active=true limit 1", [payload.sub]);
  let customer = byGoogle.rows[0];

  if (!customer) {
    const byEmail = await query("select id from auth.customers where lower(email)=lower($1) limit 1", [email]);
    if (byEmail.rows[0]) return json(res, 409, { error: "email_exists_use_password" });

    const displayName = String(payload.name || payload.email.split("@")[0]).trim().slice(0,80) || "Client";
    const created = await query(
      "insert into auth.customers(public_id,email,google_sub,display_name) values('CLI-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),$1,$2,$3) returning id,public_id,email,display_name,phone,password_hash,google_sub",
      [email,payload.sub,displayName],
    );
    customer = created.rows[0];
  }

  await query("update auth.customers set last_login_at=now() where id=$1", [customer.id]);
  const token = await createCustomerSession(customer.id);
  setCustomerCookie(res, token);
  return json(res, 200, { data:{id:customer.public_id,name:customer.display_name,email:customer.email,phone:customer.phone,hasPassword:Boolean(customer.password_hash),hasGoogle:true} });
}
