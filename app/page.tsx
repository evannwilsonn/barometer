import evalJson from "@/results/eval.json";
import { report, type Report } from "@/lib/station";
import { Station } from "./station";

export const revalidate = 900;

type Sc = { qlike: number; logRmse: number };
const E = evalJson as unknown as {
  data: { stocks: number; forecasts: { train: number; tune: number; test: number } };
  tune: { chosen: string };
  test: { scores: Record<"hist20" | "ewma" | "har" | "chosen", Sc>; diff: { chosenVsEwma: { mean: number; lo: number; hi: number } }; coverage: { within1: number; within2: number } };
  fresh: { scores: Record<"hist20" | "ewma" | "har" | "chosen", Sc>; coverage: { within1: number } } | null;
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Accuracy() {
  const t = E.test.scores;
  const rows: [string, string, Sc, Sc | undefined][] = [
    ["Last 20 days", "the simplest guess", t.hist20, E.fresh?.scores.hist20],
    ["EWMA", "RiskMetrics, the industry default", t.ewma, E.fresh?.scores.ewma],
    ["HAR", "day, week and month, fitted", t.har, E.fresh?.scores.har],
    [E.tune.chosen, "what this page uses", t.chosen, E.fresh?.scores.chosen],
  ];
  const gain = 1 - t.chosen.qlike / t.ewma.qlike;
  return (
    <section id="accuracy" className="mt-16 grid gap-10 border-t-2 border-ink pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div>
        <h2 className="font-display text-[40px] leading-none font-extrabold uppercase">How accurate is it?</h2>
        <p className="mt-4 text-[17px] leading-relaxed text-soft">
          Fitted on {E.data.stocks} S&amp;P 500 stocks from 2005 to 2019, then tested once on {E.data.forecasts.test.toLocaleString("en-US")} forecasts from 2020 to March 2024, which it had never seen, and again on 2025 prices from a different source.
          On the test years its forecasts beat the industry-standard EWMA by {pct(gain)} on QLIKE, the usual score for volatility forecasts, and the gap held in every year.
        </p>
        <p className="mt-4 text-[17px] leading-relaxed text-soft">
          The dark band caught {pct(E.test.coverage.within1)} of weeks where a perfect forecast would catch 68%, so it runs slightly wide. It forecasts the size of moves only: which way a stock goes next week is close to a coin flip, and nothing here claims otherwise.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="tabular w-full border-collapse text-[15px]">
          <thead>
            <tr className="label text-left">
              <th className="border-b-2 border-ink py-2 pr-3 font-normal">Forecast</th>
              <th className="border-b-2 border-ink px-3 py-2 text-right font-normal">2020–24</th>
              <th className="border-b-2 border-ink py-2 pl-3 text-right font-normal">2025</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, note, a, b], i) => (
              <tr key={name} className={i === rows.length - 1 ? "font-semibold" : ""}>
                <td className="border-b border-line py-3 pr-3">{name}<span className="block text-[13px] font-normal text-faint">{note}</span></td>
                <td className="border-b border-line px-3 py-3 text-right font-mono">{a.qlike.toFixed(3)}</td>
                <td className="border-b border-line py-3 pl-3 text-right font-mono">{b ? b.qlike.toFixed(3) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[14px] text-faint">QLIKE loss, lower is better. 95% interval for the gain over EWMA in 2020–24: {Math.abs(E.test.diff.chosenVsEwma.hi).toFixed(3)} to {Math.abs(E.test.diff.chosenVsEwma.lo).toFixed(3)}.</p>
      </div>
    </section>
  );
}

export default async function Page() {
  let initial: Report | null = null, initialError: string | null = null;
  try {
    initial = await report("AAPL");
  } catch (e) {
    initialError = (e as Error).message;
  }
  return (
    <main className="mx-auto max-w-[1160px] px-4 pb-16 sm:px-7">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-5">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[30px] leading-none font-extrabold uppercase">Barometer</span>
          <span className="label hidden sm:inline">Weather for the stock market</span>
        </div>
        <nav className="flex gap-5 text-[15px]">
          <a href="#accuracy" className="underline underline-offset-4">Accuracy</a>
          <a href="https://github.com/evannwilsonn/barometer" className="underline underline-offset-4">Source</a>
        </nav>
      </header>
      <div className="grid gap-6 py-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
        <h1 className="font-display text-[48px] leading-[.92] font-extrabold text-balance uppercase sm:text-[68px]">How rough will next week be?</h1>
        <p className="text-[17px] leading-relaxed text-soft">Barometer forecasts how much a stock is likely to move over the next five trading days, turns that into a price range, and explains it in plain words. It forecasts the size of moves, not their direction.</p>
      </div>
      <Station initial={initial} initialError={initialError} />
      <Accuracy />
      <footer className="mt-16 grid gap-4 border-t border-line pt-6 text-[14px] text-faint sm:grid-cols-2">
        <p>Prices from Twelve Data. Notes written by a language model on Groq from the numbers shown, with a check that drops any advice. Nothing here is investment advice.</p>
        <p>Barometer is project 11 of Evan Wilson&apos;s AI project run. Model: {E.tune.chosen}, fitted in TypeScript from scratch.</p>
      </footer>
    </main>
  );
}
