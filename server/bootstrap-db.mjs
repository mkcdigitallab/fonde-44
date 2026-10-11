import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL est obligatoire pour initialiser PostgreSQL.");
  }

  const schemaPath = path.resolve(__dirname, "../db/schema.sql");
  const migrationPath = path.resolve(__dirname, "migrate.mjs");
  const schema = await readFile(schemaPath, "utf8");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log("[bootstrap-db] Application de db/schema.sql…");
    await pool.query(schema);
    console.log("[bootstrap-db] Schéma appliqué.");
  } finally {
    await pool.end();
  }

  console.log("[bootstrap-db] Exécution des migrations…");
  const migration = spawnSync(process.execPath, [migrationPath], {
    env: process.env,
    stdio: "inherit",
  });

  if (migration.error) throw migration.error;
  if (migration.status !== 0) {
    throw new Error(
      `server/migrate.mjs a échoué (code ${migration.status ?? "inconnu"}).`,
    );
  }

  console.log("[bootstrap-db] Initialisation terminée avec succès.");
}

try {
  await main();
} catch (error) {
  console.error("[bootstrap-db] ÉCHEC :", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
