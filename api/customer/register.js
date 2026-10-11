import { query } from "../_lib/db.js";
import { json, method, parseBody } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { hashPassword } from "../_lib/passwords.js";
import { createCustomerSession, setCustomerCookie } from "../_lib/customerAuth.js";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  phone: z.string().trim().min(8).max(30).optional(),
}).strict();

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  if (!requireSameOrigin(req, res)) return;
  const limit = await checkRateLimit(`customer-register:ip:${clientIp(req)}`, 5, 60);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  const parsed = schema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 400, { error: "validation_error", details: parsed.error.flatten() });
  const input = parsed.data;
  const email = input.email.toLowerCase();
  const existing = await query("select id from auth.customers where lower(email)=lower($1) limit 1", [email]);
  if (existing.rows[0]) return json(res, 409, { error: "email_taken" });

  const passwordHash = hashPassword(input.password);
  const result = await query(
    "insert into auth.customers(public_id,email,password_hash,display_name,phone) values('CLI-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),$1,$2,$3,$4) returning id,public_id,email,display_name,phone",
    [email, passwordHash, input.displayName, input.phone || null],
  );
  const customer = result.rows[0];
  const token = await createCustomerSession(customer.id);
  setCustomerCookie(res, token);
  return json(res, 201, { data: { id:customer.public_id,name:customer.display_name,email:customer.email,phone:customer.phone,hasPassword:true,hasGoogle:false } });
}
