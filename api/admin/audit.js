import { getPool } from "../_lib/db.js";
import { requireRole, requireSameOrigin } from "../_lib/auth.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { maskRow } from "../_lib/adminTables.js";
import { writeAudit } from "../_lib/audit.js";
import { json, method } from "../_lib/http.js";

const RATE_MAX = 120;
const RATE_WINDOW = 15;

function pagination(req) {
  const page = Math.max(1, Number.parseInt(req.query?.page || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query?.pageSize || "50", 10) || 50));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

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
    const pageInfo = pagination(req);
    const count = await db.query("select count(*)::bigint as count from admin.audit_log");
    const result = await db.query(
      "select id,actor_user_id,action,target,details,created_at from admin.audit_log order by id desc limit $1 offset $2",
      [pageInfo.pageSize, pageInfo.offset],
    );
    const rows = result.rows.map(maskRow);
    await writeAudit(db, user.id, "admin.audit_read", "admin.audit_log", {
      page: pageInfo.page,
      pageSize: pageInfo.pageSize,
      rows: rows.length,
    });
    return json(res, 200, {
      data: {
        columns: ["id", "actor_user_id", "action", "target", "details", "created_at"],
        rows,
        page: pageInfo.page,
        pageSize: pageInfo.pageSize,
        totalRows: Number(count.rows[0]?.count || 0),
        readOnly: true,
      },
    });
  } catch (error) {
    console.error("admin.audit", error.message);
    return json(res, 500, { error: "admin_audit_failed" });
  }
}
