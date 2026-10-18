// Saves the running app as one self-contained page, for GitHub Pages.
//
//   npm run build && npm start   # in one terminal
//   npm run snapshot             # in another; writes docs/index.html
//
// The page is the server-rendered AAPL forecast with its stylesheet and fonts inlined. Scripts
// are dropped, so it's a frozen copy: the search box points readers to the live app instead.

import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.SNAPSHOT_URL || "http://localhost:3000";
const LIVE = process.env.LIVE_URL; // the deployed app, once there is one

const get = async (path: string) => {
  const res = await fetch(new URL(path, BASE));
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res;
};

let html = await (await get("/")).text();

// Inline every stylesheet, and every font it loads as a data URI.
for (const m of [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)]) {
  const href = /href="([^"]+)"/.exec(m[0])?.[1];
  if (!href) continue;
  let css = await (await get(href)).text();
  const sheet = new URL(href, BASE);
  for (const u of [...new Set([...css.matchAll(/url\(([^)"']+\.woff2)\)/g)].map(x => x[1]))]) {
    const buf = Buffer.from(await (await get(new URL(u, sheet).pathname)).arrayBuffer());
    css = css.split(`url(${u})`).join(`url(data:font/woff2;base64,${buf.toString("base64")})`);
  }
  html = html.replace(m[0], `<style>${css}</style>`);
}

html = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
  .replace(/<link[^>]+rel="(preload|modulepreload)"[^>]*>/g, "")
  .replace(/<link[^>]+rel="icon"[^>]*>/g, "");

// Controls that need the server (search) are dropped.
html = html.replace(/<button[^>]*data-live-only[^>]*>[\s\S]*?<\/button>/g, "");

// The form can't run without the server: swap it for a pointer to the live app.
const saved = `This is a saved copy of the AAPL forecast from ${new Date().toISOString().slice(0, 10)}.`;
const live = LIVE
  ? `<a class="underline underline-offset-4" href="${LIVE}">Open the live app</a> to forecast any US stock.`
  : `The live app needs a server for prices and notes; <a class="underline underline-offset-4" href="https://github.com/evannwilsonn/barometer#7-deployment">the README shows how to run it</a>.`;
html = html.replace(/<form[\s\S]*?<\/form>/, `<p class="mb-8 text-[16px] text-soft">${saved} ${live}</p>`);
html = html.replace(/<p class="mb-8 text-\[14px\] text-faint">Running on the price service[\s\S]*?<\/p>/, "");

mkdirSync("docs", { recursive: true });
writeFileSync("docs/index.html", html);
console.log(`wrote docs/index.html (${(html.length / 1024).toFixed(0)} KB)`);
