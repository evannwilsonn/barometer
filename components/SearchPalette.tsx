"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchStocks } from "@/lib/actions";
import type { Hit } from "@/lib/finnhub";

/** "Find a stock": a ⌘K / Ctrl-K search over Finnhub's US listings, opening the reading for the pick. */
export function SearchPalette({ inLogbook = [] }: { inLogbook?: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(true);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(o => !o); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // Debounced: wait 250 ms after typing stops, and drop answers to older queries.
  useEffect(() => {
    if (!open) return;
    const id = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      const r = await searchStocks(q);
      if (id !== seq.current) return;
      setHits(r.hits);
      setLive(r.live);
      setBusy(false);
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, open]);

  const pick = (symbol: string) => {
    setOpen(false);
    setQ("");
    router.push(`/?s=${encodeURIComponent(symbol)}`);
  };

  return (
    <>
      <button type="button" data-live-only onClick={() => setOpen(true)}
        className="inline-flex items-center gap-3 rounded-sm border border-rule bg-panel px-3 py-1.5 text-[16px] text-soft hover:text-ink">
        Find a stock <kbd className="font-mono text-[12px] text-faint">⌘K</kbd>
      </button>
      <Command.Dialog open={open} onOpenChange={setOpen} label="Find a stock" shouldFilter={false}
        overlayClassName="fixed inset-0 z-40 bg-ink/40" contentClassName="fixed inset-x-4 top-[12vh] z-50 mx-auto max-w-[560px] rounded-md bg-panel shadow-[0_24px_60px_-28px_rgb(29_21_19/0.55)]">
        <div className="flex items-center gap-3 border-b-2 border-rule px-4 focus-within:border-brass">
          <span className="label">Find</span>
          <Command.Input value={q} onValueChange={setQ} placeholder="Ticker or company, e.g. NVDA or Costco"
            className="engraved w-full bg-transparent py-4 text-[19px] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-faint" />
        </div>
        <Command.List className="max-h-[52vh] overflow-y-auto p-2">
          {busy && <Command.Loading><p className="label px-3 py-2">Searching…</p></Command.Loading>}
          {!busy && <Command.Empty><p className="px-3 py-4 text-[16px] text-soft">No US stock matches that.</p></Command.Empty>}
          <Command.Group heading={q ? "Matches" : "Popular"} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-faint [&_[cmdk-group-heading]]:uppercase">
            {hits.map(h => (
              <Command.Item key={h.symbol} value={h.symbol} onSelect={pick}
                className="flex cursor-pointer items-baseline gap-4 rounded-sm px-3 py-2.5 data-[selected=true]:bg-band-2">
                <span className="engraved w-16 shrink-0 text-[17px]">{h.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-[16px] text-soft">{h.name}</span>
                {inLogbook.includes(h.symbol) && <span className="label text-storm">In logbook</span>}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
        {!live && <p className="border-t border-rule px-4 py-2 text-[13px] text-faint">Search covers popular stocks only until a Finnhub key is set; any ticker still works in the box on the page.</p>}
      </Command.Dialog>
    </>
  );
}
