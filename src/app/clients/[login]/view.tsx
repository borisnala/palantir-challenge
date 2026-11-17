"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Copy, Eye, Route } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Chip, Group, NavBar, Row, Segmented, Switch } from "@/components/ios";
import { Monogram, Pnl } from "@/components/ui";
import { ALERTS, group, money, num, pct, when, type Client } from "@/lib/data";

type Pov = "client" | "broker";

export function ClientView({ c }: { c: Client }) {
  const { watched, toggleWatch, say } = useApp();
  const [pov, setPov] = useState<Pov>("client");
  const k = pov === "client" ? 1 : -1; // broker P&L mirrors client P&L
  const on = watched.has(c.login);
  const alerts = ALERTS.filter((a) => a.login === c.login);
  const watch = () => { toggleWatch(c.login); say(on ? `${c.name} removed from the watchlist` : `${c.name} added to the watchlist`); };
  const copy = () => { navigator.clipboard?.writeText(String(c.login)).catch(() => {}); say(`Login ${c.login} copied`); };

  return (
    <>
      <NavBar title={c.name} large={false} back={{ href: "/search/", label: "Clients" }} />

      <header className="contact">
        <Monogram name={c.name} size={88} />
        <h1 className="contact-name">{c.name}</h1>
        <p className="row-sub">#{c.login} · {group(c.group_now)}</p>
        <span className="tags">{c.momentum && <Chip tone={c.momentum === "accelerating" ? "red" : "gray"}>{c.momentum[0].toUpperCase() + c.momentum.slice(1)}</Chip>}{on && <Chip tone="purple">Watch</Chip>}</span>
        <div className="actions">
          <button className={`action ${on ? "action-on" : ""}`} onClick={watch}><Eye size={20} strokeWidth={2.2} /><span>{on ? "Watching" : "Watch"}</span></button>
          <a className="action" href="#alerts"><Bell size={20} strokeWidth={2.2} /><span>Alerts {alerts.length}</span></a>
          <button className="action" onClick={copy}><Copy size={20} strokeWidth={2.2} /><span>Copy Login</span></button>
        </div>
      </header>

      <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} />

      <section className="chartcard">
        <span className="eyebrow">Last 30 days</span>
        <b className="chart-value"><Pnl v={c.t30 * k} /></b>
        <div className="chart-stats">
          <div><span>All time</span><Pnl v={c.tall * k} short /></div>
          <div><span>180 days</span><Pnl v={c.t180 * k} short /></div>
          <div><span>Floating</span><Pnl v={c.fpl * k} short /></div>
          <div><span>Win rate</span><b>{pct(c.win_rate)}</b></div>
        </div>
      </section>

      <Group header="Account">
        <Row title="Balance" detail={money(c.balance)} />
        <Row title="Equity" detail={money(c.equity)} />
        <Row title="Credit" detail={money(c.credit)} />
        <Row title="Lots, 30 days" detail={c.lots_30d === null ? "Not recorded" : num(c.lots_30d, 2)} />
        <Row title="Deals, 30 days" detail={c.deals_30d === null ? "Not recorded" : num(c.deals_30d)} />
        <Row title="Group" detail={group(c.group_now)} />
      </Group>

      {c.open && (
        <Group header={`Open now · ${c.open.positions} positions`} footer={c.open.mg ? `MachineGun tier ${c.open.mg.tier} in a ${c.open.mg.window} s window, ${c.open.mg.lots} lots.` : undefined}>
          <Row title="Gross lots" detail={num(c.open.gross, 2)} />
          <Row title="Net lots" detail={num(c.open.net, 2)} />
          <Row title="Floating" detail={<Pnl v={c.open.fpl * k} />} />
          {c.open.top_symbols.map(([s, l]) => <Row key={s} title={s} detail={`${num(l, 2)} lots`} />)}
        </Group>
      )}

      {c.pg_moves && c.pg_moves.length > 0 && (
        <Group header="Price group moves">
          {c.pg_moves.map((m, i) => (
            <Row key={i} icon={<Route size={17} strokeWidth={2.4} />} tint="var(--blue)" title={`${m.from_tier} to ${m.to_tier}`}
              subtitle={`${group(m.to)} · ${m.source}`} detail={when(m.time_wib)} />
          ))}
        </Group>
      )}

      {c.etl && c.etl.length > 0 && (
        <Group header="Equity traffic light">
          {c.etl.map((e, i) => <Row key={i} title={e.reason} subtitle={`${e.kind.replace(/_/g, " ")} · ${e.tpl}`} detail={when(e.time_wib)} />)}
        </Group>
      )}

      <section id="alerts">
        <Group header={`Alerts · ${alerts.length}`}>
          {alerts.length === 0 && <Row title="No alerts for this client" chevron={false} />}
          {alerts.map((a) => <Row key={a.id} title={a.title} subtitle={a.detail} detail={<Link href="/alerts/" className="link">Open</Link>} />)}
        </Group>
      </section>

      <Group footer="Alerts for clients on the watchlist also show on Today.">
        <Row title="On watchlist" chevron={false}><Switch on={on} onChange={watch} label="On watchlist" /></Row>
      </Group>

      <p className="fine">Dummy data.</p>
    </>
  );
}
