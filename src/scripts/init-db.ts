import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";
import pg from "pg";

config({ path: resolve(process.cwd(), ".env.local") });

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function main() {
  const sql = readFileSync(resolve(process.cwd(), "src/lib/schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Tabelle 'mitglieder' erstellt.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
