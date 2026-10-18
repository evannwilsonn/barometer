"use server";

// What the browser can ask of the server: search, and the reader's own logbook.
// Every logbook action checks the session; a reader only ever touches their own entries.

import { revalidatePath } from "next/cache";
import { currentUser } from "./auth";
import { logbook } from "./db";
import { companyName, finnhubOn, news, POPULAR, search, type Article, type Hit } from "./finnhub";
import { inngest } from "./inngest/client";
import { cleanSymbol } from "./sources";

export async function searchStocks(q: string): Promise<{ hits: Hit[]; live: boolean }> {
  const query = q.slice(0, 40);
  if (!finnhubOn()) {
    const t = query.trim().toUpperCase();
    return { hits: POPULAR.filter(h => !t || h.symbol.startsWith(t) || h.name.toUpperCase().includes(t)), live: false };
  }
  try {
    return { hits: await search(query), live: true };
  } catch {
    return { hits: [], live: true };
  }
}

/** The last five days of headlines for one stock (empty without a Finnhub key). */
export async function stockNews(raw: string): Promise<Article[]> {
  const symbol = cleanSymbol(raw);
  return symbol ? news([symbol], 5).then(a => a.filter(x => x.symbol === symbol)) : [];
}

/** The signed-in reader's logbook symbols, or null when nobody is signed in. */
export async function logbookSymbols(): Promise<string[] | null> {
  const user = await currentUser();
  if (!user) return null;
  const c = await logbook();
  return (await c.find({ userId: user.id }, { projection: { symbol: 1 } }).toArray()).map(e => e.symbol);
}

type Result = { ok: true; inLogbook: boolean } | { ok: false; error: string };

export async function setInLogbook(raw: string, add: boolean): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Sign in to keep a logbook" };
  const symbol = cleanSymbol(raw);
  if (!symbol) return { ok: false, error: "That doesn't look like a ticker symbol" };
  const c = await logbook();
  if (add) {
    if ((await c.countDocuments({ userId: user.id })) >= 40) return { ok: false, error: "A logbook holds up to 40 stocks" };
    await c.updateOne(
      { userId: user.id, symbol },
      { $setOnInsert: { userId: user.id, symbol, company: await companyName(symbol), addedAt: new Date() } },
      { upsert: true },
    );
  } else {
    await c.deleteOne({ userId: user.id, symbol });
  }
  revalidatePath("/logbook");
  return { ok: true, inLogbook: add };
}

/** Queues today's dispatch for the signed-in reader only (the morning run sends everyone's). */
export async function requestDispatch(): Promise<{ ok: boolean; message: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, message: "Sign in first" };
  try {
    await inngest.send({ name: "app/dispatch.requested", data: { userId: user.id } });
    return { ok: true, message: `On its way to ${user.email}` };
  } catch {
    return { ok: false, message: "The background job service isn't reachable right now" };
  }
}
