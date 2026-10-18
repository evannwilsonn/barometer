// One forecast request, end to end: prices, model, note. Shared by the API route and the page.

import { forecast, type Forecast } from "./forecast";
import { SourceError, cleanSymbol, dailyCandles, plainNote, writeNote } from "./sources";

export type Report = {
  forecast: Forecast;
  note: { text: string; by: string };
  demo: boolean; // true when running on Twelve Data's public demo key (AAPL and a few others only)
};

export async function report(raw: string): Promise<Report> {
  const symbol = cleanSymbol(raw);
  if (!symbol) throw new SourceError("that doesn't look like a ticker symbol", 400);
  const key = process.env.TWELVE_DATA_API_KEY;
  const candles = await dailyCandles(symbol, key || "demo");
  const f = forecast(symbol, candles);
  const written = await writeNote(f, process.env.GROQ_API_KEY);
  return {
    forecast: f,
    note: written ? { text: written.text, by: `Written by ${prettyModel(written.model)} from the numbers above` } : { text: plainNote(f), by: "Written from the numbers above" },
    demo: !key,
  };
}

/** A forecast without the written note, for the logbook and the morning dispatch. */
export type Reading = Pick<Forecast, "symbol" | "asOf" | "price" | "vol" | "lastMonth" | "range68"> & { level: string };

export async function reading(symbol: string): Promise<Reading> {
  const s = cleanSymbol(symbol);
  if (!s) throw new SourceError("that doesn't look like a ticker symbol", 400);
  const f = forecast(s, await dailyCandles(s, process.env.TWELVE_DATA_API_KEY || "demo"));
  return { symbol: f.symbol, asOf: f.asOf, price: f.price, vol: f.vol, lastMonth: f.lastMonth, range68: f.range68, level: f.level.name };
}

const prettyModel = (m: string) =>
  m.replace(/^llama-(\d)\.(\d)-(\d+)b.*$/i, "Llama $1.$2 $3B").replace(/^llama-(\d)-(\d+)b.*$/i, "Llama $1 $2B");
