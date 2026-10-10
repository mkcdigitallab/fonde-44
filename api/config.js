import { checkRateLimit, clientIp } from "./_lib/rateLimit.js";
import { json, method } from "./_lib/http.js";

function isConfigured(...names) {
  return names.every(name => Boolean(process.env[name]));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return method(res, ["GET"]);
  }

  const limit = await checkRateLimit("config:" + clientIp(req), 60, 15);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  return json(res, 200, {
    payments: {
      cash: true,
      wave: isConfigured("WAVE_API_KEY", "WAVE_WEBHOOK_SECRET"),
      orange_money: isConfigured(
        "OM_MERCHANT_CODE",
        "OM_CLIENT_ID",
        "OM_CLIENT_SECRET",
        "OM_WEBHOOK_SECRET",
      ),
    },
    subscriptions: process.env.SUBSCRIPTIONS_ENABLED === "true",
  });
}
