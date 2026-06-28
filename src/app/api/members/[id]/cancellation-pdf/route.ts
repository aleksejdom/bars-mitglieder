import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getClubSettings } from "@/lib/club-settings";

type Member = {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  city: string;
  postal_code: string;
  joined_date: string;
  cancellation_date: string;
  status: string;
};

type Sport = { name: string };

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("de-DE").format(new Date(dateStr));
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/members/[id]/cancellation-pdf">
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;

  const [member, sports, club] = await Promise.all([
    queryOne<Member>("SELECT * FROM members WHERE id = $1", [id]),
    query<Sport>(
      `SELECT s.name FROM sports s
       JOIN member_sports ms ON ms.sport_id = s.id
       WHERE ms.member_id = $1`,
      [id]
    ),
    getClubSettings(),
  ]);

  if (!member) return new NextResponse("Not found", { status: 404 });

  const today = formatDate(new Date().toISOString().slice(0, 10));
  const cancellationDate = formatDate(member.cancellation_date);
  const joinedDate = formatDate(member.joined_date);
  const sportsList = sports.map((s) => s.name).join(", ") || "—";

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12pt; color: #1a1a1a; padding: 60px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
  .club-name { font-size: 22pt; font-weight: bold; color: #dc2626; }
  .club-sub { font-size: 10pt; color: #64748b; margin-top: 2px; }
  .club-contact { font-size: 9pt; color: #64748b; margin-top: 6px; line-height: 1.6; }
  .date-block { text-align: right; font-size: 10pt; color: #64748b; }
  .recipient { margin-bottom: 40px; }
  .recipient p { line-height: 1.8; }
  .subject { font-size: 14pt; font-weight: bold; margin-bottom: 8px; border-bottom: 2px solid #dc2626; padding-bottom: 8px; }
  .subject-sub { font-size: 10pt; color: #64748b; margin-bottom: 32px; }
  .body { margin-bottom: 32px; line-height: 1.8; }
  .info-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 24px 0; border-radius: 0 6px 6px 0; }
  .info-row { display: flex; gap: 12px; margin-bottom: 4px; }
  .info-label { font-weight: bold; min-width: 160px; }
  .signature { margin-top: 48px; }
  .sig-line { border-top: 1px solid #1a1a1a; width: 240px; margin-top: 48px; padding-top: 6px; font-size: 10pt; color: #64748b; }
  .footer { position: fixed; bottom: 40px; left: 60px; right: 60px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9pt; color: #94a3b8; display: flex; justify-content: space-between; }
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
    <div>${today}</div>
  </div>
</div>

<div class="recipient">
  <p><strong>${member.first_name} ${member.last_name}</strong></p>
  ${member.address ? `<p>${member.address}</p>` : ""}
  ${member.postal_code || member.city ? `<p>${[member.postal_code, member.city].filter(Boolean).join(" ")}</p>` : ""}
</div>

<div class="subject">Kündigungsbestätigung Ihrer Vereinsmitgliedschaft</div>
<div class="subject-sub">Mitgliedsnummer: ${member.member_number}</div>

<div class="body">
  <p>Sehr geehrte(r) ${member.first_name} ${member.last_name},</p>
  <br>
  <p>hiermit bestätigen wir den Eingang Ihrer Kündigung und verarbeiten diese ordnungsgemäß.</p>
  <br>
  <p>Ihre Mitgliedschaft beim ${club.club_name} wird zum unten aufgeführten Datum beendet.
  Bis zu diesem Zeitpunkt stehen Ihnen alle vereinbarten Leistungen weiterhin zur Verfügung.</p>
</div>

<div class="info-box">
  <div class="info-row"><span class="info-label">Mitglied:</span><span>${member.first_name} ${member.last_name}</span></div>
  <div class="info-row"><span class="info-label">Mitgliedsnummer:</span><span>${member.member_number}</span></div>
  <div class="info-row"><span class="info-label">Mitglied seit:</span><span>${joinedDate}</span></div>
  <div class="info-row"><span class="info-label">Sportarten:</span><span>${sportsList}</span></div>
  <div class="info-row"><span class="info-label">Kündigung zum:</span><span><strong>${cancellationDate}</strong></span></div>
</div>

<div class="body">
  <p>Wir bedauern sehr, dass Sie unseren Verein verlassen. Für etwaige Rückfragen stehen wir Ihnen
  jederzeit zur Verfügung.</p>
  <br>
  <p>Wir wünschen Ihnen alles Gute für die Zukunft und hoffen, Sie vielleicht bald wieder
  in unserem Verein begrüßen zu dürfen.</p>
  <br>
  <p>Mit sportlichen Grüßen</p>
</div>

<div class="signature">
  <div class="sig-line">${club.club_name} — Vereinsleitung</div>
</div>

<div class="footer">
  <span>${club.club_name}</span>
  <span>Dieses Dokument wurde automatisch erstellt am ${today}</span>
</div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="kuendigung-${member.member_number}.html"`,
    },
  });
}
