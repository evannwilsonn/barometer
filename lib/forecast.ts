// Turns a stock's recent daily candles into the page's forecast: next-week volatility from the
// fitted model, the price range that implies, its reading on the dial, and a backtest of the model on
// this stock over the past months.

import modelJson from "../model/model.json";
import { Candle, HORIZON, Model, annVol, ewmaVar, features, futureVol, logReturns, mean, parkinson, predict } from "./vol";

export const model = modelJson as unknown as Model & { name: string; trainedThrough: string };

/**
 * The words on the dial, after the words on an aneroid barometer (which run Stormy to Very Dry).
 * The boundaries are the 10th, 50th, 90th and 99th percentiles of next-week forecasts for
 * S&P 500 stocks in 2020–2024, rounded (results/eval.json: test.percentiles).
 */
export const LEVELS = [
  { min: 0, name: "Settled", note: "quieter than 90% of large-stock forecasts" },
  { min: 19, name: "Fair", note: "calmer than a typical large stock" },
  { min: 28, name: "Change", note: "rougher than a typical large stock" },
  { min: 45, name: "Rough", note: "rougher than 90% of large-stock forecasts" },
  { min: 90, name: "Stormy", note: "rougher than 99% of large-stock forecasts" },
] as const;
export const levelOf = (vol: number) => [...LEVELS].reverse().find(l => vol >= l.min)!;

export type Forecast = {
  symbol: string;
  asOf: string;
  price: number;
  vol: number; // model forecast, annualised %
  ewma: number; // RiskMetrics baseline, for comparison
  lastMonth: number; // realised volatility over the last 22 days
  level: (typeof LEVELS)[number];
  weekSd: number; // one standard deviation of the week's move, as a fraction
  range68: [number, number];
  range95: [number, number];
  history: { d: string; f: number; y: number | null }[]; // forecast made on d, and what followed
  hitRate: { n: number; within68: number } | null; // past weeks that stayed inside the ±1σ range
};

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function forecast(symbol: string, candles: Candle[]): Forecast {
  if (candles.length < 30) throw new Error(`need at least 30 days of prices for ${symbol}, got ${candles.length}`);
  const closes = candles.map(c => c.close);
  const r = logReturns(closes);
  const sq = r.map(x => x * x);
  const base = model.spec.range ? candles.map(parkinson) : sq;
  const ew = ewmaVar(sq);
  const at = (t: number) => predict(model, features(base, r, t));

  const t = candles.length - 1;
  const vol = at(t);
  if (!(vol > 0)) throw new Error(`couldn't forecast ${symbol}: the latest prices are incomplete`);
  const price = closes[t];
  const weekSd = (vol / 100) * Math.sqrt(HORIZON / 252);
  const band = (k: number): [number, number] => [r2(price * Math.exp(-k * weekSd)), r2(price * Math.exp(k * weekSd))];

  // Backtest on this stock: every forecast from day 22 on, with the week that followed.
  const history: Forecast["history"] = [];
  let inside = 0, scored = 0;
  for (let i = 22; i <= t; i++) {
    const f = at(i);
    if (!(f > 0)) continue;
    const y = futureVol(sq, i);
    history.push({ d: candles[i].date, f: r1(f), y: Number.isFinite(y) ? r1(y) : null });
    if (i + HORIZON <= t) {
      const move = Math.abs(Math.log(closes[i + HORIZON] / closes[i]));
      if (move <= (f / 100) * Math.sqrt(HORIZON / 252)) inside++;
      scored++;
    }
  }

  return {
    symbol,
    asOf: candles[t].date,
    price: r2(price),
    vol: r1(vol),
    ewma: r1(annVol(ew[t])),
    lastMonth: r1(annVol(mean(sq, t - 21, t + 1))),
    level: levelOf(vol),
    weekSd: Math.round(weekSd * 1e4) / 1e4,
    range68: band(1),
    range95: band(2),
    history,
    hitRate: scored >= 20 ? { n: scored, within68: Math.round((inside / scored) * 1000) / 1000 } : null,
  };
}

/** The numbers the language model is allowed to talk about, and nothing else. */
export function factsFor(f: Forecast) {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const p = (x: number) => x.toFixed(2);
  return [
    `Stock: ${f.symbol}, last close ${p(f.price)} on ${f.asOf}.`,
    `Forecast volatility for the next 5 trading days: ${f.vol}% annualised (model: ${model.name}).`,
    `For comparison: realised volatility over the last month ${f.lastMonth}%, RiskMetrics EWMA estimate ${f.ewma}%.`,
    `Reading on the dial: ${f.level.name} (${f.level.note}).`,
    `One standard deviation for the week is ${pct(f.weekSd)}: in about two weeks out of three the close a week from now should land between ${p(f.range68[0])} and ${p(f.range68[1])}; in about 19 out of 20, between ${p(f.range95[0])} and ${p(f.range95[1])}.`,
    f.hitRate ? `Of ${f.hitRate.n} past forecasts for this stock, ${pct(f.hitRate.within68)} saw the following week close inside the one-standard-deviation range (68% would be exact).` : "",
    `The forecast says how much the price is likely to move, not which way.`,
  ].filter(Boolean).join("\n");
}

