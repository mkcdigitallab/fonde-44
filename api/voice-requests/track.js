import { query } from "../_lib/db.js";
import { json, method } from "../_lib/http.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { isTrackingDisabled, verifyVoiceTrackingToken } from "../_lib/orderTracking.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (req.method !== "GET") return method(res, ["GET"]);

  const limit = await checkRateLimit(`voice-track:${clientIp(req)}`, 200, 15);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  const id = String(req.query?.id || "");
  const token = String(req.query?.token || "");
  let valid = false;
  try {
    valid = verifyVoiceTrackingToken(id, token);
  } catch (error) {
    if (!isTrackingDisabled(error)) throw error;
  }
  if (!valid) return json(res, 404, { error: "voice_not_found" });

  const result = await query("select status from events.voice_requests where public_id=$1 limit 1", [id]);
  const row = result.rows[0];
  if (!row) return json(res, 404, { error: "voice_not_found" });
  const status = row.status === "new" ? "sent" : row.status === "heard" ? "heard" : "processed";
  return json(res, 200, { status });
}
