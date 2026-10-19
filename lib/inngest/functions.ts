// The two background jobs.
//
// welcome:  once a reader confirms their email, a short welcome note, emailed.
// dispatch: each weekday morning (and on request from the logbook page), every reader with
//           stocks in their logbook gets that day's readings, any change of weather since the
//           last dispatch, and a summary of the news on those stocks. Only confirmed
//           addresses that haven't unsubscribed get the morning run; every email carries
//           a one-click unsubscribe link.

import { ObjectId } from "mongodb";
import { inngest } from "./client";
import { db, logbook } from "../db";
import { news, type Article } from "../finnhub";
import { esc, frame, paragraphs, send, unsubscribeUrl } from "../mail";
import { reading, type Reading } from "../station";
import { newsSummary, welcomeNote, type Profile } from "../writer";

export const welcome = inngest.createFunction(
  { id: "welcome-email", triggers: [{ event: "app/user.verified" }] },
  async ({ event, step }) => {
    const p = event.data as Profile & { email: string };
    const note = await step.run("write-welcome-note", () => welcomeNote(p));
    const body = paragraphs(note.text) +
      `<p style="margin:18px 0 0;font:15px/1.6 Baskerville,Georgia,serif;color:#3a4357">Once your logbook has a stock in it, a dispatch with your stocks' readings and their news arrives each weekday morning. You can switch it off from your logbook page or from any dispatch.</p>`;
    return step.run("send-welcome-email", () =>
      send(p.email, "Your barometer is set up", frame("Your barometer is set up", body), note.text));
  },
);

type Reader = { id: string; email: string; name: string; entries: { symbol: string; company: string; lastLevel?: string }[] };

export const dispatch = inngest.createFunction(
  {
    id: "morning-dispatch",
    triggers: [{ cron: "TZ=America/New_York 30 8 * * 1-5" }, { event: "app/dispatch.requested" }],
    concurrency: { limit: 1 },
  },
  async ({ event, step }) => {
    const only = (event?.data as { userId?: string } | undefined)?.userId;

    const readers = await step.run("find-readers", async (): Promise<Reader[]> => {
      const c = await logbook();
      const groups = await c.aggregate<{ _id: string; entries: Reader["entries"] }>([
        ...(only ? [{ $match: { userId: only } }] : []),
        { $sort: { addedAt: 1 } },
        { $group: { _id: "$userId", entries: { $push: { symbol: "$symbol", company: "$company", lastLevel: "$lastLevel" } } } },
      ]).toArray();
      const ids = groups.map(g => g._id).filter(ObjectId.isValid).map(id => new ObjectId(id));
      // Confirmed addresses only; the morning run also skips readers who switched the dispatch off
      // (asking for one from the logbook page still sends it).
      const users = await db().collection<{ _id: ObjectId; email: string; name: string; emailVerified?: boolean; dispatch?: boolean }>("user")
        .find({ _id: { $in: ids }, emailVerified: true, ...(only ? {} : { dispatch: { $ne: false } }) }).toArray();
      const byId = new Map(users.map(u => [u._id.toHexString(), u]));
      return groups.flatMap(g => {
        const u = byId.get(g._id);
        return u?.email ? [{ id: g._id, email: u.email, name: u.name, entries: g.entries }] : [];
      });
    });
    if (!readers.length) return { readers: 0 };

    // One reading per stock, however many readers follow it. Twelve Data's free plan allows
    // 8 requests a minute, so pause after every 8.
    const symbols = [...new Set(readers.flatMap(r => r.entries.map(e => e.symbol)))];
    const readings: Record<string, Reading | { error: string }> = {};
    for (let i = 0; i < symbols.length; i++) {
      if (i > 0 && i % 8 === 0) await step.sleep(`rate-limit-${i}`, "61s");
      readings[symbols[i]] = await step.run(`read-${symbols[i]}`, async () => {
        try {
          return await reading(symbols[i]);
        } catch (e) {
          return { error: (e as Error).message };
        }
      });
    }

    let sent = 0;
    for (const r of readers) {
      const result = await step.run(`dispatch-${r.id}`, async () => {
        const articles = await news(r.entries.map(e => e.symbol), 6);
        const summary = await newsSummary(articles);
        const { html, text } = compose(r, readings, articles, summary?.text ?? null);
        const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });
        const unsub = unsubscribeUrl(r.id);
        const out = await send(r.email, `Morning dispatch · ${date}`, frame(`Morning dispatch · ${date}`, html, unsub), `${text}\n\nStop these emails: ${unsub}`, unsub);
        // Remember today's weather, to report changes next time.
        const c = await logbook();
        await Promise.all(r.entries.map(e => {
          const now = readings[e.symbol];
          return now && "level" in now ? c.updateOne({ userId: r.id, symbol: e.symbol }, { $set: { lastLevel: now.level } }) : null;
        }));
        return out;
      });
      if (result.sent) sent++;
    }
    return { readers: readers.length, symbols: symbols.length, sent };
  },
);

const ORDER = ["Settled", "Fair", "Change", "Rough", "Stormy"];

/** The dispatch body. Every number comes from the readings; only the news paragraphs are written by the model. */
export function compose(r: Reader, readings: Record<string, Reading | { error: string }>, articles: Article[], summary: string | null) {
  const changes: string[] = [];
  const rows = r.entries.map(e => {
    const x = readings[e.symbol];
    if (!x || "error" in x) {
      return { html: `<tr><td style="padding:8px 0;border-bottom:1px solid #d6c7a3;font:15px Baskerville,Georgia,serif">${esc(e.symbol)}</td><td colspan="3" style="padding:8px 0;border-bottom:1px solid #d6c7a3;font:14px Baskerville,Georgia,serif;color:#5c5f6a">no reading today</td></tr>`, text: `${e.symbol}: no reading today` };
    }
    if (e.lastLevel && e.lastLevel !== x.level) {
      const rougher = ORDER.indexOf(x.level) > ORDER.indexOf(e.lastLevel);
      changes.push(`${e.symbol} moved from ${e.lastLevel} to ${x.level}: next week looks ${rougher ? "rougher" : "calmer"} than it did.`);
    }
    const range = `${x.range68[0].toFixed(2)}–${x.range68[1].toFixed(2)}`;
    return {
      html: `<tr><td style="padding:8px 0;border-bottom:1px solid #d6c7a3;font:15px Baskerville,Georgia,serif"><b>${esc(x.symbol)}</b><br><span style="font-size:13px;color:#5c5f6a">${esc(e.company)}</span></td>` +
        `<td style="padding:8px 6px;border-bottom:1px solid #d6c7a3;font:17px Baskerville,Georgia,serif;color:#9e2b25">${esc(x.level)}</td>` +
        `<td align="right" style="padding:8px 6px;border-bottom:1px solid #d6c7a3;font:14px 'Courier New',monospace">${x.vol}%<br><span style="color:#5c5f6a">was ${x.lastMonth}%</span></td>` +
        `<td align="right" style="padding:8px 0;border-bottom:1px solid #d6c7a3;font:14px 'Courier New',monospace">${range}</td></tr>`,
      text: `${x.symbol} (${e.company}): ${x.level}, ${x.vol}% forecast vs ${x.lastMonth}% last month; likely close ${range}`,
    };
  });
  const head = `<tr><td style="padding:0 0 6px;font:12px 'Courier New',monospace;color:#5c5f6a">STOCK</td><td style="padding:0 6px 6px;font:12px 'Courier New',monospace;color:#5c5f6a">READING</td><td align="right" style="padding:0 6px 6px;font:12px 'Courier New',monospace;color:#5c5f6a">NEXT WEEK</td><td align="right" style="padding:0 0 6px;font:12px 'Courier New',monospace;color:#5c5f6a">LIKELY CLOSE</td></tr>`;
  const first = r.name.split(/\s+/)[0];
  let html = paragraphs(`${first}, here is the weather for the ${r.entries.length === 1 ? "stock" : `${r.entries.length} stocks`} in your logbook.`);
  if (changes.length) html += `<div style="margin:0 0 16px;padding:12px 14px;background:#e6cbbb;font:15px/1.5 Baskerville,Georgia,serif;color:#14233a">${changes.map(esc).join("<br>")}</div>`;
  html += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px">${head}${rows.map(x => x.html).join("")}</table>`;
  html += `<p style="margin:0 0 22px;font:13px/1.5 Baskerville,Georgia,serif;color:#5c5f6a">Readings are volatility for the next five trading days, annualised, against the last month. The likely close is the range the price should end in about two weeks out of three.</p>`;
  if (articles.length) {
    html += `<p style="margin:0 0 10px;font:13px 'Courier New',monospace;letter-spacing:2px;color:#5c5f6a">IN THE NEWS</p>`;
    if (summary) html += paragraphs(summary) + `<p style="margin:-4px 0 14px;font:13px Baskerville,Georgia,serif;color:#5c5f6a">Summary written by a language model from the headlines below.</p>`;
    html += `<ul style="margin:0 0 12px;padding-left:18px">${articles.map(a => `<li style="margin:0 0 8px;font:15px/1.45 Baskerville,Georgia,serif"><a href="${esc(a.url)}" style="color:#9e2b25">${esc(a.headline)}</a> <span style="color:#5c5f6a">· ${esc(a.source)}${a.symbol ? ` · ${esc(a.symbol)}` : ""}</span></li>`).join("")}</ul>`;
  }
  const text = [`${first}, here is the weather for your logbook.`, ...changes, "", ...rows.map(x => x.text), "", summary ?? "",
    ...articles.map(a => `- ${a.headline} (${a.source}) ${a.url}`)].join("\n");
  return { html, text };
}

export const functions = [welcome, dispatch];
