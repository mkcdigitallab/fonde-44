import { randomBytes } from "node:crypto";
import { query } from "./db.js";
import { hashToken } from "./auth.js";

const COOKIE = "fonde44_customer";
const TTL_SECONDS = 60 * 60 * 24 * 30;

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => {
    const index = part.indexOf("=");
    if (index < 0) return [part.trim(), ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

export function setCustomerCookie(res, token, maxAgeSeconds = TTL_SECONDS) {
  const maxAge = Number.isInteger(maxAgeSeconds) && maxAgeSeconds > 0 ? maxAgeSeconds : TTL_SECONDS;
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

export function clearCustomerCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

export async function createCustomerSession(customerId, client = null) {
  const token = randomBytes(32).toString("hex");
  const db = client || { query };
  await db.query("delete from auth.customer_sessions where expires_at < now()");
  await db.query(
    "insert into auth.customer_sessions(token_hash,customer_id,expires_at) values($1,$2,now()+($3 * interval '1 second'))",
    [hashToken(token), customerId, TTL_SECONDS],
  );
  return token;
}

export async function getCustomerFromRequest(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const result = await query(
    "select c.id,c.public_id,c.email,c.display_name,c.phone,c.password_hash,c.google_sub,c.is_active from auth.customer_sessions s join auth.customers c on c.id=s.customer_id where s.token_hash=$1 and s.expires_at>now() and c.is_active=true",
    [hashToken(token)],
  );
  return result.rows[0] || null;
}

export async function destroyCustomerSession(req) {
  const token = parseCookies(req)[COOKIE];
  if (token) await query("delete from auth.customer_sessions where token_hash=$1", [hashToken(token)]);
}

export async function destroyCustomerSessions(customerId, client = null) {
  const db = client || { query };
  await db.query("delete from auth.customer_sessions where customer_id=$1", [customerId]);
}

export async function requireCustomer(req, res) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) {
    res.status(401).json({ error: "authentication_required" });
    return null;
  }
  return customer;
}

export { TTL_SECONDS };
