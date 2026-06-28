import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getClubSettings } from "@/lib/club-settings";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  type: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  city: string;
  postal_code: string;
  member_number: string;
  billing_period: string;
};

const typeTitle: Record<string, string> = {
  invoice: "Rechnung",
  reminder: "Zahlungserinnerung",
  final_reminder: "Letzte Mahnung",
};

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("de-DE").format(new Date(dateStr));
}

function money(val: number | string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(val));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const inv = await queryOne<InvoiceRow>(
    `SELECT i.*, m.first_name, m.last_name, m.email, m.address, m.city,
            m.postal_code, m.member_number,
            COALESCE(m.billing_period, 'monthly') as billing_period
     FROM invoices i JOIN members m ON i.member_id=m.id
     WHERE i.id=$1`,
    [id]
  );
  if (!inv) return new NextResponse("Not found", { status: 404 });

  const club = await getClubSettings();
  const today = fmt(new Date().toISOString().slice(0, 10));
  const title = typeTitle[inv.type] || "Rechnung";

  const periodLine =
    inv.period_start && inv.period_end
      ? `${fmt(inv.period_start)} – ${fmt(inv.period_end)}`
      : inv.period_start
      ? `ab ${fmt(inv.period_start)}`
      : "Mitgliedsbeitrag";

  const billingLabel =
    inv.billing_period === "yearly" ? "Jahresbeitrag" : "Monatsbeitrag";

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; padding: 50px 60px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .club-name { font-size: 20pt; font-weight: bold; color: #dc2626; }
  .club-sub { font-size: 9pt; color: #64748b; margin-top: 2px; }
  .club-contact { font-size: 9pt; color: #64748b; margin-top: 6px; line-height: 1.6; }
  .date-block { text-align: right; font-size: 10pt; color: #64748b; }
  .recipient { margin-bottom: 36px; }
  .recipient p { line-height: 1.8; }
  .doc-title { font-size: 18pt; font-weight: bold; margin-bottom: 4px; }
  .doc-number { font-size: 10pt; color: #64748b; margin-bottom: 28px; }
  .info-box { background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin-bottom: 28px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .info-row { display: flex; gap: 8px; font-size: 10pt; }
  .info-label { color: #64748b; min-width: 130px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { text-align: left; padding: 8px 12px; background: #f1f5f9; font-size: 10pt; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 10pt; }
  .amount-col { text-align: right; }
  .total-row td { font-weight: bold; font-size: 11pt; border-top: 2px solid #1a1a1a; border-bottom: none; padding-top: 12px; }
  .payment-section { margin-top: 32px; padding: 16px 18px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 6px 6px 0; }
  .payment-title { font-weight: bold; font-size: 10pt; margin-bottom: 8px; }
  .payment-row { font-size: 10pt; line-height: 1.8; }
  .body-text { margin-bottom: 20px; font-size: 10pt; line-height: 1.7; }
  .footer { position: fixed; bottom: 30px; left: 60px; right: 60px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px 30px; } .footer { position: fixed; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="club-name">${club.club_name}</div>
    ${club.address ? `<div class="club-sub">${club.address}${club.postal_code || club.city ? `, ${[club.postal_code, club.city].filter(Boolean).join(" ")}` : ""}</div>` : ""}
    <div class="club-contact">
      ${club.phone ? `Tel: ${club.phone}<br>` : ""}
      ${club.email ? `E-Mail: ${club.email}<br>` : ""}
      ${club.website ? `${club.website}` : ""}
    </div>
  </div>
  <div class="date-block">
    <div style="font-size:9pt;color:#64748b">Datum</div>
    <div style="font-weight:bold">${today}</div>
  </div>
</div>

<div class="recipient">
  <p><strong>${inv.first_name} ${inv.last_name}</strong></p>
  ${inv.address ? `<p>${inv.address}</p>` : ""}
  ${inv.postal_code || inv.city ? `<p>${[inv.postal_code, inv.city].filter(Boolean).join(" ")}</p>` : ""}
  ${inv.email ? `<p>${inv.email}</p>` : ""}
</div>

<div class="doc-title">${title}</div>
<div class="doc-number">${inv.invoice_number}</div>

<p class="body-text">
  Sehr geehrte(r) ${inv.first_name} ${inv.last_name},<br><br>
  ${inv.type === "invoice"
    ? "anbei erhalten Sie Ihre Rechnung für den Mitgliedsbeitrag."
    : inv.type === "reminder"
    ? "wir möchten Sie freundlich daran erinnern, dass folgende Zahlung noch aussteht."
    : "wir weisen Sie letztmalig auf den ausstehenden Betrag hin. Bitte begleichen Sie diesen umgehend."}
</p>

<div class="info-box">
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Rechnungsnummer:</span><span>${inv.invoice_number}</span></div>
    <div class="info-row"><span class="info-label">Mitgliedsnummer:</span><span>${inv.member_number}</span></div>
    <div class="info-row"><span class="info-label">Ausstellungsdatum:</span><span>${today}</span></div>
    <div class="info-row"><span class="info-label">Fälligkeitsdatum:</span><span>${fmt(inv.due_date)}</span></div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Beschreibung</th>
      <th>Zahlungsweise</th>
      <th class="amount-col">Betrag</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${billingLabel} — ${periodLine}</td>
      <td>${inv.billing_period === "yearly" ? "Jahresbeitrag" : "Monatsbeitrag"}</td>
      <td class="amount-col">${money(inv.amount)}</td>
    </tr>
  </tbody>
  <tfoot>
    <tr class="total-row">
      <td colspan="2">Gesamtbetrag</td>
      <td class="amount-col">${money(inv.amount)}</td>
    </tr>
  </tfoot>
</table>

${club.iban ? `
<div class="payment-section">
  <div class="payment-title">Zahlungsinformationen</div>
  <div class="payment-row">
    Bitte überweisen Sie den Betrag unter Angabe der Rechnungsnummer <strong>${inv.invoice_number}</strong>.<br>
    Kontoinhaber: ${club.club_name}<br>
    IBAN: ${club.iban}${club.bic ? `<br>BIC: ${club.bic}` : ""}${club.bank_name ? `<br>Kreditinstitut: ${club.bank_name}` : ""}
  </div>
</div>
` : ""}

<br><br>
<p class="body-text">Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br>Mit sportlichen Grüßen<br><br>${club.club_name}</p>

<div class="footer">
  <span>${club.club_name}${club.address ? ` · ${club.address}` : ""}${club.city ? ` · ${club.postal_code || ""} ${club.city}` : ""}</span>
  <span>${club.tax_number ? `St-Nr: ${club.tax_number}` : ""}${club.register_number ? ` · ${club.register_number}` : ""}</span>
</div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="rechnung-${inv.invoice_number}.html"`,
    },
  });
}
