import { redirect } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { DispatchButton, RemoveButton } from "@/components/LogbookControls";
import { currentUser } from "@/lib/auth";
import { logbook } from "@/lib/db";
import { finnhubOn, news } from "@/lib/finnhub";
import { LEVELS } from "@/lib/forecast";
import { reading, type Reading } from "@/lib/station";

export const metadata = { title: "Logbook · Barometer" };

const when = (t: number) => new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A short bar showing where a reading sits among the five words on the dial. */
function Scale({ level }: { level: string }) {
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {LEVELS.map(l => <span key={l.name} className={`h-[6px] w-4 rounded-[1px] ${l.name === level ? "bg-merlot" : "bg-rule"}`} />)}
    </span>
  );
}

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=/logbook");
  const entries = await (await logbook()).find({ userId: user.id }).sort({ addedAt: 1 }).toArray();

  // One reading at a time: the free price plan allows 8 requests a minute, and readings are cached for 15.
  const readings: (Reading | { error: string })[] = [];
  for (const e of entries) {
    try { readings.push(await reading(e.symbol)); } catch (err) { readings.push({ error: (err as Error).message }); }
  }
  const articles = entries.length && finnhubOn() ? await news(entries.map(e => e.symbol), 8) : [];
  const first = user.name.split(/\s+/)[0];

  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-7">
      <Masthead />
      <div className="flex flex-wrap items-end justify-between gap-6 border-t border-rule pt-12">
        <div>
          <p className="label">{first}&apos;s logbook</p>
          <h1 className="engraved mt-2 text-[44px] leading-none sm:text-[56px]">The week ahead</h1>
        </div>
        {entries.length > 0 && <DispatchButton />}
      </div>

      {entries.length === 0 ? (
        <section className="mt-10 rounded-md bg-porcelain p-8 sm:p-12">
          <p className="engraved text-[26px]">Nothing logged yet</p>
          <p className="mt-3 max-w-[60ch] text-[18px] text-soft">Find a stock with the search above (or press ⌘K), take a reading, and add it to your logbook. Each weekday morning you&apos;ll get a dispatch with every stock here.</p>
        </section>
      ) : (
        <section className="mt-10 rounded-md bg-porcelain p-4 sm:p-8" aria-label="Your stocks">
          <div className="relative overflow-x-auto">
            <table className="tabular w-full min-w-[640px] border-collapse text-[16px]">
              <thead>
                <tr className="label text-left">
                  <th scope="col" className="border-b-2 border-ink py-2 pr-3 font-normal">Stock</th>
                  <th scope="col" className="border-b-2 border-ink px-3 py-2 font-normal">Reading</th>
                  <th scope="col" className="border-b-2 border-ink px-3 py-2 text-right font-normal">Next week</th>
                  <th scope="col" className="border-b-2 border-ink px-3 py-2 text-right font-normal">Last month</th>
                  <th scope="col" className="border-b-2 border-ink px-3 py-2 text-right font-normal">Likely close</th>
                  <th scope="col" className="border-b-2 border-ink py-2 pl-3 font-normal"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const r = readings[i];
                  return (
                    <tr key={e.symbol}>
                      <td className="border-b border-rule py-3 pr-3">
                        <a href={`/?s=${e.symbol}`} className="engraved text-[19px] underline-offset-4 hover:underline">{e.symbol}</a>
                        <span className="block text-[14px] text-faint">{e.company}</span>
                      </td>
                      {"error" in r ? (
                        <td colSpan={4} className="border-b border-rule px-3 py-3 text-[15px] text-faint">No reading right now: {r.error}.</td>
                      ) : (
                        <>
                          <td className="border-b border-rule px-3 py-3"><span className="engraved block text-[19px] text-merlot">{r.level}</span><Scale level={r.level} /></td>
                          <td className="border-b border-rule px-3 py-3 text-right font-mono">{r.vol}%</td>
                          <td className="border-b border-rule px-3 py-3 text-right font-mono text-soft">{r.lastMonth}%</td>
                          <td className="border-b border-rule px-3 py-3 text-right font-mono">{r.range68[0].toFixed(2)}–{r.range68[1].toFixed(2)}</td>
                        </>
                      )}
                      <td className="border-b border-rule py-3 pl-3 text-right"><RemoveButton symbol={e.symbol} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[14px] text-faint">Next week is forecast volatility, annualised, against what last month turned out to be. The likely close is where the price should end a week from now in about two weeks out of three. Readings, not advice.</p>
        </section>
      )}

      {articles.length > 0 && (
        <section aria-labelledby="h-news" className="mt-14">
          <h2 id="h-news" className="engraved mb-4 text-[26px]">Dispatches for your stocks</h2>
          <ol className="divide-y divide-rule border-y border-rule">
            {articles.map(a => (
              <li key={a.id || a.url} className="grid grid-cols-[minmax(0,1fr)] gap-1 py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
                <p className="label pt-1">{a.symbol ? `${a.symbol} · ` : ""}{when(a.datetime)}</p>
                <div className="min-w-0">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[18px] leading-snug underline-offset-4 hover:underline">{a.headline}</a>
                  <p className="mt-1 text-[14px] text-faint">{a.source}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
