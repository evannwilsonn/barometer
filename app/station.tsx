"use client";

import { useEffect, useRef, useState } from "react";
import type { Report } from "@/lib/station";
import type { Forecast } from "@/lib/forecast";

const fmt = (x: number) => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The signal mast: warning flags hoisted by level, after the US coastal warning displays. */
function Mast({ flags, name }: { flags: number; name: string }) {
  const pennant = (y: number) => <path d={`M30 ${y} L84 ${y + 14} L30 ${y + 28} Z`} fill="var(--flag)" />;
  const square = (y: number) => (
    <g>
      <rect x="30" y={y} width="46" height="40" fill="var(--flag)" />
      <rect x="45" y={y + 13} width="16" height="14" fill="var(--ink)" />
    </g>
  );
  const hoist =
    flags === 0 ? null :
    flags === 1 ? pennant(14) :
    flags === 2 ? <>{pennant(14)}{pennant(50)}</> :
    flags === 3 ? square(14) :
    <>{square(14)}{square(62)}</>;
  return (
    <svg viewBox="0 0 100 200" className="h-44 w-auto" role="img" aria-label={flags ? `${name}: ${flags} warning flag${flags > 1 ? "s" : ""} hoisted` : "No warning flags hoisted"}>
      <line x1="28" y1="6" x2="28" y2="196" stroke="var(--ink)" strokeWidth="3" />
      <line x1="14" y1="196" x2="42" y2="196" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="28" cy="6" r="4" fill="var(--ink)" />
      {hoist}
    </svg>
  );
}

/** Where the price is likely to close in a week: ±1σ (two weeks in three) and ±2σ (19 in 20). */
function RangeBar({ f }: { f: Forecast }) {
  const [lo2, hi2] = f.range95, [lo1, hi1] = f.range68;
  const pad = (hi2 - lo2) * 0.08;
  const min = lo2 - pad, max = hi2 + pad;
  const x = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <div>
      <div className="relative h-12">
        <div className="absolute top-3 h-6 rounded-sm bg-band-2" style={{ left: `${x(lo2)}%`, width: `${x(hi2) - x(lo2)}%` }} />
        <div className="absolute top-3 h-6 rounded-sm bg-band" style={{ left: `${x(lo1)}%`, width: `${x(hi1) - x(lo1)}%` }} />
        <div className="absolute top-0 h-12 w-[3px] -translate-x-1/2 bg-ink" style={{ left: `${x(f.price)}%` }} aria-hidden />
      </div>
      <div className="tabular relative mt-1 h-10 font-mono text-[13px] text-soft">
        <span className="absolute -translate-x-1/2" style={{ left: `${x(lo2)}%` }}>{fmt(lo2)}</span>
        <span className="absolute -translate-x-1/2 font-semibold text-ink" style={{ left: `${x(lo1)}%` }}>{fmt(lo1)}</span>
        <span className="absolute -translate-x-1/2 font-semibold text-ink" style={{ left: `${x(hi1)}%` }}>{fmt(hi1)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${x(hi2)}%` }}>{fmt(hi2)}</span>
      </div>
      <p className="text-[15px] text-soft">
        Closed at <b className="tabular text-ink">{fmt(f.price)}</b> on {f.asOf}. In about two weeks out of three, a week from now it should close inside the dark band (±{(f.weekSd * 100).toFixed(1)}%); in about 19 out of 20, inside the light one.
      </p>
    </div>
  );
}

/** The model's past forecasts for this stock against what each week turned out to be. */
function Backtest({ f }: { f: Forecast }) {
  const tip = useRef<HTMLDivElement>(null);
  const pts = f.history;
  const W = 720, H = 260, m = { l: 44, r: 16, t: 12, b: 30 };
  const vals = pts.flatMap(p => (p.y == null ? [p.f] : [p.f, p.y]));
  const top = Math.max(20, Math.ceil(Math.max(...vals) / 10) * 10);
  const X = (i: number) => m.l + (i / Math.max(1, pts.length - 1)) * (W - m.l - m.r);
  const Y = (v: number) => H - m.b - (Math.min(v, top) / top) * (H - m.t - m.b);
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((top / 4) * i));
  const months: { i: number; label: string }[] = [];
  pts.forEach((p, i) => {
    const mo = p.d.slice(0, 7);
    if (i === 0 || mo !== pts[i - 1].d.slice(0, 7)) months.push({ i, label: new Date(p.d + "T12:00:00").toLocaleString("en-US", { month: "short" }) });
  });
  const show = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round((((e.clientX - r.left) / r.width) * W - m.l) / ((W - m.l - m.r) / Math.max(1, pts.length - 1)));
    const p = pts[Math.max(0, Math.min(pts.length - 1, i))];
    if (!p || !tip.current) return;
    tip.current.textContent = `${p.d}\nforecast ${p.f}%\nthe week after ${p.y == null ? "not over yet" : p.y + "%"}`;
    tip.current.style.opacity = "1";
    tip.current.style.left = Math.min(e.clientX + 14, innerWidth - 220) + "px";
    tip.current.style.top = e.clientY + 14 + "px";
  };
  return (
    <div className="chart">
      <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[13px] text-soft">
        <span className="inline-flex items-center gap-2"><svg width="24" height="8" aria-hidden><line x1="0" y1="4" x2="24" y2="4" stroke="var(--sea)" strokeWidth="2" /></svg>forecast for the next week</span>
        <span className="inline-flex items-center gap-2"><svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="3" fill="var(--soft)" /></svg>what the week turned out to be</span>
      </div>
      <div className="overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[560px]" role="img" aria-label={`Past next-week volatility forecasts for ${f.symbol} against realised volatility`} onPointerMove={show} onPointerLeave={() => tip.current && (tip.current.style.opacity = "0")}>
        <g className="grid">{ticks.map(v => <line key={v} x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} />)}</g>
        {ticks.map(v => <text key={v} x={m.l - 8} y={Y(v) + 4} textAnchor="end">{v}%</text>)}
        {months.filter((_, k) => k % 2 === 0).map(({ i, label }) => <text key={i} x={X(i)} y={H - 8} textAnchor="middle">{label}</text>)}
        {pts.map((p, i) => p.y == null ? null : <circle key={i} cx={X(i)} cy={Y(p.y)} r="2.2" fill="var(--soft)" opacity="0.55" />)}
        <path d={"M" + pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.f).toFixed(1)}`).join("L")} fill="none" stroke="var(--sea)" strokeWidth="2" />
      </svg></div>
      <div ref={tip} className="tip" style={{ opacity: 0 }} role="tooltip" />
    </div>
  );
}

function Board({ r }: { r: Report }) {
  const f = r.forecast;
  const cmp = f.vol > f.lastMonth * 1.1 ? "rougher than" : f.vol < f.lastMonth * 0.9 ? "calmer than" : "about the same as";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-md bg-line lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <section className="bg-paper p-6 sm:p-8" aria-label="Forecast">
        <p className="label">{f.symbol} · next 5 trading days</p>
        <div className="mt-4 flex items-end gap-5">
          <Mast flags={f.level.flags} name={f.level.name} />
          <div className="pb-1">
            <p className="font-display text-[44px] leading-[.95] font-extrabold uppercase sm:text-[52px]">{f.level.name}</p>
            <p className="mt-2 text-[15px] text-soft">{f.level.note}</p>
          </div>
        </div>
        <dl className="tabular mt-7 grid grid-cols-3 gap-4 border-t border-line pt-5">
          <div><dt className="label">Forecast</dt><dd className="font-display text-[40px] leading-none font-extrabold">{f.vol}%</dd></div>
          <div><dt className="label">Last month</dt><dd className="font-display text-[40px] leading-none font-semibold text-soft">{f.lastMonth}%</dd></div>
          <div><dt className="label">EWMA</dt><dd className="font-display text-[40px] leading-none font-semibold text-soft">{f.ewma}%</dd></div>
        </dl>
        <p className="mt-3 text-[14px] text-faint">Annualised volatility, so 20% means a typical day moves about 1.3%. The forecast is {cmp} the last month.</p>
      </section>
      <section className="bg-paper p-6 sm:p-8" aria-label="Likely range and note">
        <p className="label">Likely close a week from now</p>
        <div className="mt-4"><RangeBar f={f} /></div>
        <figure className="mt-7 border-t border-line pt-5">
          <blockquote className="text-[18px] leading-relaxed">{r.note.text}</blockquote>
          <figcaption className="label mt-3">{r.note.by} · not investment advice</figcaption>
        </figure>
      </section>
      <section className="bg-paper p-6 sm:p-8 lg:col-span-2" aria-label="Backtest">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[28px] font-extrabold uppercase">How it did on {f.symbol}</h2>
          {f.hitRate && <p className="text-[15px] text-soft">Of {f.hitRate.n} past forecasts here, {(f.hitRate.within68 * 100).toFixed(0)}% saw the next week close inside the ±1σ band (68% would be exact).</p>}
        </div>
        <Backtest f={f} />
      </section>
    </div>
  );
}

export function Station({ initial, initialError }: { initial: Report | null; initialError: string | null }) {
  const [r, setR] = useState<Report | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState(initial?.forecast.symbol ?? "AAPL");

  async function load(symbol: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/forecast/${encodeURIComponent(symbol)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || res.statusText);
      setR(body);
      history.replaceState(null, "", `?s=${body.forecast.symbol}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const s = new URLSearchParams(location.search).get("s");
    if (s && s.toUpperCase() !== initial?.forecast.symbol) { setQ(s.toUpperCase()); load(s); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <form className="mb-6 flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); if (q.trim()) load(q.trim()); }}>
        <label className="grow sm:grow-0">
          <span className="label mb-1 block">Ticker</span>
          <input value={q} onChange={e => setQ(e.target.value.toUpperCase())} className="w-full rounded-sm border border-line bg-paper px-3 py-2 font-mono text-[18px] uppercase sm:w-56" autoComplete="off" spellCheck={false} aria-describedby="hint" />
        </label>
        <button type="submit" disabled={busy} className="rounded-sm bg-ink px-5 py-[11px] font-mono text-[14px] tracking-wider text-paper uppercase disabled:opacity-60">{busy ? "Reading the glass…" : "Forecast"}</button>
        <p id="hint" className="w-full text-[14px] text-faint">US stocks and ETFs. The model was fitted on S&P 500 stocks, so it fits large companies best.</p>
      </form>
      {error && <p role="alert" className="mb-6 rounded-sm border border-flag px-4 py-3 text-[15px]">Couldn&apos;t forecast that: {error}.</p>}
      {r?.demo && <p className="mb-6 text-[14px] text-faint">Running on the price service&apos;s public demo key, which only covers a few symbols such as AAPL.</p>}
      {r && <div className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}><Board r={r} /></div>}
    </div>
  );
}
