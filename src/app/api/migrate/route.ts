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

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 });
  }
}
