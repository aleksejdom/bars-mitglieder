import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  const result = await pool.query(
    "SELECT * FROM mitglieder ORDER BY created_at DESC"
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { name, email, telefon, eintrittsdatum, status } = await req.json();
  const result = await pool.query(
    "INSERT INTO mitglieder (name, email, telefon, eintrittsdatum, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [name, email, telefon, eintrittsdatum, status ?? "aktiv"]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
