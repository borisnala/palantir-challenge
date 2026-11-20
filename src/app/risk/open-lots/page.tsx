"use client";

import { useState } from "react";
import { Chip, Group, Metrics, NavBar, Segmented, Sheet, Row } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import ol from "@/data/openlots.json";
import { Scatter } from "@/components/scatter";
import { compact, group, money, nameOf, num, pct, when } from "@/lib/data";
import { buzz } from "@/lib/haptics";

type W = "today" | "week" | "month" | "30d" | "year";
const WIN: Record<W, string> = { today: "2026-11-12|2026-11-12", week: "2026-11-06|2026-11-12", month: "2026-11-01|2026-11-12", "30d": "2026-10-14|2026-11-12", year: "2026-01-01|2026-11-12" };
type Hist = { from: string; to: string; totals: Record<string, number>;
  quadrants: Record<"behaviour" | "edge", { title: string; x_label: string; y_label: string; x_div: number; y_div: number; cells: Record<string, { short: string; pos: string; clients: number; lots: number; pl: number }> }>;
  clients: { login: number; family: string; excluded: boolean; lots: number; deals: number; avg_lot: number; active_days: number; deals_per_day: number; pl: number; win_rate: number; quadrant: { behaviour: string; edge: string } }[] };
const HIST = (ol as unknown as { history: Record<string, Hist> }).history;
const ORDER = ["tl", "tr", "bl", "br"];

type Sort = "gross" | "fpl" | "positions";
type C = (typeof ol.clients)[number];

export default function OpenLots() {
  const [sort, setSort] = useState<Sort>("gross");
  const [sel, setSel] = useState<C | null>(null);
  const [open, setOpen] = useState(false);
  const list = [...ol.clients].sort((a, b) => (sort === "fpl" ? Math.abs(b.fpl) - Math.abs(a.fpl) : b[sort] - a[sort]));
  const t = ol.totals;
  const [mode, setMode] = useState<"open" | "closed">("open");
  const [w, setW] = useState<W>("30d");
  const [map, setMap] = useState<"edge" | "behaviour">("edge");
  const [quad, setQuad] = useState<string | null>(null);
  const h = HIST[WIN[w]];
  const q = h.quadrants[map];
  const hc = h.clients.filter((c) => !c.excluded);
  const xOf = (c: Hist["clients"][number]) => (map === "edge" ? c.lots : c.deals_per_day);
  const yOf = (c: Hist["clients"][number]) => (map === "edge" ? (c.lots ? c.pl / c.lots : 0) : c.avg_lot);
  const shown = [...hc].filter((c) => !quad || c.quadrant[map] === quad).sort((a, b) => b.lots - a.lots);

  return (
    <>
      <NavBar title="Open Lots" eyebrow={`Live · as of ${when(new Date(ol.as_of * 1000).toISOString())} UTC`} back={{ href: "/risk/", label: "Risk Management" }} />

      <Segmented label="Lots" value={mode} onChange={setMode} options={[{ v: "open", label: "Open now" }, { v: "closed", label: "Closed lots" }]} />

      {mode === "open" && (<>
      <Metrics label="Open now" items={[
        { k: "Clients", v: t.clients, history: "openlots.clients" }, { k: "Positions", v: t.positions, history: "openlots.positions" },
        { k: "Gross lots", v: num(t.gross_lots, 1), history: "openlots.gross" }, { k: "MG hits", v: t.mg_triggered, tone: t.mg_triggered ? "warn" : undefined, history: "openlots.mg" },
      ]} />

      <Group header="Open lots against equity" footer="Equity on a log scale, floating P&L included. Red dots tripped MachineGun.">
        <Scatter dots={ol.clients.map((c) => ({ id: c.login, x: Math.max(c.equity, 1), y: c.gross, tone: c.mg && c.mg.tier ? "neg" : c.excluded ? "muted" : "warn" }))}
          xLog xLabel="Equity, USD" yLabel="Gross lots" onSel={(id) => { const c = ol.clients.find((x) => x.login === id); if (c) { setSel(c); setOpen(true); } }} />
      </Group>

      <Segmented label="Sort by" value={sort} onChange={setSort} options={[{ v: "gross", label: "Gross lots" }, { v: "fpl", label: "Floating" }, { v: "positions", label: "Positions" }]} />

      <Group footer={`MachineGun trips at ${ol.mg1.normal["60"]} lots in 60 s for normal groups, ${ol.mg1.micro["60"]} for micro.`}>
        {list.map((c) => (
          <Row key={c.login} onClick={() => { setSel(c); setOpen(true); }} title={nameOf(c.login)}
            subtitle={`${c.positions} ${c.positions === 1 ? "position" : "positions"} · ${c.top_symbols.map((s) => s[0]).join(", ")}`}
            detail={<span className="stack-r">{sort === "fpl" ? <Pnl v={c.fpl} short /> : <span>{num(c.gross, 2)} lots</span>}
              {c.mg && c.mg.tier ? <Chip tone="red">MG{c.mg.tier}</Chip> : c.excluded ? <Chip>Excluded</Chip> : null}</span>} />
        ))}
      </Group>

      </>)}

      {mode === "closed" && h && (<>
        <Segmented label="Window" value={w} onChange={(x) => { setW(x); setQuad(null); }} options={[{ v: "today", label: "Day" }, { v: "week", label: "Week" }, { v: "month", label: "Month" }, { v: "30d", label: "30 d" }, { v: "year", label: "Year" }]} />
        <Metrics label="Closed lots" items={[
          { k: "Clients", v: h.totals.clients }, { k: "Lots", v: num(h.totals.lots, 1) },
          { k: "Deals", v: num(h.totals.deals) }, { k: "Client P&L", v: compact(h.totals.pl, true), tone: h.totals.pl >= 0 ? "pos" : "neg" },
        ]} />
        <Segmented label="Map" value={map} onChange={(x) => { setMap(x); setQuad(null); }} options={[{ v: "edge", label: "Edge map" }, { v: "behaviour", label: "Behaviour map" }]} />
        <Group header={q.title} footer={map === "edge" ? "Closed lots against client P&L a lot. Red, the client profits. Dashed lines split the quadrants." : "Deals a day against the average lot. Red, the client profits. Dashed lines split the quadrants."}>
          <Scatter dots={hc.map((c) => ({ id: c.login, x: Math.max(xOf(c), map === "edge" ? 0.01 : 0), y: yOf(c), tone: c.pl >= 0 ? "neg" : "pos", r: 3.5 + Math.min(4, Math.sqrt(c.lots) / 3) }))}
            xLog={map === "edge"} xLabel={map === "edge" ? "Closed lots" : "Deals a day"} yLabel={map === "edge" ? "P&L a lot" : "Average lot"} xDiv={q.x_div} yDiv={q.y_div} />
          <div className="quad">
            {ORDER.map((pos) => { const [k, z] = Object.entries(q.cells).find(([, c]) => c.pos === pos)!; return (
              <button key={k} aria-pressed={quad === k} onClick={() => { buzz(); setQuad(quad === k ? null : k); }}>
                <b>{z.short}</b><strong>{z.clients}</strong><span>{num(z.lots, 1)} lots · {compact(z.pl, true)}</span>
              </button>
            ); })}
          </div>
        </Group>
        <Group header={quad ? `${q.cells[quad].short} · ${shown.length}` : `Clients · ${shown.length}`} footer="Client P&L, positive when the client profits.">
          {shown.map((c) => <ClientRow key={c.login} login={c.login} sub={`${c.family} · ${num(c.lots, 1)} lots · ${c.deals} deals · win ${pct(c.win_rate, 0)}`} value={c.pl} />)}
        </Group>
      </>)}

      <Sheet open={open} onClose={() => setOpen(false)} title={sel ? `#${sel.login}` : "Account"}>
        {sel && (
          <>
            <Group><ClientRow login={sel.login} sub={`#${sel.login} · ${group(sel.group)}`} /></Group>
            <Group header="Account">
              <Row title="Balance" detail={money(sel.balance)} />
              <Row title="Equity" detail={money(sel.equity)} />
              <Row title="Floating" detail={<Pnl v={sel.fpl} />} />
              <Row title="Gross lots" detail={num(sel.gross, 2)} />
              <Row title="Net lots" detail={num(sel.net, 2)} />
            </Group>
            <Group header="By symbol">{sel.top_symbols.map(([s, l]) => <Row key={s} title={s} detail={`${num(l as number, 2)} lots`} />)}</Group>
            <Group header="Position age" footer={sel.mg && sel.mg.tier ? `MachineGun tier ${sel.mg.tier}: ${sel.mg.lots} lots in ${sel.mg.window} s.` : "No MachineGun trigger."}>
              <Row title="Up to 60 s" detail={`${num(sel.age.le60, 2)} lots`} />
              <Row title="61 to 180 s" detail={`${num(sel.age["61_180"], 2)} lots`} />
              <Row title="181 to 900 s" detail={`${num(sel.age["181_900"], 2)} lots`} />
              <Row title="Over 900 s" detail={`${num(sel.age.gt900, 2)} lots`} />
            </Group>
          </>
        )}
      </Sheet>
    </>
  );
}
