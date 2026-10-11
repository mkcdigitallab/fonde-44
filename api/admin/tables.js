import { getPool } from "../_lib/db.js";
import { requireRole, requireSameOrigin } from "../_lib/auth.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { listReadableTables } from "../_lib/adminTables.js";
import { writeAudit } from "../_lib/audit.js";
import { json, method } from "../_lib/http.js";

const RATE_MAX = 120;
const RATE_WINDOW = 15;

export default async function handler(req, res) {
  if (req.method !== "GET") return method(res, ["GET"]);
  const user = await requireRole(req, res, ["superadmin"], { superadmin: true });
  if (!user) return;

  const limit = await checkRateLimit(`admin:user:${user.id}`, RATE_MAX, RATE_WINDOW);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  if (!requireSameOrigin(req, res)) return;

  try {
    const db = getPool();
    const tables = await listReadableTables(db);
    await writeAudit(db, user.id, "admin.tables_read", "admin.tables", { count: tables.length });
    return json(res, 200, { data: tables });
  } catch (error) {
    console.error("admin.tables", error.message);
    return json(res, 500, { error: "admin_tables_failed" });
  }
}
