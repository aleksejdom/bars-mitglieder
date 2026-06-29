import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const SETUP_SECRET = process.env.SETUP_SECRET ?? "";

export async function GET(req: NextRequest) {
  // Accept either a valid session cookie or the x-setup-secret header
  const secretHeader = req.headers.get("x-setup-secret");
  const session = await getSession();

  if (!session && (!SETUP_SECRET || secretHeader !== SETUP_SECRET)) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const to = req.nextUrl.searchParams.get("to");

  const config = {
    SMTP_HOST: process.env.SMTP_HOST || "(nicht gesetzt)",
    SMTP_PORT: process.env.SMTP_PORT || "(nicht gesetzt)",
    SMTP_SECURE: process.env.SMTP_SECURE || "(nicht gesetzt)",
    SMTP_USER: process.env.SMTP_USER ? process.env.SMTP_USER.replace(/(.{2}).*(@.*)/, "$1***$2") : "(nicht gesetzt)",
    SMTP_FROM: process.env.SMTP_FROM || "(nicht gesetzt)",
    SMTP_PASS: process.env.SMTP_PASS ? "***gesetzt***" : "(nicht gesetzt)",
  };

  if (!to) {
    return NextResponse.json({
      message: "SMTP-Konfiguration (GET /api/admin/test-email?to=email@example.com zum Testen)",
      config,
    });
  }

  try {
    await sendEmail({
      to,
      subject: "Test-E-Mail – BoxClub Mitgliederverwaltung",
      html: `<div style="font-family:sans-serif;padding:24px">
        <h2>Test erfolgreich ✓</h2>
        <p>Diese Test-E-Mail wurde von der BoxClub-Mitgliederverwaltung gesendet.</p>
        <p style="color:#64748b;font-size:12px;margin-top:16px">SMTP: ${config.SMTP_HOST}:${config.SMTP_PORT} (secure: ${config.SMTP_SECURE})</p>
      </div>`,
    });

    return NextResponse.json({
      success: true,
      message: `Test-E-Mail an ${to} gesendet`,
      config,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { success: false, error: msg, config },
      { status: 500 }
    );
  }
}
