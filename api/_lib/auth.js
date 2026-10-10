import { createHash, randomBytes } from "node:crypto";
import { query } from "./db.js";

const COOKIE = "fonde44_session";
const DEFAULT_TTL_SECONDS = 60 * 60 * 12;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map(part => {
    const index = part.indexOf("=");
    if (index < 0) return [part.trim(), ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function originFromRequest(req) {
  const proto = String(req.headers["x-forwarded-proto"] || (process.env.NODE_ENV === "production" ? "https" : "http")).split(",")[0].trim();
  const host = String(req.headers.host || "").trim();
  return host ? `${proto}://${host}` : null;
}

export function setSessionCookie(res, token, maxAgeSeconds = DEFAULT_TTL_SECONDS) {
  const maxAge = Number.isInteger(maxAgeSeconds) && maxAgeSeconds > 0 ? maxAgeSeconds : DEFAULT_TTL_SECONDS;
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

export async function createSession(userId, client = null, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const token = randomBytes(32).toString("hex");
  const db = client || { query };
  const ttl = Number.isInteger(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : DEFAULT_TTL_SECONDS;
  await db.query(
    "insert into auth.sessions(token_hash,user_id,expires_at) values($1,$2,now()+($3 * interval '1 second'))",
    [hashToken(token), userId, ttl],
  );
  return token;
}

export async function getSessionUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const result = await query(
    "select u.id,u.public_id,u.email,u.display_name,u.role from auth.sessions s join auth.staff_users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now() and u.is_active=true",
    [hashToken(token)]
  );
  return result.rows[0] || null;
}

export async function destroySession(req) {
  const token = parseCookies(req)[COOKIE];
  if (token) await query("delete from auth.sessions where token_hash=$1", [hashToken(token)]);
}

export async function requireRole(req, res, roles, options = {}) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "authentication_required" });
    return null;
  }
  if (user.role === "superadmin" && options.superadmin !== false) return user;
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }
  return user;
}

export function requireSameOrigin(req, res) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return true;

  const supplied = req.headers.origin || req.headers.referer;
  if (!supplied) {
    res.status(403).json({ error: "bad_origin" });
    return false;
  }

  let suppliedOrigin;
  try {
    suppliedOrigin = new URL(String(supplied)).origin;
  } catch {
    res.status(403).json({ error: "bad_origin" });
    return false;
  }

  const allowed = new Set();
  const requestOrigin = originFromRequest(req);
  if (requestOrigin) allowed.add(requestOrigin);

  if (process.env.PUBLIC_BASE_URL) {
    try {
      allowed.add(new URL(process.env.PUBLIC_BASE_URL).origin);
    } catch {}
  }

  if (!allowed.has(suppliedOrigin)) {
    res.status(403).json({ error: "bad_origin" });
    return false;
  }

  return true;
}

export { hashToken };
