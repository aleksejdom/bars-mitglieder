import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { name, email, telefon, eintrittsdatum, status } = await req.json();
  const result = await pool.query(
    "UPDATE mitglieder SET name=$1, email=$2, telefon=$3, eintrittsdatum=$4, status=$5 WHERE id=$6 RETURNING *",
    [name, email, telefon, eintrittsdatum, status, id]
  );
  if (result.rows.length === 0)
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await pool.query("DELETE FROM mitglieder WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}
