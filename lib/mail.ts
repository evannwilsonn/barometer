// Outgoing email through Nodemailer, styled like the instrument: porcelain card, merlot rule.
//
// Transport, in order: Gmail when NODEMAILER_EMAIL and NODEMAILER_PASSWORD (a Gmail app password)
// are set; any SMTP server in SMTP_URL (e.g. smtp://localhost:1025 for a local mail catcher);
// otherwise nothing is sent and the subject line is logged.

import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

function transporter(): Transporter | null {
  if (transport) return transport;
  const { NODEMAILER_EMAIL: user, NODEMAILER_PASSWORD: pass, SMTP_URL } = process.env;
  if (user && pass) transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  else if (SMTP_URL) transport = nodemailer.createTransport(SMTP_URL);
  return transport;
}

const from = () => `"Barometer" <${process.env.MAIL_FROM || process.env.NODEMAILER_EMAIL || "barometer@localhost"}>`;

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain paragraphs (blank-line separated) to escaped HTML paragraphs. */
export const paragraphs = (text: string) =>
  text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;font:17px/1.6 Georgia,serif;color:#1d1513">${esc(p)}</p>`).join("");

/** Wraps body HTML (already escaped) in the email frame. */
export function frame(title: string, body: string) {
  const site = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return `<!doctype html><html><body style="margin:0;background:#ece3dd;padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fbf8f3;border-top:6px solid #5c1621">
<tr><td style="padding:28px 32px 6px;font:13px/1.4 'Courier New',monospace;letter-spacing:2px;color:#6a5c57;text-transform:uppercase">Barometer · No. 11</td></tr>
<tr><td style="padding:0 32px 18px;font:400 30px/1.15 Georgia,serif;color:#5c1621">${esc(title)}</td></tr>
<tr><td style="padding:0 32px 10px">${body}</td></tr>
<tr><td style="padding:18px 32px 28px;border-top:1px solid #ddcfc7;font:13px/1.5 Georgia,serif;color:#6a5c57">
Forecasts give the likely size of next week's moves, never their direction. Nothing here is investment advice.<br>
<a href="${esc(site)}" style="color:#7a1f2e">Open Barometer</a> · <a href="${esc(site)}/logbook" style="color:#7a1f2e">Your logbook</a></td></tr>
</table></td></tr></table></body></html>`;
}

export async function send(to: string, subject: string, html: string, text: string) {
  const t = transporter();
  if (!t) {
    console.log(`[mail] no transport configured; would send "${subject}"`);
    return { sent: false };
  }
  await t.sendMail({ from: from(), to, subject, html, text });
  return { sent: true };
}
