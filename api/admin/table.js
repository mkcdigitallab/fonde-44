import { getPool } from "../_lib/db.js";
import { requireRole, requireSameOrigin } from "../_lib/auth.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { resolveReadableTable, primaryKeyColumns, quoteIdentifier, maskRow, hasColumn } from "../_lib/adminTables.js";
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
    const name = String(req.query?.name || "");
    const table = await resolveReadableTable(db, name);
    if (!table) return json(res, 404, { error: "table_not_readable" });

    const pageInfo = pagination(req);
    const primaryKeys = await primaryKeyColumns(db, table.schema, table.table);
    let orderBy = primaryKeys.map(column => quoteIdentifier(column) + " ASC").join(", ");
    if (!orderBy && hasColumn(table.columns, "created_at")) {
      orderBy = quoteIdentifier("created_at") + " DESC";
    }
    if (!orderBy && table.columns[0]) {
      orderBy = quoteIdentifier(table.columns[0].column_name) + " ASC";
    }

    const from = quoteIdentifier(table.schema) + "." + quoteIdentifier(table.table);
    const countResult = await db.query("select count(*)::bigint as count from " + from);
    const dataQuery = "select * from " + from + (orderBy ? " order by " + orderBy : "") + " limit $1 offset $2";
    const result = await db.query(dataQuery, [pageInfo.pageSize, pageInfo.offset]);

    const data = result.rows.map(maskRow);
    await writeAudit(db, user.id, "admin.table_read", name, {
      page: pageInfo.page,
      pageSize: pageInfo.pageSize,
      rows: data.length,
    });

    return json(res, 200, {
      data: {
        schema: table.schema,
        table: table.table,
        columns: table.columns,
        rows: data,
        page: pageInfo.page,
        pageSize: pageInfo.pageSize,
        totalRows: Number(countResult.rows[0]?.count || 0),
        readOnly: true,
      },
    });
  } catch (error) {
    console.error("admin.table", error.message);
    return json(res, 500, { error: "admin_table_failed" });
  }
}
