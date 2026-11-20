"use client";

// A scatter chart in the app's chart style (y axis on the right, hairline grid, no legend box): one dot per account,
// optional log x axis and quadrant dividers, a tap on a dot selects it. Used by Open Lots for lots against equity and
// for the portal's behaviour and edge maps.

import { buzz } from "@/lib/haptics";

export type Dot = { id: number; x: number; y: number; tone?: "neg" | "pos" | "warn" | "muted"; r?: number };

const nice = (v: number) => { const a = Math.abs(v); const s = a >= 1e6 ? `${+(a / 1e6).toFixed(1)}m` : a >= 1e3 ? `${+(a / 1e3).toFixed(1)}k` : a >= 10 ? a.toFixed(0) : +a.toFixed(2) + ""; return (v < 0 ? "-" : "") + s; };

export function Scatter({ dots, xLog, yLog, xLabel, yLabel, xDiv, yDiv, sel, onSel, height = 220 }: {
  dots: Dot[]; xLog?: boolean; yLog?: boolean; xLabel: string; yLabel: string; xDiv?: number; yDiv?: number; sel?: number | null; onSel?: (id: number) => void; height?: number;
}) {
  const W = 340, H = height, L = 8, R = 44, T = 10, B = 26;
  const fx = (v: number) => (xLog ? Math.log10(Math.max(v, 1e-6)) : v);
  const fy = (v: number) => (yLog ? Math.log10(Math.max(v, 1e-6)) : v);
  const { x0, x1, y0, y1, xt, yt } = (() => {
    const xs = dots.map((d) => fx(d.x)).concat(xDiv !== undefined ? [fx(xDiv)] : []), ys = dots.map((d) => fy(d.y)).concat(yDiv !== undefined ? [fy(yDiv)] : []);
    let a = Math.min(...xs), b = Math.max(...xs), c = Math.min(...ys), d = Math.max(...ys);
    if (a === b) { a -= 1; b += 1; } if (c === d) { c -= 1; d += 1; }
    const px = (b - a) * 0.06, py = (d - c) * 0.08;
    a -= px; b += px; c -= py; d += py;
    const ticks = (lo: number, hi: number, log?: boolean) => {
      if (log) { const out = []; for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) out.push(e); return out.length >= 2 ? out : [lo, (lo + hi) / 2, hi]; }
      const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 3))); const m = [1, 2, 5].map((k) => k * step).find((k) => (hi - lo) / k <= 5) ?? step * 10;
      const out = []; for (let v = Math.ceil(lo / m) * m; v <= hi; v += m) out.push(+v.toFixed(10)); return out;
    };
    return { x0: a, x1: b, y0: c, y1: d, xt: ticks(a, b, xLog), yt: ticks(c, d, yLog) };
  })();
  const sx = (v: number) => L + ((fx(v) - x0) / (x1 - x0)) * (W - L - R);
  const sy = (v: number) => T + (1 - (fy(v) - y0) / (y1 - y0)) * (H - T - B);
  const raw = (t: number, log?: boolean) => (log ? Math.pow(10, t) : t);

  return (
    <figure className="scatter">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} against ${xLabel}, ${dots.length} accounts`}>
        {yt.map((t) => <g key={`y${t}`}><line x1={L} x2={W - R} y1={sy(raw(t, yLog))} y2={sy(raw(t, yLog))} className="sc-grid" /><text x={W - R + 6} y={sy(raw(t, yLog)) + 4} className="sc-tick">{nice(raw(t, yLog))}</text></g>)}
        {xt.map((t) => <text key={`x${t}`} x={sx(raw(t, xLog))} y={H - 8} className="sc-tick" textAnchor="middle">{nice(raw(t, xLog))}</text>)}
        {xDiv !== undefined && <line x1={sx(xDiv)} x2={sx(xDiv)} y1={T} y2={H - B} className="sc-div" />}
        {yDiv !== undefined && <line x1={L} x2={W - R} y1={sy(yDiv)} y2={sy(yDiv)} className="sc-div" />}
        {dots.map((d, i) => (
          <circle key={d.id} cx={sx(d.x)} cy={sy(d.y)} r={(d.r ?? 4.5) + (sel === d.id ? 2.5 : 0)} className={`sc-dot sc-${d.tone ?? "muted"} ${sel === d.id ? "sc-on" : ""}`}
            style={{ animationDelay: `${Math.min(i * 18, 400)}ms` }} onClick={() => { buzz(); onSel?.(d.id); }} />
        ))}
      </svg>
      <figcaption><span>{xLabel}</span><span>{yLabel}</span></figcaption>
    </figure>
  );
}

/** Several series over one x axis, y axis on the right, last value labelled at the end of each line. */
export function MultiLine({ x, series, xLabel, unit = "", height = 200, mark }: {
  x: number[]; series: { name: string; values: number[]; color: string }[]; xLabel: string; unit?: string; height?: number; mark?: number;
}) {
  const W = 340, H = height, L = 6, R = 48, T = 10, B = 24;
  const all = series.flatMap((s) => s.values);
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (lo === hi) hi = lo + 1;
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const sx = (v: number) => L + ((v - x[0]) / ((x[x.length - 1] - x[0]) || 1)) * (W - L - R);
  const sy = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 3))); const m = [1, 2, 5].map((k) => k * step).find((k) => (hi - lo) / k <= 5) ?? step * 10;
  const yt: number[] = []; for (let v = Math.ceil(lo / m) * m; v <= hi; v += m) yt.push(+v.toFixed(8));
  const xt = [x[0], x[Math.floor(x.length / 2)], x[x.length - 1]];
  return (
    <figure className="scatter">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => `${s.name} ${nice(s.values[s.values.length - 1])}${unit}`).join(", ")}>
        {yt.map((t) => <g key={t}><line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} className={t === 0 ? "sc-div" : "sc-grid"} /><text x={W - R + 6} y={sy(t) + 4} className="sc-tick">{nice(t)}</text></g>)}
        {xt.map((t, i) => <text key={i} x={sx(t)} y={H - 6} className="sc-tick" textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}>{t} h</text>)}
        {mark !== undefined && <line x1={sx(mark)} x2={sx(mark)} y1={T} y2={H - B} className="sc-div" />}
        {series.map((s) => <polyline key={s.name} className="ml-line" pathLength={1} points={s.values.map((v, i) => `${sx(x[i]).toFixed(1)},${sy(v).toFixed(1)}`).join(" ")} style={{ stroke: s.color }} />)}
      </svg>
      <figcaption className="ml-legend">{series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name} {nice(s.values[s.values.length - 1])}{unit}</span>)}<span>{xLabel}</span></figcaption>
    </figure>
  );
}
