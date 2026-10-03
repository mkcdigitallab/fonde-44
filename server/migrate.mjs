import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
});

try {
  await pool.query(`
    alter table orders add column if not exists client_reference text;
    create unique index if not exists orders_client_reference_idx
      on orders(client_reference)
      where client_reference is not null;
  `);
  console.log("Fondé 44 DB local: migrations OK");
} finally {
  await pool.end();
}
