"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { sendContractEmail, sendCancellationEmail } from "@/lib/actions/email";

async function nextMemberNumber(): Promise<string> {
  const result = await queryOne<{ member_number: string }>(
    "SELECT member_number FROM members ORDER BY created_at DESC LIMIT 1"
  );
  if (!result) return "M-0001";
  const num = parseInt(result.member_number.replace("M-", ""), 10);
  return `M-${String(num + 1).padStart(4, "0")}`;
}

function nextInvoiceDate(billingPeriod: string): string {
  const now = new Date();
  if (billingPeriod === "yearly") {
    return new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString().slice(0, 10);
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
}

export async function createMember(formData: FormData) {
  await requireAuth();

  const subscriptionType = formData.get("subscription_type") as string;
  const planId = formData.get("plan_id") as string | null;
  const memberNumber = await nextMemberNumber();
  const billingPeriod = (formData.get("billing_period") as string) || "monthly";
  const autoInvoice = formData.get("auto_invoice_enabled") !== "false";

  const [member] = await query<{ id: string }>(
    `INSERT INTO members (
      member_number, first_name, last_name, email, phone,
      date_of_birth, address, city, postal_code,
      joined_date, status, subscription_type, plan_id,
      iban, bic, bank_name, notes, billing_period,
      auto_invoice_enabled, next_invoice_date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING id`,
    [
      memberNumber,
      formData.get("first_name"),
      formData.get("last_name"),
      formData.get("email") || null,
      formData.get("phone") || null,
      formData.get("date_of_birth") || null,
      formData.get("address") || null,
      formData.get("city") || null,
      formData.get("postal_code") || null,
      formData.get("joined_date") || new Date().toISOString().slice(0, 10),
      formData.get("status") || "active",
      subscriptionType,
      subscriptionType === "all_inclusive" && planId ? planId : null,
      formData.get("iban") || null,
      formData.get("bic") || null,
      formData.get("bank_name") || null,
      formData.get("notes") || null,
      billingPeriod,
      autoInvoice,
      autoInvoice ? nextInvoiceDate(billingPeriod) : null,
    ]
  );

  if (subscriptionType === "individual") {
    const sportIds = formData.getAll("sport_ids") as string[];
    for (const sportId of sportIds) {
      if (sportId) {
        await query(
          "INSERT INTO member_sports (member_id, sport_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [member.id, sportId]
        );
      }
    }
  }

  revalidatePath("/members");
  await sendContractEmail(member.id).catch((e) =>
    console.error("[email] Vertrag senden fehlgeschlagen:", e)
  );
  redirect(`/members/${member.id}`);
}

export async function updateMember(id: string, formData: FormData) {
  await requireAuth();

  const subscriptionType = formData.get("subscription_type") as string;
  const planId = formData.get("plan_id") as string | null;
  const autoInvoice = formData.get("auto_invoice_enabled") !== "false";

  await query(
    `UPDATE members SET
      first_name=$1, last_name=$2, email=$3, phone=$4,
      date_of_birth=$5, address=$6, city=$7, postal_code=$8,
      joined_date=$9, status=$10, subscription_type=$11, plan_id=$12,
      iban=$13, bic=$14, bank_name=$15, notes=$16,
      billing_period=$17, auto_invoice_enabled=$18, updated_at=NOW()
    WHERE id=$19`,
    [
      formData.get("first_name"),
      formData.get("last_name"),
      formData.get("email") || null,
      formData.get("phone") || null,
      formData.get("date_of_birth") || null,
      formData.get("address") || null,
      formData.get("city") || null,
      formData.get("postal_code") || null,
      formData.get("joined_date"),
      formData.get("status"),
      subscriptionType,
      subscriptionType === "all_inclusive" && planId ? planId : null,
      formData.get("iban") || null,
      formData.get("bic") || null,
      formData.get("bank_name") || null,
      formData.get("notes") || null,
      formData.get("billing_period") || "monthly",
      autoInvoice,
      id,
    ]
  );

  await query("DELETE FROM member_sports WHERE member_id = $1", [id]);
  if (subscriptionType === "individual") {
    const sportIds = formData.getAll("sport_ids") as string[];
    for (const sportId of sportIds) {
      if (sportId) {
        await query(
          "INSERT INTO member_sports (member_id, sport_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [id, sportId]
        );
      }
    }
  }

  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}`);
}

export async function cancelMember(id: string, formData: FormData) {
  await requireAuth();
  const cancellationDate = formData.get("cancellation_date") as string;

  await query(
    `UPDATE members SET
      status = 'cancelled',
      cancellation_date = $1,
      subscription_paused = true,
      auto_invoice_enabled = false,
      subscription_paused_at = NOW(),
      updated_at = NOW()
    WHERE id = $2`,
    [cancellationDate, id]
  );

  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  await sendCancellationEmail(id).catch((e) =>
    console.error("[email] Kündigung senden fehlgeschlagen:", e)
  );
}

export async function pauseSubscription(id: string) {
  await requireAuth();
  await query(
    `UPDATE members SET
      subscription_paused = true,
      auto_invoice_enabled = false,
      subscription_paused_at = NOW(),
      updated_at = NOW()
    WHERE id = $1`,
    [id]
  );
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
}

export async function resumeSubscription(id: string) {
  await requireAuth();
  const member = await queryOne<{ billing_period: string }>(
    "SELECT billing_period FROM members WHERE id=$1",
    [id]
  );
  const billingPeriod = member?.billing_period || "monthly";
  const nextDate = nextInvoiceDate(billingPeriod);

  await query(
    `UPDATE members SET
      subscription_paused = false,
      auto_invoice_enabled = true,
      subscription_paused_at = NULL,
      next_invoice_date = $1,
      updated_at = NOW()
    WHERE id = $2`,
    [nextDate, id]
  );
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
}

export async function deleteMember(id: string) {
  await requireAuth();
  await query("DELETE FROM members WHERE id = $1", [id]);
  revalidatePath("/members");
  redirect("/members");
}
