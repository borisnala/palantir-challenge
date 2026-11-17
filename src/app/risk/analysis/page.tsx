"use client";

import { useState } from "react";
import { Group, Metrics, NavBar, Row, Segmented } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Bars, Pnl, Share } from "@/components/ui";
import ra from "@/data/riskanalysis.json";
import { compact, group, money, num, pct, when } from "@/lib/data";

type A = "machinegun" | "scalperam" | "fbuv2";
/* eslint-disable @typescript-eslint/no-explicit-any */
const AN = ra.analysis as any;
const PROT = ra.protection as any;

const Counts = ({ items, k, of }: { items: any[]; k: string; of?: number }) => {
  const total = of ?? items.reduce((a, x) => a + x.count, 0);
  return <>{items.map((x) => <Row key={x[k]} title={<span className="row-text">{String(x[k]).replace(/_/g, " ")}<Share v={x.count} of={total} /></span>} detail={x.count} chevron={false} />)}</>;
};

function MachineGun() {
  const m = AN.machinegun;
  return (
    <>
      <Metrics label="Moves" items={[{ k: "Detections", v: m.move_outcome.total }, { k: "Moved", v: m.move_outcome.successful, tone: "pos" }, { k: "No action", v: pct(m.move_outcome.no_action_pct, 0), tone: "warn" }, { k: "Failed", v: m.move_outcome.failed, tone: "neg" }]} />
      <Group header="Detections a month"><div className="chartpad"><Bars data={m.detections_over_time.per_month.map((x: any) => ({ label: x.period, v: x.count }))} tone="var(--red)" /></div></Group>
      <Group header={`Accounts by tier · ${m.tier_distribution.accounts}`}><Counts items={m.tier_distribution.by_tier} k="tier" /></Group>
      <Group header="Tier changes" footer={`${m.tier_transitions.escalations} escalations, ${m.tier_transitions.deescalations} back down.`}><Counts items={m.tier_transitions.transitions} k="transition" /></Group>
      <Group header={`Price group moves · ${pct(m.pg_movement.same_pg_pct, 0)} stayed in the same group`}>
        {m.pg_movement.pairs.slice(0, 8).map((x: any) => <Row key={`${x.from}${x.to}`} title={`${x.from} to ${x.to}`} detail={x.count} chevron={false} />)}
      </Group>
      <Group header="Deals per trigger" footer={`Median ${m.trigger_margin.deal_count.median} deals, ${num(m.trigger_margin.total_lots.median, 1)} lots.`}><Counts items={m.trigger_margin.deal_count_buckets} k="label" /></Group>
    </>
  );
}

function Scalper() {
  const s = AN.scalperam;
  return (
    <>
      <Metrics label="Detections" items={[{ k: "Trades", v: s.profitability.pl.count }, { k: "Client profit", v: compact(s.profitability.total_pl), tone: "pos" }, { k: "Alerts sent", v: pct(s.alerting.sent_pct, 0) }]} />
      <Group header="Trades a month"><div className="chartpad"><Bars data={s.volume_over_time.per_month.map((x: any) => ({ label: x.period, v: x.count }))} tone="var(--orange)" /></div></Group>
      <Group header="Holding time" footer={`Median ${num(s.holding_time.seconds.median, 0)} seconds.`}><Counts items={s.holding_time.buckets} k="label" /></Group>
      <Group header="By symbol">{s.by_symbol.top.map((x: any) => <Row key={x.symbol} title={x.symbol} subtitle={`${x.trades} trades · ${pct(x.share_pct, 0)}`} detail={<Pnl v={x.total_pl} short />} chevron={false} />)}</Group>
      <Group header="Top accounts">{s.by_account.top_by_pl.map((x: any) => <ClientRow key={x.account} login={Number(x.account)} sub={`${x.detections} detections`} value={x.total_pl} />)}</Group>
    </>
  );
}

function Fbu() {
  const f = AN.fbuv2;
  return (
    <>
      <Metrics label="Force build up" items={[{ k: "Events", v: f.outcomes.total }, { k: "Moved", v: f.outcomes.moved, tone: "pos" }, { k: "Moved share", v: pct(f.outcomes.moved_pct, 0) }]} />
      <Group header="What triggered it"><Counts items={f.triggers.by_condition} k="condition" /></Group>
      <Group header="Combinations"><Counts items={f.triggers.by_combination} k="combination" /></Group>
      <Group header="Tiers"><Counts items={f.tiers.by_tier} k="tier" /></Group>
      <Group header="Outcomes"><Counts items={f.outcomes.by_status} k="status" /></Group>
      <Group header="Top groups">{f.tiers.top_groups.map((x: any) => <Row key={x.group} title={group(x.group)} detail={x.count} chevron={false} />)}</Group>
    </>
  );
}

export default function RiskAnalysis() {
  const [a, setA] = useState<A>("machinegun");
  const [scope, setScope] = useState<"default" | "all">("default");
  const p = PROT[scope];
  return (
    <>
      <NavBar title="Risk Analysis" eyebrow={`Since ${when(ra.analysis.machinegun.generated_at)}`} back={{ href: "/risk/", label: "Risk" }} />
      <Segmented label="Algorithm" value={a} onChange={setA} options={[{ v: "machinegun", label: "MachineGun" }, { v: "scalperam", label: "ScalperAM" }, { v: "fbuv2", label: "FBUv2" }]} />
      {a === "machinegun" ? <MachineGun /> : a === "scalperam" ? <Scalper /> : <Fbu />}

      <h2 className="sub-head">Protection</h2>
      <Segmented label="Window" value={scope} onChange={setScope} options={[{ v: "default", label: "Since cutoff" }, { v: "all", label: "All moves" }]} />
      <Metrics label="Protection" items={[{ k: "Protected", v: compact(p.totals.protection_usd), tone: "pos" }, { k: "House P&L", v: compact(p.totals.pl_house), tone: p.totals.pl_house >= 0 ? "pos" : "neg" }, { k: "Lots", v: num(p.totals.lots_total, 0) }]} />
      <Group header="By algorithm" footer="Protected is the extra spread the move earned on the client's later trades.">
        {p.by_algo.map((x: any) => <Row key={x.algo} title={x.label} subtitle={`${x.moves} moves · ${x.accounts} accounts`} detail={money(x.protection_usd)} chevron={false} />)}
      </Group>
      <Group header="Latest moves">
        {p.rows.slice(0, 15).map((x: any, i: number) => <ClientRow key={i} login={x.login} sub={`${x.algo} · ${x.symbol} · ${when(x.moved_at, false)}`} detail={money(x.protection_usd)} />)}
      </Group>
    </>
  );
}
