const READABLE_ALL_SCHEMAS = new Set(["catalog", "orders", "events", "media"]);
const READABLE_SPECIFIC = {
  auth: new Set(["staff_users", "activation_codes"]),
  admin: new Set(["audit_log"]),
};
const MASKED_COLUMN = /password|token|secret|code_hash/i;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/;

export function quoteIdentifier(value) {
  const identifier = String(value);
  if (!IDENTIFIER.test(identifier)) throw new Error("invalid_identifier");
  return '"' + identifier.replace(/"/g, '""') + '"';
}

function maskValue(value) {
  if (Array.isArray(value)) return value.map(maskValue);
  if (!value || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    MASKED_COLUMN.test(key) ? "[masqué]" : maskValue(item),
  ]));
}

export function maskRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    MASKED_COLUMN.test(key) ? "[masqué]" : maskValue(value),
  ]));
}

export async function listReadableTables(db) {
  const result = await db.query(
    "select table_schema,table_name from information_schema.tables where table_type='BASE TABLE' and ((table_schema=any($1::text[])) or (table_schema='auth' and table_name=any($2::text[])) or (table_schema='admin' and table_name=any($3::text[]))) order by table_schema,table_name",
    [["catalog", "orders", "events", "media"], [...READABLE_SPECIFIC.auth], [...READABLE_SPECIFIC.admin]],
  );

  const tables = [];
  for (const row of result.rows) {
    const schemaAllowed = READABLE_ALL_SCHEMAS.has(row.table_schema);
    const tableAllowed = READABLE_SPECIFIC[row.table_schema]?.has(row.table_name) || false;
    if (!schemaAllowed && !tableAllowed) continue;

    const sql = "select count(*)::bigint as count from " + quoteIdentifier(row.table_schema) + "." + quoteIdentifier(row.table_name);
    const count = await db.query(sql);
    tables.push({
      schema: row.table_schema,
      table: row.table_name,
      rows: Number(count.rows[0]?.count || 0),
      readOnly: true,
    });
  }
  return tables;
}

export async function resolveReadableTable(db, name) {
  const parts = String(name || "").split(".");
  if (parts.length !== 2) return null;

  const schema = parts[0];
  const table = parts[1];
  const tables = await db.query(
    "select table_schema,table_name from information_schema.tables where table_type='BASE TABLE' and table_schema=$1 and table_name=$2",
    [schema, table],
  );
  if (!tables.rows[0]) return null;

  const allowed = READABLE_ALL_SCHEMAS.has(schema)
    || Boolean(READABLE_SPECIFIC[schema]?.has(table));
  if (!allowed) return null;

  const columns = await db.query(
    "select c.column_name,c.data_type,c.is_nullable,case when k.column_name is null then false else true end as is_primary from information_schema.columns c left join (select kcu.table_schema,kcu.table_name,kcu.column_name from information_schema.table_constraints tc join information_schema.key_column_usage kcu on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema and kcu.table_name=tc.table_name where tc.constraint_type='PRIMARY KEY') k on k.table_schema=c.table_schema and k.table_name=c.table_name and k.column_name=c.column_name where c.table_schema=$1 and c.table_name=$2 order by c.ordinal_position",
    [schema, table],
  );

  return { schema, table, columns: columns.rows };
}

export async function primaryKeyColumns(db, schema, table) {
  const result = await db.query(
    "select kcu.column_name from information_schema.table_constraints tc join information_schema.key_column_usage kcu on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name and kcu.table_schema=tc.table_schema and kcu.table_name=tc.table_name where tc.constraint_type='PRIMARY KEY' and tc.table_schema=$1 and tc.table_name=$2 order by kcu.ordinal_position",
    [schema, table],
  );
  return result.rows.map(row => row.column_name);
}

export function hasColumn(columns, name) {
  return columns.some(column => column.column_name === name);
}
