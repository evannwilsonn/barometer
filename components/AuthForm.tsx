"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "./auth-client";

// ISO 3166 country codes; names come from the browser in the reader's language.
const CODES = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");

export type Options = { investmentGoals: readonly string[]; riskTolerance: readonly string[]; preferredIndustry: readonly string[] };

const input = "w-full rounded-sm border border-rule bg-porcelain px-3 py-2.5 text-[17px] focus:border-merlot";

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
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="sr-only" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function AuthForm({ mode, options }: { mode: "sign-in" | "sign-up"; options?: Options }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/logbook";
  // Country names come from the browser's own data, so the full list is built after hydration
  // (the server's names can differ, e.g. "Turkey" vs "Türkiye", which would break hydration).
  const [countries, setCountries] = useState([{ c: "US", n: "United States" }]);
  useEffect(() => {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    setCountries(CODES.map(c => ({ c, n: names.of(c) ?? c })).sort((a, b) => a.n.localeCompare(b.n)));
  }, []);
  const [f, setF] = useState({ name: "", email: "", password: "", country: "US", investmentGoals: "Growth", riskTolerance: "Medium", preferredIndustry: "Technology" });
  const set = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = mode === "sign-up"
      ? await authClient.signUp.email({ name: f.name.trim(), email: f.email.trim(), password: f.password, country: f.country, investmentGoals: f.investmentGoals, riskTolerance: f.riskTolerance, preferredIndustry: f.preferredIndustry })
      : await authClient.signIn.email({ email: f.email.trim(), password: f.password });
    setBusy(false);
    if (r.error) {
      setError(r.error.message || (mode === "sign-up" ? "Couldn't create the account" : "That email and password don't match"));
      return;
    }
    router.push(dest);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate={false}>
      {mode === "sign-up" && <Field label="Full name"><input required autoComplete="name" value={f.name} onChange={e => set("name")(e.target.value)} className={input} /></Field>}
      <Field label="Email"><input required type="email" autoComplete="email" value={f.email} onChange={e => set("email")(e.target.value)} className={input} /></Field>
      <Field label="Password" hint={mode === "sign-up" ? "At least 8 characters." : undefined}>
        <input required type="password" minLength={8} maxLength={128} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={f.password} onChange={e => set("password")(e.target.value)} className={input} />
      </Field>
      {mode === "sign-up" && options && (
        <>
          <Field label="Country">
            <select value={f.country} onChange={e => set("country")(e.target.value)} className={input}>
              {countries.map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
            </select>
          </Field>
          <Choice name="investmentGoals" label="Investment goal" options={options.investmentGoals} value={f.investmentGoals} onChange={set("investmentGoals")} />
          <Choice name="riskTolerance" label="Risk tolerance" options={options.riskTolerance} value={f.riskTolerance} onChange={set("riskTolerance")} />
          <Choice name="preferredIndustry" label="Industry you follow most" options={options.preferredIndustry} value={f.preferredIndustry} onChange={set("preferredIndustry")} />
        </>
      )}
      {error && <p role="alert" className="rounded-sm border border-merlot px-4 py-3 text-[16px]">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-sm bg-case px-5 py-3 font-mono text-[14px] tracking-wider text-case-ink uppercase disabled:opacity-60">
        {busy ? "One moment…" : mode === "sign-up" ? "Open my logbook" : "Sign in"}
      </button>
      <p className="text-[16px] text-soft">
        {mode === "sign-up"
          ? <>Already keep one? <a href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-merlot underline underline-offset-4">Sign in</a></>
          : <>New here? <a href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-merlot underline underline-offset-4">Keep a logbook</a></>}
      </p>
    </form>
  );
}
