import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Use the new app router pages" }, { status: 410 });
}
