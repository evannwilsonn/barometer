"use client";

import { useEffect, useState } from "react";
import { TradingViewWidget, type Palette } from "./TradingViewWidget";

const rgba = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return Number.isFinite(n) ? `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})` : `rgba(150, 48, 68, ${a})`;
};

const GROUPS: [string, [string, string][]][] = [
  ["Indices", [["AMEX:SPY", "S&P 500 (SPY)"], ["NASDAQ:QQQ", "Nasdaq 100 (QQQ)"], ["AMEX:DIA", "Dow 30 (DIA)"], ["AMEX:IWM", "Russell 2000 (IWM)"]]],
  ["Technology", [["NASDAQ:AAPL", "Apple"], ["NASDAQ:MSFT", "Microsoft"], ["NASDAQ:NVDA", "NVIDIA"], ["NASDAQ:GOOGL", "Alphabet"], ["NASDAQ:META", "Meta Platforms"], ["NYSE:ORCL", "Oracle"]]],
  ["Financial", [["NYSE:JPM", "JPMorgan Chase"], ["NYSE:BAC", "Bank of America"], ["NYSE:WFC", "Wells Fargo"], ["NYSE:GS", "Goldman Sachs"], ["NYSE:V", "Visa"], ["NYSE:MA", "Mastercard"]]],
  ["Energy", [["NYSE:XOM", "Exxon Mobil"], ["NYSE:CVX", "Chevron"], ["NYSE:COP", "ConocoPhillips"], ["NYSE:SLB", "SLB"]]],
];

const overview = (p: Palette) => ({
  colorTheme: p.dark ? "dark" : "light", dateRange: "12M", isTransparent: true, showFloatingTooltip: true,
  plotLineColorGrowing: p.line, plotLineColorFalling: p.line, gridLineColor: rgba(p.rule, 0.6), scaleFontColor: p.faint,
  belowLineFillColorGrowing: rgba(p.line, 0.14), belowLineFillColorFalling: rgba(p.line, 0.14),
  belowLineFillColorGrowingBottom: rgba(p.line, 0), belowLineFillColorFallingBottom: rgba(p.line, 0),
  symbolActiveColor: rgba(p.line, 0.08), showSymbolLogo: false, showChart: true, width: "100%", height: "100%",
  tabs: GROUPS.map(([title, s]) => ({ title, symbols: s.map(([sym, d]) => ({ s: sym, d })) })),
});

const heatmap = (p: Palette) => ({
  dataSource: "SPX500", blockSize: "market_cap_basic", blockColor: "change", grouping: "sector",
  colorTheme: p.dark ? "dark" : "light", isTransparent: true, hasTopBar: false, isDataSetEnabled: false,
  isZoomEnabled: true, hasSymbolTooltip: true, isMonoSize: false, width: "100%", height: "100%",
});

const wire = (p: Palette) => ({ displayMode: "regular", feedMode: "market", market: "stock", colorTheme: p.dark ? "dark" : "light", isTransparent: true, width: "100%", height: "100%" });

const board = (p: Palette) => ({
  colorTheme: p.dark ? "dark" : "light", isTransparent: true, showSymbolLogo: false, width: "100%", height: "100%",
  symbolsGroups: GROUPS.map(([name, s]) => ({ name, symbols: s.map(([sym, displayName]) => ({ name: sym, displayName })) })),
});

function Panel({ title, note, children, className = "" }: { title: string; note: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col rounded-md border border-hair bg-panel p-5 sm:p-6 ${className}`}>
      <div className="mb-4 border-b border-rule pb-3">
        <h3 className="display text-[21px] leading-tight">{title}</h3>
        <p className="mt-1 text-[15px] leading-relaxed text-soft">{note}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Today's market, from TradingView's widgets: the S&P 500 by sector, the main indices and
 * sectors over a year, the wire, and a quotes board. They show what has happened; the dial
 * above shows how rough the coming week is likely to be. Rendered in the browser only.
 */
export function MarketWeather() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  if (!on) return null;
  return (
    <section className="mt-20" aria-labelledby="h-market">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-bezel pt-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-6">
        <div>
          <p className="label">Across the market</p>
          <h2 id="h-market" className="display mt-2 text-[34px] leading-none sm:text-[44px]">Today&apos;s weather map</h2>
        </div>
        <p className="text-[16px] leading-relaxed text-soft">The dial reads one stock&apos;s coming week. These read the whole market as it stands: where it moved today, how the main indices and sectors have run this year, and what the wire is saying.</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <Panel title="Pressure map" note="The S&P 500 by sector, each block sized by company value and shaded by today's move." className="lg:col-span-2">
          <TradingViewWidget widget="stock-heatmap" id="heatmap" height={520} label="S&P 500 heatmap by sector, from TradingView" config={heatmap} />
        </Panel>
        <Panel title="Indices and sectors" note="A year of prices for the main indices and a few sectors. Pick a tab, then a row.">
          <TradingViewWidget widget="market-overview" id="overview" height={520} label="Market overview of indices and sectors, from TradingView" config={overview} />
        </Panel>
        <Panel title="The wire" note="Market headlines as they come in.">
          <TradingViewWidget widget="timeline" id="timeline" height={560} label="Top market stories, from TradingView" config={wire} />
        </Panel>
        <Panel title="Quotes board" note="Prices and the day's change for the same groups." className="lg:col-span-2">
          <TradingViewWidget widget="market-quotes" id="quotes" height={560} label="Market quotes board, from TradingView" config={board} />
        </Panel>
      </div>
      <p className="mt-3 text-[13px] text-faint">Market widgets by <a href="https://www.tradingview.com/" className="underline underline-offset-2" rel="noopener" target="_blank">TradingView</a>. Prices may be delayed.</p>
    </section>
  );
}
