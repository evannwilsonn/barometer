import { test } from "node:test";
import assert from "node:assert/strict";
import { compose } from "./inngest/functions";
import { esc, paragraphs } from "./mail";

const reader = { id: "u1", email: "a@example.com", name: "Ada Lovelace", entries: [
  { symbol: "AAPL", company: "Apple Inc", lastLevel: "Fair" },
  { symbol: "XYZ", company: "<script>x</script>" },
] };
const readings = {
  AAPL: { symbol: "AAPL", asOf: "2026-10-16", price: 343.46, vol: 31.2, lastMonth: 15.9, range68: [332.76, 354.5] as [number, number], level: "Change" },
  XYZ: { error: "no daily prices for XYZ" },
};

test("the dispatch reports a change of weather since the last one", () => {
  const { html, text } = compose(reader, readings, [], null);
  assert.match(text, /AAPL moved from Fair to Change: next week looks rougher than it did\./);
  assert.match(html, /moved from Fair to Change/);
  assert.match(text, /XYZ: no reading today/);
});

test("names, companies, headlines and model text are escaped in the email", () => {
  const { html } = compose(reader, readings, [{ id: 1, headline: "<b>Big</b> \"news\"", summary: "", source: "Wire & Co", url: "https://example.com/?a=1&b=2", datetime: 1, symbol: "AAPL" }], "Apple (AAPL) <img src=x onerror=alert(1)>");
  assert.doesNotMatch(html, /<script>|<img|<b>Big/);
  assert.match(html, /&lt;b&gt;Big&lt;\/b&gt; &quot;news&quot;/);
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
});

test("plain text becomes escaped paragraphs", () => {
  assert.equal(esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal((paragraphs("one\n\ntwo\n \nthree").match(/<p /g) ?? []).length, 3);
});
