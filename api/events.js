import { query } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";
import { eventSchema } from "./_lib/validation.js";
import { requireSameOrigin } from "./_lib/auth.js";
import { checkRateLimit, clientIp } from "./_lib/rateLimit.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  if(!requireSameOrigin(req,res))return;
  const limit=await checkRateLimit(`events:${clientIp(req)}`,5,60);
  if(!limit.allowed){res.setHeader("Retry-After",String(limit.retryAfterSeconds));return json(res,429,{error:"rate_limited"});}
  const parsed = eventSchema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 400, { error: "validation_error", details: parsed.error.flatten() });
  try {
    const { type, people, date, phone, location, details } = parsed.data;
    const { rows } = await query("insert into events.event_requests(type,people,requested_date,phone,location,details) values($1,$2,$3,$4,$5,$6) returning public_id,status,created_at", [type,people,date,phone,location,details]);
    return json(res, 201, { data: rows[0] });
  } catch (error) { console.error("events.create", error); return json(res, 500, { error: "event_creation_failed" }); }
}
