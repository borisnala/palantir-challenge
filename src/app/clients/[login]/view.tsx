"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Copy, Eye } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row, Segmented, Switch } from "@/components/ios";
import { Monogram, Pnl, Sparkline, StatusTag } from "@/components/ui";
import { compact, money, type Client } from "@/lib/data";

type Pov = "client" | "broker";

export function ClientView({ c }: { c: Client }) {
  const { watched, toggleWatch } = useApp();
  const [pov, setPov] = useState<Pov>("client");
  const [copied, setCopied] = useState(false);
  const k = pov === "client" ? 1 : -1; // broker P&L mirrors client P&L
  const on = watched.has(c.login);
  const copy = () => { navigator.clipboard?.writeText(String(c.login)).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1400); };

  return (
    <>
      <NavBar title={c.name} large={false} back={{ href: "/clients/", label: "Clients" }} tone="purple" />

      {/* Contacts-style header */}
      <header className="contact">
        <Monogram name={c.name} size={88} />
        <h1 className="contact-name">{c.name}</h1>
        <p className="row-sub">#{c.login} · {c.country}</p>
        {c.status && <StatusTag s={c.status} />}
        <div className="actions">
          <button className={`action ${on ? "action-on" : ""}`} onClick={() => toggleWatch(c.login)}><Eye size={20} strokeWidth={2.2} /><span>{on ? "Watching" : "Watch"}</span></button>
          <Link className="action" href="/alerts/"><Bell size={20} strokeWidth={2.2} /><span>Alerts</span></Link>
          <button className="action" onClick={copy}><Copy size={20} strokeWidth={2.2} /><span>{copied ? "Copied" : "Copy Login"}</span></button>
        </div>
      </header>

      {c.note && <Group header="Note"><Row title={c.note} chevron={false} /></Group>}

      <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} />

      {/* Stocks-style chart card */}
      <section className="chartcard">
        <span className="eyebrow">Last 30 days</span>
        <b className="chart-value"><Pnl v={c.t30 * k} /></b>
        <Sparkline values={c.pnl30.map((v) => v * k)} height={120} fill id={`c${c.login}${pov}`} />
        <div className="chart-stats">
          <div><span>T180</span><Pnl v={c.t180 * k} short /></div>
          <div><span>Floating</span><Pnl v={c.fpl * k} short /></div>
          <div><span>Win rate</span><b>{c.winRate}%</b></div>
          <div><span>Profit factor</span><b>{c.profitFactor ?? "No losses"}</b></div>
        </div>
      </section>

      <Group header="Account">
        <Row title="Balance" detail={money(c.balance)} />
        <Row title="Equity" detail={money(c.equity)} />
        <Row title="Trading style" detail={c.style} />
        <Row title="Price tier" detail={c.tier} />
        <Row title="Group" detail={c.group.replace("DUMMY\\", "")} />
        <Row title="Risk" detail={<span className={`riskval risk-${c.risk}`}>{c.risk[0].toUpperCase() + c.risk.slice(1)}</span>} />
      </Group>

      <Group header={`Open positions · ${c.exposure.length}`}>
        {c.exposure.map((p) => (
          <Row key={p.symbol} title={p.symbol} subtitle={`${p.side} ${p.lots} lots · net ${compact(p.net)}`} detail={<Pnl v={p.fpl * k} />} />
        ))}
      </Group>

      <Group footer="Alerts from this client show up in Alerts and on Today.">
        <Row title="On watchlist" chevron={false}><Switch on={on} onChange={() => toggleWatch(c.login)} label="On watchlist" /></Row>
      </Group>

      <p className="fine">Last trade {c.lastTrade}. Dummy data.</p>
    </>
  );
}
