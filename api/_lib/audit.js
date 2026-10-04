const SENSITIVE_KEY = /password|token|secret|code_hash|hash/i;

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key) ? "[masqué]" : sanitize(item);
  }
  return output;
}

export async function writeAudit(db, actorUserId, action, target = null, details = {}) {
  const safeDetails = sanitize(details);
  await db.query(
    "insert into admin.audit_log(actor_user_id,action,target,details) values($1,$2,$3,$4::jsonb)",
    [actorUserId, action, target, JSON.stringify(safeDetails)],
  );
}
