"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "./auth-client";

// ISO 3166 country codes; names come from the browser in the reader's language.
const CODES = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");

export type Mode = "sign-in" | "sign-up" | "forgot" | "reset";

const input = "w-full rounded-sm border border-rule bg-porcelain px-3 py-2.5 text-[17px] focus:border-merlot";
const primary = "w-full rounded-sm bg-case px-5 py-3 font-mono text-[14px] tracking-wider text-case-ink uppercase disabled:opacity-60";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-faint">{hint}</span>}
    </label>
  );
}

function Choice({ name, label, options, value, onChange }: { name: string; label: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="label mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <label key={o} className={`cursor-pointer rounded-sm border px-3 py-1.5 text-[15px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-copper ${value === o ? "border-merlot bg-band text-ink" : "border-rule text-soft"}`}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(value === o ? "" : o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A finished step: what happened and what to do next. */
function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="rounded-sm border border-rule bg-porcelain p-5">
      <p className="engraved text-[20px]">{title}</p>
      <div className="mt-2 text-[16px] leading-relaxed text-soft">{children}</div>
    </div>
  );
}

export function AuthForm({ mode, industries }: { mode: Mode; industries?: readonly string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/logbook";
  const keepNext = next ? `?next=${encodeURIComponent(next)}` : "";
  // Country names come from the browser's own data, so the full list is built after hydration
  // (the server's names can differ, e.g. "Turkey" vs "Türkiye", which would break hydration).
  const [countries, setCountries] = useState([{ c: "US", n: "United States" }]);
  useEffect(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    setCountries(CODES.map(c => ({ c, n: names.of(c) ?? c })).sort((a, b) => a.n.localeCompare(b.n)));
  }, []);
  const [f, setF] = useState({ name: "", email: "", password: "", country: "US", preferredIndustry: "", agree: false });
  const set = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "check-email" | "unverified" | "reset-sent" | "reset-done">(null);
  const [busy, setBusy] = useState(false);
  const linkError = params.get("error"); // set by Better Auth when an emailed link is expired or used

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        if (!f.agree) { setError("Please confirm you're 18 or older and agree to the terms"); return; }
        const r = await authClient.signUp.email({
          name: f.name.trim(), email: f.email.trim(), password: f.password, country: f.country,
          preferredIndustry: f.preferredIndustry || undefined, termsAcceptedAt: new Date().toISOString(),
          callbackURL: dest,
        });
        if (r.error) setError(r.error.message || "Couldn't create the account");
        else setDone("check-email");
      } else if (mode === "sign-in") {
        const r = await authClient.signIn.email({ email: f.email.trim(), password: f.password, callbackURL: dest });
        if (r.error?.code === "EMAIL_NOT_VERIFIED" || r.error?.status === 403) setDone("unverified");
        else if (r.error) setError("That email and password don't match");
        else { router.push(dest); router.refresh(); }
      } else if (mode === "forgot") {
        await authClient.requestPasswordReset({ email: f.email.trim(), redirectTo: "/reset-password" });
        setDone("reset-sent"); // the same answer whether or not the address has an account
      } else {
        const token = params.get("token");
        if (!token) { setError("This reset link is incomplete; ask for a new one"); return; }
        const r = await authClient.resetPassword({ newPassword: f.password, token });
        if (r.error) setError("This reset link has expired or was already used; ask for a new one");
        else setDone("reset-done");
      }
    } finally {
      setBusy(false);
    }
  }

  if (done === "check-email") return (
    <Notice title="Check your inbox">
      We sent a confirmation link to <b className="text-ink">{f.email.trim()}</b>. Open it within an hour to activate your logbook. Nothing is sent to that address again until it&apos;s confirmed. If it doesn&apos;t arrive, look in spam or <a href="/sign-in" className="text-merlot underline underline-offset-4">sign in</a> to get a new link.
    </Notice>
  );
  if (done === "unverified") return (
    <Notice title="Confirm your email first">
      This account&apos;s email isn&apos;t confirmed yet. We&apos;ve sent a new link to <b className="text-ink">{f.email.trim()}</b>; open it and you&apos;ll be signed in.
    </Notice>
  );
  if (done === "reset-sent") return (
    <Notice title="Check your inbox">
      If an account uses <b className="text-ink">{f.email.trim()}</b>, a link to choose a new password is on its way. It works for one hour.
    </Notice>
  );
  if (done === "reset-done") return (
    <Notice title="Password changed">
      Your password is reset and other sessions were signed out. <a href="/sign-in" className="text-merlot underline underline-offset-4">Sign in</a> with the new one.
    </Notice>
  );

  const label = { "sign-up": "Open my logbook", "sign-in": "Sign in", forgot: "Email me a reset link", reset: "Set new password" }[mode];

  return (
    <form onSubmit={submit} className="space-y-5">
      {linkError && <p role="alert" className="rounded-sm border border-merlot px-4 py-3 text-[16px]">That link has expired or was already used. {mode === "reset" ? "Ask for a new reset link." : "Sign in to get a new one."}</p>}
      {mode === "sign-up" && <Field label="Full name"><input required autoComplete="name" value={f.name} onChange={e => set("name")(e.target.value)} className={input} /></Field>}
      {mode !== "reset" && <Field label="Email"><input required type="email" autoComplete="email" value={f.email} onChange={e => set("email")(e.target.value)} className={input} /></Field>}
      {mode !== "forgot" && (
        <Field label={mode === "reset" ? "New password" : "Password"} hint={mode !== "sign-in" ? "At least 8 characters." : undefined}>
          <input required type="password" minLength={8} maxLength={128} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={f.password} onChange={e => set("password")(e.target.value)} className={input} />
        </Field>
      )}
      {mode === "sign-in" && <p className="-mt-2 text-[15px]"><a href="/forgot-password" className="text-soft underline underline-offset-4">Forgot your password?</a></p>}
      {mode === "sign-up" && industries && (
        <>
          <Field label="Country">
            <select value={f.country} onChange={e => set("country")(e.target.value)} className={input}>
              {countries.map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
            </select>
          </Field>
          <Choice name="preferredIndustry" label="Industry you follow most (optional)" options={industries} value={f.preferredIndustry} onChange={set("preferredIndustry")} />
          <label className="flex items-start gap-3 text-[15px] leading-relaxed text-soft">
            <input type="checkbox" required checked={f.agree} onChange={e => setF(x => ({ ...x, agree: e.target.checked }))} className="mt-1 h-4 w-4 accent-[var(--merlot)]" />
            <span>I&apos;m 18 or older, and I agree to the <a href="/legal#terms" target="_blank" className="text-merlot underline underline-offset-4">Terms</a> and <a href="/legal#privacy" target="_blank" className="text-merlot underline underline-offset-4">Privacy Policy</a>. I understand Barometer gives no investment advice.</span>
          </label>
        </>
      )}
      {error && <p role="alert" className="rounded-sm border border-merlot px-4 py-3 text-[16px]">{error}</p>}
      <button type="submit" disabled={busy} className={primary}>{busy ? "One moment…" : label}</button>
      <p className="text-[16px] text-soft">
        {mode === "sign-up" && <>Already keep one? <a href={`/sign-in${keepNext}`} className="text-merlot underline underline-offset-4">Sign in</a></>}
        {mode === "sign-in" && <>New here? <a href={`/sign-up${keepNext}`} className="text-merlot underline underline-offset-4">Keep a logbook</a></>}
        {(mode === "forgot" || mode === "reset") && <><a href="/sign-in" className="text-merlot underline underline-offset-4">Back to sign in</a></>}
      </p>
    </form>
  );
}
