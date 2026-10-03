import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, '../..');
const migrationsDirectory = path.join(repositoryRoot, 'db', 'migrations');
const envPath = path.join(repositoryRoot, '.env');

dotenv.config({ path: envPath });

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.error('DATABASE_URL est manquante dans le .env racine.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    )
  `);

  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  const { rows: appliedRows } = await pool.query(
    'SELECT filename FROM public.schema_migrations ORDER BY filename'
  );
  const applied = new Set(appliedRows.map(({ filename }) => filename));

  for (const filename of migrationFiles) {
    if (applied.has(filename)) {
      console.log(`[migration] déjà appliquée: ${filename}`);
      continue;
    }

    const filePath = path.join(migrationsDirectory, filename);
    const sql = await fs.readFile(filePath, 'utf8');

    try {
      await pool.query(sql);
      await pool.query(
        'INSERT INTO public.schema_migrations (filename) VALUES ($1)',
        [filename]
      );
      console.log(`[migration] appliquée: ${filename}`);
    } catch (error) {
      console.error(`[migration] erreur dans ${filename}`);
      console.error(error);
      process.exitCode = 1;
      break;
    }
  }
} catch (error) {
  console.error('[migration] échec du runner');
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
