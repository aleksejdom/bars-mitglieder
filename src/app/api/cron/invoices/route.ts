import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function runInvoiceGeneration() {
  const today = new Date().toISOString().slice(0, 10);

  const { rows: dueMembers } = await pool.query<{
    id: string;
    subscription_type: string;
    plan_id: string | null;
    billing_period: string;
    next_invoice_date: string;
  }>(
    `SELECT id, subscription_type, plan_id, billing_period, next_invoice_date
     FROM members
     WHERE status='active' AND auto_invoice_enabled=true
       AND next_invoice_date IS NOT NULL AND next_invoice_date <= $1`,
    [today]
  );

  let created = 0;
  let skipped = 0;

  for (const member of dueMembers) {
    const isYearly = member.billing_period === "yearly";
    const periodStart = member.next_invoice_date;
    const periodStartDate = new Date(periodStart);

    let periodEnd: string;
    let nextDate: string;
    if (isYearly) {
      const end = new Date(periodStartDate);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      periodEnd = end.toISOString().slice(0, 10);
      const next = new Date(periodStartDate);
      next.setFullYear(next.getFullYear() + 1);
      nextDate = next.toISOString().slice(0, 10);
    } else {
      const end = new Date(periodStartDate);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      periodEnd = end.toISOString().slice(0, 10);
      const next = new Date(periodStartDate);
      next.setMonth(next.getMonth() + 1);
      nextDate = next.toISOString().slice(0, 10);
    }

    const { rows: existing } = await pool.query(
      "SELECT id FROM invoices WHERE member_id=$1 AND period_start=$2 AND type='invoice'",
      [member.id, periodStart]
    );
    if (existing.length > 0) {
      await pool.query("UPDATE members SET next_invoice_date=$1 WHERE id=$2", [nextDate, member.id]);
      skipped++;
      continue;
    }

    let amount = 0;
    if (member.subscription_type === "all_inclusive" && member.plan_id) {
      const { rows: [plan] } = await pool.query<{ monthly_fee: number; yearly_fee: number | null }>(
        "SELECT monthly_fee, yearly_fee FROM subscription_plans WHERE id=$1",
        [member.plan_id]
      );
      if (plan) {
        amount = isYearly ? Number(plan.yearly_fee ?? plan.monthly_fee * 12) : Number(plan.monthly_fee);
      }
    } else {
      const feeField = isYearly ? "COALESCE(s.yearly_fee, s.monthly_fee * 12)" : "s.monthly_fee";
      const { rows: [fee] } = await pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(${feeField}), 0) as total FROM member_sports ms JOIN sports s ON ms.sport_id=s.id WHERE ms.member_id=$1`,
        [member.id]
      );
      amount = parseFloat(fee?.total || "0");
    }

    if (amount > 0) {
      const prefix = "RE";
      const { rows: [last] } = await pool.query<{ invoice_number: string }>(
        "SELECT invoice_number FROM invoices WHERE type='invoice' ORDER BY created_at DESC LIMIT 1"
      );
      const num = last ? parseInt(last.invoice_number.split("-")[1] || "0", 10) + 1 : 1;
      const invoiceNumber = `${prefix}-${String(num).padStart(4, "0")}-${new Date().getFullYear()}`;
      const dueDate = new Date(periodStartDate);
      dueDate.setDate(dueDate.getDate() + 14);
      await pool.query(
        `INSERT INTO invoices (invoice_number, member_id, type, period_start, period_end, amount, status, due_date)
         VALUES ($1,$2,'invoice',$3,$4,$5,'pending',$6)`,
        [invoiceNumber, member.id, periodStart, periodEnd, amount, dueDate.toISOString().slice(0, 10)]
      );
      created++;
    }
    await pool.query("UPDATE members SET next_invoice_date=$1 WHERE id=$2", [nextDate, member.id]);
  }

  revalidatePath("/accounting/invoices");
  return { created, skipped };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const cronSecret = process.env.CRON_SECRET || "";

  if (!cronSecret || secret !== cronSecret) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runInvoiceGeneration();
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
    const result = await runInvoiceGeneration();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
