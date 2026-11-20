"use client";

import { useState } from "react";
import { Chip, Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import gr from "@/data/growth.json";
import { compact, group, money, num, pct, sentence } from "@/lib/data";
import { buzz } from "@/lib/haptics";

type Detail = { momentum: { slope_td_all: number; slope_td_30: number; label: string } | null; moves: { time_wib: string; from_tier: string; to_tier: string; source_detail: string }[]; etl: { time_wib: string; kind: string; reason: string; tpl: string }[] };
const DETAIL = (gr as unknown as { detail: Record<string, Detail> }).detail;

type W = "30" | "180" | "all";
type G = (typeof gr)["30"]["rows"][number] & { pg?: string | null };

export default function Growth() {
  const [w, setW] = useState<W>("30");
  const [fit, setFit] = useState<"any" | "0.7" | "0.85">("any");
  const [sel, setSel] = useState<G | null>(null);
  const [open, setOpen] = useState(false);
  const [pov, setPov] = useState<"client" | "broker">("client");
  const [days, setDays] = useState<"0" | "5" | "10" | "20" | "30">("0");
  const [pg, setPg] = useState<string>("all");
  const sg = pov === "client" ? 1 : -1;
  const win = gr[w] as { scan_date: string; pg_counts: Record<string, number>; rows: G[] };
  const base = win.rows.filter((r) => (fit === "any" || (r.r_squared ?? 0) >= Number(fit)) && (r.active_days ?? 0) >= Number(days));
  const pgs = Object.entries(base.reduce<Record<string, number>>((a, r) => { const k = r.pg ?? "None"; a[k] = (a[k] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
  const rows = base.filter((r) => pg === "all" || (r.pg ?? "None") === pg).sort((a, b) => sg * (b.net_change - a.net_change));
  const det = sel ? DETAIL[String(sel.login)] : undefined;
  const steady = rows.filter((r) => (r.r_squared ?? 0) >= 0.85 && r.net_change > 0).length;

  return (
    <>
      <NavBar title="Growth Detection" eyebrow={`Scan ${win.scan_date}`} back={{ href: "/risk/", label: "Risk Management" }} />
      <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} />
      <Segmented label="Window" value={w} onChange={setW} options={[{ v: "30", label: "30 days" }, { v: "180", label: "180 days" }, { v: "all", label: "All time" }]} />
      <Metrics label="Scan" items={[{ k: "Accounts", v: rows.length }, { k: "Consistent growth", v: steady, tone: steady ? "warn" : undefined }, { k: pov === "client" ? "Client P&L" : "Broker P&L", v: compact(sg * rows.reduce((a, r) => a + r.net_change, 0), true) }]} />
      <Segmented label="Curve fit at least" value={fit} onChange={setFit} options={[{ v: "any", label: "Any fit" }, { v: "0.7", label: "Fit 0.70" }, { v: "0.85", label: "Fit 0.85" }]} />

      <Segmented label="Active days at least" value={days} onChange={setDays} options={[{ v: "0", label: "Any days" }, { v: "5", label: "5+ d" }, { v: "10", label: "10+ d" }, { v: "20", label: "20+ d" }, { v: "30", label: "30+ d" }]} />
      <div className="tchips" role="radiogroup" aria-label="Price group">
        <button role="radio" aria-checked={pg === "all"} className={`tchip ${pg === "all" ? "on" : ""}`} onClick={() => { buzz(); setPg("all"); }}>All {base.length}</button>
        {pgs.map(([k, n]) => <button key={k} role="radio" aria-checked={pg === k} className={`tchip ${pg === k ? "on" : ""}`} onClick={() => { buzz(); setPg(k); }}>{k} {n}</button>)}
      </div>

      <Group footer="Curve fit measures how linear the profit curve is. High fit on a rising curve means consistent profit.">
        {rows.map((r) => (
          <Row key={r.login} onClick={() => { setSel(r); setOpen(true); }} title={r.name ?? `#${r.login}`}
            subtitle={`Fit ${num(r.r_squared, 2)} · ${num(r.active_days)} active days · ${compact(r.slope_per_day, true)} a day`}
            detail={<span className="stack-r"><Pnl v={sg * r.net_change} short />{r.pg && <Chip>{r.pg}</Chip>}</span>} />
        ))}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title="Growth">
        {sel && (
          <>
            <Group><ClientRow login={sel.login} name={sel.name ?? undefined} sub={`#${sel.login} · ${group(sel.group)}`} /></Group>
            <Group header={`Window ${w === "all" ? "all time" : `${w} days`}`}>
              <Row title="Client profit" detail={<Pnl v={sel.net_change} />} />
              <Row title="Profit a day" detail={money(sel.slope_per_day)} />
              <Row title="Curve fit" detail={num(sel.r_squared, 2)} />
              <Row title="Winning days" detail={pct((sel.win_day_ratio ?? 0) * 100, 0)} />
              <Row title="Active days" detail={num(sel.active_days)} />
              <Row title="Worst drawdown" detail={money(-(sel.max_drawdown ?? 0))} />
              <Row title="Balance" detail={money(sel.balance)} />
            </Group>
            {det?.momentum && (
              <Group header="Momentum" footer="Profit a trading day, all time against the last 30 days.">
                <Row title="Trend" detail={sentence(det.momentum.label)} chevron={false} />
                <Row title="All time" detail={`${compact(det.momentum.slope_td_all, true)} a day`} chevron={false} />
                <Row title="Last 30 days" detail={`${compact(det.momentum.slope_td_30, true)} a day`} chevron={false} />
              </Group>
            )}
            {det && (det.moves.length > 0 || det.etl.length > 0) && (
              <Group header="Group moves" className="timeline">
                {det.moves.map((m, i) => <Row key={`m${i}`} title={`${m.from_tier} to ${m.to_tier}`} subtitle={m.source_detail} detail={m.time_wib.slice(5, 16)} chevron={false} />)}
                {det.etl.map((e, i) => <Row key={`e${i}`} title={`${sentence(e.kind)}, ${e.reason}`} subtitle={e.tpl} detail={e.time_wib.slice(5, 16)} chevron={false} />)}
              </Group>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
