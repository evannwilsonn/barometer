"use client";

import { useEffect, useRef } from "react";

export type Palette = { dark: boolean; panel: string; rule: string; line: string; faint: string; band: string; brass: string; ink: string };

/** The page's colours, read from the CSS tokens so the widgets follow light and dark mode. */
function palette(): Palette {
  const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const dark = matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
  return { dark, panel: css("--panel"), rule: css("--rule"), line: css("--line"), faint: css("--faint"), band: css("--band"), brass: css("--brass"), ink: css("--ink") };
}

/**
 * One of TradingView's free embeddable widgets. TradingView's script reads the JSON config from
 * its own text and builds the widget in the container; it's rebuilt when `id` changes and
 * removed on unmount. `config` receives the page's palette, so each widget can be dressed to match.
 */
export function TradingViewWidget({ widget, id, config, height, label }: {
  widget: "advanced-chart" | "market-overview" | "stock-heatmap" | "timeline" | "market-quotes";
  id: string;
  config: (p: Palette) => Record<string, unknown>;
  height: number;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
    const s = document.createElement("script");
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widget}.js`;
    s.async = true;
    s.innerHTML = JSON.stringify({ locale: "en", support_host: "https://www.tradingview.com", ...config(palette()) });
    el.appendChild(s);
    return () => { el.innerHTML = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget, id]);
  return <div ref={box} role="region" className="tradingview-widget-container w-full overflow-hidden rounded-sm" style={{ height }} aria-label={label} />;
}
