// The language model's two jobs in the emails, each with a plain fallback written by code:
// the welcome note, and a summary of the news on the stocks in a reader's logbook.
// Same Groq model and the same advice filter as the note under each forecast.

import type { Article } from "./finnhub";
import { groqChat, guardNote } from "./sources";

async function groq(system: string, user: string, maxTokens: number): Promise<string | null> {
  const r = await groqChat([{ role: "system", content: system }, { role: "user", content: user }], maxTokens, 0.3, 20000);
  return r?.text ?? null;
}

/** Runs the advice filter over each paragraph, keeping the blank lines between them. */
const guarded = (text: string) => text.split(/\n\s*\n/).map(guardNote).filter(Boolean).join("\n\n");

export type Profile = { name: string; preferredIndustry?: string };

// The model sees only the industry a reader picked, never their name or email: code adds the
// name. And it explains how Barometer works; it never suggests what to look at or own.
const WELCOME = `You write two sentences for a welcome email from Barometer, a free site that forecasts how much a US stock is likely to move next week (the size of moves, not their direction).
The reader said the industry they follow most is given below. Explain, in plain words, how they could use the readings to see how rough next week may be for stocks they already follow in that industry.
Plain text only, no greeting, no sign-off, no emoji. Never name or suggest particular stocks, never tell anyone to buy, sell or hold anything, and don't promise returns.`;

export async function welcomeNote(p: Profile): Promise<{ text: string; byModel: boolean }> {
  const first = p.name.split(/\s+/)[0] || p.name;
  const plain = "Barometer reads the weather for stocks: how much each one is likely to move over the next five trading days, and the range its price is likely to close in. Search for any stock you already follow, take a reading, and add it to your logbook.";
  const written = p.preferredIndustry ? await groq(WELCOME, `Industry they follow most: ${p.preferredIndustry}`, 160) : null;
  const text = written ? guarded(written) : "";
  return { text: `Hi ${first}, your email is confirmed and your logbook is open.\n\n${text || plain}`, byModel: Boolean(text) };
}

const DISPATCH = `You summarise recent news for a reader who follows the stocks named in the articles. You get a list of articles (headline, source, summary).
Write two to four short paragraphs, plain text, separated by blank lines. Group related stories. Mention the ticker in parentheses the first time you name a company.
Use only what the articles say. Don't add prices, numbers or events that aren't in them, and don't predict where any stock will go.
No advice: never tell the reader to buy, sell, hold or trade. No headings, lists, links or emoji.`;

export async function newsSummary(articles: Article[]): Promise<{ text: string; byModel: boolean } | null> {
  if (!articles.length) return null;
  const list = articles.map((a, i) => `${i + 1}. [${a.symbol ?? "market"}] ${a.headline} (${a.source})\n${a.summary.slice(0, 500)}`).join("\n\n");
  const written = await groq(DISPATCH, list, 450);
  const text = written ? guarded(written) : "";
  return text ? { text, byModel: true } : null;
}
