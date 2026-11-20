"use client";

// Monthly history over the account's life, the portal's MONTHLY HISTORY panel as a sheet (owner 2026-11-20, "make this
// just a pop up window", then "more complex and interactive"). A month chart a finger scrubs, measure and symbol
// filters, lifetime figures and asset mix, the months sortable, and a month pushes its figures against the month
// before and its symbols. P&L follows the point of view, balance and equity never flip.

import { useRef, useState } from "react";
import { Group, Row, Segmented, useSheetPush } from "./ios";
import { DivBar, Pnl } from "./ui";
import { compact, num } from "@/lib/data";
import { buzz } from "@/lib/haptics";

type Asset = { symbol: string; pct: number };
type Sym = { symbol: string; trades: number; lots: number; net_exposure: number; pl: number; win_rate: number; hold_days: number };
type Month = { month: string; open_lot: number; close_lot: number; trades: number; win_rate: number; net_exposure: number; hold_days: number; pl: number; balance: number; equity: number; assets: Asset[]; symbols: Sym[] };
type Total = Omit<Month, "month" | "symbols">;
export type Monthly = { months: Month[]; total: Total };

const HUE = ["var(--orange)", "var(--blue)", "var(--green)", "var(--purple)", "var(--red)", "var(--gray)"];
const NAME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (m: string, long = false) => { const [y, k] = m.split("-"); return long ? `${new Date(Number(y), Number(k) - 1).toLocaleString("en-GB", { month: "long" })} ${y}` : `${NAME[Number(k) - 1]} ${y}`; };
const signed = (v: number, d = 2) => `${v > 0 ? "+" : ""}${v.toFixed(d)}`;

type Measure = "pl" | "trades" | "win" | "lots" | "balance";
const MEASURES: { v: Measure; label: string }[] = [{ v: "pl", label: "P&L" }, { v: "trades", label: "Trades" }, { v: "win", label: "Win rate" }, { v: "lots", label: "Lots" }, { v: "balance", label: "Balance" }];

/** One month's figures, whole account or one symbol. */
function figs(m: Month, sym: string | null) {
  if (!sym) return { pl: m.pl, trades: m.trades, win: m.win_rate, lots: m.open_lot, balance: m.balance };
  const x = m.symbols.find((s) => s.symbol === sym);
  return { pl: x?.pl ?? 0, trades: x?.trades ?? 0, win: x?.win_rate ?? 0, lots: x?.lots ?? 0, balance: m.balance };
}
const show = (k: Measure, v: number, sg: number) => (k === "pl" ? compact(v * sg, true) : k === "win" ? `${Math.round(v)}%` : k === "lots" ? `${num(v, 1)} lots` : k === "balance" ? compact(v) : `${v}`);

function Mix({ assets, hue }: { assets: Asset[]; hue: (s: string) => string }) {
  const shown = assets.filter((a) => a.pct > 0);
  return <span className="mix" aria-hidden>{shown.map((a) => <i key={a.symbol} style={{ flex: a.pct, background: hue(a.symbol) }} />)}</span>;
}

function Delta({ v, unit = "", good = 1 }: { v: number; unit?: string; good?: number }) {
  if (!Number.isFinite(v) || v === 0) return <span className="muted">no change</span>;
  return <span className={good === 0 ? "" : v * good > 0 ? "pos" : "neg"}>{v > 0 ? "+" : ""}{unit === "$" ? compact(v, false) : `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`}</span>;
}

function MonthPage({ m, prev, sg, hue }: { m: Month; prev?: Month; sg: number; hue: (s: string) => string }) {
  const plMax = Math.max(1, ...m.symbols.map((x) => Math.abs(x.pl)));
  return (
    <>
      <div className="metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div><span>P&L</span><b className={m.pl * sg >= 0 ? "pos" : "neg"}>{compact(m.pl * sg, true)}</b></div>
        <div><span>Trades</span><b>{m.trades}</b></div>
        <div><span>Win rate</span><b>{Math.round(m.win_rate)}%</b></div>
        <div><span>Lots</span><b>{num(m.open_lot, 1)}</b></div>
      </div>
      {prev && (
        <Group header={`Against ${label(prev.month)}`}>
          <Row title="P&L" detail={<span className="num"><Delta v={(m.pl - prev.pl) * sg} unit="$" /></span>} chevron={false} />
          <Row title="Trades" detail={<span className="num"><Delta v={m.trades - prev.trades} good={0} /></span>} chevron={false} />
          <Row title="Win rate" detail={<span className="num"><Delta v={Math.round(m.win_rate - prev.win_rate)} unit=" pts" good={sg} /></span>} chevron={false} />
          <Row title="Lots" detail={<span className="num"><Delta v={Number((m.open_lot - prev.open_lot).toFixed(1))} good={0} /></span>} chevron={false} />
        </Group>
      )}
      <Group header="Month">
        <Row title="Open lots" detail={<span className="num">{num(m.open_lot, 2)}</span>} chevron={false} />
        <Row title="Close lots" detail={<span className="num">{num(m.close_lot, 2)}</span>} chevron={false} />
        <Row title="Net exposure" detail={<span className={`num ${m.net_exposure >= 0 ? "pos" : "neg"}`}>{signed(m.net_exposure)} lots</span>} chevron={false} />
        <Row title="Average hold" detail={<span className="num">{m.hold_days.toFixed(1)} d</span>} chevron={false} />
        <Row title="Balance at month end" detail={<span className="num">{compact(m.balance)}</span>} chevron={false} />
        <Row title="Equity at month end" detail={<span className="num">{compact(m.equity)}</span>} chevron={false} />
      </Group>
      <Group header="Asset mix"><div className="mix-wrap"><Mix assets={m.assets} hue={hue} /><span className="mix-keys">{m.assets.filter((a) => a.pct > 0).map((a) => <span key={a.symbol}><i style={{ background: hue(a.symbol) }} />{a.symbol} {a.pct}%</span>)}</span></div></Group>
      <Group header="By symbol" footer="P&L bars share one scale. Net exposure in lots, average hold in days.">
        {m.symbols.map((x) => (
          <Row key={x.symbol} chevron={false} icon={<i className="mix-dot" style={{ background: hue(x.symbol) }} />}
            title={x.symbol} subtitle={<span className="mrow-sub"><span>{x.trades} trades · {Math.round(x.win_rate)}% win · {num(x.lots, 2)} lots · net {signed(x.net_exposure)} · {x.hold_days.toFixed(1)} d</span><DivBar v={x.pl * sg} max={plMax} /></span>}
            detail={<Pnl v={x.pl * sg} short />} />
        ))}
      </Group>
    </>
  );
}

/** Months as bars, P&L diverging from zero, the rest from the floor. A finger scrubs, a tap on the reading opens it. */
function MonthBars({ months, k, sym, sg, at, setAt, onOpen }: { months: Month[]; k: Measure; sym: string | null; sg: number; at: number; setAt: (i: number) => void; onOpen: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const vals = months.map((m) => figs(m, sym)[k] * (k === "pl" ? sg : 1));
  const div = k === "pl";
  const max = Math.max(1, ...vals.map((v) => Math.abs(v)));
  const pick = (x: number) => {
    const r = box.current?.getBoundingClientRect(); if (!r) return;
    const i = Math.max(0, Math.min(months.length - 1, Math.floor(((x - r.left) / r.width) * months.length)));
    if (i !== at) { setAt(i); buzz(); }
  };
  const m = months[at];
  return (
    <div className="hb mb">
      <button className="mb-read" onClick={() => { buzz(); onOpen(at); }}>
        <b className={div ? (vals[at] >= 0 ? "pos" : "neg") : ""}>{show(k, figs(m, sym)[k], sg)}</b>
        <span>{label(m.month, true)}{sym ? `, ${sym}` : ""}</span>
        <span className="mb-open">Open</span>
      </button>
      <div className={`hb-plot mb-plot ${div ? "mb-div" : ""}`} ref={box} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") pick(e.clientX); }}>
        {vals.map((v, j) => (
          <span key={j} className={j === at ? "on" : ""}>
            <i style={{ height: `${Math.max(v ? 2 : 0, (Math.abs(v) / max) * (div ? 50 : 100))}%`, background: div ? (v >= 0 ? "var(--green)" : "var(--red)") : "var(--blue)", ...(div ? (v >= 0 ? { bottom: "50%" } : { top: "50%" }) : { bottom: 0 }) }} />
          </span>
        ))}
      </div>
      <div className="bar-axis"><span>{label(months[0].month)}</span><span>{label(months[months.length - 1].month)}</span></div>
    </div>
  );
}

export function MonthlyHistory({ data, sg }: { data: Monthly; sg: number }) {
  const push = useSheetPush();
  const [k, setK] = useState<Measure>("pl");
  const [sym, setSym] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "best" | "worst">("new");
  const [at, setAt] = useState(data.months.length - 1);
  const order = data.total.assets.map((a) => a.symbol);
  const hue = (s: string) => HUE[Math.min(order.indexOf(s) < 0 ? 5 : order.indexOf(s), 5)];
  const t = data.total;
  const best = data.months.reduce((a, b) => (b.pl * sg > a.pl * sg ? b : a), data.months[0]);
  const worst = data.months.reduce((a, b) => (b.pl * sg < a.pl * sg ? b : a), data.months[0]);
  const up = data.months.filter((m) => m.pl * sg > 0).length;
  const open = (i: number) => push?.(label(data.months[i].month, true), <MonthPage m={data.months[i]} prev={data.months[i - 1]} sg={sg} hue={hue} />);
  const listed = data.months.map((m, i) => ({ m, i })).sort((a, b) => (sort === "new" ? b.i - a.i : sort === "best" ? figs(b.m, sym).pl * sg - figs(a.m, sym).pl * sg : figs(a.m, sym).pl * sg - figs(b.m, sym).pl * sg));
  return (
    <>
      <div className="metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div><span>P&L</span><b className={t.pl * sg >= 0 ? "pos" : "neg"}>{compact(t.pl * sg, true)}</b></div>
        <div><span>Trades</span><b>{t.trades}</b></div>
        <div><span>Win rate</span><b>{Math.round(t.win_rate)}%</b></div>
        <div><span>Lots</span><b>{num(t.open_lot, 0)}</b></div>
      </div>

      <div className="tchips" role="radiogroup" aria-label="Measure">
        {MEASURES.map((x) => <button key={x.v} role="radio" aria-checked={k === x.v} className={`tchip ${k === x.v ? "on" : ""}`} onClick={() => { buzz(); setK(x.v); }}>{x.label}</button>)}
      </div>
      <Group header={sym ? `${MEASURES.find((x) => x.v === k)?.label}, ${sym}` : MEASURES.find((x) => x.v === k)?.label}>
        <MonthBars months={data.months} k={k} sym={k === "balance" ? null : sym} sg={sg} at={at} setAt={setAt} onOpen={open} />
      </Group>
      <div className="tchips" role="radiogroup" aria-label="Symbol">
        <button role="radio" aria-checked={!sym} className={`tchip ${!sym ? "on" : ""}`} onClick={() => { buzz(); setSym(null); }}>All symbols</button>
        {t.assets.filter((a) => a.pct > 0).map((a) => (
          <button key={a.symbol} role="radio" aria-checked={sym === a.symbol} className={`tchip ${sym === a.symbol ? "on" : ""}`} style={{ ["--c" as string]: hue(a.symbol) }} onClick={() => { buzz(); setSym(sym === a.symbol ? null : a.symbol); }}><i />{a.symbol}</button>
        ))}
      </div>

      <Group header={`Account life, since ${label(data.months[0].month)}`}>
        <Row title="Balance" detail={<span className="num">{compact(t.balance)}</span>} chevron={false} />
        <Row title="Months in profit" detail={<span className="num">{up} of {data.months.length}</span>} chevron={false} />
        <Row title="Best month" onClick={() => open(data.months.indexOf(best))} detail={<span className="num">{label(best.month)} · <Pnl v={best.pl * sg} short /></span>} />
        <Row title="Worst month" onClick={() => open(data.months.indexOf(worst))} detail={<span className="num">{label(worst.month)} · <Pnl v={worst.pl * sg} short /></span>} />
        <Row title="Net exposure" detail={<span className={`num ${t.net_exposure >= 0 ? "pos" : "neg"}`}>{signed(t.net_exposure)} lots</span>} chevron={false} />
        <Row title="Average hold" detail={<span className="num">{t.hold_days.toFixed(1)} d</span>} chevron={false} />
      </Group>
      <Group header="Asset mix, account life">
        <div className="mix-wrap"><Mix assets={t.assets} hue={hue} /><span className="mix-keys">{t.assets.filter((a) => a.pct > 0).map((a) => <span key={a.symbol}><i style={{ background: hue(a.symbol) }} />{a.symbol} {a.pct}%</span>)}</span></div>
      </Group>

      <Segmented label="Order" value={sort} onChange={setSort} options={[{ v: "new", label: "Newest" }, { v: "best", label: "Best" }, { v: "worst", label: "Worst" }]} />
      <Group header={sym ? `By month, ${sym}` : "By month"} footer="Balance is reconstructed from closed deals and balance operations. The latest month shows live equity.">
        {listed.map(({ m, i }) => {
          const f = figs(m, sym);
          return (
            <Row key={m.month} onClick={() => open(i)}
              title={label(m.month)} subtitle={<span className="mrow-sub"><span>{f.trades} trades · {Math.round(f.win)}% win · {num(f.lots, 1)} lots · balance {compact(m.balance)}</span><Mix assets={m.assets} hue={hue} /></span>}
              detail={<Pnl v={f.pl * sg} short />} />
          );
        })}
      </Group>
    </>
  );
}
