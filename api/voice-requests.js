import { randomUUID } from "node:crypto";
import { query } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";
import { createStorage, isPersistentStorageConfigured } from "./media/storage-factory.js";
import { requireRole, requireSameOrigin } from "./_lib/auth.js";
import { checkRateLimit, clientIp } from "./_lib/rateLimit.js";
import { voiceRequestSchema } from "./_lib/validation.js";
import { isTrackingDisabled, voiceTrackingToken } from "./_lib/orderTracking.js";

const MAX_AUDIO_SIZE = 8 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/webm", "audio/ogg", "audio/mp4"]);
const LOCAL_VOICE_ENABLED = process.env.NODE_ENV !== "production" && process.env.VOICE_ALLOW_LOCAL === "true";

export function isVoiceStorageEnabled() {
  return isPersistentStorageConfigured() || LOCAL_VOICE_ENABLED;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await requireRole(req, res, ["mere-fonde", "superadmin"]);
    if (!user) return;
    const result = await query(
      "select public_id, customer_name, customer_phone, kind, url, duration_seconds, status, created_at, heard_at, processed_at from events.voice_requests order by created_at desc limit 100"
    );
    return json(res, 200, { data: result.rows });
  }

  if (req.method === "PATCH") {
    if (!requireSameOrigin(req, res)) return;
    const user = await requireRole(req, res, ["mere-fonde", "superadmin"]);
    if (!user) return;
    const body = parseBody(req);
    const id = String(body?.id || "");
    const status = String(body?.status || "");

    if (!id || !["new", "heard", "processed", "archived"].includes(status)) {
      return json(res, 422, { error: "invalid_voice_status" });
    }

    const result = await query(
      `update events.voice_requests
       set status=$2,
           heard_at=case when $2='heard' then coalesce(heard_at, now()) else heard_at end,
           processed_at=case when $2='processed' then coalesce(processed_at, now()) else processed_at end
       where public_id=$1
       returning public_id,status,heard_at,processed_at`,
      [id, status]
    );
    if (!result.rows[0]) return json(res, 404, { error: "voice_not_found" });
    return json(res, 200, { data: result.rows[0] });
  }

  if (req.method !== "POST") return method(res, ["GET", "POST", "PATCH"]);
  if (!requireSameOrigin(req, res)) return;

  const limit = await checkRateLimit(`voice-requests:${clientIp(req)}`, 5, 15);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  if (!isVoiceStorageEnabled()) return json(res, 503, { error: "voice_storage_not_configured" });

  const parsed = voiceRequestSchema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 422, { error: "validation_error", details: parsed.error.flatten() });
  const { audioData, duration, kind, customer } = parsed.data;
  const match = audioData.match(/^data:(audio\/(?:webm|ogg|mp4));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || !AUDIO_TYPES.has(match[1])) return json(res, 422, { error: "unsupported_audio_format" });

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_AUDIO_SIZE) return json(res, 422, { error: "audio_too_large" });

  const id = "VOC-" + randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const key = `voice/${id}.${match[1].split("/")[1]}`;

  try {
    const trackingToken = voiceTrackingToken(id);
    const stored = await createStorage().put({ key, buffer, contentType: match[1] });
    const result = await query(
      "insert into events.voice_requests(public_id,storage_key,url,mime_type,size_bytes,duration_seconds,customer_name,customer_phone,kind) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning public_id,created_at",
      [id, key, stored.url, match[1], buffer.length, Math.round(duration), customer.name || null, customer.phone, kind]
    );
    return json(res, 201, { id: result.rows[0].public_id, createdAt: result.rows[0].created_at, trackingToken });
  } catch (error) {
    if (isTrackingDisabled(error)) return json(res, 503, { error: "tracking_disabled" });
    console.error("voice.create", error);
    return json(res, 500, { error: "voice_request_failed" });
  }
}
