import { Pool, types } from "pg";

// Return DATE as ISO string (not Date object) to avoid timezone shifts and .slice() errors
types.setTypeParser(1082, (val: string) => val);
// Return NUMERIC/DECIMAL as float, not string
types.setTypeParser(1700, (val: string) => parseFloat(val));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export { pool };

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
