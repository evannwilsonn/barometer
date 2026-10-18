"use client";

import { useEffect, useRef, useState } from "react";
import type { Report } from "@/lib/station";
import { LEVELS, type Forecast } from "@/lib/forecast";
import { LogbookButton } from "@/components/LogbookButton";
import { NewsList } from "@/components/NewsList";
import { TradingViewChart } from "@/components/TradingViewChart";

const fmt = (x: number) => x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------- the dial ----------

const CX = 200, CY = 200;
/** The scale runs 270° clockwise from the lower left, square-root spaced so the busy low end gets room. */
const angleOf = (v: number) => -135 + 270 * Math.sqrt(Math.max(0, Math.min(v, 100)) / 100);
const at = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = at(from, r), [x2, y2] = at(to, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

/** An aneroid barometer: the needle is the forecast, the copper set hand last month's volatility. */
function Dial({ f }: { f: Forecast }) {
  const bounds = [...LEVELS.map(l => l.min), 100];
  const minor = Array.from({ length: 21 }, (_, i) => i * 5);
  const major = [0, 10, 20, 30, 40, 60, 80, 100];
  return (
    <svg viewBox="0 0 400 400" className="dial block h-auto w-full max-w-[460px]" role="img"
      aria-label={`Barometer dial for ${f.symbol}: the needle reads ${f.vol}% (${f.level.name}); the set hand marks last month at ${f.lastMonth}%.`}>
      <circle cx={CX} cy={CY} r="196" fill="var(--case)" />
      <circle cx={CX} cy={CY} r="182" fill="none" stroke="var(--copper)" strokeWidth="2" />
      <circle cx={CX} cy={CY} r="176" fill="var(--porcelain)" />

      {/* zones: thin track, the current one drawn heavier */}
      {LEVELS.map((l, i) => {
        const a0 = angleOf(bounds[i]), a1 = angleOf(bounds[i + 1]);
        const on = l.name === f.level.name;
        return <path key={l.name} d={arc(a0 + 0.6, a1 - 0.6, 150)} fill="none" stroke={on ? "var(--merlot)" : "var(--rule)"} strokeWidth={on ? 7 : 4} />;
      })}

      {minor.map(v => { const [x1, y1] = at(angleOf(v), 158), [x2, y2] = at(angleOf(v), 164); return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--faint)" strokeWidth="1" />; })}
      {major.map(v => {
        const [x1, y1] = at(angleOf(v), 156), [x2, y2] = at(angleOf(v), 168);
        const [tx, ty] = at(angleOf(v), 134);
        return <g key={v}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink)" strokeWidth="2" /><text x={tx} y={ty + 4} textAnchor="middle" fontSize="13" fill="var(--soft)">{v}</text></g>;
      })}

      {/* the words, set along the dial like Stormy · Rain · Change · Fair; the last zone is too narrow for an arc */}
      <defs>
        {LEVELS.map((l, i) => <path key={l.name} id={`zone-${i}`} d={arc(angleOf(bounds[i]), angleOf(bounds[i + 1]), 104)} />)}
      </defs>
      {LEVELS.map((l, i) => {
        const on = l.name === f.level.name;
        const fill = on ? "var(--merlot)" : "var(--faint)";
        if (i === LEVELS.length - 1) {
          const [x, y] = at((angleOf(bounds[i]) + angleOf(100)) / 2, 108);
          return <text key={l.name} x={x - 6} y={y + 18} textAnchor="middle" fontSize="11" letterSpacing="1.5" fill={fill}>{l.name.toUpperCase()}</text>;
        }
        return (
          <text key={l.name} fontSize="14" letterSpacing="1.5" fill={fill}>
            <textPath href={`#zone-${i}`} startOffset="50%" textAnchor="middle">{l.name.toUpperCase()}</textPath>
          </text>
        );
      })}

      <text x={CX} y={CY + 52} textAnchor="middle" fontSize="30" letterSpacing="3" fill="var(--ink)">{f.symbol}</text>
      <text x={CX} y={CY + 72} textAnchor="middle" fontSize="10" letterSpacing="2" fill="var(--faint)">% A YEAR, NEXT WEEK</text>
      <text x={CX} y={CY + 128} textAnchor="middle" fontSize="9" letterSpacing="3" fill="var(--faint)">BAROMETER · No. 11</text>

      {/* copper set hand: last month */}
      <g transform={`rotate(${angleOf(f.lastMonth)} ${CX} ${CY})`}>
        <line x1={CX} y1={CY} x2={CX} y2={CY - 168} stroke="var(--copper)" strokeWidth="2.5" />
        <path d={`M${CX - 6} ${CY - 156} L${CX} ${CY - 172} L${CX + 6} ${CY - 156} Z`} fill="var(--copper)" />
        <circle cx={CX} cy={CY} r="16" fill="none" stroke="var(--copper)" strokeWidth="2.5" />
      </g>

      {/* the needle: the forecast */}
      <g className="needle" style={{ transform: `rotate(${angleOf(f.vol)}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
        <path d={`M${CX - 3.5} ${CY + 34} L${CX - 1.6} ${CY - 150} L${CX} ${CY - 162} L${CX + 1.6} ${CY - 150} L${CX + 3.5} ${CY + 34} Z`} fill="var(--needle)" />
        <circle cx={CX} cy={CY + 30} r="9" fill="var(--needle)" />
      </g>
      <circle cx={CX} cy={CY} r="7" fill="var(--case)" stroke="var(--copper)" strokeWidth="2" />
    </svg>
  );
}

// ---------- the vernier: where the price is likely to close in a week ----------

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map(k => k * p).find(s => s >= raw) ?? 10 * p;
}

function Vernier({ f }: { f: Forecast }) {
  const [lo2, hi2] = f.range95, [lo1, hi1] = f.range68;
  const pad = (hi2 - lo2) * 0.1;
  const min = lo2 - pad, max = hi2 + pad;
  const x = (v: number) => ((v - min) / (max - min)) * 100;
  const step = niceStep((max - min) / 8);
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
  return (
    <div>
      <div className="relative h-16 rounded-sm border border-rule bg-porcelain">
        <div className="absolute inset-y-3 bg-band-2" style={{ left: `${x(lo2)}%`, width: `${x(hi2) - x(lo2)}%` }} />
        <div className="absolute inset-y-3 bg-band" style={{ left: `${x(lo1)}%`, width: `${x(hi1) - x(lo1)}%` }} />
        {ticks.map(v => <div key={v} className="absolute bottom-0 h-2 w-px bg-faint" style={{ left: `${x(v)}%` }} aria-hidden />)}
        <div className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-ink" style={{ left: `${x(f.price)}%` }} aria-hidden />
        <div className="absolute -top-[7px] h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[8px] border-x-transparent border-t-ink" style={{ left: `${x(f.price)}%` }} aria-hidden />
      </div>
      <div className="tabular relative mt-2 h-6 font-mono text-[12.5px] text-soft">
        <span className="absolute -translate-x-1/2" style={{ left: `${x(lo2)}%` }}>{fmt(lo2)}</span>
        <span className="absolute -translate-x-1/2 font-semibold text-ink" style={{ left: `${x(lo1)}%` }}>{fmt(lo1)}</span>
        <span className="absolute -translate-x-1/2 font-semibold text-ink" style={{ left: `${x(hi1)}%` }}>{fmt(hi1)}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${x(hi2)}%` }}>{fmt(hi2)}</span>
      </div>
      <p className="mt-3 text-[16px] leading-relaxed text-soft">
        Closed at <b className="tabular text-ink">{fmt(f.price)}</b> on {f.asOf}. In about two weeks out of three it should close inside the darker band a week from now (±{(f.weekSd * 100).toFixed(1)}%); in about 19 out of 20, inside the lighter one.
      </p>
      <p className="mt-2 text-[13px] text-faint">Data provided by <a href="https://twelvedata.com" className="underline underline-offset-2">Twelve Data</a>. Not investment advice.</p>
    </div>
  );
}

// ---------- the barograph: past forecasts against what each week turned out to be ----------

function Barograph({ f }: { f: Forecast }) {
  const tip = useRef<HTMLDivElement>(null);
  const pts = f.history;
  const W = 760, H = 250, m = { l: 44, r: 14, t: 14, b: 30 };
  const vals = pts.flatMap(p => (p.y == null ? [p.f] : [p.f, p.y]));
  const top = Math.max(20, Math.ceil(Math.max(...vals) / 10) * 10);
  const X = (i: number) => m.l + (i / Math.max(1, pts.length - 1)) * (W - m.l - m.r);
  const Y = (v: number) => H - m.b - (Math.min(v, top) / top) * (H - m.t - m.b);
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((top / 4) * i));
  const months: { i: number; label: string }[] = [];
  pts.forEach((p, i) => {
    if (i === 0 || p.d.slice(0, 7) !== pts[i - 1].d.slice(0, 7)) months.push({ i, label: new Date(p.d + "T12:00:00").toLocaleString("en-US", { month: "short" }) });
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
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[12.5px] text-soft">
        <span className="inline-flex items-center gap-2"><svg width="24" height="8" aria-hidden><line x1="0" y1="4" x2="24" y2="4" stroke="var(--line)" strokeWidth="2" /></svg>forecast for the next week</span>
        <span className="inline-flex items-center gap-2"><svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="3" fill="var(--soft)" /></svg>what the week turned out to be</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[560px]" role="img" aria-label={`Past next-week volatility forecasts for ${f.symbol} against realised volatility`}
          onPointerMove={show} onPointerLeave={() => tip.current && (tip.current.style.opacity = "0")}>
          <g className="grid">
            {ticks.map(v => <line key={v} x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} />)}
            {months.map(({ i }) => <line key={i} x1={X(i)} x2={X(i)} y1={m.t} y2={H - m.b} />)}
          </g>
          {ticks.map(v => <text key={v} x={m.l - 8} y={Y(v) + 4} textAnchor="end">{v}%</text>)}
          {months.filter((_, k) => k % 2 === 0).map(({ i, label }) => <text key={i} x={X(i) + 4} y={H - 10}>{label}</text>)}
          {pts.map((p, i) => (p.y == null ? null : <circle key={i} cx={X(i)} cy={Y(p.y)} r="2.2" fill="var(--soft)" opacity="0.5" />))}
          <path d={"M" + pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.f).toFixed(1)}`).join("L")} fill="none" stroke="var(--line)" strokeWidth="2" />
        </svg>
      </div>
      <div ref={tip} className="tip" style={{ opacity: 0 }} role="tooltip" />
    </div>
  );
}

// ---------- the instrument ----------

type Account = { accounts: boolean; signedIn: boolean; saved: string[] };

function Instrument({ r, account }: { r: Report; account: Account }) {
  const f = r.forecast;
  const cmp = f.vol > f.lastMonth * 1.1 ? "rougher than" : f.vol < f.lastMonth * 0.9 ? "calmer than" : "about the same as";
  const readings: [string, string, string, string | null][] = [
    ["Needle", "forecast, next 5 trading days", `${f.vol}%`, "var(--needle)"],
    ["Set hand", "last month, as it happened", `${f.lastMonth}%`, "var(--copper)"],
    ["Reference", "EWMA, the industry default", `${f.ewma}%`, null],
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-14">
      <div className="mx-auto w-full max-w-[460px]"><Dial f={f} /></div>
      <div className="min-w-0">
        <p className="label">Reading for {f.symbol}</p>
        <p className="engraved mt-2 text-[56px] leading-none text-merlot sm:text-[68px]">{f.level.name}</p>
        <p className="mt-2 text-[18px] text-soft">{f.level.note}; {cmp} the last month.</p>
        {account.accounts && <div className="mt-5"><LogbookButton key={f.symbol} symbol={f.symbol} signedIn={account.signedIn} saved={account.saved.includes(f.symbol)} /></div>}
        <dl className="mt-7 divide-y divide-rule border-y border-rule">
          {readings.map(([k, note, v, swatch]) => (
            <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3">
              <dt>
                <span className="engraved inline-flex items-center gap-2 text-[15px]">
                  {swatch ? <span className="inline-block h-[3px] w-5" style={{ background: swatch }} aria-hidden /> : <span className="inline-block w-5" aria-hidden />}
                  {k}
                </span>
                <span className="block pl-7 text-[14px] text-faint">{note}</span>
              </dt>
              <dd className="tabular engraved text-[30px] leading-none">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[14px] text-faint">Volatility is annualised: 20% means a typical day moves about 1.3%.</p>
        <div className="mt-8">
          <p className="label mb-3">Likely close a week from now</p>
          <Vernier f={f} />
        </div>
      </div>
    </div>
  );
}

function Log({ r }: { r: Report }) {
  return (
    <figure className="grid grid-cols-[minmax(0,1fr)] gap-3 border-y-2 border-ink py-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
      <figcaption className="label leading-relaxed">
        <span className="block text-ink">Log · {r.forecast.asOf}</span>
        {r.note.by}. Not investment advice.
      </figcaption>
      <blockquote className="text-[21px] leading-relaxed italic">{r.note.text}</blockquote>
    </figure>
  );
}

export function Station({ initial, initialError, ...account }: { initial: Report | null; initialError: string | null } & Account) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
      <form className="mb-8 flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); if (q.trim()) load(q.trim()); }}>
        <label className="grow sm:grow-0">
          <span className="label mb-1 block">Set the instrument to a ticker</span>
          <input value={q} onChange={e => setQ(e.target.value.toUpperCase())} className="engraved w-full rounded-sm border border-rule bg-porcelain px-3 py-2 text-[20px] sm:w-60" autoComplete="off" spellCheck={false} aria-describedby="hint" />
        </label>
        <button type="submit" disabled={busy} className="rounded-sm bg-case px-5 py-[12px] font-mono text-[13px] tracking-wider text-case-ink uppercase disabled:opacity-60">{busy ? "Tapping the glass…" : "Take a reading"}</button>
        <p id="hint" className="w-full text-[14px] text-faint">US stocks and ETFs. The model was fitted on S&amp;P 500 stocks, so it reads large companies best.</p>
      </form>
      {error && <p role="alert" className="mb-8 rounded-sm border border-merlot px-4 py-3 text-[16px]">Couldn&apos;t take that reading: {error}.</p>}
      {r?.demo && <p className="mb-8 text-[14px] text-faint">Running on the price service&apos;s public demo key, which only covers a few symbols such as AAPL.</p>}
      {r && (
        <div className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <section className="rounded-md bg-porcelain p-6 sm:p-10" aria-label="Reading"><Instrument r={r} account={account} /></section>
          <div className="mt-10"><Log r={r} /></div>
          <section className="mt-12" aria-labelledby="h-baro">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="h-baro" className="engraved text-[26px]">Barograph · {r.forecast.symbol}</h2>
              {r.forecast.hitRate && <p className="text-[16px] text-soft">Of {r.forecast.hitRate.n} past forecasts here, {(r.forecast.hitRate.within68 * 100).toFixed(0)}% saw the next week close inside the darker band (68% would be exact).</p>}
            </div>
            <div className="rounded-md bg-porcelain p-5 sm:p-7"><Barograph f={r.forecast} /></div>
          </section>
          {mounted && (
            <section className="mt-12" aria-labelledby="h-chart">
              <h2 id="h-chart" className="engraved mb-4 text-[26px]">Price chart · {r.forecast.symbol}</h2>
              <div className="rounded-md bg-porcelain p-3 sm:p-4"><TradingViewChart symbol={r.forecast.symbol} /></div>
            </section>
          )}
          {mounted && <NewsList symbol={r.forecast.symbol} />}
        </div>
      )}
    </div>
  );
}
