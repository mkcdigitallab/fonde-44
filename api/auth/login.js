import { query } from "../_lib/db.js";
import { json, method, parseBody } from "../_lib/http.js";
import { createSession, setSessionCookie } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { hashPassword, verifyPassword } from "../_lib/passwords.js";

const ROLES = new Set(["superadmin", "mere-fonde", "livreur"]);
const DUMMY_HASH = hashPassword("fonde44-dummy-password");

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  const body = parseBody(req);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const role = String(body?.role || "");
  if (!email || !email.includes("@") || !ROLES.has(role)) return json(res, 401, { error: "invalid_credentials" });

  const ipLimit = await checkRateLimit(`login:ip:${clientIp(req)}`, 10, 15);
  const emailLimit = await checkRateLimit(`login:email:${email}`, 5, 15);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    res.setHeader("Retry-After", String(Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds)));
    return json(res, 429, { error: "rate_limited" });
  }

  const result = await query(
    "select id,public_id,email,display_name,role,password_hash from auth.staff_users where lower(email)=lower($1) and role=$2 and is_active=true",
    [email, role],
  );
  const user = result.rows[0];
  const valid = user ? verifyPassword(password, user.password_hash) : verifyPassword(password, DUMMY_HASH);
  if (!user || !valid) return json(res, 401, { error: "invalid_credentials" });

  const token = await createSession(user.id);
  setSessionCookie(res, token);
  return json(res, 200, { data: { id:user.public_id, email:user.email, name:user.display_name, role:user.role } });
}
