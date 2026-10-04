import { getPool } from "../api/_lib/db.js";
import { issueActivationCode, ACTIVATION_ROLES } from "../api/_lib/activationCodes.js";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const role = option("--role", null);
const days = Number(option("--days", "7"));

if (!ACTIVATION_ROLES.has(role)) throw new Error("Usage: npm run create-activation-code -- --role <superadmin|mere-fonde|livreur> [--days 7]");
if (!Number.isInteger(days) || days < 1 || days > 14) throw new Error("Le nombre de jours doit être compris entre 1 et 14.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL est obligatoire.");

const pool = getPool();
try {
  const client = await pool.connect();
  try {
    const issued = await issueActivationCode(client, role, days);
    console.log(issued.code);
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
