import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getPool } from "../_lib/db.js";
import { json, method, parseBody } from "../_lib/http.js";
import { setSessionCookie, hashToken } from "../_lib/auth.js";
import { checkRateLimit, clientIp } from "../_lib/rateLimit.js";
import { hashPassword } from "../_lib/passwords.js";

const schema = z.object({
  code: z.string().length(24),
  email: z.string().email().transform(value => value.trim().toLowerCase()),
  displayName: z.string().trim().min(2).max(80),
  password: z.string().min(12).max(128),
}).strict();

const GENERIC_ERROR = { error: "invalid_activation" };

export default async function handler(req, res) {
  if (req.method !== "POST") return method(res, ["POST"]);
  const limit = await checkRateLimit(`activate:ip:${clientIp(req)}`, 5, 15);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSeconds));
    return json(res, 429, { error: "rate_limited" });
  }
  const parsed = schema.safeParse(parseBody(req));
  if (!parsed.success) return json(res, 400, GENERIC_ERROR);

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const codeHash = createHash("sha256").update(parsed.data.code).digest("hex");
    const codeResult = await client.query("select id,role,expires_at,used_at from auth.activation_codes where code_hash=$1 for update", [codeHash]);
    const activation = codeResult.rows[0];
    if (!activation || activation.used_at || new Date(activation.expires_at).getTime() <= Date.now()) {
      await client.query("rollback");
      return json(res, 400, GENERIC_ERROR);
    }
    const activeRole = await client.query("select id from auth.staff_users where role=$1 and is_active=true limit 1 for update", [activation.role]);
    if (activeRole.rows[0]) {
      await client.query("rollback");
      return json(res, 409, { error: "role_already_active" });
    }
    const passwordHash = hashPassword(parsed.data.password);
    const inserted = await client.query(
      "insert into auth.staff_users(email,display_name,role,password_hash,is_active) values($1,$2,$3,$4,true) returning id,public_id,email,display_name,role",
      [parsed.data.email, parsed.data.displayName, activation.role, passwordHash],
    );
    const claimed = await client.query("update auth.activation_codes set used_at=now() where id=$1 and used_at is null returning id", [activation.id]);
    if (claimed.rows.length !== 1) {
      await client.query("rollback");
      return json(res, 400, GENERIC_ERROR);
    }
    await client.query(
      "insert into admin.audit_log(actor_user_id,action,target,details) values($1,$2,$3,$4::jsonb)",
      [null, "staff.activated", inserted.rows[0].public_id, JSON.stringify({ role: activation.role })],
    );
    const token = randomBytes(32).toString("hex");
    await client.query("insert into auth.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '12 hours')", [hashToken(token), inserted.rows[0].id]);
    await client.query("commit");
    setSessionCookie(res, token);
    return json(res, 201, { data: { id: inserted.rows[0].public_id, email: inserted.rows[0].email, name: inserted.rows[0].display_name, role: inserted.rows[0].role } });
  } catch (error) {
    await client.query("rollback");
    if (error.code === "23505") return json(res, 409, { error: "account_conflict" });
    console.error("auth.activate", error.message);
    return json(res, 500, { error: "activation_failed" });
  } finally { client.release(); }
}
