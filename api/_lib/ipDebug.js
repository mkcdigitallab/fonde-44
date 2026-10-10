import { timingSafeEqual } from "node:crypto";
import { clientIp } from "./rateLimit.js";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 30;
const requestsByIp = new Map();

function notFound(res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(404).json({ error: "not_found" });
}

function hasValidToken(candidate, expected) {
  const expectedBytes = Buffer.from(expected, "utf8");
  const candidateBytes = Buffer.from(candidate, "utf8");
  if (candidateBytes.length !== expectedBytes.length) {
    timingSafeEqual(expectedBytes, Buffer.alloc(expectedBytes.length));
    return false;
  }
  return timingSafeEqual(candidateBytes, expectedBytes);
}

function isRateLimited(ip, now = Date.now()) {
  const active = (requestsByIp.get(ip) || []).filter(timestamp => now - timestamp < WINDOW_MS);
  if (active.length >= MAX_REQUESTS) {
    requestsByIp.set(ip, active);
    return true;
  }
  active.push(now);
  requestsByIp.set(ip, active);
  if (requestsByIp.size > 10000) {
    for (const [key, timestamps] of requestsByIp) {
      if (!timestamps.some(timestamp => now - timestamp < WINDOW_MS)) requestsByIp.delete(key);
    }
  }
  return false;
}

export default function ipDebug(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const expected = process.env.IP_DEBUG_TOKEN;
  if (typeof expected !== "string" || expected.length < 24) return notFound(res);

  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    res.setHeader("Retry-After", "900");
    return res.status(429).json({ error: "rate_limited" });
  }

  const token = typeof req.query?.token === "string" ? req.query.token : "";
  if (!hasValidToken(token, expected)) return notFound(res);

  const configuredHops = process.env.TRUSTED_PROXY_HOPS;
  const trustedProxyHops = configuredHops === undefined ? 1 : Number(configuredHops);
  return res.status(200).json({
    clientIp: ip,
    trustedProxyHops,
    xForwardedFor: req.headers["x-forwarded-for"] || null,
    cfConnectingIp: req.headers["cf-connecting-ip"] || null,
    socketAddress: req.socket?.remoteAddress || null,
  });
}
