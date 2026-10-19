"use client";

import { TradingViewWidget } from "./TradingViewWidget";

/** TradingView's advanced chart (daily candles) for one stock, in the instrument's colours. */
export function TradingViewChart({ symbol }: { symbol: string }) {
  return (
    <div>
      <TradingViewWidget widget="advanced-chart" id={symbol} height={440} label={`${symbol} daily price chart from TradingView`}
        config={p => ({
          symbol, interval: "D", range: "6M", timezone: "America/New_York", theme: p.dark ? "dark" : "light", style: "1",
          backgroundColor: p.panel, gridColor: p.rule, hide_side_toolbar: true, allow_symbol_change: false,
          save_image: false, details: false, calendar: false, autosize: true,
        })} />
      <p className="mt-2 text-[13px] text-faint">Chart by <a href={`https://www.tradingview.com/symbols/${encodeURIComponent(symbol)}/`} className="underline underline-offset-2" rel="noopener" target="_blank">TradingView</a>.</p>
    </div>
  );
}
