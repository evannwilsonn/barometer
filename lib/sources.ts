// The two outside services: Twelve Data for daily prices and Groq for the written note.
// Both keys come from the environment and never reach the browser.

import type { Candle } from "./vol";
import { factsFor, type Forecast } from "./forecast";

const TWELVE = "https://api.twelvedata.com/time_series";

/** A symbol like AAPL, BRK.B or RDS-A; anything else is refused before it reaches the API. */
export const cleanSymbol = (s: string) => {
  const t = s.trim().toUpperCase();
  return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(t) ? t : null;
};

export class SourceError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/**
 * The last ~300 daily candles, oldest first. A bar for today is dropped while the market is
 * open, because its high, low and close aren't final yet.
 */
export async function dailyCandles(symbol: string, key: string, now = new Date()): Promise<Candle[]> {
  const url = `${TWELVE}?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=300&order=ASC&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url, { next: { revalidate: 900 } } as RequestInit);
  // Twelve Data reports errors in the body, sometimes with a matching HTTP status.
  const body = await res.json().catch(() => ({ status: "error", code: res.status }));
  if (body.status === "error" || !Array.isArray(body.values)) {
    const code = Number(body.code) || 502;
    if (code === 429) throw new SourceError("the price service's rate limit is used up for the moment; try again in a minute", 429);
    if (code === 400 || code === 404) throw new SourceError(`no daily prices for ${symbol}`, 404);
    if ((code === 401 || code === 403) && key === "demo") throw new SourceError(`the public demo key doesn't cover ${symbol}; this deployment needs its own free Twelve Data key`, 403);
    if (code === 401 || code === 403) throw new SourceError("the price service rejected the API key or this symbol on its plan", 502);
    throw new SourceError(body.message || "the price service didn't return prices", 502);
  }
  const candles: Candle[] = body.values.map((v: Record<string, string>) => ({
    date: v.datetime.slice(0, 10), open: +v.open, high: +v.high, low: +v.low, close: +v.close,
  }));
  candles.sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const hourNY = +new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(now);
  if (candles.length && candles[candles.length - 1].date === today && hourNY < 17) candles.pop();
  return candles;
}

const SYSTEM = `You write a short note under a stock-volatility forecast for a general reader.
Rules:
- Use only the numbers you are given. Don't add news, events, causes or prices that aren't listed.
- Say how large the next week's moves are likely to be, compare the forecast with the last month, and give the likely price range.
- The forecast is about the size of moves, not their direction. Never say whether the price will rise or fall.
- No advice: don't tell anyone to buy, sell, hold, hedge or trade.
- Three sentences at most, plain words, no headings, no lists, no emoji.`;

/** Drops any sentence that drifts into advice, as a backstop to the prompt. */
const ADVICE = /\b(buy(ing)?|sell(ing)?|recommend\w*|go (long|short)|hedg(e|ing)|should (you|investors|traders))\b/i;
export function guardNote(text: string): string {
  // Split only where punctuation is followed by a space, so "27.4%" stays one number.
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
  return sentences.filter(s => !ADVICE.test(s)).join(" ").trim();
}

/** A note from Groq, or null when no key is set or the call fails (the page then shows its own). */
export async function writeNote(f: Forecast, key: string | undefined, model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile") {
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 180,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: factsFor(f) }],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      // Status and Groq's error message only; the key is never logged.
      const err = await res.json().catch(() => null);
      console.error(`groq ${res.status}: ${err?.error?.message ?? res.statusText}`);
      return null;
    }
    const body = await res.json();
    const text = guardNote(String(body.choices?.[0]?.message?.content ?? ""));
    return text ? { text, model } : null;
  } catch (e) {
    console.error(`groq request failed: ${(e as Error).name}`);
    return null;
  }
}

/** The fallback note, written from the same numbers without a language model. */
export function plainNote(f: Forecast): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const vsMonth = f.vol > f.lastMonth * 1.1 ? "rougher than" : f.vol < f.lastMonth * 0.9 ? "calmer than" : "about the same as";
  return `${f.symbol} is forecast at ${f.vol}% volatility for the next five trading days, ${vsMonth} the last month (${f.lastMonth}%). ` +
    `That puts one standard deviation for the week at ${pct(f.weekSd)}, so in about two weeks out of three the price would close between ${f.range68[0].toFixed(2)} and ${f.range68[1].toFixed(2)}. ` +
    `It says how far the price may move, not which way.`;
}
