import { Pool, types } from "pg";

// Return DATE as ISO string (not Date object) to avoid timezone shifts and .slice() errors
types.setTypeParser(1082, (val: string) => val);
// Return NUMERIC/DECIMAL as float, not string
types.setTypeParser(1700, (val: string) => parseFloat(val));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export { pool };

async function ensureSchema(): Promise<void> {
  const run = (sql: string) => pool.query(sql);
  await run(`ALTER TABLE members ADD COLUMN IF NOT EXISTS cancellation_date DATE`);
  await run(`ALTER TABLE members ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly'`);
  await run(`ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url TEXT`);
  await run(`ALTER TABLE sports ADD COLUMN IF NOT EXISTS yearly_fee NUMERIC(10,2)`);
  await run(`ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS yearly_fee NUMERIC(10,2)`);
  await run(`ALTER TABLE members ADD COLUMN IF NOT EXISTS auto_invoice_enabled BOOLEAN NOT NULL DEFAULT true`);
  await run(`ALTER TABLE members ADD COLUMN IF NOT EXISTS next_invoice_date DATE`);
  await run(`ALTER TABLE members ADD COLUMN IF NOT EXISTS subscription_paused BOOLEAN NOT NULL DEFAULT false`);
  await run(`ALTER TABLE members ADD COLUMN IF NOT EXISTS subscription_paused_at TIMESTAMPTZ`);
  await run(`
    CREATE TABLE IF NOT EXISTS club_settings (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      club_name TEXT NOT NULL DEFAULT 'Mein Verein',
      address TEXT, postal_code TEXT, city TEXT,
      phone TEXT, email TEXT, website TEXT,
      iban TEXT, bic TEXT, bank_name TEXT,
      tax_number TEXT, register_number TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT single_row CHECK (id = 1)
    )
  `);
  await run(`INSERT INTO club_settings (id) VALUES (1) ON CONFLICT DO NOTHING`);
  await run(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL`);
  await run(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ`);
  // Ensure payments cascade on invoice delete (re-create constraint idempotently)
  await run(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payments_invoice_id_fkey' AND table_name = 'payments'
      ) THEN
        ALTER TABLE payments DROP CONSTRAINT payments_invoice_id_fkey;
      END IF;
      ALTER TABLE payments
        ADD CONSTRAINT payments_invoice_id_fkey
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
    END $$
  `);
}

// Run once on startup; all query functions await this before executing
const schemaReady: Promise<void> = ensureSchema().catch((err) => {
  console.error("[db] Schema init error:", err);
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  await schemaReady;
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
