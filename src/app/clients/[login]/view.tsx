"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Initials, Pnl, RiskDot, SecHead, Sparkline, StatusTag } from "@/components/ui";
import { compact, money, type Client } from "@/lib/data";

const POV = { client: "Client view", broker: "Broker view" };

export function ClientView({ c }: { c: Client }) {
  const { watched, toggleWatch } = useApp();
  const [pov, setPov] = useState<keyof typeof POV>("client");
  const k = pov === "client" ? 1 : -1; // broker P&L is the mirror of client P&L
  const on = watched.has(c.login);

  return (
    <>
      <Link href="/clients/" className="back glass"><i className="chev" />Clients</Link>

      <header className="profile card">
        <div className="top">
          <Initials name={c.name} />
          <div className="stack grow">
            <h1 className="h2">{c.name}</h1>
            <span className="muted">#{c.login} · {c.country}</span>
          </div>
          {c.status && <StatusTag s={c.status} />}
        </div>
        <div className="tags">
          <span className="tag">{c.style}</span>
          <span className="tag">Tier {c.tier}</span>
          <span className="tag">{c.group.replace("DUMMY\\", "")}</span>
          <RiskDot r={c.risk} />
        </div>
        {c.note && <p className="note">{c.note}</p>}
        <button className={on ? "soft" : "fill"} onClick={() => toggleWatch(c.login)}>{on ? "On your watchlist" : "Add to watchlist"}</button>
      </header>

      <div className="seg" role="tablist" aria-label="Point of view">
        {(Object.keys(POV) as (keyof typeof POV)[]).map((p) => (
          <button key={p} role="tab" aria-selected={pov === p} className={pov === p ? "seg-on" : ""} onClick={() => setPov(p)}>{POV[p]}</button>
        ))}
      </div>

      <section className="card">
        <div className="top"><span className="eyebrow">P&amp;L last 30 days</span><Pnl v={c.t30 * k} /></div>
        <Sparkline values={c.pnl30.map((v) => v * k)} height={64} />
        <div className="stats3 inner">
          <div><span className="small">T180</span><Pnl v={c.t180 * k} short /></div>
          <div><span className="small">Floating</span><Pnl v={c.fpl * k} short /></div>
          <div><span className="small">Win rate</span><span>{c.winRate}%</span></div>
        </div>
      </section>

      <section className="stats">
        <div className="stat"><span className="eyebrow">Balance</span><strong className="num">{compact(c.balance)}</strong><span className="small">{money(c.balance)}</span></div>
        <div className="stat"><span className="eyebrow">Equity</span><strong className="num">{compact(c.equity)}</strong><span className="small">Profit factor {c.profitFactor ?? "no losses"}</span></div>
      </section>

      <section className="section">
        <SecHead title="Open positions" count={c.exposure.length} />
        <div className="group">
          {c.exposure.map((p) => (
            <div key={p.symbol} className="row">
              <span className="stack"><span className="strong">{p.symbol}</span><span className="muted">{p.side} {p.lots} lots · net {compact(p.net)}</span></span>
              <Pnl v={p.fpl * k} />
            </div>
          ))}
        </div>
      </section>
      <p className="small center">Last trade {c.lastTrade}. Dummy data.</p>
    </>
  );
}
