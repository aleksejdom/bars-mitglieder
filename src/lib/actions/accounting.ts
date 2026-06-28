"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function nextInvoiceNumber(type: string): Promise<string> {
  const prefix = type === "reminder" ? "MAN" : type === "final_reminder" ? "LMA" : "RE";
  const result = await queryOne<{ invoice_number: string }>(
    `SELECT invoice_number FROM invoices WHERE type=$1 ORDER BY created_at DESC LIMIT 1`,
    [type]
  );
  if (!result) return `${prefix}-0001-${new Date().getFullYear()}`;
  const parts = result.invoice_number.split("-");
  const num = parseInt(parts[1] || "0", 10);
  return `${prefix}-${String(num + 1).padStart(4, "0")}-${new Date().getFullYear()}`;
}

export async function createInvoice(formData: FormData) {
  await requireAuth();
  const type = (formData.get("type") as string) || "invoice";
  const invoiceNumber = await nextInvoiceNumber(type);

  await query(
    `INSERT INTO invoices (invoice_number, member_id, type, period_start, period_end, amount, status, due_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      invoiceNumber,
      formData.get("member_id"),
      type,
      formData.get("period_start") || null,
      formData.get("period_end") || null,
      parseFloat(formData.get("amount") as string),
      "pending",
      formData.get("due_date") || null,
      formData.get("notes") || null,
    ]
  );

  revalidatePath("/accounting");
  revalidatePath("/accounting/invoices");
}

export async function markInvoicePaid(id: string, _formData?: FormData) {
  const paidDate: string | undefined = undefined;
  await requireAuth();
  const date = paidDate || new Date().toISOString().slice(0, 10);

  const invoice = await queryOne<{ member_id: string; amount: number }>(
    "SELECT member_id, amount FROM invoices WHERE id=$1",
    [id]
  );
  if (!invoice) return;

  await query(
    "UPDATE invoices SET status='paid', paid_date=$1, updated_at=NOW() WHERE id=$2",
    [date, id]
  );
  await query(
    `INSERT INTO payments (invoice_id, member_id, amount, payment_date) VALUES ($1,$2,$3,$4)`,
    [id, invoice.member_id, invoice.amount, date]
  );

  revalidatePath("/accounting");
  revalidatePath("/accounting/invoices");
}

export async function markInvoiceOverdue(id: string, _formData?: FormData) {
  await requireAuth();
  await query(
    "UPDATE invoices SET status='overdue', updated_at=NOW() WHERE id=$1",
    [id]
  );
  revalidatePath("/accounting");
}

export async function deleteInvoice(id: string, _formData?: FormData) {
  await requireAuth();
  await query("DELETE FROM invoices WHERE id=$1", [id]);
  revalidatePath("/accounting");
  revalidatePath("/accounting/invoices");
}

export async function generateMonthlyInvoices(formData: FormData): Promise<void> {
  await requireAuth();
  const year = parseInt(formData.get("year") as string);
  const month = parseInt(formData.get("month") as string);
  const dueDate = formData.get("due_date") as string;

  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  // Get all active members with their fee
  const members = await query<{
    id: string;
    first_name: string;
    last_name: string;
    subscription_type: string;
    plan_id: string | null;
  }>(
    "SELECT id, first_name, last_name, subscription_type, plan_id FROM members WHERE status='active'"
  );

  let created = 0;
  for (const member of members) {
    // Check if invoice already exists for this period
    const existing = await queryOne(
      "SELECT id FROM invoices WHERE member_id=$1 AND period_start=$2 AND type='invoice'",
      [member.id, periodStart]
    );
    if (existing) continue;

    let amount = 0;
    if (member.subscription_type === "all_inclusive" && member.plan_id) {
      const plan = await queryOne<{ monthly_fee: number }>(
        "SELECT monthly_fee FROM subscription_plans WHERE id=$1",
        [member.plan_id]
      );
      amount = plan ? Number(plan.monthly_fee) : 0;
    } else {
      // Sum up individual sport fees
      const fees = await query<{ total: string }>(
        `SELECT COALESCE(SUM(s.monthly_fee), 0) as total
         FROM member_sports ms JOIN sports s ON ms.sport_id=s.id
         WHERE ms.member_id=$1`,
        [member.id]
      );
      amount = parseFloat(fees[0]?.total || "0");
    }

    if (amount <= 0) continue;

    const invoiceNumber = await nextInvoiceNumber("invoice");
    await query(
      `INSERT INTO invoices (invoice_number, member_id, type, period_start, period_end, amount, status, due_date)
       VALUES ($1,$2,'invoice',$3,$4,$5,'pending',$6)`,
      [invoiceNumber, member.id, periodStart, periodEnd, amount, dueDate || null]
    );
    created++;
  }

  revalidatePath("/accounting");
  revalidatePath("/accounting/invoices");
}
