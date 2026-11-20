"use client";

import { useState } from "react";
import { buzz } from "@/lib/haptics";
import { Group, Metrics, NavBar, Row, Segmented, Switch } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import t10 from "@/data/top10.json";
import { compact, group, num, pct } from "@/lib/data";

type P = "day" | "month" | "ytd";
type B = "clients" | "a" | "b";
type V = "winners" | "losers" | "activity" | "movers" | "consistency" | "groups" | "volume" | "instruments";
type Acc = { login: number; name: string; group: string; pl: number; deals: number; win_rate: number; pf: number; prev_rank: number | null; active_days?: number; delta?: number; prev_pl?: number; is_new?: boolean };
// The eight boards of the portal's Top 10, as filter chips: a segmented control holds four at most
const BOARD_OPTS: { v: V; label: string }[] = [
  { v: "winners", label: "Winners" }, { v: "losers", label: "Losers" }, { v: "activity", label: "Activity" }, { v: "movers", label: "Movers" },
  { v: "consistency", label: "Consistency" }, { v: "groups", label: "Groups" }, { v: "volume", label: "Volume" }, { v: "instruments", label: "Instruments" },
];
const BOARDS = t10 as unknown as Record<string, {
  label: string; prev_label: string | null; totals: Record<string, number>;
  winners: Acc[]; losers: Acc[]; activity: Acc[]; movers: Acc[]; consistency: Acc[];
  instruments: { symbol: string; lots: number; profit: number; deals: number; traders: number; top_login: number; top_share_pct: number }[];
  volume: { login: number; name: string; group: string; lots: number; deals: number; avg_lot: number }[];
  groups: { group: string; pl: number; deals: number; accounts: number; total: number }[];
}>;

export default function Top10() {
  const [p, setP] = useState<P>("month");
  const [b, setB] = useState<B>("clients");
  const [fl, setFl] = useState(true);
  const [v, setV] = useState<V>("winners");
  const [pov, setPov] = useState<"client" | "broker">("client");
  const sg = pov === "client" ? 1 : -1; // the broker's view is the client's P&L with the sign turned
  const bd = BOARDS[`${p}|${b}|${fl ? "net_fpl" : "net"}`];
  const t = bd?.totals ?? {};
  // Profit and loss split of the two boards, drawn the way Screen Time draws a split: one bar, then the figures as rows
  const cWon = (bd?.winners ?? []).reduce((a, r) => a + Math.max(0, r.pl), 0);
  const cLost = (bd?.losers ?? []).reduce((a, r) => a + Math.min(0, r.pl), 0);
  const won = pov === "client" ? cWon : -cLost, lost = pov === "client" ? cLost : -cWon;
  const gross = won - lost;
  const share = gross > 0 ? (won / gross) * 100 : 0;
  const best = pov === "client" ? bd?.winners[0] : bd?.losers[0];
  const worst = pov === "client" ? bd?.losers[0] : bd?.winners[0];

  return (
    <>
      <NavBar title="Top 10" eyebrow={bd?.label ?? ""} back={{ href: "/risk/", label: "Risk Management" }} />
      <Segmented label="Period" value={p} onChange={setP} options={[{ v: "day", label: "Day" }, { v: "month", label: "Month" }, { v: "ytd", label: "Year" }]} />
      <Segmented label="Book" value={b} onChange={setB} options={[{ v: "clients", label: "All clients" }, { v: "a", label: "A book" }, { v: "b", label: "B book" }]} />
      <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} />

      <Metrics label="Totals" items={[
        { k: "Accounts", v: t.accounts ?? 0 },
        { k: pov === "client" ? "Client P&L" : "Broker P&L", v: compact(sg * (fl ? t.client_total ?? t.client_pl : t.client_pl), true), tone: sg * (t.client_pl ?? 0) >= 0 ? "pos" : "neg" },
        { k: "Top 10 share", v: pct(t.top10_winners_share_pct, 0) },
      ]} />

      {gross > 0 && (
        <Group header="Profit and loss" footer={pov === "client" ? "Client profit is a cost to the book." : "Broker view, the client figures with the sign turned."}>
          <div className="split">
            <span className="split-top"><b className="pos">{pct(share, 1)} profit</b><b className="neg">{pct(100 - share, 1)} loss</b></span>
            <span className="split-bar" role="img" aria-label={`${pct(share, 1)} profit, ${pct(100 - share, 1)} loss`}>
              <i className="split-pos" style={{ width: `${share}%` }} /><i className="split-neg" />
            </span>
          </div>
          <Row title="Net" detail={<Pnl v={won + lost} />} chevron={false} />
          <Row title="Total profit" detail={<Pnl v={won} />} chevron={false} />
          <Row title="Total loss" detail={<Pnl v={lost} />} chevron={false} />
          {best && <ClientRow login={best.login} name={best.name} sub={pov === "client" ? "Highest profit" : "Largest gain for the book"} value={sg * best.pl} />}
          {worst && sg * worst.pl < 0 && <ClientRow login={worst.login} name={worst.name} sub={pov === "client" ? "Highest loss" : "Largest cost to the book"} value={sg * worst.pl} />}
        </Group>
      )}

      <Group footer="Adds floating P&L on open positions.">
        <Row title="Include floating P&L" chevron={false}><Switch on={fl} onChange={() => setFl(!fl)} label="Include floating P&L" /></Row>
      </Group>

      <div className="tchips board-chips" role="radiogroup" aria-label="Board">
        {BOARD_OPTS.map((o) => <button key={o.v} role="radio" aria-checked={v === o.v} className={`tchip ${v === o.v ? "on" : ""}`} onClick={() => { buzz(); setV(o.v); }}>{o.label}</button>)}
      </div>

      <Group header={BOARD_OPTS.find((o) => o.v === v)!.label} footer={v === "movers" ? `Change against ${bd?.prev_label ?? "the prior period"}.` : v === "consistency" ? "Profit on most active days, ranked by win rate and profit factor." : v === "instruments" ? "Top trader share is the largest single account's share of the symbol's lots." : undefined}>
        {(!bd || (bd[v] ?? []).length === 0) && <Row title="No accounts on this board" subtitle="No account met the activity threshold." chevron={false} />}
        {(v === "winners" || v === "losers") && bd?.[v].map((r, i) => (
          <ClientRow key={r.login} login={r.login} name={r.name}
            sub={`Rank ${i + 1} · ${r.deals} deals · win ${pct(r.win_rate, 0)}${r.prev_rank ? ` · was ${r.prev_rank}` : " · new"}`} value={sg * r.pl} />
        ))}
        {v === "activity" && bd?.activity.map((r, i) => (
          <ClientRow key={r.login} login={r.login} name={r.name} sub={`Rank ${i + 1} · ${r.deals} deals · ${r.active_days ?? 0} active days`} value={sg * r.pl} />
        ))}
        {v === "movers" && bd?.movers.map((r, i) => (
          <ClientRow key={r.login} login={r.login} name={r.name} sub={`Rank ${i + 1} · ${r.is_new ? "new this period" : `was ${compact(sg * (r.prev_pl ?? 0), true)}`}`} value={sg * (r.delta ?? 0)} />
        ))}
        {v === "consistency" && bd?.consistency.map((r, i) => (
          <ClientRow key={r.login} login={r.login} name={r.name} sub={`Rank ${i + 1} · win ${pct(r.win_rate, 0)} · PF ${num(r.pf, 2)} · ${r.active_days ?? 0} days`} value={sg * r.pl} />
        ))}
        {v === "volume" && bd?.volume.map((r, i) => (
          <ClientRow key={r.login} login={r.login} name={r.name} sub={`Rank ${i + 1} · ${r.deals} deals · ${num(r.avg_lot, 2)} lots each`} detail={`${num(r.lots, 1)} lots`} />
        ))}
        {v === "groups" && bd?.groups.map((g) => (
          <Row key={g.group} title={group(g.group) === "" ? g.group : g.group} subtitle={`${g.accounts} accounts · ${g.deals} deals`} detail={<Pnl v={sg * (g.total ?? g.pl)} short />} chevron={false} />
        ))}
        {v === "instruments" && bd?.instruments.map((r, i) => (
          <Row key={r.symbol} title={r.symbol} subtitle={`Rank ${i + 1} · ${num(r.lots, 1)} lots · ${r.traders} traders · top trader ${pct(r.top_share_pct, 0)}`} detail={<Pnl v={sg * r.profit} short />} chevron={false} />
        ))}
      </Group>
    </>
  );
}
