import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSymbol, guardNote, plainNote } from "./sources";
import { forecast } from "./forecast";
import type { Candle } from "./vol";

test("ticker symbols are cleaned or refused", () => {
  assert.equal(cleanSymbol(" aapl "), "AAPL");
  assert.equal(cleanSymbol("brk.b"), "BRK.B");
  assert.equal(cleanSymbol("a<b"), null);
  assert.equal(cleanSymbol("../etc"), null);
});

test("the note filter drops advice and keeps the rest", () => {
  const out = guardNote("Moves should be larger than last month. You should buy before the open. The likely range is 100 to 110.");
  assert.equal(out, "Moves should be larger than last month. The likely range is 100 to 110.");
  assert.equal(guardNote("In the short term the range is 98 to 102."), "In the short term the range is 98 to 102.");
});

test("a forecast from steady prices, and its plain note", () => {
  const candles: Candle[] = [];
  let p = 100;
  for (let i = 0; i < 80; i++) {
    p *= i % 2 ? 1.01 : 0.99;
    candles.push({ date: `2025-01-${String(i).padStart(2, "0")}`, open: p, high: p * 1.012, low: p * 0.988, close: p });
  }
  const f = forecast("TEST", candles);
  assert.ok(f.vol > 5 && f.vol < 60, `forecast ${f.vol}`);
  assert.ok(f.range68[0] < f.price && f.price < f.range68[1]);
  assert.ok(f.range95[0] < f.range68[0] && f.range68[1] < f.range95[1]);
  const note = plainNote(f);
  assert.equal(guardNote(note), note.replace(/\s+/g, " ").trim(), "the fallback note passes the advice filter untouched");
});
