// Outgoing email through Nodemailer, styled like the instrument: porcelain card, merlot rule.
//
// Transport, in order: Gmail when NODEMAILER_EMAIL and NODEMAILER_PASSWORD (a Gmail app password)
// are set; any SMTP server in SMTP_URL (e.g. smtp://localhost:1025 for a local mail catcher);
// otherwise nothing is sent and the subject line is logged.
//
// Every dispatch carries a one-click unsubscribe link (and the List-Unsubscribe headers that
// mail apps show as an "Unsubscribe" button). The link is signed with BETTER_AUTH_SECRET, so it
// can only turn off the dispatch for the reader it was sent to.

import { createHmac, timingSafeEqual } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

function transporter(): Transporter | null {
  if (transport) return transport;
  const { NODEMAILER_EMAIL: user, NODEMAILER_PASSWORD: pass, SMTP_URL } = process.env;
  // Short timeouts: a mail server that doesn't answer should fail in seconds, not hang a request
  // (Nodemailer's defaults wait up to two minutes for a connection).
  const timeouts = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };
  if (user && pass) transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass }, ...timeouts });
  else if (SMTP_URL) transport = nodemailer.createTransport({ url: SMTP_URL, ...timeouts } as Parameters<typeof nodemailer.createTransport>[0]);
  return transport;
}

const from = () => `"Barometer" <${process.env.MAIL_FROM || process.env.NODEMAILER_EMAIL || "barometer@localhost"}>`;
export const site = () => (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");

/** Where readers can reach the operator: CONTACT_EMAIL, else the sending address. */
export const contactEmail = () => process.env.CONTACT_EMAIL || process.env.NODEMAILER_EMAIL || "";

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain paragraphs (blank-line separated) to escaped HTML paragraphs. */
export const paragraphs = (text: string) =>
  text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p style="margin:0 0 14px;font:17px/1.6 Georgia,serif;color:#1d1513">${esc(p)}</p>`).join("");

// ---------- unsubscribe links ----------

const sign = (userId: string) =>
  createHmac("sha256", process.env.BETTER_AUTH_SECRET || "dev-only-secret").update(`unsubscribe:${userId}`).digest("base64url");

export const unsubscribeUrl = (userId: string) => `${site()}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;

export function validUnsubscribe(userId: string, token: string) {
  const a = Buffer.from(sign(userId)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- the frame ----------

/** Wraps body HTML (already escaped) in the email frame. With `unsubscribe`, the footer says how to stop these. */
export function frame(title: string, body: string, unsubscribe?: string) {
  const s = esc(site());
  const why = unsubscribe
    ? `You're getting this because you turned on the morning dispatch for your Barometer logbook. <a href="${esc(unsubscribe)}" style="color:#7a1f2e">Unsubscribe in one click</a>, or switch it off on your logbook page.<br>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#ece3dd;padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fbf8f3;border-top:6px solid #5c1621">
<tr><td style="padding:28px 32px 6px;font:13px/1.4 'Courier New',monospace;letter-spacing:2px;color:#6a5c57;text-transform:uppercase">Barometer · No. 11</td></tr>
<tr><td style="padding:0 32px 18px;font:400 30px/1.15 Georgia,serif;color:#5c1621">${esc(title)}</td></tr>
<tr><td style="padding:0 32px 10px">${body}</td></tr>
<tr><td style="padding:18px 32px 28px;border-top:1px solid #ddcfc7;font:13px/1.5 Georgia,serif;color:#6a5c57">
${why}Barometer is a free, non-commercial student project. Its forecasts give the likely size of next week's moves, never their direction, and nothing here is investment advice or a recommendation to buy or sell anything.<br>
<a href="${s}" style="color:#7a1f2e">Open Barometer</a> · <a href="${s}/logbook" style="color:#7a1f2e">Your logbook</a> · <a href="${s}/legal" style="color:#7a1f2e">Terms and privacy</a></td></tr>
</table></td></tr></table></body></html>`;
}

/** A one-button email: confirm an address, reset a password. */
export async function actionEmail(to: string, subject: string, title: string, text: string, button: string, url: string) {
  const body = paragraphs(text) +
    `<p style="margin:8px 0 18px"><a href="${esc(url)}" style="display:inline-block;background:#5c1621;color:#f6ece6;padding:12px 20px;border-radius:3px;font:14px 'Courier New',monospace;letter-spacing:1px;text-decoration:none;text-transform:uppercase">${esc(button)}</a></p>` +
    `<p style="margin:0 0 14px;font:13px/1.5 Georgia,serif;color:#6a5c57;word-break:break-all">Or paste this link into your browser: ${esc(url)}</p>`;
  return send(to, subject, frame(title, body), `${text}\n\n${button}: ${url}`);
}

export async function send(to: string, subject: string, html: string, text: string, unsubscribe?: string) {
  const t = transporter();
  if (!t) {
    console.log(`[mail] no transport configured; would send "${subject}"`);
    return { sent: false };
  }
  await t.sendMail({
    from: from(), to, subject, html, text,
    ...(unsubscribe ? { list: { unsubscribe: { url: unsubscribe, comment: "Stop the morning dispatch" } }, headers: { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
  });
  return { sent: true };
}
