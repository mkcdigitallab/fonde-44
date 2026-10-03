import { randomUUID } from "node:crypto";
import { query } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";
import { MinioMediaStorage } from "./media/minio-media-storage.js";
import { requireRole } from "./_lib/auth.js";

const MAX_AUDIO_SIZE = 8 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"]);

function storage() {
  if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
    throw new Error("voice_storage_not_configured");
  }
  return new MinioMediaStorage({
    endpoint: process.env.MINIO_ENDPOINT,
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET || "fonde44"
  });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = await requireRole(req, res, ["mere-fonde"]);
    if (!user) return;
    const result = await query("select public_id, url, duration_seconds, status, created_at from events.voice_requests where status <> 'archived' order by created_at desc limit 50");
    return json(res, 200, { data: result.rows });
  }
  if (req.method === "PATCH") {
    const user = await requireRole(req, res, ["mere-fonde"]);
    if (!user) return;
    const body = parseBody(req);
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    if (!id || !["new","heard","processed","archived"].includes(status)) return json(res, 422, { error: "invalid_voice_status" });
    const result = await query("update events.voice_requests set status=$2 where public_id=$1 returning public_id,status", [id,status]);
    if (!result.rows[0]) return json(res, 404, { error: "voice_not_found" });
    return json(res, 200, { data: result.rows[0] });
  }
  if (req.method !== "POST") return method(res, ["GET", "POST", "PATCH"]);

  const body = parseBody(req);
  const audioData = body?.audioData;
  const duration = Number(body?.duration || 0);

  if (typeof audioData !== "string" || duration < 0 || duration > 600) {
    return json(res, 422, { error: "invalid_voice_request" });
  }

  const match = audioData.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match || !AUDIO_TYPES.has(match[1])) {
    return json(res, 422, { error: "unsupported_audio_format" });
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_AUDIO_SIZE) {
    return json(res, 422, { error: "audio_too_large" });
  }

  const id = "VOC-" + randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const extension = match[1].split("/")[1].replace("mpeg", "mp3");
  const key = `voice/${id}.${extension}`;

  try {
    const stored = await storage().put({ key, buffer, contentType: match[1] });
    const result = await query(
      "insert into events.voice_requests(public_id,storage_key,url,mime_type,size_bytes,duration_seconds) values($1,$2,$3,$4,$5,$6) returning public_id,created_at",
      [id, key, stored.url, match[1], buffer.length, Math.round(duration)]
    );
    return json(res, 201, { data: result.rows[0] });
  } catch (error) {
    console.error("voice.create", error);
    return json(res, 500, { error: "voice_request_failed" });
  }
}
