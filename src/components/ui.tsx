import { compact } from "@/lib/data";

// Stocks-style line. Cumulative client P&L, so a rising line means the client is winning.
export function Sparkline({ values, height = 32, fill = false, id }: { values: number[]; height?: number; fill?: boolean; id?: string }) {
  const cum: number[] = [];
  values.reduce((a, v) => { const n = a + v; cum.push(n); return n; }, 0);
  const min = Math.min(0, ...cum), max = Math.max(0, ...cum), w = 100, span = max - min || 1;
  const y = (v: number) => 2 + (height - 4) - ((v - min) / span) * (height - 4);
  const pts = cum.map((v, i) => `${((i / (cum.length - 1)) * w).toFixed(2)},${y(v).toFixed(2)}`);
  const up = cum[cum.length - 1] >= 0;
  const gid = `g-${id ?? "x"}-${up ? "u" : "d"}`;
  return (
    <svg className={`spark ${up ? "spark-up" : "spark-down"}`} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
      {fill && (
        <>
          <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".28" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
          <path d={`M0,${height} L${pts.join(" L")} L${w},${height} Z`} fill={`url(#${gid})`} stroke="none" />
        </>
      )}
      <line x1="0" x2={w} y1={y(0)} y2={y(0)} className="spark-zero" />
      <polyline points={pts.join(" ")} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// The Stocks app's change capsule.
export function ChangePill({ v }: { v: number }) {
  return <span className={`pill-chg ${v >= 0 ? "pill-up" : "pill-down"}`}>{compact(v, true)}</span>;
}

export function Pnl({ v, short = false }: { v: number; short?: boolean }) {
  const txt = short ? compact(v, true) : (v < 0 ? "-$" : "+$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <span className={v >= 0 ? "pos" : "neg"}>{txt}</span>;
}

// Contacts-style monogram.
export function Monogram({ name, size = 40 }: { name: string; size?: number }) {
  const n = name.replace("Demo Client ", "");
  return <span className="monogram" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">{/^\d+$/.test(n) ? `C${n}` : name.slice(0, 2).toUpperCase()}</span>;
}

const STATUS_LABEL = { watch: "Watch", escalated: "Escalated", cleared: "Cleared" } as const;
export function StatusTag({ s }: { s: keyof typeof STATUS_LABEL }) {
  return <span className={`tag tag-${s}`}>{STATUS_LABEL[s]}</span>;
}

/** Monthly or weekly counts as bars, labels under the first and last. */
export function Bars({ data, tone = "var(--blue)" }: { data: { label: string; v: number }[]; tone?: string }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  return (
    <div className="barchart">
      <div className="bars">{data.map((d) => <span key={d.label} title={`${d.label} ${d.v}`} style={{ height: `${(d.v / max) * 100}%`, background: tone }} />)}</div>
      {data.length > 1 && <div className="bar-axis"><span>{data[0].label}</span><span>{data[data.length - 1].label}</span></div>}
    </div>
  );
}

/** A share of the whole as a thin bar under a row. */
export function Share({ v, of, tone = "var(--blue)" }: { v: number; of: number; tone?: string }) {
  return <span className="hbar" aria-hidden><i style={{ width: `${of ? Math.max(2, (v / of) * 100) : 0}%`, background: tone }} /></span>;
}

/** P&L as a bar either side of a zero line, on a scale the caller shares across rows and groups, so the same dollar
 *  amount draws the same length everywhere (owner 2026-11-20, "at scale level toward each other"). */
export function DivBar({ v, max }: { v: number; max: number }) {
  const w = max ? Math.min(50, (Math.abs(v) / max) * 50) : 0;
  return (
    <span className="divbar" aria-hidden>
      <i className={v >= 0 ? "dv-pos" : "dv-neg"} style={{ width: `${Math.max(w, v ? 0.8 : 0)}%`, [v >= 0 ? "left" : "right"]: "50%" }} />
    </span>
  );
}
