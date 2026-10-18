// The language model's two jobs in the emails, each with a plain fallback written by code:
// the welcome note, and a summary of the news on the stocks in a reader's logbook.
// Same Groq model and the same advice filter as the note under each forecast.

import type { Article } from "./finnhub";
import { guardNote } from "./sources";

async function groq(system: string, user: string, maxTokens: number): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      // Status and Groq's error message only; the key is never logged.
      const err = await res.json().catch(() => null);
      console.error(`groq ${res.status}: ${err?.error?.message ?? res.statusText}`);
      return null;
    }
    const body = await res.json();
    return String(body.choices?.[0]?.message?.content ?? "").trim() || null;
  } catch (e) {
    console.error(`groq request failed: ${(e as Error).name}`);
    return null;
  }
}

/** Runs the advice filter over each paragraph, keeping the blank lines between them. */
const guarded = (text: string) => text.split(/\n\s*\n/).map(guardNote).filter(Boolean).join("\n\n");

export type Profile = { name: string; country?: string; investmentGoals?: string; riskTolerance?: string; preferredIndustry?: string };

const WELCOME = `You write the opening of a welcome email for Barometer, a site that forecasts how much a US stock is likely to move next week (the size of moves, not their direction).
Write two or three sentences to the new reader, by first name, that connect what Barometer does to what they told us. Plain text, no greeting line, no sign-off, no headings, no emoji.
Never recommend stocks or tell them to buy, sell or hold anything, and don't promise returns. Don't start with "Welcome".`;

export async function welcomeNote(p: Profile): Promise<{ text: string; byModel: boolean }> {
  const first = p.name.split(/\s+/)[0] || p.name;
  const facts = [`First name: ${first}`, p.country && `Country: ${p.country}`, p.investmentGoals && `Investment goal: ${p.investmentGoals}`,
    p.riskTolerance && `Risk tolerance: ${p.riskTolerance}`, p.preferredIndustry && `Industry they follow most: ${p.preferredIndustry}`].filter(Boolean).join("\n");
  const written = await groq(WELCOME, facts, 160);
  const text = written ? guarded(written) : "";
  if (text) return { text, byModel: true };
  const risk = p.riskTolerance === "Low" ? "If you'd rather avoid rough weeks, the dial shows which of your stocks are heading into one."
    : p.riskTolerance === "High" ? "If you can live with rough weeks, the dial shows how rough the next one is likely to be, and the range shows how far the price may swing."
    : "The dial shows how rough the next week is likely to be, and the range shows how far the price may swing.";
  const industry = p.preferredIndustry ? ` Start with a few ${p.preferredIndustry.toLowerCase()} names you follow and add them to your logbook.` : "";
  return { text: `${first}, Barometer reads the weather for stocks: how much each one is likely to move over the next five trading days. ${risk}${industry}`, byModel: false };
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
