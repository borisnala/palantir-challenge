import Link from "next/link";
import { compact } from "@/lib/data";

export function Sparkline({ values, height = 36 }: { values: number[]; height?: number }) {
  // Cumulative client P&L: rising line = client winning = broker losing.
  const cum: number[] = [];
  values.reduce((a, v) => { const n = a + v; cum.push(n); return n; }, 0);
  const min = Math.min(0, ...cum), max = Math.max(0, ...cum), w = 100, span = max - min || 1;
  const y = (v: number) => height - ((v - min) / span) * height;
  const d = cum.map((v, i) => `${i ? "L" : "M"}${((i / (cum.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = cum[cum.length - 1] >= 0;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
      <line x1="0" x2={w} y1={y(0)} y2={y(0)} className="spark-zero" />
      <path d={d} className={up ? "spark-up" : "spark-down"} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Pnl({ v, short = false }: { v: number; short?: boolean }) {
  return <span className={v >= 0 ? "pos" : "neg"}>{short ? compact(v, true) : (v < 0 ? "-$" : "+$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
}

export function SecHead({ title, count, href }: { title: string; count?: number; href?: string }) {
  const inner = <>{title}{count !== undefined && <span className="seccount">{count}</span>}{href && <i className="chev" />}</>;
  return href ? <Link href={href} className="sechead">{inner}</Link> : <h2 className="sechead">{inner}</h2>;
}

const STATUS_LABEL = { watch: "Watch", escalated: "Escalated", cleared: "Cleared" } as const;
export function StatusTag({ s }: { s: keyof typeof STATUS_LABEL }) {
  return <span className={`tag tag-${s}`}>{STATUS_LABEL[s]}</span>;
}

export function RiskDot({ r }: { r: "low" | "medium" | "high" }) {
  return <span className={`risk risk-${r}`}><i />{r[0].toUpperCase() + r.slice(1)} risk</span>;
}

export function Initials({ name }: { name: string }) {
  const n = name.replace("Demo Client ", "");
  return <span className="avatar" aria-hidden="true">{/^\d+$/.test(n) ? `C${n}` : name.slice(0, 2)}</span>;
}
