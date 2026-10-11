import { createStorage } from "./storage-factory.js";
import { requireRole } from "../_lib/auth.js";
import { json, method } from "../_lib/http.js";

const KEY_PATTERN = /^(catalog|voice)\/[A-Za-z0-9._\/-]{1,180}$/;
const CATALOG_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function parseRange(value, size) {
  if (!value) return null;
  const match = String(value).match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return { invalid: true };
  let start = match[1] ? Number(match[1]) : null;
  let end = match[2] ? Number(match[2]) : null;
  if (start === null && end === null) return { invalid: true };
  if (start === null) {
    const suffix = Number(end);
    if (!Number.isInteger(suffix) || suffix <= 0) return { invalid: true };
    start = Math.max(size - suffix, 0);
    end = size - 1;
  } else {
    if (!Number.isInteger(start) || start < 0 || start >= size) return { invalid: true };
    end = end === null ? size - 1 : Number(end);
    if (!Number.isInteger(end) || end < start) return { invalid: true };
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, ["GET"]);
  const key = String(req.query?.key || "");
  if (!KEY_PATTERN.test(key) || key.includes("..") || key.includes("//")) {
    return json(res, 400, { error: "invalid_key" });
  }

  const isVoice = key.startsWith("voice/");
  if (isVoice) {
    const user = await requireRole(req, res, ["mere-fonde"]);
    if (!user) return;
  }

  try {
    const storage = createStorage();
    let object = await storage.get({ key });
    const total = Number(object.ContentSize || object.ContentLength || 0);
    const range = parseRange(req.headers.range, total);

    if (range?.invalid) return res.status(416).setHeader("Accept-Ranges", "bytes").end();     
    if (range && !object.ContentRange) {
      object.Body?.destroy?.();
      object = await storage.get({ key, range });
    }

    const contentType = String(object.ContentType || "");
    if (!isVoice && !CATALOG_TYPES.has(contentType)) return json(res, 415, { error: "unsupported_media_type" });
    if (isVoice && !contentType.startsWith("audio/")) return json(res, 415, { error: "unsupported_media_type" });

    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", isVoice ? "private, no-store" : "public, max-age=31536000, immutable");
    if (object.ContentLength != null) res.setHeader("Content-Length", String(object.ContentLength));
    if (range && object.ContentRange) {
      res.status(206);
      res.setHeader("Content-Range", object.ContentRange);
    }

    if (!object.Body) return res.status(404).json({ error: "not_found" });
    object.Body.on?.("error", () => { if (!res.headersSent) res.status(404).end(); });
    object.Body.pipe(res);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.name === "NoSuchKey" || error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) {
      return json(res, 404, { error: "not_found" });
    }
    return json(res, 404, { error: "not_found" });
  }
}
