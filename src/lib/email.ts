import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error("SMTP_HOST nicht konfiguriert");

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    replyTo: opts.replyTo ?? from,
  });
}

export function emailWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; background: #f1f5f9; }
  .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .head { background: #dc2626; padding: 24px 32px; color: #fff; }
  .head h1 { font-size: 20px; font-weight: bold; }
  .head p { font-size: 12px; margin-top: 4px; opacity: .8; }
  .body { padding: 32px; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
  .info-row { display: flex; gap: 12px; font-size: 13px; margin-bottom: 6px; }
  .info-label { color: #64748b; min-width: 160px; }
  .highlight { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 20px 0; font-size: 15px; font-weight: bold; }
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 11px; color: #94a3b8; }
  p { line-height: 1.7; margin-bottom: 12px; }
</style>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}
