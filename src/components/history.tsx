"use client";

// History behind a summary figure (owner 2026-11-20, "give dummy of historical at any given moment, via selectables").
// Tapping a figure in a Metrics row opens this sheet: a range (7, 30 or 90 days), the measure (count, amount, time),
// daily bars that a finger scrubs, the period summary against the period before, each breakdown as a ranked list that
// filters the bars, and the hours of the day. Data from scripts/distill.py build_history().

import { useRef, useState } from "react";
import { Group, Row, Segmented, Sheet } from "@/components/ios";
import { Share } from "@/components/ui";
import { buzz } from "@/lib/haptics";
import hist from "@/data/history.json";

type Measure = { k: string; unit: string; agg: string; values: number[] };
type Entry = { title: string; measures: Measure[]; breakdowns?: { title: string; items: { label: string; values: number[] }[] }[]; hours?: number[] };
const SERIES = hist.series as Record<string, Entry>;
const DAYS = hist.days;
type R = "7" | "30" | "90";

export const hasHistory = (k: string) => k in SERIES;

function fmt(v: number, unit: string) {
  if (unit === "usd") return Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(2)}m` : Math.abs(v) >= 1e4 ? `$${(v / 1e3).toFixed(1)}k` : `$${Math.round(v).toLocaleString("en-US")}`;
  if (unit === "min") return `${v < 10 ? v.toFixed(1) : Math.round(v)} min`;
  if (unit === "s") return `${v.toFixed(1)} s`;
  if (unit === "lots") return `${v.toFixed(1)} lots`;
  return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(1);
}
const day = (iso: string, long = false) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", long ? { weekday: "short", day: "numeric", month: "short" } : { day: "numeric", month: "short" });
const agg = (v: number[], how: string) => (v.length === 0 ? 0 : how === "sum" ? v.reduce((a, b) => a + b, 0) : how === "last" ? v[v.length - 1] : v.reduce((a, b) => a + b, 0) / v.length);

function DayBars({ values, dates, unit, tone }: { values: number[]; dates: string[]; unit: string; tone: string }) {
  const [at, setAt] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...values);
  const pick = (x: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.max(0, Math.min(values.length - 1, Math.floor(((x - r.left) / r.width) * values.length)));
    if (i !== at) { setAt(i); buzz(); }
  };
  const i = at ?? values.length - 1;
  return (
    <div className="hb">
      <div className="hb-read"><b>{fmt(values[i], unit)}</b><span>{day(dates[i], true)}{at === null ? ", today" : ""}</span></div>
      <div className="hb-plot" ref={box} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") pick(e.clientX); }} onPointerUp={() => setAt(null)} onPointerCancel={() => setAt(null)}>
        <span className="hb-max">{fmt(max, unit)}</span>
        {values.map((v, j) => <i key={j} className={j === i ? "on" : ""} style={{ height: `${Math.max(v ? 3 : 0, (v / max) * 100)}%`, background: tone }} />)}
      </div>
      <div className="bar-axis"><span>{day(dates[0])}</span><span>{day(dates[dates.length - 1])}</span></div>
    </div>
  );
}

export function HistorySheet({ k, onClose, tone = "var(--blue)" }: { k: string | null; onClose: () => void; tone?: string }) {
  const e = k ? SERIES[k] : null;
  const [r, setR] = useState<R>("30");
  const [m, setM] = useState(0);
  const [only, setOnly] = useState<string | null>(null);
  const n = Number(r);
  const meas = e?.measures[Math.min(m, (e?.measures.length ?? 1) - 1)];
  const item = only && e?.breakdowns?.flatMap((b) => b.items).find((x) => x.label === only);
  const full = item && meas === e?.measures[0] ? item.values : meas?.values ?? [];
  const cur = full.slice(-n), prev = full.slice(-2 * n, -n);
  const how = meas?.agg === "last" ? "avg" : meas?.agg ?? "sum";
  const total = agg(cur, how), before = agg(prev, how);
  const chg = before ? ((total - before) / Math.abs(before)) * 100 : 0;
  const top = cur.length ? cur.indexOf(Math.max(...cur)) : 0;
  const dates = DAYS.slice(-n);

  return (
    <Sheet open={!!e} onClose={() => { onClose(); setOnly(null); }} title={e?.title ?? "History"}>
      {e && meas && (
        <>
          <Segmented label="Range" value={r} onChange={(v) => setR(v)} options={[{ v: "7", label: "7 days" }, { v: "30", label: "30 days" }, { v: "90", label: "90 days" }]} />
          {e.measures.length > 1 && (
            <div className="tchips" role="radiogroup" aria-label="Measure">
              {e.measures.map((x, j) => <button key={x.k} role="radio" aria-checked={m === j} className={`tchip ${m === j ? "on" : ""}`} onClick={() => { buzz(); setM(j); setOnly(null); }}>{x.k}</button>)}
            </div>
          )}
          <Group header={only && meas === e.measures[0] ? `${meas.k}, ${only}` : meas.k}>
            <DayBars values={cur} dates={dates} unit={meas.unit} tone={tone} />
          </Group>
          <Group header="Summary">
            <Row title={how === "sum" ? `Total, ${n} days` : `Daily average, ${n} days`} detail={<b className="num">{fmt(total, meas.unit)}</b>} chevron={false} />
            {how === "sum" && <Row title="Daily average" detail={<span className="num">{fmt(total / n, meas.unit)}</span>} chevron={false} />}
            <Row title="Highest day" detail={<span className="num">{fmt(cur[top] ?? 0, meas.unit)} · {day(dates[top])}</span>} chevron={false} />
            <Row title={`Previous ${n} days`} detail={<span className="num">{fmt(before, meas.unit)} <b>{chg >= 0 ? "+" : ""}{chg.toFixed(0)}%</b></span>} chevron={false} />
          </Group>
          {e.breakdowns?.map((b) => {
            const sums = b.items.map((x) => ({ label: x.label, v: x.values.slice(-n).reduce((a, c) => a + c, 0) })).sort((a, c) => c.v - a.v);
            const all = sums.reduce((a, c) => a + c.v, 0);
            return (
              <Group key={b.title} header={`${b.title}, ${n} days`}>
                {sums.map((x) => (
                  <Row key={x.label} onClick={() => { buzz(); setOnly(only === x.label ? null : x.label); setM(0); }} chevron={false}
                    title={<span className={only && only !== x.label ? "muted" : ""}>{x.label}</span>}
                    subtitle={<Share v={x.v} of={all} tone={only === x.label ? tone : "var(--gray)"} />}
                    detail={<span className="num">{x.v} · {all ? Math.round((x.v / all) * 100) : 0}%</span>} />
                ))}
              </Group>
            );
          })}
          {e.hours && (
            <Group header="By hour, last 30 days, WIB">
              <div className="hb hb-hours">
                <div className="hb-plot">{e.hours.map((v, j) => <i key={j} style={{ height: `${(v / Math.max(1, ...e.hours!)) * 100}%`, background: tone }} />)}</div>
                <div className="hb-hx">{[0, 6, 12, 18].map((x) => <span key={x} style={{ left: `${(x / 24) * 100}%` }}>{String(x).padStart(2, "0")}</span>)}</div>
              </div>
            </Group>
          )}
        </>
      )}
    </Sheet>
  );
}
