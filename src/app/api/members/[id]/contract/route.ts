import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getClubSettings } from "@/lib/club-settings";

type MemberRow = {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  address: string;
  city: string;
  postal_code: string;
  joined_date: string;
  subscription_type: string;
  billing_period: string;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  plan_name: string | null;
  plan_fee: number | null;
};

type Sport = { name: string; monthly_fee: number };

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("de-DE").format(new Date(d));
}

function money(val: number | string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(val));
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;

  const [member, sports, club] = await Promise.all([
    queryOne<MemberRow>(
      `SELECT m.*, sp.name as plan_name, sp.monthly_fee as plan_fee
       FROM members m LEFT JOIN subscription_plans sp ON m.plan_id=sp.id
       WHERE m.id=$1`,
      [id]
    ),
    query<Sport>(
      `SELECT s.name, s.monthly_fee FROM sports s
       JOIN member_sports ms ON ms.sport_id=s.id
       WHERE ms.member_id=$1 ORDER BY s.name`,
      [id]
    ),
    getClubSettings(),
  ]);

  if (!member) return new NextResponse("Not found", { status: 404 });

  const isYearly = member.billing_period === "yearly";
  const monthlyFee =
    member.subscription_type === "all_inclusive"
      ? Number(member.plan_fee ?? 0)
      : sports.reduce((s, sp) => s + Number(sp.monthly_fee), 0);
  const yearlyFee = monthlyFee * 12;
  const displayFee = isYearly ? yearlyFee : monthlyFee;
  const feeLabel = isYearly ? "Jahresbeitrag" : "Monatsbeitrag";

  const today = fmt(new Date().toISOString().slice(0, 10));

  const sportsList =
    sports.length > 0
      ? sports.map((s) => `${s.name} (${money(s.monthly_fee)}/Monat)`).join(", ")
      : "—";

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
  .doc-title { font-size: 18pt; font-weight: bold; text-align: center; margin: 24px 0 6px; }
  .doc-sub { font-size: 10pt; color: #64748b; text-align: center; margin-bottom: 32px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11pt; font-weight: bold; color: #dc2626; border-bottom: 1px solid #dc2626; padding-bottom: 4px; margin-bottom: 12px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .row { display: flex; gap: 8px; font-size: 10pt; margin-bottom: 4px; }
  .lbl { color: #64748b; min-width: 160px; }
  .highlight { background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 6px 6px 0; padding: 12px 16px; margin: 16px 0; font-size: 11pt; }
  .sig-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .sig-box { }
  .sig-line { border-top: 1px solid #1a1a1a; padding-top: 6px; margin-top: 48px; font-size: 9pt; color: #64748b; }
  .footer { position: fixed; bottom: 30px; left: 60px; right: 60px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px 30px; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="club-name">${club.club_name}</div>
    ${club.address ? `<div class="club-sub">${club.address}${club.postal_code || club.city ? `, ${[club.postal_code, club.city].filter(Boolean).join(" ")}` : ""}</div>` : ""}
    <div class="club-contact">
      ${club.phone ? `Tel: ${club.phone}<br>` : ""}
      ${club.email ? `E-Mail: ${club.email}` : ""}
    </div>
  </div>
  <div class="date-block">
    <div style="font-size:9pt;color:#64748b">Datum</div>
    <div style="font-weight:bold">${today}</div>
  </div>
</div>

<div class="doc-title">Mitgliedsvertrag</div>
<div class="doc-sub">Beitrittserklärung · ${club.club_name}</div>

<div class="section">
  <div class="section-title">1. Verein</div>
  <div class="grid2">
    <div class="row"><span class="lbl">Vereinsname:</span><span>${club.club_name}</span></div>
    <div class="row"><span class="lbl">Adresse:</span><span>${[club.address, club.postal_code, club.city].filter(Boolean).join(", ") || "—"}</span></div>
    ${club.register_number ? `<div class="row"><span class="lbl">Vereinsregister:</span><span>${club.register_number}</span></div>` : ""}
    ${club.tax_number ? `<div class="row"><span class="lbl">Steuernummer:</span><span>${club.tax_number}</span></div>` : ""}
  </div>
</div>

<div class="section">
  <div class="section-title">2. Mitglied</div>
  <div class="grid2">
    <div class="row"><span class="lbl">Name:</span><span>${member.first_name} ${member.last_name}</span></div>
    <div class="row"><span class="lbl">Mitgliedsnummer:</span><span>${member.member_number}</span></div>
    ${member.date_of_birth ? `<div class="row"><span class="lbl">Geburtsdatum:</span><span>${fmt(member.date_of_birth)}</span></div>` : ""}
    ${member.email ? `<div class="row"><span class="lbl">E-Mail:</span><span>${member.email}</span></div>` : ""}
    ${member.phone ? `<div class="row"><span class="lbl">Telefon:</span><span>${member.phone}</span></div>` : ""}
    ${member.address ? `<div class="row"><span class="lbl">Adresse:</span><span>${member.address}, ${[member.postal_code, member.city].filter(Boolean).join(" ")}</span></div>` : ""}
  </div>
</div>

<div class="section">
  <div class="section-title">3. Mitgliedschaft</div>
  <div class="grid2">
    <div class="row"><span class="lbl">Eintrittsdatum:</span><span>${fmt(member.joined_date)}</span></div>
    <div class="row"><span class="lbl">Abo-Modell:</span><span>${member.subscription_type === "all_inclusive" ? `Komplett-Paket (${member.plan_name ?? ""})` : "Einzelsportarten"}</span></div>
    ${member.subscription_type === "individual" ? `<div class="row" style="grid-column:1/-1"><span class="lbl">Sportarten:</span><span>${sportsList}</span></div>` : ""}
  </div>
  <div class="highlight">
    <strong>${feeLabel}:</strong> ${money(displayFee)}
    ${isYearly ? ` <span style="font-size:9pt;color:#64748b">(entspricht ${money(monthlyFee)}/Monat)</span>` : ""}
  </div>
</div>

<div class="section">
  <div class="section-title">4. Zahlungsweise</div>
  <div class="row"><span class="lbl">Abrechnungsperiode:</span><span>${isYearly ? "Jährlich" : "Monatlich"}</span></div>
  ${member.iban ? `
  <br>
  <div class="row"><span class="lbl">SEPA-Lastschrift:</span><span>Ja</span></div>
  <div class="row"><span class="lbl">IBAN:</span><span>${member.iban}</span></div>
  ${member.bic ? `<div class="row"><span class="lbl">BIC:</span><span>${member.bic}</span></div>` : ""}
  ${member.bank_name ? `<div class="row"><span class="lbl">Kreditinstitut:</span><span>${member.bank_name}</span></div>` : ""}
  <p style="font-size:9pt;color:#64748b;margin-top:8px">
    Ich ermächtige ${club.club_name} Zahlungen von meinem Konto mittels SEPA-Lastschrift einzuziehen.
  </p>
  ` : `<div class="row" style="margin-top:8px"><span class="lbl">Zahlung per:</span><span>Überweisung</span></div>`}
</div>

<div class="section">
  <div class="section-title">5. Kündigung</div>
  <p style="font-size:10pt;">Die Mitgliedschaft kann schriftlich gekündigt werden. Die Kündigungsfrist und -modalitäten richten sich nach der aktuellen Satzung des Vereins.</p>
</div>

<div class="sig-area">
  <div class="sig-box">
    <div class="sig-line">Ort, Datum — Mitglied</div>
    <br>
    <div class="sig-line">${member.first_name} ${member.last_name} (Unterschrift)</div>
  </div>
  <div class="sig-box">
    <div class="sig-line">Ort, Datum — Verein</div>
    <br>
    <div class="sig-line">${club.club_name} (Vereinsleitung)</div>
  </div>
</div>

<div class="footer">
  <span>${club.club_name}${club.address ? ` · ${club.address}` : ""}${club.city ? ` · ${club.postal_code || ""} ${club.city}` : ""}</span>
  <span>${club.tax_number ? `St-Nr: ${club.tax_number}` : ""}${club.register_number ? ` · ${club.register_number}` : ""}</span>
</div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="vertrag-${member.member_number}.html"`,
    },
  });
}
