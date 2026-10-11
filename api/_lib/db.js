import { Pool } from "pg";

let pool;
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined });
  return pool;
}
export async function query(text, params = []) { return getPool().query(text, params); }
