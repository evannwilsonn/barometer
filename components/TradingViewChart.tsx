"use client";

import { useEffect, useRef } from "react";

/**
 * TradingView's free advanced-chart widget (daily candles), dressed in the instrument's colours.
 * TradingView's script builds the chart inside the container; it's rebuilt when the symbol or
 * colour scheme changes and removed on unmount.
 */
export function TradingViewChart({ symbol }: { symbol: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const dark = matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
    const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    el.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbol,
      interval: "D",
      range: "6M",
      timezone: "America/New_York",
      theme: dark ? "dark" : "light",
      style: "1",
      locale: "en",
      backgroundColor: css("--porcelain"),
      gridColor: css("--rule"),
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      details: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      autosize: true,
    });
    el.appendChild(s);
    return () => { el.innerHTML = ""; };
  }, [symbol]);
  return (
    <div>
      <div ref={box} className="tradingview-widget-container h-[440px] w-full overflow-hidden rounded-sm" aria-label={`${symbol} daily price chart from TradingView`} />
      <p className="mt-2 text-[13px] text-faint">Chart by <a href={`https://www.tradingview.com/symbols/${encodeURIComponent(symbol)}/`} className="underline underline-offset-2" rel="noopener" target="_blank">TradingView</a>.</p>
    </div>
  );
}
