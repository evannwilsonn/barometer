import { test } from "node:test";
import assert from "node:assert/strict";
import { LeastSquares } from "./ols";
import { annVol, dailyVar, ewmaVar, features, futureVol, losses, mean, parkinson, predict, logReturns } from "./vol";

const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test("least squares recovers known coefficients", () => {
  const ls = new LeastSquares(3);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let i = 0; i < 2000; i++) {
    const x1 = rand(), x2 = rand();
    ls.add([1, x1, x2], 0.5 + 2 * x1 - 3 * x2);
  }
  const { beta, residVar } = ls.solve(0);
  [0.5, 2, -3].forEach((b, i) => close(beta[i], b, 1e-8));
  assert.ok(residVar < 1e-12);
});

test("Parkinson variance of a 10% range day", () => {
  const v = parkinson({ date: "", open: 100, high: 110, low: 100, close: 105 });
  close(v, Math.log(1.1) ** 2 / (4 * Math.LN2));
  assert.ok(Number.isNaN(parkinson({ date: "", open: 1, high: 1, low: 2, close: 1 })), "high below low is rejected");
});

test("annualising round-trips", () => {
  close(annVol(dailyVar(23.5)), 23.5);
});

test("future volatility of a steady 1% daily move", () => {
  const closes = [100];
  for (let i = 0; i < 30; i++) closes.push(closes[closes.length - 1] * (i % 2 ? 1.01 : 0.99));
  const r2 = logReturns(closes).map(r => r * r);
  // |log 1.01| and |log 0.99| are both close to 1%, so about 15.9 annualised.
  assert.ok(Math.abs(futureVol(r2, 10) - 15.87) < 0.1);
  assert.ok(Number.isNaN(futureVol(r2, 28)), "no target past the end");
});

test("EWMA waits for its warm-up", () => {
  const r2 = new Array(40).fill(1e-4);
  r2[0] = NaN;
  const v = ewmaVar(r2);
  assert.ok(Number.isNaN(v[20]));
  close(v[30], 1e-4, 1e-12);
});

test("mean needs at least half its window", () => {
  assert.ok(Number.isNaN(mean([1, NaN, NaN, NaN], 0, 4)));
  close(mean([1, 3, NaN, NaN], 0, 4), 2);
});

test("a model that predicts last month's variance gives it back, with the mean correction", () => {
  const base = new Array(30).fill(dailyVar(20));
  const r = new Array(30).fill(0.001);
  const f = features(base, r, 29);
  const spec = { range: true, down: false, mkt: false };
  close(predict({ spec, beta: [0, 0, 0, 1], residVar: 0 }, f), 20, 1e-6);
  // exp(σ²/2) on variance is exp(σ²/4) on volatility
  close(predict({ spec, beta: [0, 0, 0, 1], residVar: 0.5 }, f), 20 * Math.exp(0.125), 1e-6);
});

test("QLIKE is zero for a perfect forecast and penalises under-forecasting more", () => {
  close(losses(20, 20).qlike, 0);
  assert.ok(losses(10, 20).qlike > losses(40, 20).qlike);
});
