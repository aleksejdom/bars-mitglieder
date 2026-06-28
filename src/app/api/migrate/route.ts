import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

const SETUP_SECRET = process.env.SETUP_SECRET ?? "";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!SETUP_SECRET || secret !== SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];

  try {
    await pool.query(`
      ALTER TABLE members
        ADD COLUMN IF NOT EXISTS cancellation_date DATE;
    `);
    log.push("Column cancellation_date added to members");

    await pool.query(`
      ALTER TABLE members
        ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly';
    `);
    log.push("Column billing_period added to members");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS club_settings (
        id SMALLINT PRIMARY KEY DEFAULT 1,
        club_name TEXT NOT NULL DEFAULT 'Mein Verein',
        address TEXT,
        postal_code TEXT,
        city TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        iban TEXT,
        bic TEXT,
        bank_name TEXT,
        tax_number TEXT,
        register_number TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT single_row CHECK (id = 1)
      );
    `);
    log.push("Table club_settings created");

    await pool.query(`
      INSERT INTO club_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    `);
    log.push("Default club_settings row ensured");

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 });
  }
}
