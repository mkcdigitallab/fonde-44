import { query } from "./db.js";

const configuredHops = process.env.TRUSTED_PROXY_HOPS;
const TRUSTED_PROXY_HOPS = configuredHops === undefined ? 1 : Number(configuredHops);

if (!Number.isSafeInteger(TRUSTED_PROXY_HOPS) || TRUSTED_PROXY_HOPS < 1) {
  throw new Error("TRUSTED_PROXY_HOPS doit être un entier supérieur ou égal à 1.");
}

export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const addresses = String(forwarded).split(",").map(address => address.trim()).filter(Boolean);
    const index = addresses.length - TRUSTED_PROXY_HOPS;
    if (index >= 0 && addresses[index]) return addresses[index];
  }
  return req.socket?.remoteAddress || "unknown";
}

export async function checkRateLimit(key, max, windowMinutes) {
  await query("delete from auth.login_attempts where attempted_at < now() - interval '24 hours'");
  const result = await query(
    "select count(*)::int as count from auth.login_attempts where key=$1 and attempted_at >= now() - ($2 * interval '1 minute')",
    [key, windowMinutes],
  );
  const count = result.rows[0]?.count || 0;
  await query("insert into auth.login_attempts(key) values($1)", [key]);
  const allowed = count < max;
  const retryAfterSeconds = allowed ? 0 : Math.max(1, windowMinutes * 60);
  return { allowed, retryAfterSeconds };
}
