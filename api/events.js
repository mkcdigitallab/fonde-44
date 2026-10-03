import { query } from "./_lib/db.js";
import { json, method, parseBody } from "./_lib/http.js";
import { eventSchema } from "./_lib/validation.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  const parsed = eventSchema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 400, { error: "validation_error", details: parsed.error.flatten() });
  try {
    const { type, people, date, phone } = parsed.data;
    const { rows } = await query("insert into events.event_requests(type,people,requested_date,phone) values($1,$2,$3,$4) returning public_id,status,created_at", [type,people,date,phone]);
    return json(res, 201, { data: rows[0] });
  } catch (error) { console.error("events.create", error); return json(res, 500, { error: "event_creation_failed" }); }
}
