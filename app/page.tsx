import evalJson from "@/results/eval.json";
import { report, type Report } from "@/lib/station";
import { Station } from "./station";
import { Masthead } from "@/components/Masthead";
import { accountsOn, currentUser } from "@/lib/auth";
import { logbookSymbols } from "@/lib/actions";


type Sc = { qlike: number; logRmse: number };
const E = evalJson as unknown as {
  data: { stocks: number; forecasts: { train: number; tune: number; test: number } };
  tune: { chosen: string };
  test: {
    scores: Record<"hist20" | "ewma" | "har" | "chosen", Sc>;
    diff: { chosenVsEwma: { mean: number; lo: number; hi: number } };
    coverage: { within1: number; within2: number };
    byYear: { year: string; model: number; ewma: number }[];
  };
  fresh: { forecasts: number; scores: Record<"hist20" | "ewma" | "har" | "chosen", Sc>; coverage: { within1: number; within2: number } } | null;
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The accuracy results, set out as an instrument's calibration certificate. */
function Certificate() {
  const t = E.test.scores;
  const rows: [string, string, Sc, Sc | undefined][] = [
    ["Last 20 days", "the simplest guess", t.hist20, E.fresh?.scores.hist20],
    ["EWMA", "RiskMetrics, the reference standard", t.ewma, E.fresh?.scores.ewma],
    ["HAR", "day, week and month, fitted", t.har, E.fresh?.scores.har],
    [E.tune.chosen, "this instrument", t.chosen, E.fresh?.scores.chosen],
  ];
  const gain = 1 - t.chosen.qlike / t.ewma.qlike;
  const everyYear = E.test.byYear.every(y => y.model < y.ewma);
  const facts: [string, string][] = [
    ["Instrument", `${E.tune.chosen}, fitted in TypeScript on ${E.data.stocks} S&P 500 stocks, 2005–2019`],
    ["Tested on", `${E.data.forecasts.test.toLocaleString("en-US")} forecasts from 2020 to March 2024, unseen in fitting${E.fresh ? `, and ${E.fresh.forecasts.toLocaleString("en-US")} from 2025, from a second source` : ""}`],
    ["Reference", "RiskMetrics EWMA, λ = 0.94"],
    ["Result", `${pct(gain)} lower QLIKE than the reference in 2020–24 (95% interval ${Math.abs(E.test.diff.chosenVsEwma.hi).toFixed(3)} to ${Math.abs(E.test.diff.chosenVsEwma.lo).toFixed(3)})${everyYear ? ", better in every year" : ""}`],
    ["Range check", `${pct(E.test.coverage.within1)} of weeks closed inside ±1σ (68% nominal), ${pct(E.test.coverage.within2)} inside ±2σ (95% nominal)`],
    ["Not certified", "direction. Which way a stock moves next week is close to a coin flip, and the instrument doesn't try."],
  ];
  return (
    <section id="accuracy" aria-labelledby="h-cert" className="mt-20 rounded-md border-[6px] border-double border-case bg-porcelain p-6 sm:p-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink pb-4">
        <h2 id="h-cert" className="engraved text-[30px] leading-none sm:text-[38px]">Certificate of calibration</h2>
        <p className="label">Barometer No. 11</p>
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <dl className="divide-y divide-rule">
          {facts.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[minmax(0,1fr)] gap-1 py-3 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-5">
              <dt className="label pt-1">{k}</dt>
              <dd className="text-[16px] leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="min-w-0">
          <div className="overflow-x-auto">
            <table className="tabular w-full border-collapse text-[15px]">
              <caption className="label mb-2 text-left">QLIKE loss, lower is better</caption>
              <thead>
                <tr className="label text-left">
                  <th scope="col" className="border-b-2 border-ink py-2 pr-3 font-normal">Forecast</th>
                  <th scope="col" className="border-b-2 border-ink px-3 py-2 text-right font-normal">2020–24</th>
                  <th scope="col" className="border-b-2 border-ink py-2 pl-3 text-right font-normal">2025</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([name, note, a, b], i) => (
                  <tr key={name} className={i === rows.length - 1 ? "text-merlot" : ""}>
                    <td className="border-b border-rule py-3 pr-3">{name}<span className="block text-[13px] text-faint">{note}</span></td>
                    <td className="border-b border-rule px-3 py-3 text-right font-mono">{a.qlike.toFixed(3)}</td>
                    <td className="border-b border-rule py-3 pl-3 text-right font-mono">{b ? b.qlike.toFixed(3) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-faint">QLIKE is the standard score for volatility forecasts. It punishes calling a rough week calm more than the reverse. Full method and every number are in the README.</p>
        </div>
      </div>
    </section>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const symbol = (typeof s === "string" && s.trim()) || "AAPL";
  let initial: Report | null = null, initialError: string | null = null;
  try {
    initial = await report(symbol);
  } catch (e) {
    initialError = (e as Error).message;
  }
  const user = await currentUser();
  const saved = user ? (await logbookSymbols()) ?? [] : [];
  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-7">
      <Masthead />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 border-t border-rule py-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end">
        <h1 className="engraved text-[44px] leading-[1.02] text-balance sm:text-[64px]">How rough will next week be?</h1>
        <p className="text-[18px] leading-relaxed text-soft">A barometer for stocks. It forecasts how much a stock is likely to move over the next five trading days, turns that into a likely price range, and explains it in plain words. It reads the size of moves, never their direction.</p>
      </div>
      <Station key={symbol.toUpperCase()} initial={initial} initialError={initialError} accounts={accountsOn()} signedIn={Boolean(user)} saved={saved} />
      <Certificate />
      <footer className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-rule pt-6 text-[14px] text-faint sm:grid-cols-2">
        <p>Prices from Twelve Data, headlines from Finnhub, charts by TradingView. Notes written by a language model on Groq from the numbers shown, with a check that drops any advice. Nothing here is investment advice. <a href="https://github.com/evannwilsonn/barometer" className="underline underline-offset-4">Source on GitHub</a>.</p>
        <p>Barometer is project 11 of Evan Wilson&apos;s AI project run. Set in Marcellus, Newsreader and Spline Sans Mono.</p>
      </footer>
    </main>
  );
}
