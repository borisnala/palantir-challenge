"use client";

import Link from "next/link";
import { useApp } from "@/components/app-state";
import { Pnl, SecHead, Sparkline, StatusTag } from "@/components/ui";
import { CLIENTS, DIGEST, NEWS, compact, findClient } from "@/lib/data";

export default function Today() {
  const { pending, unread } = useApp();
  const hits = CLIENTS.filter((c) => c.status);
  const wdTotal = pending.reduce((a, w) => a + w.amount, 0);

  return (
    <>
      <header className="titlebar">
        <div>
          <p className="eyebrow">Morning digest · since {DIGEST.since}</p>
          <h1>Today</h1>
        </div>
        <span className="mark-gr" aria-hidden="true">GR</span>
      </header>

      <p className="lead card">{DIGEST.headline}</p>

      <section className="section" aria-label="Needs you">
        <SecHead title="Needs you" />
        <div className="group">
          <Link href="/approvals/" className="row">
            <span className="stack"><span className="strong">Withdrawals to decide</span><span className="muted">{pending.length ? `${compact(wdTotal)} across ${pending.length} requests` : "Nothing waiting"}</span></span>
            <span className={`count ${pending.length ? "count-hot" : ""}`}>{pending.length}</span>
          </Link>
          <Link href="/alerts/" className="row">
            <span className="stack"><span className="strong">Unread alerts</span><span className="muted">2 critical news profits</span></span>
            <span className={`count ${unread.size ? "count-hot" : ""}`}>{unread.size}</span>
          </Link>
        </div>
      </section>

      <section className="stats3" aria-label="Book">
        <div className="stat"><span className="eyebrow">Flagged</span><strong>{DIGEST.flagged}</strong><span className="small">{DIGEST.flaggedChange} since prior</span></div>
        <div className="stat"><span className="eyebrow">Client P&amp;L 30d</span><strong className="pos">{compact(DIGEST.clientPnl30)}</strong><span className="small">{compact(DIGEST.clientPnl30Change, true)} since prior</span></div>
        <div className="stat"><span className="eyebrow">Floating</span><strong className="pos">{compact(DIGEST.floating)}</strong><span className="small">{compact(DIGEST.floatingChange, true)} since prior</span></div>
      </section>

      <section className="section">
        <SecHead title="Watchlist hits" count={hits.length} href="/clients/" />
        <div className="rail">
          {hits.map((c) => (
            <Link key={c.login} href={`/clients/${c.login}/`} className="tile">
              <span className="top"><span className="strong">{c.name}</span>{c.status && <StatusTag s={c.status} />}</span>
              <span className="small">#{c.login} · {c.why}</span>
              <Sparkline values={c.pnl30} />
              <span className="top foot"><span className="small">T30</span><Pnl v={c.t30} short /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <SecHead title="Tier moves" count={DIGEST.moves.length} />
        <div className="group">
          {DIGEST.moves.map((m) => {
            const c = findClient(m.login)!;
            return (
              <Link key={m.login} href={`/clients/${m.login}/`} className="row">
                <span className="stack"><span className="strong">{c.name}</span><span className="muted">#{c.login}</span></span>
                <span className="move"><b>{m.from}</b><i className="arrow" /><b>{m.to}</b><span className={`tag ${m.worse ? "tag-escalated" : "tag-cleared"}`}>{m.worse ? "Worse" : "Better"}</span></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section">
        <SecHead title="News coming up" />
        <div className="group">
          {NEWS.map((n) => (
            <div key={n.title} className="row">
              <span className="stack"><span className="strong">{n.title}</span><span className="muted">{n.currency} · {n.exposed} flagged {n.exposed === 1 ? "account holds" : "accounts hold"} {n.currency}</span></span>
              <span className={`when ${n.impact === "high" && n.inMinutes < 60 ? "when-soon" : ""}`}>{n.inMinutes < 60 ? `${n.inMinutes} min` : `${Math.round(n.inMinutes / 60)} h`}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
