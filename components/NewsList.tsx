"use client";

import { useEffect, useState } from "react";
import { stockNews } from "@/lib/actions";
import type { Article } from "@/lib/finnhub";

const when = (t: number) => new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** The latest headlines for one stock, from Finnhub. Hidden when the deployment has no Finnhub key. */
export function NewsList({ symbol }: { symbol: string }) {
  const [items, setItems] = useState<Article[] | null>(null);
  useEffect(() => {
    let live = true;
    setItems(null);
    stockNews(symbol).then(a => live && setItems(a)).catch(() => live && setItems([]));
    return () => { live = false; };
  }, [symbol]);
  if (items && !items.length) return null;
  return (
    <section aria-labelledby="h-news" className="mt-12">
      <h2 id="h-news" className="engraved mb-4 text-[26px]">Dispatches · {symbol}</h2>
      {!items ? <p className="label">Fetching the wires…</p> : (
        <ol className="divide-y divide-rule border-y border-rule">
          {items.map(a => (
            <li key={a.id || a.url} className="grid grid-cols-[minmax(0,1fr)] gap-1 py-4 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-6">
              <p className="label pt-1">{when(a.datetime)} · {a.source}</p>
              <div className="min-w-0">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[18px] leading-snug underline-offset-4 hover:underline">{a.headline}</a>
                {a.summary && <p className="mt-1 line-clamp-2 text-[15px] leading-relaxed text-soft">{a.summary}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-[13px] text-faint">Headlines from <a href="https://finnhub.io" className="underline underline-offset-2">Finnhub</a>, as published by their sources. Barometer doesn&apos;t use news in its forecast.</p>
    </section>
  );
}
