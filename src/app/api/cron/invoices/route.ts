import { NextRequest, NextResponse } from "next/server";
import { generateDueInvoices } from "@/lib/actions/accounting";
import { getSession } from "@/lib/auth";

// Can be called by: an external cron (with x-cron-secret header) or a logged-in admin via GET
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET || "";

  if (cronSecret && secret !== cronSecret) {
    // If no CRON_SECRET set, fall back to requiring auth
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateDueInvoices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET || "";

  if (!cronSecret || secret !== cronSecret) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateDueInvoices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
