import { createHash, randomBytes } from 'node:crypto';

import { pool } from '../db.js';

const args = process.argv.slice(2);
const roleIndex = args.indexOf('--role');
const daysIndex = args.indexOf('--days');
const role = roleIndex >= 0 ? args[roleIndex + 1] : null;
const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : 7;
const roles = new Set(['superadmin', 'mere-fonde', 'livreur']);

if (!roles.has(role)) {
  console.error('Usage: npm run create-activation-code -- --role <superadmin|mere-fonde|livreur> [--days 7]');
  process.exitCode = 1;
} else if (!Number.isInteger(days) || days <= 0 || days > 365) {
  console.error('Le nombre de jours doit être un entier entre 1 et 365.');
  process.exitCode = 1;
} else {
  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM auth.users WHERE role = $1 AND is_active = true LIMIT 1',
      [role],
    );
    if (rows.length) throw new Error('Un utilisateur actif possède déjà ce rôle.');

    const code = randomBytes(18).toString('base64url').slice(0, 24);
    const codeHash = createHash('sha256').update(code).digest('hex');
    await pool.query(
      "INSERT INTO auth.activation_codes (role, code_hash, expires_at, created_by) VALUES ($1, $2, now() + ($3 * interval '1 day'), NULL)",
      [role, codeHash, days],
    );
    console.log(code);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
