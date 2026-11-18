"use client";

import { useState } from "react";
import { Group, Metrics, NavBar, Row, Segmented, Switch } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import t10 from "@/data/top10.json";
import { compact, group, num, pct } from "@/lib/data";

type P = "day" | "month" | "ytd";
type B = "clients" | "a" | "b";
type V = "winners" | "losers" | "volume" | "groups";
const BOARDS = t10 as unknown as Record<string, {
  label: string; prev_label: string | null; totals: Record<string, number>;
  winners: { login: number; name: string; group: string; pl: number; deals: number; win_rate: number; pf: number; prev_rank: number | null }[];
  losers: { login: number; name: string; group: string; pl: number; deals: number; win_rate: number; pf: number; prev_rank: number | null }[];
  volume: { login: number; name: string; group: string; lots: number; deals: number; avg_lot: number }[];
  groups: { group: string; pl: number; deals: number; accounts: number; total: number }[];
}>;

export default function Top10() {
  const [p, setP] = useState<P>("month");
  const [b, setB] = useState<B>("clients");
  const [fl, setFl] = useState(true);
  const [v, setV] = useState<V>("winners");
  const bd = BOARDS[`${p}|${b}|${fl ? "net_fpl" : "net"}`];
  const t = bd?.totals ?? {};
  // Profit and loss split of the two boards, drawn the way Screen Time draws a split: one bar, then the figures as rows
  const won = (bd?.winners ?? []).reduce((a, r) => a + Math.max(0, r.pl), 0);
  const lost = (bd?.losers ?? []).reduce((a, r) => a + Math.min(0, r.pl), 0);
  const gross = won - lost;
  const share = gross > 0 ? (won / gross) * 100 : 0;
  const best = bd?.winners[0];
  const worst = bd?.losers[0];

  return (
    <>
      <NavBar title="Top 10" eyebrow={bd?.label ?? ""} back={{ href: "/risk/", label: "Risk Management" }} />
      <Segmented label="Period" value={p} onChange={setP} options={[{ v: "day", label: "Day" }, { v: "month", label: "Month" }, { v: "ytd", label: "Year" }]} />
      <Segmented label="Book" value={b} onChange={setB} options={[{ v: "clients", label: "All clients" }, { v: "a", label: "A book" }, { v: "b", label: "B book" }]} />

      <Metrics label="Totals" items={[
        { k: "Accounts", v: t.accounts ?? 0 },
        { k: "Client P&L", v: compact(fl ? t.client_total ?? t.client_pl : t.client_pl), tone: (t.client_pl ?? 0) >= 0 ? "pos" : "neg" },
        { k: "Top 10 share", v: pct(t.top10_winners_share_pct, 0) },
      ]} />

      {gross > 0 && (
        <Group header="Profit and loss" footer="Top 10 winners against top 10 losers for the period. Client profit is a cost to the book.">
          <div className="split">
            <span className="split-top"><b className="pos">{pct(share, 1)} profit</b><b className="neg">{pct(100 - share, 1)} loss</b></span>
            <span className="split-bar" role="img" aria-label={`${pct(share, 1)} profit, ${pct(100 - share, 1)} loss`}>
              <i className="split-pos" style={{ width: `${share}%` }} /><i className="split-neg" />
            </span>
          </div>
          <Row title="Net" detail={<Pnl v={won + lost} />} chevron={false} />
          <Row title="Total profit" detail={<Pnl v={won} />} chevron={false} />
          <Row title="Total loss" detail={<Pnl v={lost} />} chevron={false} />
          {best && <ClientRow login={best.login} name={best.name} sub="Highest profit" value={best.pl} />}
          {worst && worst.pl < 0 && <ClientRow login={worst.login} name={worst.name} sub="Highest loss" value={worst.pl} />}
        </Group>
      )}

      <Group footer="Counts floating P&L of open positions together with closed profit.">
        <Row title="Include floating P&L" chevron={false}><Switch on={fl} onChange={() => setFl(!fl)} label="Include floating P&L" /></Row>
      </Group>

      <Segmented label="Board" value={v} onChange={setV} options={[{ v: "winners", label: "Winners" }, { v: "losers", label: "Losers" }, { v: "volume", label: "Volume" }, { v: "groups", label: "Groups" }]} />

      <Group>
        {(!bd || (bd[v] ?? []).length === 0) && <Row title="No accounts on this board" subtitle="No account in this book met the activity threshold for the period." chevron={false} />}
        {v === "winners" || v === "losers" ? bd?.[v].map((r, i) => (
          <ClientRow key={r.login} login={r.login} name={`${i + 1}. ${r.name}`}
            sub={`${r.deals} deals · win ${pct(r.win_rate, 0)}${r.prev_rank ? ` · was ${r.prev_rank}` : " · new"}`} value={r.pl} />
        )) : v === "volume" ? bd?.volume.map((r, i) => (
          <ClientRow key={r.login} login={r.login} name={`${i + 1}. ${r.name}`} sub={`${r.deals} deals · ${num(r.avg_lot, 2)} lots each`} detail={`${num(r.lots, 1)} lots`} />
        )) : bd?.groups.map((g) => (
          <Row key={g.group} title={group(g.group) === "" ? g.group : g.group} subtitle={`${g.accounts} accounts · ${g.deals} deals`} detail={<Pnl v={g.total ?? g.pl} short />} />
        ))}
      </Group>
    </>
  );
}
