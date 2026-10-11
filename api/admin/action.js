import { z } from "zod";
import { getPool } from "../_lib/db.js";
import { requireRole, requireSameOrigin } from "../_lib/auth.js";
import { checkRateLimit } from "../_lib/rateLimit.js";
import { writeAudit } from "../_lib/audit.js";
import { issueActivationCode } from "../_lib/activationCodes.js";
import { json, method, parseBody } from "../_lib/http.js";

const RATE_MAX = 120;
const RATE_WINDOW = 15;

const actionSchema = z.object({
  action: z.enum(["staff.deactivate", "staff.revoke_sessions", "staff.issue_activation_code"]),
  params: z.record(z.unknown()),
  confirm: z.string().max(32),
}).strict();

const publicIdSchema = z.object({ publicId: z.string().trim().min(1).max(80) }).strict();
const issueCodeSchema = z.object({
  role: z.enum(["superadmin", "mere-fonde", "livreur"]),
  days: z.number().int().min(1).max(14),
}).strict();

function actionError(status, error) {
  const result = new Error(error);
  result.status = status;
  return result;
}

async function executeAction(client, actor, input) {
  if (input.action === "staff.deactivate") {
    const params = publicIdSchema.safeParse(input.params);
    if (!params.success) throw actionError(400, "invalid_action_params");
    if (input.confirm !== "DESACTIVER") throw actionError(400, "confirmation_required");
    if (params.data.publicId === actor.public_id) throw actionError(409, "cannot_deactivate_self");

    const targetResult = await client.query(
      "select id,public_id,email,display_name,role,is_active from auth.staff_users where public_id=$1 for update",
      [params.data.publicId],
    );
    const target = targetResult.rows[0];
    if (!target) throw actionError(404, "staff_not_found");
    if (!target.is_active) throw actionError(409, "staff_already_inactive");

    if (target.role === "superadmin") {
      const active = await client.query(
        "select count(*)::int as count from auth.staff_users where role='superadmin' and is_active=true",
      );
      if (Number(active.rows[0]?.count || 0) <= 1) throw actionError(409, "last_superadmin");
    }

    await client.query("update auth.staff_users set is_active=false where id=$1", [target.id]);
    await client.query("delete from auth.sessions where user_id=$1", [target.id]);
    await writeAudit(client, actor.id, "staff.deactivate", target.public_id, { role: target.role });
    return { data: { publicId: target.public_id, isActive: false } };
  }

  if (input.action === "staff.revoke_sessions") {
    const params = publicIdSchema.safeParse(input.params);
    if (!params.success) throw actionError(400, "invalid_action_params");

    const target = await client.query(
      "select id,public_id from auth.staff_users where public_id=$1 for update",
      [params.data.publicId],
    );
    if (!target.rows[0]) throw actionError(404, "staff_not_found");

    const deleted = await client.query("delete from auth.sessions where user_id=$1", [target.rows[0].id]);
    await writeAudit(client, actor.id, "staff.revoke_sessions", target.rows[0].public_id, {
      revokedSessions: deleted.rowCount,
    });
    return { data: { publicId: target.rows[0].public_id, revokedSessions: deleted.rowCount } };
  }

  if (input.action === "staff.issue_activation_code") {
    const params = issueCodeSchema.safeParse(input.params);
    if (!params.success) throw actionError(400, "invalid_action_params");

    try {
      const issued = await issueActivationCode(client, params.data.role, params.data.days);
      await writeAudit(client, actor.id, "staff.issue_activation_code", params.data.role, {
        role: params.data.role,
        days: params.data.days,
      });
      return { data: { role: params.data.role, days: params.data.days, code: issued.code } };
    } catch (error) {
      if (error.code === "ROLE_ALREADY_ACTIVE") throw actionError(409, "role_already_active");
      if (error.code === "INVALID_ROLE" || error.code === "INVALID_DAYS") throw actionError(400, "invalid_activation_code_request");
      throw error;
    }
  }

  throw actionError(400, "unknown_action");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  if (!requireSameOrigin(req, res)) return;

  const user = await requireRole(req, res, ["superadmin"], { superadmin: true });
  if (!user) return;

  const limit = await checkRateLimit(`admin:user:${user.id}`, RATE_MAX, RATE_WINDOW);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }

  const parsed = actionSchema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 400, { error: "invalid_action" });

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await executeAction(client, user, parsed.data);
    await client.query("commit");
    return json(res, 200, result);
  } catch (error) {
    await client.query("rollback");
    if (error.status) return json(res, error.status, { error: error.message });
    console.error("admin.action", error.message);
    return json(res, 500, { error: "admin_action_failed" });
  } finally {
    client.release();
  }
}
