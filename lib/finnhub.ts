// Finnhub, for symbol search, company names and news. The key stays on the server
// (FINNHUB_API_KEY); it is never sent to the browser.

const BASE = "https://finnhub.io/api/v1";

export const finnhubOn = () => Boolean(process.env.FINNHUB_API_KEY);

async function get<T>(path: string, revalidate: number): Promise<T> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY isn't set");
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}token=${encodeURIComponent(key)}`, { next: { revalidate } } as RequestInit);
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return (await res.json()) as T;
}

export type Hit = { symbol: string; name: string; type: string };

/** The stocks you can always find, shown before anything is typed. */
export const POPULAR: Hit[] = [
  ["AAPL", "Apple Inc"], ["MSFT", "Microsoft Corp"], ["NVDA", "NVIDIA Corp"], ["AMZN", "Amazon.com Inc"],
  ["GOOGL", "Alphabet Inc"], ["META", "Meta Platforms Inc"], ["TSLA", "Tesla Inc"], ["JPM", "JPMorgan Chase & Co"],
  ["XOM", "Exxon Mobil Corp"], ["SPY", "SPDR S&P 500 ETF"],
].map(([symbol, name]) => ({ symbol, name, type: "Common Stock" }));

/** US-listed stocks and ETFs matching the query (plain tickers only, as the model needs). */
export async function search(q: string): Promise<Hit[]> {
  const query = q.trim();
  if (!query) return POPULAR;
  const body = await get<{ result?: { symbol: string; description: string; type: string }[] }>(`/search?q=${encodeURIComponent(query)}&exchange=US`, 1800);
  return (body.result ?? [])
    .filter(r => /^[A-Z]{1,5}(\.[A-Z])?$/.test(r.symbol))
    .map(r => ({ symbol: r.symbol, name: titleCase(r.description), type: r.type || "Stock" }))
    .slice(0, 12);
}

/** Company name for a symbol, from Finnhub's profile when available. */
export async function companyName(symbol: string): Promise<string> {
  if (!finnhubOn()) return POPULAR.find(h => h.symbol === symbol)?.name ?? symbol;
  try {
    const p = await get<{ name?: string }>(`/stock/profile2?symbol=${encodeURIComponent(symbol)}`, 86400);
    return p.name || POPULAR.find(h => h.symbol === symbol)?.name || symbol;
  } catch {
    return symbol;
  }
}

export type Article = { id: number; headline: string; summary: string; source: string; url: string; datetime: number; symbol?: string };

const valid = (a: Partial<Article>): a is Article =>
  Boolean(a.headline && a.url && a.datetime && /^https?:\/\//.test(a.url));

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Recent news: for each symbol, its latest company news, taken in turn until `max` articles;
 * with no symbols (or no company news), general market news.
 */
export async function news(symbols: string[] = [], max = 6): Promise<Article[]> {
  if (!finnhubOn()) return [];
  const to = new Date(), from = new Date(Date.now() - 5 * 86400e3);
  const lists = await Promise.all(symbols.map(async s => {
    try {
      const raw = await get<Partial<Article>[]>(`/company-news?symbol=${encodeURIComponent(s)}&from=${isoDay(from)}&to=${isoDay(to)}`, 900);
      return raw.filter(valid).sort((a, b) => b.datetime - a.datetime).map(a => ({ ...a, symbol: s }));
    } catch {
      return [];
    }
  }));
  const out: Article[] = [], seen = new Set<string>();
  for (let round = 0; out.length < max && lists.some(l => l.length > round); round++) {
    for (const l of lists) {
      const a = l[round];
      if (a && !seen.has(a.headline) && out.length < max) { seen.add(a.headline); out.push(a); }
    }
  }
  if (out.length) return out.sort((a, b) => b.datetime - a.datetime);
  try {
    const general = await get<Partial<Article>[]>("/news?category=general", 900);
    return general.filter(valid).filter(a => !seen.has(a.headline) && seen.add(a.headline)).slice(0, max);
  } catch {
    return [];
  }
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()).replace(/\b(Inc|Corp|Co|Ltd|Plc|Etf)\b/g, w => w === "Etf" ? "ETF" : w);
}
