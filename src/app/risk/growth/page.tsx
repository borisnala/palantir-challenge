"use client";

import { useState } from "react";
import { Chip, Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import gr from "@/data/growth.json";
import { compact, group, money, num, pct } from "@/lib/data";

type W = "30" | "180" | "all";
type G = (typeof gr)["30"]["rows"][number];

export default function Growth() {
  const [w, setW] = useState<W>("30");
  const [fit, setFit] = useState<"any" | "0.7" | "0.85">("any");
  const [sel, setSel] = useState<G | null>(null);
  const [open, setOpen] = useState(false);
  const win = gr[w];
  const rows = win.rows.filter((r) => fit === "any" || (r.r_squared ?? 0) >= Number(fit)).sort((a, b) => b.net_change - a.net_change);
  const steady = rows.filter((r) => (r.r_squared ?? 0) >= 0.85 && r.net_change > 0).length;

  return (
    <>
      <NavBar title="Growth Detection" eyebrow={`Scan ${win.scan_date}`} back={{ href: "/risk/", label: "Risk Management" }} />
      <Segmented label="Window" value={w} onChange={setW} options={[{ v: "30", label: "30 days" }, { v: "180", label: "180 days" }, { v: "all", label: "All time" }]} />
      <Metrics label="Scan" items={[{ k: "Accounts", v: rows.length }, { k: "Consistent growth", v: steady, tone: steady ? "warn" : undefined }, { k: "Client P&L", v: compact(rows.reduce((a, r) => a + r.net_change, 0)) }]} />
      <Segmented label="Curve fit at least" value={fit} onChange={setFit} options={[{ v: "any", label: "Any fit" }, { v: "0.7", label: "Fit 0.70" }, { v: "0.85", label: "Fit 0.85" }]} />

      <Group footer="Curve fit measures how linear the profit curve is. A high fit on a rising curve indicates consistent client profit.">
        {rows.map((r) => (
          <Row key={r.login} onClick={() => { setSel(r); setOpen(true); }} title={r.name ?? `#${r.login}`}
            subtitle={`Fit ${num(r.r_squared, 2)} · ${num(r.active_days)} active days · ${compact(r.slope_per_day, true)} a day`}
            detail={<span className="stack-r"><Pnl v={r.net_change} short />{r.pg && <Chip>{r.pg}</Chip>}</span>} />
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
          </>
        )}
      </Sheet>
    </>
  );
}
