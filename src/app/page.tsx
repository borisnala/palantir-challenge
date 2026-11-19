"use client";

import Link from "next/link";
import { ArrowDownUp, Bell, ChevronRight, Newspaper, TrendingUp, Waves } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { ChangePill, Monogram } from "@/components/ui";
import digest from "@/data/digest.json";
import newsData from "@/data/news.json";
import { compact, day, hasProfile, pct, when } from "@/lib/data";

// Health "Summary" card: tinted label row, big rounded value.
function SummaryCard({ href, Icon, color, label, time, value, unit, note }: {
  href: string; Icon: typeof Bell; color: string; label: string; time?: string; value: string; unit?: string; note?: string;
}) {
  return (
    <Link href={href} className="hcard">
      <span className="hcard-top" style={{ color }}>
        <Icon size={17} strokeWidth={2.4} />
        <span className="hcard-label">{label}</span>
        {time && <span className="hcard-time">{time}</span>}
        <ChevronRight size={16} strokeWidth={2.6} className="hcard-chev" />
      </span>
      <span className="hcard-bottom">
        <span><b className="hcard-value">{value}</b>{unit && <span className="hcard-unit"> {unit}</span>}</span>
        {note && <span className="hcard-note">{note}</span>}
      </span>
    </Link>
  );
}

type R = Record<string, unknown> & { login: number; name: string };

/** The digest as a board (owner 2026-11-19, "so lame, showcase as a chart or kanban"): the profit change first, the
 *  flagged count as in and out, then one column per kind of movement with its clients as cards, swiped sideways. */
function Board() {
  const t = digest.totals;
  const tm = S.tier_moves;
  const cols: { k: string; title: string; tone: string; rows: R[]; fig: (r: R) => React.ReactNode }[] = [
    { k: "new", title: "Entered", tone: "var(--orange)", rows: S.new_flagged, fig: (r) => `Tier ${r.pg} ${r.tier}` },
    { k: "worse", title: "Worse tier", tone: "var(--red)", rows: tm.filter((r) => r.direction === "worse"), fig: (r) => `${r.pg_before} to ${r.pg_now}` },
    { k: "better", title: "Better tier", tone: "var(--green)", rows: tm.filter((r) => r.direction !== "worse"), fig: (r) => `${r.pg_before} to ${r.pg_now}` },
    { k: "up", title: "Profit up", tone: "var(--purple)", rows: S.exposure_up, fig: (r) => compact(n(r.t30_delta), true) },
    { k: "swing", title: "Floating swing", tone: "var(--blue)", rows: S.floating_swing, fig: (r) => compact(n(r.fpl_delta), true) },
    { k: "left", title: "Left", tone: "var(--gray)", rows: S.left_book, fig: (r) => `Was ${r.pg}` },
  ];
  const inN = S.new_flagged.length, outN = S.left_book.length;
  return (
    <section className="board" aria-label="Book movement">
      <div className="board-head">
        <span className="eyebrow">Client profit, flagged book</span>
        <b className={`board-big ${t.t30_delta >= 0 ? "neg" : "pos"}`}>{compact(t.t30_delta, true)}</b>
        <span className="row-sub">30 days {compact(t.t30_before)} to {compact(t.t30_now)}. Client profit is a cost to the book.</span>
        <div className="board-flow" aria-label={`Flagged accounts ${t.flagged_before} to ${t.flagged_now}`}>
          <span className="bf-n">{t.flagged_before}</span>
          <span className="bf-bars"><i className="bf-in" style={{ flex: inN }}>+{inN} in</i><i className="bf-out" style={{ flex: outN }}>−{outN} out</i></span>
          <span className="bf-n">{t.flagged_now}</span>
        </div>
      </div>
      <div className="kanban">
        {cols.map((c) => (
          <div key={c.k} className="kcol" style={{ ["--tone" as string]: c.tone }}>
            <span className="kcol-head"><i />{c.title}<b>{c.rows.length}</b></span>
            {c.rows.length === 0 && <span className="kempty">None</span>}
            {c.rows.map((r) => {
              const body = (<><Monogram name={String(r.name)} size={28} /><span className="kcard-t"><b>{String(r.name)}</b><small>{c.fig(r)}</small></span></>);
              return hasProfile(r.login)
                ? <Link key={r.login} href={`/clients/${r.login}/`} className="kcard">{body}</Link>
                : <span key={r.login} className="kcard">{body}</span>;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
const S = digest.sections as unknown as Record<string, R[]>;
const n = (v: unknown) => (typeof v === "number" ? v : 0);

export default function Today() {
  const { pending, unread } = useApp();
  const t = digest.totals;
  const wdTotal = pending.reduce((a, w) => a + (w.amount ?? 0), 0);
  const upcoming = newsData.lists["7d|high"].upcoming;

  return (
    <>
      <NavBar title="Morning Digest" eyebrow={`Since ${when(digest.previous_taken_at)}`} root />

      <Board />

      <section className="hcards" aria-label="Action required">
        <h2 className="sub-head">Action required</h2>
        <SummaryCard href="/withdrawals/" Icon={ArrowDownUp} color="var(--orange)" label="Withdrawals"
          value={String(pending.length)} unit="pending review" note={`${compact(wdTotal)} in total`} />
        <SummaryCard href="/alerts/" Icon={Bell} color="var(--red)" label="Notifications" value={String(unread.size)} unit="unread" />
      </section>

      <section className="hcards" aria-label="Flagged book">
        <h2 className="sub-head">Flagged book</h2>
        <div className="hgrid">
          <SummaryCard href="/liquidity/book/" Icon={TrendingUp} color="var(--green)" label="Client P&L" value={compact(t.t30_now)} unit="30 days"
            note={`${compact(t.t30_delta, true)} since ${day(Date.parse(digest.previous_taken_at) / 1000)}`} />
          <SummaryCard href="/risk/open-lots/" Icon={Waves} color="var(--blue)" label="Floating" value={compact(t.fpl_now)}
            note={`${compact(t.fpl_delta, true)} since ${day(Date.parse(digest.previous_taken_at) / 1000)}`} />
        </div>
        <SummaryCard href="/risk/watchlist/" Icon={TrendingUp} color="var(--purple)" label="Flagged accounts" value={String(t.flagged_now)}
          note={`${t.flagged_now - t.flagged_before >= 0 ? "+" : ""}${t.flagged_now - t.flagged_before} since prior`} />
      </section>

      <Group header={`Watchlist hits · ${S.watchlist_hits.length}`}>
        {S.watchlist_hits.map((r) => (
          <ClientRow key={r.login} login={r.login} name={r.name} sub={String(r.watchlist_note ?? "").replace(/^DUMMY note: /, "")}
            detail={<span className="stack-r"><ChangePill v={n(r.t30_delta)} /><span className="small">T30 change</span></span>} />
        ))}
      </Group>

      <Group header={`New flagged · ${S.new_flagged.length}`}>
        {S.new_flagged.map((r) => <ClientRow key={r.login} login={r.login} name={r.name} sub={`Tier ${r.pg} ${r.tier} · win ${pct(n(r.win_rate_pct))}`} value={n(r.t30)} />)}
      </Group>

      <Group header={`Tier moves · ${S.tier_moves.length}`} footer="A downgrade widens the client's spreads.">
        {S.tier_moves.map((r) => (
          <ClientRow key={r.login} login={r.login} name={r.name} sub={`${r.pg_before} to ${r.pg_now}`}
            detail={<span className={r.direction === "worse" ? "neg" : "pos"}>{r.direction === "worse" ? "Worse" : "Better"}</span>} />
        ))}
      </Group>

      <Group header={`Client profit up · ${S.exposure_up.length}`}>
        {S.exposure_up.map((r) => <ClientRow key={r.login} login={r.login} name={r.name} sub={`T30 ${compact(n(r.t30_before))} to ${compact(n(r.t30_now))}`} detail={<ChangePill v={n(r.t30_delta)} />} />)}
      </Group>

      <Group header={`Floating P&L swing · ${S.floating_swing.length}`}>
        {S.floating_swing.map((r) => <ClientRow key={r.login} login={r.login} name={r.name} sub={`Floating ${compact(n(r.fpl_before))} to ${compact(n(r.fpl_now))}`} detail={<ChangePill v={n(r.fpl_delta)} />} />)}
      </Group>

      <Group header={`Left the flagged book · ${S.left_book.length}`}>
        {S.left_book.map((r) => <ClientRow key={r.login} login={r.login} name={r.name} sub={`Was tier ${r.pg} ${r.tier}`} value={n(r.t30)} />)}
      </Group>

      <Group header="Upcoming high impact releases">
        {upcoming.map((e) => (
          <Row key={e.id} href="/risk/news/" icon={<Newspaper size={17} strokeWidth={2.4} />} tint="var(--orange)"
            title={e.title} subtitle={`${e.currency} · forecast ${e.forecast ?? "not set"}${e.unit ?? ""}, previous ${e.previous ?? "not set"}${e.unit ?? ""}`}
            detail={when(e.event_time_utc)} />
        ))}
      </Group>

      <p className="fine">Demonstration data. Snapshot taken {when(digest.taken_at)} UTC.</p>
    </>
  );
}
