import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";
import bcrypt from "bcryptjs";

config({ path: resolve(process.cwd(), ".env.local") });

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function main() {
  console.log("Initialisiere Datenbank...");

  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      color TEXT DEFAULT '#dc2626',
      active BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      monthly_fee DECIMAL(10,2) NOT NULL,
      includes_all_sports BOOLEAN DEFAULT true,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      date_of_birth DATE,
      address TEXT,
      city TEXT,
      postal_code TEXT,
      joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status TEXT NOT NULL DEFAULT 'active',
      subscription_type TEXT NOT NULL DEFAULT 'individual',
      plan_id UUID REFERENCES subscription_plans(id),
      iban TEXT,
      bic TEXT,
      bank_name TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS member_sports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
      joined_date DATE DEFAULT CURRENT_DATE,
      UNIQUE(member_id, sport_id)
    );

    CREATE TABLE IF NOT EXISTS custom_fields (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      field_type TEXT NOT NULL DEFAULT 'text',
      required BOOLEAN DEFAULT false,
      options JSONB,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS member_field_values (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
      value TEXT,
      UNIQUE(member_id, field_id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number TEXT UNIQUE NOT NULL,
      member_id UUID NOT NULL REFERENCES members(id),
      type TEXT NOT NULL DEFAULT 'invoice',
      period_start DATE,
      period_end DATE,
      amount DECIMAL(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      due_date DATE,
      paid_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID REFERENCES invoices(id),
      member_id UUID NOT NULL REFERENCES members(id),
      amount DECIMAL(10,2) NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT DEFAULT 'bank_transfer',
      reference TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Default-Admin anlegen
  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    ["admin@boxclub.de"]
  );
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)",
      ["admin@boxclub.de", hash, "Administrator"]
    );
    console.log("Admin erstellt: admin@boxclub.de / admin123");
  }

  // Beispiel-Sportarten
  const sportsCount = await pool.query("SELECT COUNT(*) FROM sports");
  if (parseInt(sportsCount.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO sports (name, description, monthly_fee, color, sort_order) VALUES
        ('Boxen', 'Klassisches Boxtraining für alle Altersklassen', 45.00, '#dc2626', 1),
        ('Kickboxen', 'Kickboxen und Thaiboxen', 45.00, '#ea580c', 2),
        ('Fitness', 'Kraft- und Konditionstraining', 35.00, '#16a34a', 3),
        ('Kampfsport Kinder', 'Kampfsport für Kinder (6–14 Jahre)', 30.00, '#2563eb', 4)
    `);
    console.log("Sportarten angelegt");
  }

  // Komplett-Paket
  const plansCount = await pool.query(
    "SELECT COUNT(*) FROM subscription_plans"
  );
  if (parseInt(plansCount.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO subscription_plans (name, description, monthly_fee, includes_all_sports) VALUES
        ('Komplett-Paket', 'Alle Sportarten inklusive – unbegrenzt trainieren', 89.00, true)
    `);
    console.log("Komplett-Paket angelegt");
  }

  console.log("Datenbank erfolgreich initialisiert.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
