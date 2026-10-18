"use client";

import { useState, useTransition } from "react";
import { setInLogbook } from "@/lib/actions";

/** Adds the stock on the dial to the reader's logbook, or takes it out. */
export function LogbookButton({ symbol, signedIn, saved }: { symbol: string; signedIn: boolean; saved: boolean }) {
  const [inLog, setInLog] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!signedIn) {
    return <a href={`/sign-in?next=${encodeURIComponent(`/?s=${symbol}`)}`} className="inline-block rounded-sm border border-case px-4 py-2 font-mono text-[13px] tracking-wider text-merlot uppercase">Sign in to log {symbol}</a>;
  }
  return (
    <div>
      <button type="button" disabled={pending} aria-pressed={inLog}
        onClick={() => start(async () => {
          setError(null);
          const r = await setInLogbook(symbol, !inLog);
          if (r.ok) setInLog(r.inLogbook); else setError(r.error);
        })}
        className={`rounded-sm px-4 py-2 font-mono text-[13px] tracking-wider uppercase disabled:opacity-60 ${inLog ? "border border-case text-merlot" : "bg-case text-case-ink"}`}>
        {pending ? "Writing…" : inLog ? `In your logbook · remove` : `Add ${symbol} to your logbook`}
      </button>
      {error && <p role="alert" className="mt-2 text-[14px] text-merlot">{error}</p>}
    </div>
  );
}
