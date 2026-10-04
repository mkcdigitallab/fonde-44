import { createHash, randomBytes } from "node:crypto";

export const ACTIVATION_ROLES = new Set(["superadmin", "mere-fonde", "livreur"]);
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 24;

export function generateActivationCode() {
  let code = "";
  while (code.length < CODE_LENGTH) {
    const bytes = randomBytes(32);
    for (const byte of bytes) {
      const limit = 256 - (256 % ALPHABET.length);
      if (byte >= limit) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }
  return code;
}

export function hashActivationCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

export async function issueActivationCode(client, role, days) {
  if (!ACTIVATION_ROLES.has(role)) {
    const error = new Error("invalid_role");
    error.code = "INVALID_ROLE";
    throw error;
  }
  if (!Number.isInteger(days) || days < 1 || days > 14) {
    const error = new Error("invalid_days");
    error.code = "INVALID_DAYS";
    throw error;
  }

  const active = await client.query(
    "select 1 from auth.staff_users where role=$1 and is_active=true limit 1",
    [role],
  );
  if (active.rows.length) {
    const error = new Error("role_already_active");
    error.code = "ROLE_ALREADY_ACTIVE";
    throw error;
  }

  const code = generateActivationCode();
  await client.query(
    "insert into auth.activation_codes(role,code_hash,expires_at) values($1,$2,now()+($3 * interval '1 day'))",
    [role, hashActivationCode(code), days],
  );

  return { code, days };
}
