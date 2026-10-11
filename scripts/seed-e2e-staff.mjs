import { randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";
import pg from "pg";
import { hashPassword } from "../api/_lib/passwords.js";

if (!process.env.DATABASE_URL || !process.env.GITHUB_ENV) {
  throw new Error("Ce script est réservé à l'étape database de GitHub Actions.");
}

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const email = `e2e-mere-${randomBytes(4).toString("hex")}@example.test`;
const password = randomBytes(24).toString("base64url");

try {
  await pool.query(
    "insert into auth.staff_users(email,display_name,role,password_hash,is_active) values($1,$2,'mere-fonde',$3,true)",
    [email, "E2E Mère Fondé", hashPassword(password)]
  );
  await appendFile(process.env.GITHUB_ENV, `E2E_MERE_EMAIL=${email}
E2E_MERE_PASSWORD=${password}
`);
  console.log(`::add-mask::${password}`);
  console.log("Compte de test Mère Fondé créé pour les tests E2E ; identifiants masqués.");
} finally {
  await pool.end();
}
