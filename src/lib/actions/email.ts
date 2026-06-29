"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getClubSettings } from "@/lib/club-settings";
import { sendEmail, emailWrapper } from "@/lib/email";

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("de-DE").format(new Date(d));
}

function money(val: number | string): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(val));
}

// ─── Invoice / Reminder email ───────────────────────────────────────────────

type InvoiceEmailData = {
  id: string;
  invoice_number: string;
  type: string;
  amount: number;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  billing_period: string;
  first_name: string;
  last_name: string;
  email: string;
  member_number: string;
};

const typeTitle: Record<string, string> = {
  invoice: "Rechnung",
  reminder: "Zahlungserinnerung",
  final_reminder: "Letzte Mahnung",
};

export async function sendInvoiceEmail(
  invoiceId: string,
  _?: FormData
): Promise<{ error?: string }> {
  try {
    await requireAuth();
  } catch {
    return { error: "Nicht authentifiziert — bitte Seite neu laden und erneut anmelden" };
  }

  let inv: InvoiceEmailData | null = null;
  try {
    inv = await queryOne<InvoiceEmailData>(
      `SELECT i.id, i.invoice_number, i.type, i.amount, i.due_date,
              i.period_start, i.period_end,
              COALESCE(m.billing_period, 'monthly') as billing_period,
              m.first_name, m.last_name, m.email, m.member_number
       FROM invoices i JOIN members m ON i.member_id = m.id
       WHERE i.id = $1`,
      [invoiceId]
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] DB query failed:", msg);
    return { error: `Datenbankfehler: ${msg}` };
  }

  if (!inv) return { error: "Rechnung nicht gefunden" };
  if (!inv.email) return { error: "Dieses Mitglied hat keine E-Mail-Adresse hinterlegt" };

  const club = await getClubSettings();
  const title = typeTitle[inv.type] || "Rechnung";
  const billingLabel = inv.billing_period === "yearly" ? "Jahresbeitrag" : "Monatsbeitrag";

  const periodLine =
    inv.period_start && inv.period_end
      ? `${fmt(inv.period_start)} – ${fmt(inv.period_end)}`
      : inv.period_start
      ? `ab ${fmt(inv.period_start)}`
      : billingLabel;

  const introText =
    inv.type === "invoice"
      ? "anbei erhalten Sie Ihre Rechnung für den Mitgliedsbeitrag."
      : inv.type === "reminder"
      ? "wir möchten Sie freundlich daran erinnern, dass folgende Zahlung noch aussteht."
      : "wir weisen Sie letztmalig auf den ausstehenden Betrag hin. Bitte begleichen Sie diesen umgehend, um weitere Maßnahmen zu vermeiden.";

  const html = emailWrapper(`
    <div class="head">
      <h1>${title} — ${club.club_name}</h1>
      <p>${inv.invoice_number} · Fällig: ${fmt(inv.due_date)}</p>
    </div>
    <div class="body">
      <p>Sehr geehrte(r) ${inv.first_name} ${inv.last_name},</p>
      <p>${introText}</p>

      <div class="info-box">
        <div class="info-row"><span class="info-label">Rechnungsnummer:</span><span>${inv.invoice_number}</span></div>
        <div class="info-row"><span class="info-label">Mitgliedsnummer:</span><span>${inv.member_number}</span></div>
        <div class="info-row"><span class="info-label">Leistungszeitraum:</span><span>${periodLine}</span></div>
        <div class="info-row"><span class="info-label">Fälligkeitsdatum:</span><span>${fmt(inv.due_date)}</span></div>
      </div>

      <div class="highlight">Gesamtbetrag: ${money(inv.amount)}</div>

      ${club.iban ? `
      <div class="info-box">
        <p style="font-weight:bold;margin-bottom:8px">Zahlungsinformationen</p>
        <div class="info-row"><span class="info-label">Kontoinhaber:</span><span>${club.club_name}</span></div>
        <div class="info-row"><span class="info-label">IBAN:</span><span>${club.iban}</span></div>
        ${club.bic ? `<div class="info-row"><span class="info-label">BIC:</span><span>${club.bic}</span></div>` : ""}
        ${club.bank_name ? `<div class="info-row"><span class="info-label">Kreditinstitut:</span><span>${club.bank_name}</span></div>` : ""}
        <p style="margin-top:8px;font-size:12px;color:#64748b">Bitte geben Sie die Rechnungsnummer <strong>${inv.invoice_number}</strong> als Verwendungszweck an.</p>
      </div>
      ` : ""}

      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      <p>Mit sportlichen Grüßen<br><strong>${club.club_name}</strong></p>
    </div>
    <div class="footer">${club.club_name}${club.address ? ` · ${club.address}` : ""}${club.city ? ` · ${club.postal_code || ""} ${club.city}` : ""}${club.email ? ` · ${club.email}` : ""}</div>
  `);

  try {
    await sendEmail({
      to: inv.email,
      subject: `${title} ${inv.invoice_number} — ${club.club_name}`,
      html,
      replyTo: club.email || undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] SMTP send failed:", msg);
    return { error: `SMTP-Fehler: ${msg}` };
  }

  try {
    await query("UPDATE invoices SET email_sent_at = NOW() WHERE id = $1", [invoiceId]);
    revalidatePath("/accounting/invoices");
  } catch {
    // non-critical: email was sent, just update tracking silently
  }

  return {};
}

// Internal variant called from within other server actions (no auth check needed)
export async function sendInvoiceEmailInternal(invoiceId: string): Promise<void> {
  const inv = await queryOne<InvoiceEmailData>(
    `SELECT i.id, i.invoice_number, i.type, i.amount, i.due_date,
            i.period_start, i.period_end,
            COALESCE(m.billing_period, 'monthly') as billing_period,
            m.first_name, m.last_name, m.email, m.member_number
     FROM invoices i JOIN members m ON i.member_id = m.id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (!inv?.email) return;

  const club = await getClubSettings();
  const title = typeTitle[inv.type] || "Rechnung";
  const billingLabel = inv.billing_period === "yearly" ? "Jahresbeitrag" : "Monatsbeitrag";

  const periodLine =
    inv.period_start && inv.period_end
      ? `${fmt(inv.period_start)} – ${fmt(inv.period_end)}`
      : inv.period_start
      ? `ab ${fmt(inv.period_start)}`
      : billingLabel;

  const introText =
    inv.type === "invoice"
      ? "anbei erhalten Sie Ihre Rechnung für den Mitgliedsbeitrag."
      : inv.type === "reminder"
      ? "wir möchten Sie freundlich daran erinnern, dass folgende Zahlung noch aussteht."
      : "wir weisen Sie letztmalig auf den ausstehenden Betrag hin. Bitte begleichen Sie diesen umgehend, um weitere Maßnahmen zu vermeiden.";

  const html = emailWrapper(`
    <div class="head">
      <h1>${title} — ${club.club_name}</h1>
      <p>${inv.invoice_number} · Fällig: ${fmt(inv.due_date)}</p>
    </div>
    <div class="body">
      <p>Sehr geehrte(r) ${inv.first_name} ${inv.last_name},</p>
      <p>${introText}</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Rechnungsnummer:</span><span>${inv.invoice_number}</span></div>
        <div class="info-row"><span class="info-label">Mitgliedsnummer:</span><span>${inv.member_number}</span></div>
        <div class="info-row"><span class="info-label">Leistungszeitraum:</span><span>${periodLine}</span></div>
        <div class="info-row"><span class="info-label">Fälligkeitsdatum:</span><span>${fmt(inv.due_date)}</span></div>
      </div>
      <div class="highlight">Gesamtbetrag: ${money(inv.amount)}</div>
      ${club.iban ? `
      <div class="info-box">
        <p style="font-weight:bold;margin-bottom:8px">Zahlungsinformationen</p>
        <div class="info-row"><span class="info-label">Kontoinhaber:</span><span>${club.club_name}</span></div>
        <div class="info-row"><span class="info-label">IBAN:</span><span>${club.iban}</span></div>
        ${club.bic ? `<div class="info-row"><span class="info-label">BIC:</span><span>${club.bic}</span></div>` : ""}
        ${club.bank_name ? `<div class="info-row"><span class="info-label">Kreditinstitut:</span><span>${club.bank_name}</span></div>` : ""}
        <p style="margin-top:8px;font-size:12px;color:#64748b">Bitte geben Sie die Rechnungsnummer <strong>${inv.invoice_number}</strong> als Verwendungszweck an.</p>
      </div>
      ` : ""}
      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
      <p>Mit sportlichen Grüßen<br><strong>${club.club_name}</strong></p>
    </div>
    <div class="footer">${club.club_name}${club.address ? ` · ${club.address}` : ""}${club.city ? ` · ${club.postal_code || ""} ${club.city}` : ""}${club.email ? ` · ${club.email}` : ""}</div>
  `);

  await sendEmail({
    to: inv.email,
    subject: `${title} ${inv.invoice_number} — ${club.club_name}`,
    html,
    replyTo: club.email || undefined,
  });

  await query("UPDATE invoices SET email_sent_at = NOW() WHERE id = $1", [invoiceId]);
  revalidatePath("/accounting/invoices");
}

// ─── Contract / Welcome email ────────────────────────────────────────────────

type MemberEmailData = {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  joined_date: string;
  subscription_type: string;
  billing_period: string;
  plan_name: string | null;
  plan_fee: number | null;
  iban: string | null;
};

export async function sendContractEmail(memberId: string): Promise<void> {
  const member = await queryOne<MemberEmailData>(
    `SELECT m.*, sp.name as plan_name, sp.monthly_fee as plan_fee
     FROM members m LEFT JOIN subscription_plans sp ON m.plan_id = sp.id
     WHERE m.id = $1`,
    [memberId]
  );

  if (!member?.email) return;

  const [sports, club] = await Promise.all([
    query<{ name: string; monthly_fee: number }>(
      `SELECT s.name, s.monthly_fee FROM sports s
       JOIN member_sports ms ON ms.sport_id = s.id
       WHERE ms.member_id = $1 ORDER BY s.name`,
      [memberId]
    ),
    getClubSettings(),
  ]);

  const isYearly = member.billing_period === "yearly";
  const monthlyFee =
    member.subscription_type === "all_inclusive"
      ? Number(member.plan_fee ?? 0)
      : sports.reduce((s, sp) => s + Number(sp.monthly_fee), 0);
  const displayFee = isYearly ? monthlyFee * 12 : monthlyFee;
  const feeLabel = isYearly ? "Jahresbeitrag" : "Monatsbeitrag";
  const sportsList =
    sports.length > 0
      ? sports.map((s) => `${s.name} (${money(s.monthly_fee)}/Monat)`).join(", ")
      : "—";

  const html = emailWrapper(`
    <div class="head">
      <h1>Willkommen beim ${club.club_name}!</h1>
      <p>Mitgliedsnummer: ${member.member_number}</p>
    </div>
    <div class="body">
      <p>Sehr geehrte(r) ${member.first_name} ${member.last_name},</p>
      <p>herzlich willkommen! Wir freuen uns, Sie als Mitglied begrüßen zu dürfen. Im Folgenden finden Sie eine Zusammenfassung Ihrer Mitgliedschaft.</p>

      <div class="info-box">
        <p style="font-weight:bold;margin-bottom:10px">Ihre Mitgliedsdaten</p>
        <div class="info-row"><span class="info-label">Mitgliedsnummer:</span><span>${member.member_number}</span></div>
        <div class="info-row"><span class="info-label">Name:</span><span>${member.first_name} ${member.last_name}</span></div>
        ${member.date_of_birth ? `<div class="info-row"><span class="info-label">Geburtsdatum:</span><span>${fmt(member.date_of_birth)}</span></div>` : ""}
        <div class="info-row"><span class="info-label">Eintrittsdatum:</span><span>${fmt(member.joined_date)}</span></div>
        <div class="info-row"><span class="info-label">Abo-Modell:</span><span>${member.subscription_type === "all_inclusive" ? `Komplett-Paket (${member.plan_name ?? ""})` : "Einzelsportarten"}</span></div>
        ${member.subscription_type === "individual" ? `<div class="info-row"><span class="info-label">Sportarten:</span><span>${sportsList}</span></div>` : ""}
        <div class="info-row"><span class="info-label">Zahlungsrhythmus:</span><span>${isYearly ? "Jährlich" : "Monatlich"}</span></div>
      </div>

      <div class="highlight">${feeLabel}: ${money(displayFee)}</div>

      ${member.iban ? `
      <p style="font-size:13px;color:#64748b;margin-top:8px">
        Ihr Beitrag wird per SEPA-Lastschrift von Ihrem Konto eingezogen.
      </p>
      ` : `
      <p style="font-size:13px;color:#64748b;margin-top:8px">
        Bitte überweisen Sie Ihren Beitrag pünktlich nach Erhalt der Rechnung.
      </p>
      `}

      <p>Sollten Sie Fragen haben, stehen wir Ihnen jederzeit zur Verfügung.</p>
      <p>Wir freuen uns auf eine sportliche Zusammenarbeit!</p>
      <p>Mit sportlichen Grüßen<br><strong>${club.club_name}</strong></p>
    </div>
    <div class="footer">${club.club_name}${club.address ? ` · ${club.address}` : ""}${club.city ? ` · ${club.postal_code || ""} ${club.city}` : ""}${club.email ? ` · ${club.email}` : ""}</div>
  `);

  await sendEmail({
    to: member.email,
    subject: `Willkommen beim ${club.club_name} — Mitgliedschaft bestätigt`,
    html,
    replyTo: club.email || undefined,
  });
}

// ─── Cancellation confirmation email ────────────────────────────────────────

export async function sendCancellationEmail(memberId: string): Promise<void> {
  const member = await queryOne<{
    member_number: string;
    first_name: string;
    last_name: string;
    email: string;
    joined_date: string;
    cancellation_date: string | null;
  }>("SELECT * FROM members WHERE id = $1", [memberId]);

  if (!member?.email) return;

  const [sports, club] = await Promise.all([
    query<{ name: string }>(
      `SELECT s.name FROM sports s
       JOIN member_sports ms ON ms.sport_id = s.id
       WHERE ms.member_id = $1`,
      [memberId]
    ),
    getClubSettings(),
  ]);

  const sportsList = sports.map((s) => s.name).join(", ") || "—";

  const html = emailWrapper(`
    <div class="head">
      <h1>Kündigungsbestätigung</h1>
      <p>${club.club_name} · Mitgliedsnummer: ${member.member_number}</p>
    </div>
    <div class="body">
      <p>Sehr geehrte(r) ${member.first_name} ${member.last_name},</p>
      <p>hiermit bestätigen wir den Eingang Ihrer Kündigung. Ihre Mitgliedschaft beim ${club.club_name} wird zum unten genannten Datum beendet.</p>

      <div class="info-box">
        <div class="info-row"><span class="info-label">Mitglied:</span><span>${member.first_name} ${member.last_name}</span></div>
        <div class="info-row"><span class="info-label">Mitgliedsnummer:</span><span>${member.member_number}</span></div>
        <div class="info-row"><span class="info-label">Mitglied seit:</span><span>${fmt(member.joined_date)}</span></div>
        <div class="info-row"><span class="info-label">Sportarten:</span><span>${sportsList}</span></div>
        <div class="info-row"><span class="info-label">Kündigung zum:</span><span><strong>${fmt(member.cancellation_date)}</strong></span></div>
      </div>

      <p>Bis zu diesem Datum stehen Ihnen alle Leistungen weiterhin zur Verfügung.</p>
      <p>Wir bedauern sehr, dass Sie den Verein verlassen, und wünschen Ihnen alles Gute für die Zukunft.</p>
      <p>Mit sportlichen Grüßen<br><strong>${club.club_name}</strong></p>
    </div>
    <div class="footer">${club.club_name}${club.address ? ` · ${club.address}` : ""}${club.city ? ` · ${club.postal_code || ""} ${club.city}` : ""}${club.email ? ` · ${club.email}` : ""}</div>
  `);

  await sendEmail({
    to: member.email,
    subject: `Kündigungsbestätigung — ${club.club_name}`,
    html,
    replyTo: club.email || undefined,
  });
}
