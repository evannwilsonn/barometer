// End-to-end test of the account flows in a real browser, against a running Barometer with a
// database, a mail catcher (Mailpit) and the Inngest dev server. CI runs it on every push.
//
//   npm run e2e                     # BASE_URL=http://localhost:3000 MAILPIT_URL=http://localhost:8025
//
// It signs up, confirms the email, adds a stock, requests the dispatch, unsubscribes through the
// emailed link, signs out and back in, resets the password and deletes the account, checking
// what the reader sees and what lands in the inbox at each step.

import { chromium, type Page } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const MAIL = (process.env.MAILPIT_URL || "http://localhost:8025").replace(/\/$/, "");
const email = `e2e-${Date.now()}@example.com`;
let password = "correct-horse-9";

type Message = { ID: string; Subject: string; Text: string };

let step = 0;
const ok = (what: string) => console.log(`ok ${++step} - ${what}`);
function check(cond: unknown, what: string): asserts cond {
  if (!cond) throw new Error(`not ok - ${what}`);
  ok(what);
}

async function mail(subject: string, after = 0): Promise<Message> {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
    const hit = (list.messages ?? []).find((m: { Subject: string; Created: string }) =>
      m.Subject.includes(subject) && Date.parse(m.Created) >= after);
    if (hit) return (await fetch(`${MAIL}/api/v1/message/${hit.ID}`)).json();
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error(`no email "${subject}" for ${email}`);
}

const link = (m: Message, path: string) => {
  const found = m.Text.match(new RegExp(`${BASE.replace(/[.:/]/g, "\\$&")}${path}\\S+`));
  if (!found) throw new Error(`no ${path} link in "${m.Subject}"`);
  return found[0];
};

// Better Auth allows 3 sign-in or sign-up requests from one address, counting until 10 quiet
// seconds pass, so the test leaves that gap before each attempt.
let lastAttempt = 0;
async function spaced(p: Page) {
  const wait = lastAttempt + 10_500 - Date.now();
  if (wait > 0) await p.waitForTimeout(wait);
  lastAttempt = Date.now();
}

async function signIn(p: Page, pass: string) {
  await spaced(p);
  await p.goto(`${BASE}/sign-in`);
  await p.fill("input[type=email]", email);
  await p.fill("input[type=password]", pass);
  await p.click("button[type=submit]");
}

async function main() {
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  p.on("pageerror", e => errors.push(`${p.url()}: ${e.message}`));

  try {
    // Sign up: the terms box is required.
    await p.goto(`${BASE}/sign-up`);
    await p.fill("input[autocomplete=name]", "Ada Lovelace");
    await p.fill("input[type=email]", email);
    await p.fill("input[type=password]", password);
    await p.click("button[type=submit]");
    check(await p.evaluate(() => !(document.querySelector("input[type=checkbox]") as HTMLInputElement).checkValidity()),
      "sign-up refuses without agreeing to the terms");
    await p.check("input[type=checkbox]");
    lastAttempt = Date.now();
    const t0 = Date.now();
    await p.click("button[type=submit]");
    await p.waitForSelector("text=Check your inbox");
    check(Date.now() - t0 < 5000, `sign-up answers in ${Date.now() - t0} ms`);

    // An unconfirmed account can't sign in.
    await signIn(p, password);
    await p.waitForSelector("text=Confirm your email first");
    ok("unconfirmed sign-in is held back");

    // Confirming signs the reader in and sends the welcome note.
    const confirm = await mail("Confirm your email");
    await p.goto(link(confirm, "/api/auth/verify-email"));
    await p.waitForURL("**/logbook");
    ok("confirm link opens the logbook");
    const welcome = await mail("Your barometer is set up");
    check(welcome.Text.includes("Ada"), "welcome email arrives after confirming");

    // Add a stock and ask for the dispatch.
    await p.goto(`${BASE}/?s=AAPL`);
    await p.click("text=Add AAPL to your logbook", { timeout: 30000 });
    await p.waitForSelector("text=In your logbook");
    ok("stock added from its reading");
    await p.goto(`${BASE}/logbook`);
    await p.waitForSelector("text=AAPL");
    const sent = Date.now() - 2000;
    await p.click("text=Email me today's dispatch");
    await p.waitForSelector("[role=status]");
    const dispatch = await mail("Morning dispatch", sent);
    const unsub = link(dispatch, "/api/unsubscribe");
    const headers = await (await fetch(`${MAIL}/api/v1/message/${dispatch.ID}/headers`)).json();
    check(String(headers["List-Unsubscribe"] ?? "").includes("/api/unsubscribe") &&
      String(headers["List-Unsubscribe-Post"] ?? "").includes("One-Click"), "dispatch carries one-click unsubscribe headers");

    // A forged token is refused; the real one switches the dispatch off.
    const forged = await fetch(unsub.replace(/t=[^&]+/, "t=forged"), { redirect: "manual" });
    check(forged.headers.get("location")?.includes("unsubscribed=0"), "forged unsubscribe link is refused");
    await p.goto(unsub);
    await p.waitForSelector("text=You're unsubscribed");
    await p.goto(`${BASE}/logbook`);
    await p.waitForSelector("text=Off: no morning emails", { timeout: 10000 });
    ok("logbook shows the dispatch switched off");

    // Sign out and back in; a wrong password gets a clear message.
    await p.context().clearCookies();
    await signIn(p, "wrong-password-1");
    const bad = await p.waitForSelector("p[role=alert]");
    check((await bad.textContent())?.includes("don't match"), "wrong password is explained");
    await p.fill("input[type=password]", password);
    await spaced(p);
    const t1 = Date.now();
    await p.click("button[type=submit]");
    await p.waitForURL("**/logbook");
    await p.waitForSelector("text=AAPL");
    check(Date.now() - t1 < 8000, `sign-in reaches the logbook in ${Date.now() - t1} ms`);

    // Password reset: the link works once.
    await p.context().clearCookies();
    await p.goto(`${BASE}/forgot-password`);
    await p.fill("input[type=email]", email);
    const asked = Date.now() - 2000;
    await p.click("button[type=submit]");
    await p.waitForSelector("text=Check your inbox");
    const reset = link(await mail("Reset your Barometer password", asked), "/api/auth/reset-password");
    await p.goto(reset);
    await p.waitForURL("**/reset-password**");
    password = "new-horse-battery-7";
    await p.fill("input[type=password]", password);
    await p.click("button[type=submit]");
    await p.waitForSelector("text=Password changed");
    await signIn(p, password);
    await p.waitForURL("**/logbook");
    ok("password reset, then sign-in with the new one");

    // Delete the account: the wrong password is refused, the right one removes everything.
    await p.click("text=Delete my account");
    await p.fill("input[autocomplete=current-password]", "wrong-password-1");
    await p.click("text=Delete for good");
    await p.waitForSelector("text=That password isn't right");
    ok("delete refuses the wrong password");
    await p.fill("input[autocomplete=current-password]", password);
    await p.click("text=Delete for good");
    await p.waitForURL(`${BASE}/`);
    await signIn(p, password);
    await p.waitForSelector("p[role=alert]");
    ok("deleted account can't sign in");

    // Pages fit a phone.
    const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const path of ["/", "/legal", "/sign-up", "/sign-in", "/forgot-password"]) {
      await m.goto(`${BASE}${path}`);
      const width = await m.evaluate(() => document.documentElement.scrollWidth);
      check(width <= 390, `${path} fits a 390px screen (${width}px)`);
    }

    check(errors.length === 0, `no script errors${errors.length ? ": " + errors.join("; ") : ""}`);
    console.log(`\nall ${step} checks passed`);
  } catch (e) {
    await p.screenshot({ path: "e2e-failure.png", fullPage: true }).catch(() => {});
    console.error((e as Error).message);
    if (errors.length) console.error("script errors:", errors);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
