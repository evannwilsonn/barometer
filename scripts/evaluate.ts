// Fits and scores next-week volatility forecasts on S&P 500 stocks.
//
//   npm run evaluate
//
// Reads data/raw/sp500.parquet (daily candles to March 2024) and data/raw/sp500-2025.csv
// (January to early October 2025, a separate source used once at the end). Writes
// results/eval.json for the README and the page, and model/model.json for the app.
//
// Splits are by time, never by stock: train 2005–2016, tune 2017–2019, test 2020 to March 2024.
// A forecast made on day t is scored against the realised volatility of days t+1..t+5, and a
// forecast whose target week crosses a split boundary is dropped.

import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { LeastSquares } from "../lib/ols";
import {
  ANN, HORIZON, Candle, Features, Model, Spec, annVol, design, ewmaVar, features, futureVol,
  logReturns, losses, mean, parkinson, predict, specName, target,
} from "../lib/vol";

const START = "2004-09-01"; // warm-up before the first forecast
const FIRST = "2005-01-03"; // stocks must trade from here on
const splitOf = (d: string) => (d < "2017-01-01" ? "train" : d < "2020-01-01" ? "tune" : "test");
type Split = "train" | "tune" | "test";

type Series = { symbol: string; dates: string[]; candles: Candle[]; r: number[]; r2: number[]; park: number[]; mkt: number[] };

// ---------- load ----------

async function loadParquet(): Promise<Map<string, Candle[]>> {
  const file = await asyncBufferFromFile("data/raw/sp500.parquet");
  const rows = (await parquetReadObjects({ file, columns: ["symbol", "date", "open", "high", "low", "close", "adj_close"] })) as any[];
  const by = new Map<string, Candle[]>();
  for (const r of rows) {
    if (r.date < START) continue;
    // Returns come from adjusted closes, so splits and dividends don't show up as crashes. The
    // range estimator uses the ratio of the day's own high and low, which scaling doesn't change.
    const k = r.close > 0 ? r.adj_close / r.close : NaN;
    const c: Candle = { date: r.date, open: r.open * k, high: r.high * k, low: r.low * k, close: r.adj_close };
    let list = by.get(r.symbol);
    if (!list) by.set(r.symbol, (list = []));
    list.push(c);
  }
  for (const list of by.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return by;
}

function loadCsv2025(): Map<string, Candle[]> {
  const text = readFileSync("data/raw/sp500-2025.csv", "utf8").trim().split("\n");
  const head = text[0].split(",");
  const [ti, di, oi, hi, li, ci] = ["ticker", "date", "open", "high", "low", "close"].map(n => head.indexOf(n));
  const by = new Map<string, Candle[]>();
  for (const line of text.slice(1)) {
    const f = line.split(",");
    const c: Candle = { date: f[di].slice(0, 10), open: +f[oi], high: +f[hi], low: +f[li], close: +f[ci] };
    let list = by.get(f[ti]);
    if (!list) by.set(f[ti], (list = []));
    list.push(c);
  }
  for (const list of by.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return by;
}

/**
 * Builds the per-stock series, plus a market series: the squared return of an equal-weighted
 * portfolio of every stock that traded that day. (The app uses SPY for the same role.)
 * `dropJumps` blanks one-day moves over 40%, used only for the 2025 file, whose closes aren't
 * adjusted for splits.
 */
function build(by: Map<string, Candle[]>, dropJumps: boolean): Series[] {
  const series: Series[] = [];
  for (const [symbol, candles] of by) {
    const r = logReturns(candles.map(c => c.close));
    if (dropJumps) for (let i = 0; i < r.length; i++) if (Math.abs(r[i]) > Math.log(1.4)) r[i] = NaN;
    series.push({ symbol, dates: candles.map(c => c.date), candles, r, r2: r.map(x => x * x), park: candles.map(parkinson), mkt: [] });
  }
  const sum = new Map<string, [number, number]>();
  for (const s of series) s.dates.forEach((d, i) => {
    if (!Number.isFinite(s.r[i])) return;
    const a = sum.get(d) ?? [0, 0];
    a[0] += s.r[i]; a[1]++;
    sum.set(d, a);
  });
  const mktR2 = new Map<string, number>();
  for (const [d, [t, n]] of sum) if (n >= 20) mktR2.set(d, (t / n) ** 2);
  for (const s of series) s.mkt = s.dates.map(d => mktR2.get(d) ?? NaN);
  return series;
}

// ---------- observations ----------

type Obs = {
  date: string; symbol: string; split: Split; y: number;
  fRet: Features; fRange: Features; hist20: number; ewma: number; ret5: number;
};

function observations(series: Series[], splitFn: (d: string) => string): Obs[] {
  const out: Obs[] = [];
  for (const s of series) {
    const ew = ewmaVar(s.r2);
    for (let t = 22; t + HORIZON < s.dates.length; t++) {
      const split = splitFn(s.dates[t]);
      if (split !== splitFn(s.dates[t + HORIZON])) continue; // target week must stay in the split
      const y = futureVol(s.r2, t);
      if (!(y > 0)) continue;
      const fRet = features(s.r2, s.r, t, s.mkt);
      const fRange = features(s.park, s.r, t, s.mkt);
      const hist20 = annVol(mean(s.r2, t - 19, t + 1));
      const ewma = annVol(ew[t]);
      const vals = [fRet.rvD, fRet.rvW, fRet.rvM, fRange.rvD, fRange.rvW, fRange.rvM, fRet.mkt, hist20, ewma, s.r[t]];
      if (!vals.every(Number.isFinite) || !(hist20 > 0)) continue;
      const ret5 = Math.log(s.candles[t + HORIZON].close / s.candles[t].close);
      out.push({ date: s.dates[t], symbol: s.symbol, split: split as Split, y, fRet, fRange, hist20, ewma, ret5 });
    }
  }
  return out;
}

// ---------- fitting and scoring ----------

const SPECS: Spec[] = [];
for (const range of [false, true]) for (const down of [false, true]) for (const mkt of [false, true]) SPECS.push({ range, down, mkt });
const feat = (o: Obs, s: Spec) => (s.range ? o.fRange : o.fRet);

function fit(obs: Obs[], spec: Spec): Model {
  const ls = new LeastSquares(design(obs[0].fRet, spec).length);
  for (const o of obs) ls.add(design(feat(o, spec), spec), target(o.y));
  const { beta, residVar } = ls.solve();
  return { spec, beta, residVar };
}

type Scores = { n: number; qlike: number; logRmse: number; mape: number };
function score(forecasts: number[], obs: Obs[]): Scores {
  let q = 0, l = 0, a = 0, n = 0;
  obs.forEach((o, i) => {
    const f = forecasts[i];
    if (!(f > 0)) return;
    const e = losses(f, o.y);
    q += e.qlike; l += e.logErr2; a += Math.abs(f - o.y) / o.y; n++;
  });
  return { n, qlike: q / n, logRmse: Math.sqrt(l / n), mape: a / n };
}

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const roundScores = (s: Scores) => ({ n: s.n, qlike: r4(s.qlike), logRmse: r4(s.logRmse), mape: r4(s.mape) });

/**
 * 95% interval for the mean QLIKE difference (a − b), from a moving-block bootstrap over trading
 * days: losses on the same day are correlated across stocks and neighbouring days overlap, so
 * days are resampled in blocks of a month rather than forecasts one at a time.
 */
function bootstrapDiff(obs: Obs[], a: number[], b: number[], reps = 2000, block = 21) {
  const byDate = new Map<string, [number, number]>();
  obs.forEach((o, i) => {
    if (!(a[i] > 0 && b[i] > 0)) return;
    const d = losses(a[i], o.y).qlike - losses(b[i], o.y).qlike;
    const v = byDate.get(o.date) ?? [0, 0];
    v[0] += d; v[1]++;
    byDate.set(o.date, v);
  });
  const days = [...byDate.keys()].sort().map(d => byDate.get(d)!);
  let seed = 2026;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const stats: number[] = [];
  for (let r = 0; r < reps; r++) {
    let s = 0, n = 0;
    while (n < days.length) {
      const start = Math.floor(rand() * (days.length - block));
      for (let j = 0; j < block && n < days.length; j++, n++) s += days[start + j][0] / days[start + j][1];
    }
    stats.push(s / n);
  }
  stats.sort((x, y) => x - y);
  const point = days.reduce((s, d) => s + d[0] / d[1], 0) / days.length;
  return { mean: r4(point), lo: r4(stats[Math.floor(reps * 0.025)]), hi: r4(stats[Math.floor(reps * 0.975)]) };
}

/** Calibration by forecast decile: mean forecast against mean realised volatility. */
function calibration(forecasts: number[], obs: Obs[], bins = 10) {
  const idx = forecasts.map((_, i) => i).filter(i => forecasts[i] > 0).sort((a, b) => forecasts[a] - forecasts[b]);
  const out = [];
  for (let b = 0; b < bins; b++) {
    const part = idx.slice(Math.floor((b * idx.length) / bins), Math.floor(((b + 1) * idx.length) / bins));
    const f = part.reduce((s, i) => s + forecasts[i], 0) / part.length;
    const y = part.reduce((s, i) => s + obs[i].y, 0) / part.length;
    out.push({ forecast: r4(f), realised: r4(y), n: part.length });
  }
  return out;
}

/**
 * How often the week's price move stayed inside the ±1σ range the app shows
 * (σ = forecast × √(5/252)). A normal distribution would put 68.3% inside and 95.4% within ±2σ.
 */
function coverage(forecasts: number[], obs: Obs[]) {
  let in1 = 0, in2 = 0, n = 0;
  obs.forEach((o, i) => {
    if (!(forecasts[i] > 0) || !Number.isFinite(o.ret5)) return;
    const sd = (forecasts[i] / 100) * Math.sqrt(HORIZON / 252);
    if (Math.abs(o.ret5) <= sd) in1++;
    if (Math.abs(o.ret5) <= 2 * sd) in2++;
    n++;
  });
  return { n, within1: r4(in1 / n), within2: r4(in2 / n) };
}

/** Percentiles of the forecasts themselves; the app's warning levels are set from these. */
function percentiles(xs: number[], ps: number[]) {
  const v = xs.filter(x => x > 0).sort((a, b) => a - b);
  return Object.fromEntries(ps.map(p => [`p${Math.round(p * 100)}`, Math.round(v[Math.floor(p * (v.length - 1))] * 10) / 10]));
}

function byYear(a: number[], b: number[], obs: Obs[]) {
  const years = [...new Set(obs.map(o => o.date.slice(0, 4)))].sort();
  return years.map(y => {
    const idx = obs.map((o, i) => (o.date.startsWith(y) ? i : -1)).filter(i => i >= 0);
    const sub = idx.map(i => obs[i]);
    return { year: y, model: r4(score(idx.map(i => a[i]), sub).qlike), ewma: r4(score(idx.map(i => b[i]), sub).qlike), n: sub.length };
  });
}

// ---------- run ----------

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const raw = await loadParquet();
const keep = new Map([...raw].filter(([, c]) => c[0].date <= FIRST && c.length > 4000));
log(`stocks trading since ${FIRST}: ${keep.size} of ${raw.size}`);
const series = build(keep, false);
const obs = observations(series, splitOf);
const part = { train: obs.filter(o => o.split === "train"), tune: obs.filter(o => o.split === "tune"), test: obs.filter(o => o.split === "test") };
log(`forecasts: train ${part.train.length}, tune ${part.tune.length}, test ${part.test.length}`);

// 1. Every spec fitted on train, scored on tune. The plain HAR is the "model" step; the best
//    spec on tune is the "improvement" step.
const tuneRows = SPECS.map(spec => {
  const m = fit(part.train, spec);
  const s = score(part.tune.map(o => predict(m, feat(o, spec))), part.tune);
  log(`tune  ${specName(spec).padEnd(36)} QLIKE ${s.qlike.toFixed(4)}  log RMSE ${s.logRmse.toFixed(4)}`);
  return { spec, name: specName(spec), ...roundScores(s) };
});
const tuneBase = {
  hist20: roundScores(score(part.tune.map(o => o.hist20), part.tune)),
  ewma: roundScores(score(part.tune.map(o => o.ewma), part.tune)),
};
log(`tune  last 20 days QLIKE ${tuneBase.hist20.qlike}  EWMA ${tuneBase.ewma.qlike}`);
const plainSpec: Spec = { range: false, down: false, mkt: false };
const best = tuneRows.reduce((a, b) => (b.qlike < a.qlike ? b : a));
log(`chosen on tune: ${best.name}`);

// 2. Refit on train + tune, then score once on test.
const trainTune = [...part.train, ...part.tune];
const plain = fit(trainTune, plainSpec);
const chosen = fit(trainTune, best.spec);
const T = part.test;
const fc = {
  hist20: T.map(o => o.hist20),
  ewma: T.map(o => o.ewma),
  har: T.map(o => predict(plain, feat(o, plainSpec))),
  chosen: T.map(o => predict(chosen, feat(o, best.spec))),
};
const testScores = Object.fromEntries(Object.entries(fc).map(([k, v]) => [k, roundScores(score(v, T))]));
for (const [k, v] of Object.entries(testScores)) log(`test  ${k.padEnd(8)} QLIKE ${v.qlike}  log RMSE ${v.logRmse}  MAPE ${v.mape}`);
const diff = {
  chosenVsEwma: bootstrapDiff(T, fc.chosen, fc.ewma),
  chosenVsHist20: bootstrapDiff(T, fc.chosen, fc.hist20),
  chosenVsHar: bootstrapDiff(T, fc.chosen, fc.har),
};
log("QLIKE differences (negative = chosen better):", JSON.stringify(diff));

// 3. A fresh period from another source: January to early October 2025, used once.
let fresh: Record<string, unknown> | null = null;
try {
  const s25 = build(loadCsv2025(), true);
  const o25 = observations(s25, () => "fresh");
  const f25 = {
    hist20: o25.map(o => o.hist20), ewma: o25.map(o => o.ewma),
    har: o25.map(o => predict(plain, feat(o, plainSpec))), chosen: o25.map(o => predict(chosen, feat(o, best.spec))),
  };
  fresh = {
    stocks: s25.length,
    from: o25.reduce((a, o) => (o.date < a ? o.date : a), "9999"),
    to: o25.reduce((a, o) => (o.date > a ? o.date : a), ""),
    forecasts: o25.length,
    scores: Object.fromEntries(Object.entries(f25).map(([k, v]) => [k, roundScores(score(v, o25))])),
    chosenVsEwma: bootstrapDiff(o25, f25.chosen, f25.ewma),
    coverage: coverage(f25.chosen, o25),
  };
  log("2025:", JSON.stringify(fresh));
} catch (e) {
  log("2025 file missing, skipped:", (e as Error).message);
}

// 4. Example stocks through the test period, for the page.
const EXAMPLES = ["AAPL", "JPM", "XOM", "NVDA"];
const examples = EXAMPLES.map(sym => {
  const rows = T.map((o, i) => [o, i] as const).filter(([o]) => o.symbol === sym);
  return {
    symbol: sym,
    points: rows.filter((_, j) => j % 5 === 0).map(([o, i]) => ({ d: o.date, f: Math.round(fc.chosen[i] * 10) / 10, e: Math.round(fc.ewma[i] * 10) / 10, y: Math.round(o.y * 10) / 10 })),
  };
});

const report = {
  data: {
    source: "jwigginton/timeseries-daily-sp500 (Hugging Face), current S&P 500 constituents",
    stocks: keep.size, of: raw.size, from: FIRST, to: obs.reduce((a, o) => (o.date > a ? o.date : a), ""),
    forecasts: { train: part.train.length, tune: part.tune.length, test: part.test.length },
    horizonDays: HORIZON,
  },
  tune: { baselines: tuneBase, specs: tuneRows.map(({ spec, ...rest }) => rest), chosen: best.name },
  test: { scores: testScores, diff, percentiles: percentiles(fc.chosen, [0.1, 0.5, 0.9, 0.99]), byYear: byYear(fc.chosen, fc.ewma, T), calibration: calibration(fc.chosen, T), coverage: coverage(fc.chosen, T), coverageEwma: coverage(fc.ewma, T) },
  fresh,
  coefficients: {
    plain: plain.beta.map(r4),
    chosen: chosen.beta.map(r4),
    names: ["intercept", "today", "last week", "last month", ...(best.spec.down ? ["down day"] : []), ...(best.spec.mkt ? ["market week"] : [])],
  },
  examples,
};
mkdirSync("results", { recursive: true });
mkdirSync("model", { recursive: true });
writeFileSync("results/eval.json", JSON.stringify(report, null, 1));
writeFileSync("model/model.json", JSON.stringify({ ...chosen, name: best.name, trainedThrough: "2019-12-31", annualisation: ANN }, null, 1));
log("wrote results/eval.json and model/model.json");
