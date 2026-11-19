"use client";

import Link from "next/link";
import { ArrowDownUp, Bell, ChevronRight, Newspaper, Search, TrendingUp, Waves } from "lucide-react";
import { useState } from "react";
import { buzz } from "@/lib/haptics";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row, Sheet } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { ChangePill } from "@/components/ui";
import digest from "@/data/digest.json";
import newsData from "@/data/news.json";
import { compact, day, hasProfile, when } from "@/lib/data";

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
const S = digest.sections as unknown as Record<string, R[]>;
const n = (v: unknown) => (typeof v === "number" ? v : 0);

/** The digest's movement (owner 2026-11-19: columns of cards do not scale to hundreds of clients). One stacked bar
 *  of counts by kind, the kinds as filters with their counts, and a dense table of the biggest moves, as a terminal
 *  lists them. The first 8 rows show here, the rest in a sheet with a search field. */
type Kind = "new" | "worse" | "better" | "up" | "swing" | "left";
const KIND: Record<Kind, { label: string; tone: string }> = {
  new: { label: "Entered", tone: "var(--orange)" }, worse: { label: "Worse tier", tone: "var(--red)" }, better: { label: "Better tier", tone: "var(--green)" },
  up: { label: "Profit up", tone: "var(--purple)" }, swing: { label: "Floating swing", tone: "var(--blue)" }, left: { label: "Left", tone: "var(--gray)" },
};
type Move = { kind: Kind; login: number; name: string; what: string; size: number; fig: React.ReactNode };
function movesOf(): Move[] {
  const tm = S.tier_moves;
  return [
    ...S.new_flagged.map((r) => ({ kind: "new" as Kind, login: r.login, name: r.name, what: `Tier ${r.pg} ${r.tier}`, size: Math.abs(n(r.t30)), fig: compact(n(r.t30)) })),
    ...tm.filter((r) => r.direction === "worse").map((r) => ({ kind: "worse" as Kind, login: r.login, name: r.name, what: `${r.pg_before} to ${r.pg_now}`, size: Math.abs(n(r.t30)), fig: compact(n(r.t30)) })),
    ...tm.filter((r) => r.direction !== "worse").map((r) => ({ kind: "better" as Kind, login: r.login, name: r.name, what: `${r.pg_before} to ${r.pg_now}`, size: Math.abs(n(r.t30)), fig: compact(n(r.t30)) })),
    ...S.exposure_up.map((r) => ({ kind: "up" as Kind, login: r.login, name: r.name, what: "Client profit up", size: Math.abs(n(r.t30_delta)), fig: <ChangePill v={n(r.t30_delta)} /> })),
    ...S.floating_swing.map((r) => ({ kind: "swing" as Kind, login: r.login, name: r.name, what: "Floating swing", size: Math.abs(n(r.fpl_delta)), fig: <ChangePill v={n(r.fpl_delta)} /> })),
    ...S.left_book.map((r) => ({ kind: "left" as Kind, login: r.login, name: r.name, what: `Was ${r.pg}`, size: Math.abs(n(r.t30)), fig: compact(n(r.t30)) })),
  ].sort((x, y) => y.size - x.size);
}
const MOVES = movesOf();

function MoveRow({ m }: { m: Move }) {
  return (
    <Row href={hasProfile(m.login) ? `/clients/${m.login}/` : undefined} icon={<i className="mv-dot" style={{ background: KIND[m.kind].tone }} />} tint="transparent"
      title={m.name} subtitle={`${KIND[m.kind].label} · ${m.what}`} detail={m.fig} />
  );
}

function AllMoves({ kind }: { kind: Kind | "all" }) {
  const [q, setQ] = useState("");
  const list = MOVES.filter((m) => (kind === "all" || m.kind === kind) && (!q || `${m.name} ${m.login}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <label className="searchfield"><Search size={17} strokeWidth={2.4} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or login" aria-label="Filter moves" /></label>
      <Group header={`${list.length} ${list.length === 1 ? "move" : "moves"}`}>
        {list.length === 0 && <Row title="No match" chevron={false} />}
        {list.map((m, i) => <MoveRow key={`${m.kind}-${m.login}-${i}`} m={m} />)}
      </Group>
    </>
  );
}

function Board() {
  const t = digest.totals;
  const [kind, setKind] = useState<Kind | "all">("all");
  const [all, setAll] = useState(false);
  const counts = (Object.keys(KIND) as Kind[]).map((k) => ({ k, n: MOVES.filter((m) => m.kind === k).length }));
  const total = MOVES.length;
  const list = MOVES.filter((m) => kind === "all" || m.kind === kind);
  return (
    <section className="board" aria-label="Book movement">
      <div className="board-head">
        <span className="eyebrow">Client profit, flagged book</span>
        <b className={`board-big ${t.t30_delta >= 0 ? "neg" : "pos"}`}>{compact(t.t30_delta, true)}</b>
        <span className="row-sub">30 days {compact(t.t30_before)} to {compact(t.t30_now)}. Flagged accounts {t.flagged_before} to {t.flagged_now}.</span>
        <span className="mv-bar" role="img" aria-label={counts.map((c) => `${c.n} ${KIND[c.k].label}`).join(", ")}>
          {counts.filter((c) => c.n).map((c) => <i key={c.k} style={{ flex: c.n, background: KIND[c.k].tone }} />)}
        </span>
        <div className="tchips" role="radiogroup" aria-label="Kind of move">
          <button role="radio" aria-checked={kind === "all"} className={`tchip ${kind === "all" ? "on" : ""}`} onClick={() => { buzz(); setKind("all"); }}>All {total}</button>
          {counts.filter((c) => c.n).map((c) => (
            <button key={c.k} role="radio" aria-checked={kind === c.k} className={`tchip ${kind === c.k ? "on" : ""}`} style={{ ["--c" as string]: KIND[c.k].tone }} onClick={() => { buzz(); setKind(c.k); }}><i />{KIND[c.k].label} {c.n}</button>
          ))}
        </div>
      </div>
      <Group header={kind === "all" ? "Largest moves" : KIND[kind].label} footer="Sorted by size. Profit and swings show the change, the rest show 30 day client P&L.">
        {list.slice(0, 8).map((m, i) => <MoveRow key={`${m.kind}-${m.login}-${i}`} m={m} />)}
        {list.length > 8 && <Row onClick={() => setAll(true)} title={<span className="link-blue">Show all {list.length}</span>} chevron={false} />}
      </Group>
      <Sheet open={all} onClose={() => setAll(false)} title={kind === "all" ? "All moves" : KIND[kind].label}><AllMoves kind={kind} /></Sheet>
    </section>
  );
}

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
