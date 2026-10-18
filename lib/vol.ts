// Volatility measures, features and forecasts, shared by the offline evaluation and the app.
//
// Everything works on daily candles. Volatility is annualised (×√252) so numbers read like the
// VIX: 20 means a typical day moves about 20/√252 ≈ 1.3%.

export type Candle = { date: string; open: number; high: number; low: number; close: number };

export const DAYS = 252; // trading days per year
export const HORIZON = 5; // forecast the next week of trading
export const ANN = Math.sqrt(DAYS);

/** Daily log returns from closes; out[i] is the return from day i-1 to day i (out[0] = NaN). */
export function logReturns(closes: number[]): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  for (let i = 1; i < closes.length; i++) out[i] = Math.log(closes[i] / closes[i - 1]);
  return out;
}

/**
 * Parkinson's range estimator of one day's variance: (ln(high/low))² / (4 ln 2).
 * It uses the whole day's range rather than only where the day closed, so it is far less noisy
 * than a single squared return. Splits don't affect it: high and low come from the same day.
 */
export function parkinson(c: Candle): number {
  if (!(c.high > 0 && c.low > 0) || c.high < c.low) return NaN;
  const hl = Math.log(c.high / c.low);
  return (hl * hl) / (4 * Math.LN2);
}

/** Mean of xs[from..to) ignoring NaNs; NaN if fewer than half are present. */
export function mean(xs: number[], from: number, to: number): number {
  let s = 0, n = 0;
  for (let i = Math.max(0, from); i < to; i++) if (Number.isFinite(xs[i])) { s += xs[i]; n++; }
  return n * 2 >= to - from && n > 0 ? s / n : NaN;
}

/** Annualised volatility in percent from a mean daily variance. */
export const annVol = (dailyVar: number) => Math.sqrt(dailyVar * DAYS) * 100;
/** Mean daily variance from an annualised volatility in percent. */
export const dailyVar = (vol: number) => (vol / 100) ** 2 / DAYS;

/**
 * The quantity being forecast: realised volatility over days t+1..t+HORIZON, annualised, from
 * close-to-close returns. NaN near the end of the series.
 */
export function futureVol(r2: number[], t: number): number {
  if (t + HORIZON >= r2.length) return NaN;
  const v = mean(r2, t + 1, t + 1 + HORIZON);
  return v > 0 ? annVol(v) : NaN;
}

/** RiskMetrics exponentially weighted variance, λ = 0.94, seeded from the first 20 days. */
export function ewmaVar(r2: number[], lambda = 0.94): number[] {
  const out = new Array<number>(r2.length).fill(NaN);
  let v = mean(r2, 1, 21);
  for (let i = 1; i < r2.length; i++) {
    if (Number.isFinite(r2[i])) v = lambda * v + (1 - lambda) * r2[i];
    if (i >= 21) out[i] = v;
  }
  return out;
}

/** Features available at the close of day t. */
export type Features = {
  rvD: number; // today's variance
  rvW: number; // mean over the last 5 days
  rvM: number; // mean over the last 22 days
  down: number; // squared return if today fell, else 0 (the leverage effect)
  mkt: number; // market variance over the last 5 days (NaN when unknown)
};

/**
 * HAR features (Corsi, 2009). `base` is the daily variance series to build them from (squared
 * returns or Parkinson ranges), `r` the returns for the down term, `mkt` an optional market series.
 */
export function features(base: number[], r: number[], t: number, mkt?: number[]): Features {
  return {
    rvD: base[t],
    rvW: mean(base, t - 4, t + 1),
    rvM: mean(base, t - 21, t + 1),
    down: r[t] < 0 ? r[t] * r[t] : 0,
    mkt: mkt ? mean(mkt, t - 4, t + 1) : NaN,
  };
}

/** A floor so log() of a dead-quiet day's variance doesn't run off to -∞. */
const FLOOR = 1e-8;
const lg = (v: number) => Math.log(Math.max(v, FLOOR));

export type Spec = { range: boolean; down: boolean; mkt: boolean };
export const specName = (s: Spec) => `HAR${s.range ? " + range" : ""}${s.down ? " + down days" : ""}${s.mkt ? " + market" : ""}`;

/** Regressors of the log-HAR model, in a fixed order with a leading 1 for the intercept. */
export function design(f: Features, s: Spec): number[] {
  const x = [1, lg(f.rvD), lg(f.rvW), lg(f.rvM)];
  if (s.down) x.push(Math.sqrt(f.down) * ANN); // size of a down day, annualised
  if (s.mkt) x.push(lg(f.mkt));
  return x;
}

export type Model = { spec: Spec; beta: number[]; residVar: number };

/**
 * Forecast of next-week annualised volatility. The model is fitted on log variance, so exp() of
 * the fit is a median; adding half the residual variance turns it into a mean before the square root.
 */
export function predict(m: Model, f: Features): number {
  const x = design(f, m.spec);
  let z = 0;
  for (let i = 0; i < x.length; i++) z += m.beta[i] * x[i];
  if (!Number.isFinite(z)) return NaN;
  return annVol(Math.exp(z + m.residVar / 2));
}

/** The log variance target that matches `design`. */
export const target = (vol: number) => lg(dailyVar(vol));

/** Losses for a forecast f of a realised volatility y, both annualised percentages. */
export function losses(f: number, y: number) {
  const hv = dailyVar(f), yv = dailyVar(y);
  return {
    logErr2: (Math.log(f) - Math.log(y)) ** 2, // squared error of log volatility
    qlike: yv / hv - Math.log(yv / hv) - 1, // QLIKE: robust to noisy targets, 0 when f = y
  };
}
