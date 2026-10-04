import { query } from "./db.js";

export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
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
