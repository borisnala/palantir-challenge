"use client";

import Link from "next/link";
import { ArrowDownUp, ArrowUpRight, Bell, ChevronRight, Newspaper, TrendingUp, Wallet } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row } from "@/components/ios";
import { ChangePill, Sparkline } from "@/components/ui";
import { CLIENTS, DIGEST, NEWS, compact, findClient } from "@/lib/data";

// Health app "Summary" card: tinted label row on top, big rounded value below.
function SummaryCard({ href, Icon, color, label, time, value, unit, children }: {
  href: string; Icon: typeof Bell; color: string; label: string; time?: string; value: string; unit?: string; children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="hcard">
      <span className="hcard-top" style={{ color }}>
        <Icon size={17} strokeWidth={2.4} />
        <span className="hcard-label">{label}</span>
        <span className="hcard-time">{time}</span>
        <ChevronRight size={16} strokeWidth={2.6} className="hcard-chev" />
      </span>
      <span className="hcard-bottom">
        <span><b className="hcard-value">{value}</b>{unit && <span className="hcard-unit"> {unit}</span>}</span>
        {children}
      </span>
    </Link>
  );
}

export default function Today() {
  const { pending, unread } = useApp();
  const hits = CLIENTS.filter((c) => c.status);
  const wdTotal = pending.reduce((a, w) => a + w.amount, 0);

  return (
    <>
      <NavBar title="Today" eyebrow="Morning digest" />

      <p className="digest">{DIGEST.headline}</p>

      <section className="hcards" aria-label="Needs you">
        <h2 className="sub-head">Needs you</h2>
        <SummaryCard href="/approvals/" Icon={Wallet} color="var(--orange)" label="Withdrawals" time="15:58"
          value={String(pending.length)} unit="to decide">
          <span className="hcard-note">{compact(wdTotal)} in total</span>
        </SummaryCard>
        <SummaryCard href="/alerts/" Icon={Bell} color="var(--red)" label="Alerts" time="4 min ago"
          value={String(unread.size)} unit="unread">
          <span className="hcard-note">2 critical</span>
        </SummaryCard>
      </section>

      <section className="hcards" aria-label="Book">
        <h2 className="sub-head">Flagged book</h2>
        <div className="hgrid">
          <SummaryCard href="/clients/" Icon={TrendingUp} color="var(--green)" label="Client P&L" value={compact(DIGEST.clientPnl30)} unit="30 days">
            <span className="hcard-note">{compact(DIGEST.clientPnl30Change, true)} since 12 Nov</span>
          </SummaryCard>
          <SummaryCard href="/clients/" Icon={ArrowUpRight} color="var(--blue)" label="Floating" value={compact(DIGEST.floating)}>
            <span className="hcard-note">{compact(DIGEST.floatingChange, true)} since 12 Nov</span>
          </SummaryCard>
        </div>
      </section>

      <Group header={<>Watchlist hits <Link href="/clients/" className="grp-link">Show All</Link></>}>
        {hits.map((c) => (
          <Link key={c.login} href={`/clients/${c.login}/`} className="row stock">
            <span className="row-main">
              <span className="row-text">
                <span className="row-title">{c.name}</span>
                <span className="row-sub">{c.why}</span>
              </span>
              <span className="stock-chart"><Sparkline values={c.pnl30} id={`h${c.login}`} /></span>
              <span className="stock-right"><span className="stock-val">{compact(c.balance)}</span><ChangePill v={c.t30} /></span>
            </span>
          </Link>
        ))}
      </Group>

      <Group header="Tier moves" footer="A worse tier means wider spreads for that client.">
        {DIGEST.moves.map((m) => {
          const c = findClient(m.login)!;
          return (
            <Row key={m.login} href={`/clients/${m.login}/`} icon={<ArrowDownUp size={17} strokeWidth={2.4} />} tint={m.worse ? "var(--red)" : "var(--green)"}
              title={c.name} subtitle={`${m.from} to ${m.to}`} detail={m.worse ? "Worse" : "Better"} />
          );
        })}
      </Group>

      <Group header="News coming up">
        {NEWS.map((n) => (
          <Row key={n.title} icon={<Newspaper size={17} strokeWidth={2.4} />} tint={n.impact === "high" ? "var(--orange)" : "var(--gray)"}
            title={n.title} subtitle={`${n.currency} · ${n.exposed} flagged ${n.exposed === 1 ? "account holds" : "accounts hold"} ${n.currency}`}
            detail={n.inMinutes < 60 ? `${n.inMinutes} min` : `${Math.round(n.inMinutes / 60)} h`} />
        ))}
      </Group>

      <p className="fine">Dummy data. Snapshot since {DIGEST.since}.</p>
    </>
  );
}
