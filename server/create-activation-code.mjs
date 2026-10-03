import { randomBytes, createHash } from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const allowedRoles = new Set(["superadmin", "mere-fonde", "livreur"]);
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function generateCode() {
  let code = "";
  while (code.length < 24) {
    const bytes = randomBytes(32);
    for (const byte of bytes) {
      const limit = 256 - (256 % alphabet.length);
      if (byte >= limit) continue;
      code += alphabet[byte % alphabet.length];
      if (code.length === 24) break;
    }
  }
  return code;
}

const role = option("--role", null);
const days = Number(option("--days", "7"));

if (!allowedRoles.has(role)) throw new Error("Usage: npm run create-activation-code -- --role <superadmin|mere-fonde|livreur> [--days 7]");
if (!Number.isInteger(days) || days < 1 || days > 14) throw new Error("Le nombre de jours doit être compris entre 1 et 14.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL est obligatoire.");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const active = await pool.query("select 1 from auth.staff_users where role=$1 and is_active=true limit 1", [role]);
  if (active.rows.length) throw new Error("Un compte actif possède déjà ce rôle.");

  const code = generateCode();
  const hash = createHash("sha256").update(code).digest("hex");
  await pool.query("insert into auth.activation_codes(role,code_hash,expires_at) values($1,$2,now()+($3 * interval '1 day'))", [role, hash, days]);
  console.log(code);
} finally {
  await pool.end();
}
