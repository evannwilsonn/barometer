import type { Forecast } from "@/lib/forecast";
import { LEVELS } from "@/lib/forecast";

/**
 * What an account adds, shown with the reading on the page: a logbook row and the morning
 * dispatch, filled with the real numbers for the stock above rather than made-up ones.
 */
export function LogbookShowcase({ f, accounts, signedIn }: { f: Forecast | null; accounts: boolean; signedIn: boolean }) {
  const range = f ? `${f.range68[0].toFixed(2)}–${f.range68[1].toFixed(2)}` : "";
  return (
    <section className="mt-20 overflow-hidden rounded-md bg-case text-case-ink" aria-labelledby="h-logbook">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
        <div>
          <p className="font-mono text-[13px] tracking-[0.2em] text-bezel uppercase">With an account</p>
          <h2 id="h-logbook" className="display mt-2 text-[34px] leading-none sm:text-[44px]">Keep a logbook</h2>
          <p className="mt-4 text-[17px] leading-relaxed opacity-90">Save the stocks you follow. Your logbook shows every one with this week&apos;s reading, and each weekday before the open a dispatch arrives by email: your readings, any stock whose weather has changed since the last one, and a short summary of its news.</p>
          <ul className="mt-6 space-y-2 text-[16px]">
            {["Search any US stock with ⌘K", "Add it from its reading", "Switch emails off or delete your account any time", "The morning dispatch, or one on request"].map(t => (
              <li key={t} className="flex gap-3"><span className="text-bezel" aria-hidden>—</span>{t}</li>
            ))}
          </ul>
          <div className="mt-8">
            {!accounts ? <p className="text-[15px] opacity-80">Accounts need the live app with a database; the README shows how to run it.</p>
              : signedIn ? <a href="/logbook" className="inline-block rounded-sm bg-bezel px-5 py-2.5 font-mono text-[13px] tracking-wider text-dial-ink uppercase">Open your logbook</a>
              : <a href="/sign-up" className="inline-block rounded-sm bg-bezel px-5 py-2.5 font-mono text-[13px] tracking-wider text-dial-ink uppercase">Start a logbook</a>}
          </div>
        </div>
        {f && (
          <figure className="min-w-0 self-center rounded-sm bg-panel p-5 text-ink shadow-[0_24px_48px_-30px_rgb(0_0_0/0.6)] sm:p-7">
            <figcaption className="flex items-baseline justify-between gap-3 border-b border-rule pb-3">
              <span className="font-mono text-[12px] tracking-[0.08em] text-faint uppercase">Morning dispatch</span>
              <span className="font-mono text-[12px] text-faint">readings as of {f.asOf}</span>
            </figcaption>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-rule py-4">
              <div>
                <p className="engraved text-[20px]">{f.symbol}</p>
                <p className="engraved mt-1 text-[26px] leading-none text-storm">{f.level.name}</p>
                <span className="mt-2 inline-flex gap-[3px]" aria-hidden>
                  {LEVELS.map(l => <span key={l.name} className={`h-[6px] w-4 rounded-[1px] ${l.name === f.level.name ? "bg-storm" : "bg-rule"}`} />)}
                </span>
              </div>
              <div className="tabular text-right font-mono text-[14px]">
                <p>{f.vol}% next week</p>
                <p className="text-faint">was {f.lastMonth}%</p>
                <p className="mt-1">close {range}</p>
              </div>
            </div>
            <p className="pt-4 text-[15px] leading-relaxed text-soft">If {f.symbol}&apos;s dial word changes before tomorrow&apos;s dispatch, it&apos;s called out at the top, followed by the news on every stock in the logbook, summarised from the headlines with links to each.</p>
          </figure>
        )}
      </div>
    </section>
  );
}
