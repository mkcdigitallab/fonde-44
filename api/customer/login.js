import { query } from "../_lib/db.js";
import { json, method, parseBody } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { hashPassword, verifyPassword } from "../_lib/passwords.js";
import { createCustomerSession, setCustomerCookie } from "../_lib/customerAuth.js";
import { z } from "zod";

const DUMMY_HASH = hashPassword("fonde44-customer-dummy-password");
const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().max(128),
}).strict();

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  if (!requireSameOrigin(req, res)) return;

  const parsed = schema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 401, { error: "invalid_credentials" });

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;
  const ipLimit = await checkRateLimit(`customer-login:ip:${clientIp(req)}`, 10, 15);
  const emailLimit = await checkRateLimit(`customer-login:email:${email}`, 5, 15);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    res.setHeader("Retry-After", String(Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds)));
    return json(res, 429, { error: "rate_limited" });
  }

  const result = await query("select id,public_id,email,display_name,phone,password_hash,google_sub from auth.customers where lower(email)=lower($1) and is_active=true limit 1", [email]);
  const customer = result.rows[0];
  const valid = customer?.password_hash
    ? verifyPassword(password, customer.password_hash)
    : verifyPassword(password, DUMMY_HASH);
  if (!customer || !customer.password_hash || !valid) return json(res, 401, { error: "invalid_credentials" });

  await query("update auth.customers set last_login_at=now() where id=$1", [customer.id]);
  const token = await createCustomerSession(customer.id);
  setCustomerCookie(res, token);
  return json(res, 200, { data:{id:customer.public_id,name:customer.display_name,email:customer.email,phone:customer.phone,hasPassword:true,hasGoogle:Boolean(customer.google_sub)} });
}
