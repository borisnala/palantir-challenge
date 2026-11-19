"use client";

// Trading pattern (owner 2026-11-19, "connected to a TradingView chart, can we do that too"): the client's trades on a
// TradingView Lightweight Charts candlestick, a buy marked under its bar and a sell over it, one symbol at a time,
// with what the marks add up to underneath. The demo holds no price history, so the daily candles are a seeded
// simulation around each symbol's price; the trades and their P&L are the client's own figures.

import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Row } from "./ios";
import { Pnl } from "./ui";
import { buzz } from "@/lib/haptics";
import meta from "@/data/client360meta.json";
import { num, pct } from "@/lib/data";

type Trade = [number, number, number, number]; // day, side (1 buy, -1 sell), lots, P&L
const PRICES = meta.prices as unknown as Record<string, [number, number]>;
const DAY = 86400;

/** Daily candles, Monday to Friday, from a seeded walk: the same symbol always draws the same chart. */
function candles(sym: string, from: number, to: number) {
  const [base, digits] = PRICES[sym] ?? [100, 2];
  let x = [...sym].reduce((a, ch) => a * 33 + ch.charCodeAt(0), 11) % 2147483647 || 1;
  const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
  const out: { time: number; open: number; high: number; low: number; close: number }[] = [];
  let close = base * (0.94 + rnd() * 0.08);
  const r = (v: number) => +v.toFixed(digits);
  for (let t = Math.floor(from / DAY) * DAY; t <= to; t += DAY) {
    const wd = new Date(t * 1000).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    const open = close;
    close = open * (1 + (rnd() - 0.49) * 0.016 - (open - base) / base * 0.02);
    const hi = Math.max(open, close) * (1 + rnd() * 0.006), lo = Math.min(open, close) * (1 - rnd() * 0.006);
    out.push({ time: t, open: r(open), high: r(hi), low: r(lo), close: r(close) });
  }
  return out;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;

export function TradingPattern({ trades, asOf }: { trades: Record<string, Trade[]>; asOf: number }) {
  const syms = Object.keys(trades).filter((s) => trades[s].length);
  const [sym, setSym] = useState(syms[0]);
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false); // the chart library loads on demand; until then the chart's outline shows
  const list = useMemo(() => trades[sym] ?? [], [trades, sym]);

  useEffect(() => {
    const el = box.current;
    if (!el || !list.length) return;
    let gone = false;
    let cleanup = () => {};
    import("lightweight-charts").then(({ createChart, CandlestickSeries, createSeriesMarkers, ColorType, CrosshairMode }) => {
      if (gone) return;
      const up = css("--pos") ?? "#34c759", down = css("--neg") ?? "#ff3b30", text = css("--label2") ?? "#8e8e93", grid = css("--sep") ?? "rgba(0,0,0,.1)";
      const chart = createChart(el, {
        autoSize: true,
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: text, fontSize: 11, attributionLogo: true },
        grid: { vertLines: { visible: false }, horzLines: { color: grid } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, rightOffset: 2, barSpacing: 9 },
        crosshair: { mode: CrosshairMode.Magnet },
        handleScale: { axisPressedMouseMove: false },
      });
      const series = chart.addSeries(CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false });
      const first = list[0][0] - 20 * DAY;
      const bars = candles(sym, first, asOf);
      series.setData(bars as never);
      const barDays = new Set(bars.map((b) => b.time));
      createSeriesMarkers(series, list.filter(([d]) => barDays.has(Math.floor(d / DAY) * DAY)).map(([d, side, lots]) => ({
        time: (Math.floor(d / DAY) * DAY) as never,
        position: side > 0 ? "belowBar" : "aboveBar",
        shape: side > 0 ? "arrowUp" : "arrowDown",
        color: side > 0 ? up : down,
        size: Math.min(1.6, 0.7 + lots * 1.2), // the arrow grows with the trade size; no labels, so nothing overlaps
      })) as never);
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, bars.length - 45), to: bars.length + 2 });
      setReady(true);
      cleanup = () => chart.remove();
    });
    return () => { gone = true; cleanup(); };
  }, [sym, list, asOf]);

  if (!syms.length) return null;
  const buys = list.filter((t) => t[1] > 0), sells = list.filter((t) => t[1] < 0);
  const pl = list.reduce((a, t) => a + t[3], 0);
  const wins = list.filter((t) => t[3] > 0).length;
  const lots = list.reduce((a, t) => a + t[2], 0) / Math.max(1, list.length);
  const lean = buys.length >= sells.length ? `Buys on ${pct((buys.length / list.length) * 100, 0)} of trading days` : `Sells on ${pct((sells.length / list.length) * 100, 0)} of trading days`;

  return (
    <>
      <Group header="Trading pattern" footer="Green arrows under a bar are buys, red arrows over a bar are sells, larger for larger trades. Daily candles are simulated for the demonstration, the trades are the client's. Drag to move through time, pinch to zoom.">
        <div className="pattern">
          <div className="tchips" role="radiogroup" aria-label="Symbol">
            {syms.map((s) => <button key={s} role="radio" aria-checked={sym === s} className={`tchip ${sym === s ? "on" : ""}`} onClick={() => { buzz(); setSym(s); }}>{s}</button>)}
          </div>
          {!ready && <span className="bone tv-bone" aria-label="Loading chart" />}
          <div ref={box} className={`tvchart ${ready ? "" : "tv-wait"}`} aria-label={`${sym} daily candles with the client's buys and sells`} />
        </div>
      </Group>
      <Group header={`${sym} · ${list.length} trading days`}>
        <Row title="Lean" detail={lean} chevron={false} />
        <Row title="Buys and sells" detail={`${buys.length} buys, ${sells.length} sells`} chevron={false} />
        <Row title="Winning days" detail={pct((wins / Math.max(1, list.length)) * 100, 0)} chevron={false} />
        <Row title="Average size" detail={`${num(lots, 2)} lots`} chevron={false} />
        <Row title="P&L on the symbol" detail={<Pnl v={pl} />} chevron={false} />
      </Group>
    </>
  );
}
