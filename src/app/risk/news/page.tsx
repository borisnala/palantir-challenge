"use client";

import { useState } from "react";
import { CalendarClock, Newspaper } from "lucide-react";
import { Chip, Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import nw from "@/data/news.json";
import { compact, num, pct, when } from "@/lib/data";

type P = "7d" | "30d" | "90d" | "all";
type I = "high" | "medium" | "all";
type Ev = { id: number; title: string; currency: string; impact: string; wib?: string; forecast: number | null; previous: number | null; actual: number | null; unit: string | null; status?: string; closed_net: number | null; accounts_active: number | null };
type Hunter = { login: number; name: string; events_participated: number; events_positive: number; hit_rate: number; total_net: number };
type Detail = Ev & { opened_lots?: number; closed_lots?: number; top_winner?: { login: number; name: string; close_net: number } | null; top_loser?: { login: number; name: string; close_net: number } | null };

const LISTS = nw.lists as unknown as Record<string, { pending: number; totals: { events_computed: number; broker_net: number }; upcoming: Ev[]; events: Ev[]; hunters: Hunter[] | null }>;
const EVENTS = nw.events as unknown as Record<string, Detail>;
const val = (v: number | null, u: string | null) => (v === null || v === undefined ? "Not out yet" : `${v}${u ?? ""}`);

export default function News() {
  const [p, setP] = useState<P>("30d");
  const [imp, setImp] = useState<I>("high");
  const [sel, setSel] = useState<Detail | null>(null);
  const [open, setOpen] = useState(false);
  const l = LISTS[`${p}|${imp}`];
  const done = l.events.filter((e) => e.status === "computed");
  const coming = l.events.filter((e) => e.status !== "computed");

  return (
    <>
      <NavBar title="News" eyebrow="Client P&L around economic releases" back={{ href: "/risk/", label: "Risk" }} />
      <Segmented label="Period" value={p} onChange={setP} options={[{ v: "7d", label: "7 days" }, { v: "30d", label: "30 days" }, { v: "90d", label: "90 days" }, { v: "all", label: "All" }]} />
      <Segmented label="Impact" value={imp} onChange={setImp} options={[{ v: "high", label: "High" }, { v: "medium", label: "Medium" }, { v: "all", label: "All" }]} />

      <Metrics label="Totals" items={[
        { k: "Events", v: l.totals.events_computed },
        { k: "Broker net", v: compact(l.totals.broker_net), tone: l.totals.broker_net >= 0 ? "pos" : "neg" },
        { k: "Pending", v: l.pending },
      ]} />

      {coming.length > 0 && (
        <Group header="Upcoming releases">
          {coming.map((e) => <Row key={e.id} icon={<CalendarClock size={17} strokeWidth={2.4} />} tint="var(--orange)" title={e.title}
            subtitle={`${e.currency} · forecast ${val(e.forecast, e.unit)}, previous ${val(e.previous, e.unit)}`} detail={when(e.wib)} chevron={false} />)}
        </Group>
      )}

      <Group header={`Computed · ${done.length}`} footer="Client profit closed in the minutes around each release. Negative broker net means clients won.">
        {done.length === 0 && <Row title="No computed events in this period" chevron={false} />}
        {done.map((e) => (
          <Row key={e.id} onClick={() => { setSel(EVENTS[String(e.id)] ?? e); setOpen(true); }} icon={<Newspaper size={17} strokeWidth={2.4} />}
            tint={e.impact === "high" ? "var(--red)" : "var(--orange)"} title={e.title} subtitle={`${e.currency} · ${when(e.wib)} · ${e.accounts_active ?? 0} accounts`}
            detail={e.closed_net !== null ? <Pnl v={e.closed_net} short /> : undefined} />
        ))}
      </Group>

      {l.hunters && l.hunters.length > 0 && (
        <Group header="News hunters" footer="Clients with consistent profit around news releases.">
          {l.hunters.slice(0, 10).map((h) => (
            <ClientRow key={h.login} login={h.login} name={h.name} sub={`${h.events_positive} of ${h.events_participated} events won · hit ${pct(h.hit_rate * 100, 0)}`} value={h.total_net} />
          ))}
        </Group>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Event">
        {sel && (
          <>
            <div className="sheet-hero"><span className="eyebrow">{sel.currency} · {when(sel.wib)}</span><b className="contact-name">{sel.title}</b><Chip tone={sel.impact === "high" ? "red" : "orange"}>{sel.impact} impact</Chip></div>
            <Group header="Release">
              <Row title="Actual" detail={val(sel.actual, sel.unit)} />
              <Row title="Forecast" detail={val(sel.forecast, sel.unit)} />
              <Row title="Previous" detail={val(sel.previous, sel.unit)} />
            </Group>
            <Group header="Client activity around the release">
              <Row title="Accounts active" detail={num(sel.accounts_active)} />
              <Row title="Closed client P&L" detail={sel.closed_net !== null ? <Pnl v={sel.closed_net} /> : "Not computed"} />
              {sel.opened_lots !== undefined && <Row title="Lots opened" detail={num(sel.opened_lots, 2)} />}
              {sel.closed_lots !== undefined && <Row title="Lots closed" detail={num(sel.closed_lots, 2)} />}
            </Group>
            {(sel.top_winner || sel.top_loser) && (
              <Group header="Largest results">
                {sel.top_winner && <ClientRow login={sel.top_winner.login} name={sel.top_winner.name} sub="Top winner" value={sel.top_winner.close_net} />}
                {sel.top_loser && <ClientRow login={sel.top_loser.login} name={sel.top_loser.name} sub="Top loser" value={sel.top_loser.close_net} />}
              </Group>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
