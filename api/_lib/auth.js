import { createHash, randomBytes } from "node:crypto";
import { query } from "./db.js";

const COOKIE = "fonde44_session";
const MAX_AGE = 60 * 60 * 12;

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

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  await query("insert into auth.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '12 hours')", [hashToken(token), userId]);
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

export async function requireRole(req, res, roles) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "authentication_required" });
    return null;
  }
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }
  return user;
}
