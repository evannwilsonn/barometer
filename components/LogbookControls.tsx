"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestDispatch, setDispatch, setInLogbook } from "@/lib/actions";
import { authClient } from "./auth-client";

export function RemoveButton({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label={`Remove ${symbol} from your logbook`}
      onClick={() => start(async () => { await setInLogbook(symbol, false); router.refresh(); })}
      className="font-mono text-[12.5px] tracking-wider text-faint uppercase hover:text-storm disabled:opacity-50">
      {pending ? "…" : "Remove"}
    </button>
  );
}

/** Account settings at the foot of the logbook: the morning dispatch switch, and deleting the account. */
export function AccountControls({ dispatchOn, email }: { dispatchOn: boolean; email: string }) {
  const router = useRouter();
  const [on, setOn] = useState(dispatchOn);
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <section aria-labelledby="h-account" className="mt-14 rounded-md border border-rule p-6 sm:p-8">
      <h2 id="h-account" className="display text-[22px]">Account</h2>
      <p className="mt-1 text-[15px] text-faint">Signed in as {email}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
        <div>
          <p className="text-[17px]">Morning dispatch</p>
          <p className="text-[15px] text-soft">{on ? "On: an email each weekday at 8:30 New York time." : "Off: no morning emails."}</p>
        </div>
        <button type="button" role="switch" aria-checked={on} disabled={pending}
          onClick={() => start(async () => { const r = await setDispatch(!on); if (r.ok) setOn(!on); })}
          className={`rounded-sm px-4 py-2 font-mono text-[13px] tracking-wider uppercase disabled:opacity-60 ${on ? "border border-btn text-storm" : "bg-btn text-btn-ink"}`}>
          {on ? "Turn off" : "Turn on"}
        </button>
      </div>
      <div className="mt-5 border-t border-rule pt-5">
        <p className="text-[17px]">Delete account</p>
        <p className="text-[15px] text-soft">Removes your account, your logbook and your sessions for good. Emails already sent can&apos;t be recalled.</p>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="mt-3 font-mono text-[13px] tracking-wider text-storm uppercase underline underline-offset-4">Delete my account</button>
        ) : (
          <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={e => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const r = await authClient.deleteUser({ password });
              if (r.error) { setError("That password isn't right"); return; }
              router.push("/");
              router.refresh();
            });
          }}>
            <label className="grow sm:grow-0">
              <span className="label mb-1 block">Your password, to confirm</span>
              <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-sm border border-rule bg-panel px-3 py-2 text-[16px] sm:w-64" />
            </label>
            <button type="submit" disabled={pending} className="rounded-sm bg-btn px-4 py-2.5 font-mono text-[13px] tracking-wider text-btn-ink uppercase disabled:opacity-60">{pending ? "Deleting…" : "Delete for good"}</button>
            <button type="button" onClick={() => { setConfirming(false); setPassword(""); }} className="py-2.5 text-[15px] text-soft underline underline-offset-4">Cancel</button>
            {error && <p role="alert" className="w-full text-[14px] text-storm">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}

/** Sends this reader today's dispatch now, rather than waiting for the morning run. */
export function DispatchButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="text-right">
      <button type="button" disabled={pending}
        onClick={() => start(async () => setMsg((await requestDispatch()).message))}
        className="rounded-sm border border-btn px-4 py-2 font-mono text-[13px] tracking-wider text-storm uppercase disabled:opacity-60">
        {pending ? "Sending…" : "Email me today's dispatch"}
      </button>
      {msg && <p role="status" className="mt-2 text-[14px] text-soft">{msg}</p>}
    </div>
  );
}
