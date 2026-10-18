"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { requestDispatch, setInLogbook } from "@/lib/actions";

export function RemoveButton({ symbol }: { symbol: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label={`Remove ${symbol} from your logbook`}
      onClick={() => start(async () => { await setInLogbook(symbol, false); router.refresh(); })}
      className="font-mono text-[12.5px] tracking-wider text-faint uppercase hover:text-merlot disabled:opacity-50">
      {pending ? "…" : "Remove"}
    </button>
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
        className="rounded-sm border border-case px-4 py-2 font-mono text-[13px] tracking-wider text-merlot uppercase disabled:opacity-60">
        {pending ? "Sending…" : "Email me today's dispatch"}
      </button>
      {msg && <p role="status" className="mt-2 text-[14px] text-soft">{msg}</p>}
    </div>
  );
}
