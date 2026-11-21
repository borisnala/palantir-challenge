"use client";

import Link from "@/components/nav-link";
import { ArrowDownUp, Bell, ChartCandlestick, ChevronRight, Newspaper, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { buzz } from "@/lib/haptics";
import { useApp } from "@/components/app-state";
import { Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { ChangePill } from "@/components/ui";
import digest from "@/data/digest.json";
import hist from "@/data/history.json";
import catches from "@/data/catches.json";
import newsData from "@/data/news.json";
import { compact, day, group, hasProfile, money, nameOf, num, sentence, when } from "@/lib/data";

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
type Move = { kind: Kind; login: number; name: string; what: string; size: number; fig: React.ReactNode; r: R };
function movesOf(): Move[] {
  const tm = S.tier_moves;
  return [
    ...S.new_flagged.map((r) => ({ kind: "new" as Kind, login: r.login, name: r.name, what: `Tier ${r.pg} ${r.tier}`, size: Math.abs(n(r.t30)), fig: <ChangePill v={n(r.t30)} />, r })),
    ...tm.filter((r) => r.direction === "worse").map((r) => ({ kind: "worse" as Kind, login: r.login, name: r.name, what: `${r.pg_before} to ${r.pg_now}`, size: Math.abs(n(r.t30)), fig: <ChangePill v={n(r.t30)} />, r })),
    ...tm.filter((r) => r.direction !== "worse").map((r) => ({ kind: "better" as Kind, login: r.login, name: r.name, what: `${r.pg_before} to ${r.pg_now}`, size: Math.abs(n(r.t30)), fig: <ChangePill v={n(r.t30)} />, r })),
    ...S.exposure_up.map((r) => ({ kind: "up" as Kind, login: r.login, name: r.name, what: `30 day P&L ${compact(n(r.t30_before))} to ${compact(n(r.t30_now))}`, size: Math.abs(n(r.t30_delta)), fig: <ChangePill v={n(r.t30_delta)} />, r })),
    ...S.floating_swing.map((r) => ({ kind: "swing" as Kind, login: r.login, name: r.name, what: `Floating ${compact(n(r.fpl_before))} to ${compact(n(r.fpl_now))}`, size: Math.abs(n(r.fpl_delta)), fig: <ChangePill v={n(r.fpl_delta)} />, r })),
    ...S.left_book.map((r) => ({ kind: "left" as Kind, login: r.login, name: r.name, what: `Was ${r.pg}`, size: Math.abs(n(r.t30)), fig: <ChangePill v={n(r.t30)} />, r })),
  ].sort((x, y) => y.size - x.size);
}
const MOVES = movesOf();
const ALGO_NAME: Record<string, string> = { mg: "MachineGun", scalper: "ScalperAM", fbu: "Force Build-Up", etl: "ETL", journal: "Journal" };
const ALGO_TONE: Record<string, string> = { mg: "var(--red)", scalper: "var(--orange)", fbu: "var(--purple)", etl: "var(--blue)" };

function MoveRow({ m, onOpen }: { m: Move; onOpen: (m: Move) => void }) {
  return (
    <Row onClick={() => onOpen(m)} icon={<i className="mv-dot" style={{ background: KIND[m.kind].tone }} />} tint="transparent"
      title={m.name} subtitle={`${KIND[m.kind].label} · ${m.what}`} detail={m.fig} />
  );
}

/** A move opened: what changed, then the account as the digest read it, then its profile. */
function MoveDetail({ m }: { m: Move }) {
  const r = m.r;
  const pf = r.profit_factor_infinite ? "No losses" : num(n(r.profit_factor), 2);
  return (
    <>
      <div className="sheet-hero"><span className="eyebrow">{KIND[m.kind].label}</span><b className="hero-amount">{m.what}</b><span className="row-sub">#{m.login}</span></div>
      <Group header="Change since the prior snapshot">
        {r.t30_before !== undefined && <Row title="Client P&L, 30 days" detail={<span className="num">{compact(n(r.t30_before))} to {compact(n(r.t30_now ?? r.t30))}</span>} chevron={false} />}
        {r.fpl_before !== undefined && <Row title="Floating P&L" detail={<span className="num">{compact(n(r.fpl_before))} to {compact(n(r.fpl_now ?? r.fpl))}</span>} chevron={false} />}
        {r.pg_before !== undefined && <Row title="Price group" detail={<span className="num">{String(r.pg_before)} {String(r.tier_before)} to {String(r.pg_now)} {String(r.tier_now)}</span>} chevron={false} />}
        {m.kind === "new" && <Row title="Entered at" detail={`${String(r.pg)} ${String(r.tier)}`} chevron={false} />}
        {m.kind === "left" && <Row title="Left from" detail={`${String(r.pg)} ${String(r.tier)}`} chevron={false} />}
      </Group>
      <Group header="Account">
        <Row title="Client P&L, 30 days" detail={<ChangePill v={n(r.t30)} />} chevron={false} />
        <Row title="Client P&L, 180 days" detail={<ChangePill v={n(r.t180)} />} chevron={false} />
        <Row title="Floating P&L" detail={<ChangePill v={n(r.fpl)} />} chevron={false} />
        <Row title="Win rate" detail={`${num(n(r.win_rate_pct), 1)}%`} chevron={false} />
        <Row title="Profit factor" detail={pf} chevron={false} />
        <Row title="Balance" detail={money(n(r.balance))} chevron={false} />
        <Row title="Last trade" detail={day(n(r.last_trade_ts))} chevron={false} />
      </Group>
      {hasProfile(m.login) && <Link href={`/clients/${m.login}/`} className="btn btn-blue wide">Open Client 360</Link>}
    </>
  );
}

type Since = "snap" | "7" | "30";
const SER = hist.series as unknown as Record<string, { measures: { values: number[] }[] }>;
const back = (k: string, s: Since) => { const v = SER[`digest.${k}`].measures[0].values; return v[v.length - 1 - (s === "snap" ? 1 : Number(s))]; };

function AllMoves({ kind, onOpen }: { kind: Kind | "all"; onOpen: (m: Move) => void }) {
  const [q, setQ] = useState("");
  const list = MOVES.filter((m) => (kind === "all" || m.kind === kind) && (!q || `${m.name} ${m.login}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <label className="searchfield"><Search size={17} strokeWidth={2.4} aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or login" aria-label="Filter moves" /></label>
      <Group header={`${list.length} ${list.length === 1 ? "move" : "moves"}`}>
        {list.length === 0 && <Row title="No match" chevron={false} />}
        {list.map((m, i) => <MoveRow key={`${m.kind}-${m.login}-${i}`} m={m} onOpen={onOpen} />)}
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
  const [since, setSince] = useState<Since>("snap");
  const [sel, setSel] = useState<Move | null>(null);
  const t30b = back("t30", since), flb = back("flagged", since), delta = t.t30_now - t30b;
  return (
    <section className="board" aria-label="Book movement">
      <div className="board-head">
        <span className="eyebrow">Client profit, flagged book</span>
        <b className={`board-big ${delta >= 0 ? "neg" : "pos"}`}>{compact(delta, true)}</b>
        <span className="row-sub">30 day P&L {compact(t30b)} to {compact(t.t30_now)}. Flagged accounts {flb} to {t.flagged_now}.</span>
        <Segmented label="Since" value={since} onChange={(v) => setSince(v)} options={[{ v: "snap", label: "Last snapshot" }, { v: "7", label: "7 days" }, { v: "30", label: "30 days" }]} />
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
      <Group header={kind === "all" ? "Largest moves" : KIND[kind].label} footer="Sorted by size. Profit and swing rows show the change, other rows 30 day client P&L.">
        {list.slice(0, 8).map((m, i) => <MoveRow key={`${m.kind}-${m.login}-${i}`} m={m} onOpen={setSel} />)}
        {list.length > 8 && <Row onClick={() => setAll(true)} title={<span className="link-blue">Show all {list.length}</span>} chevron={false} />}
      </Group>
      <Sheet open={all} onClose={() => setAll(false)} title={kind === "all" ? "All moves" : KIND[kind].label}><AllMoves kind={kind} onOpen={setSel} /></Sheet>
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? "Move"}>{sel && <MoveDetail m={sel} />}</Sheet>
    </section>
  );
}

export default function Today() {
  const { pending, unread } = useApp();
  const t = digest.totals;
  const wdTotal = pending.reduce((a, w) => a + (w.amount ?? 0), 0);
  const upcoming = newsData.lists["7d|high"].upcoming;
  const overnight = (catches as { algo: string; kind: string; acc: number; day: number; from_group: string | null; to_group: string | null; seen_ago_min: number | null }[]).filter((c) => c.day === 0);

  return (
    <>
      <NavBar title="Morning Digest" eyebrow={`Since ${when(digest.previous_taken_at)}`} root />

      <Board />

      <Metrics label="Flagged book" items={[
        { k: "Flagged", v: t.flagged_now, history: "digest.flagged" },
        { k: "Client P&L", v: compact(t.t30_now), tone: "neg", history: "digest.t30" },
        { k: "Floating", v: compact(t.fpl_now), tone: t.fpl_now >= 0 ? "neg" : "pos", history: "digest.fpl" },
      ]} />

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
          <SummaryCard href="/risk/open-lots/" Icon={ChartCandlestick} color="var(--blue)" label="Floating" value={compact(t.fpl_now)}
            note={`${compact(t.fpl_delta, true)} since ${day(Date.parse(digest.previous_taken_at) / 1000)}`} />
        </div>
        <SummaryCard href="/risk/watchlist/" Icon={TrendingUp} color="var(--purple)" label="Flagged accounts" value={String(t.flagged_now)}
          note={`${t.flagged_now - t.flagged_before >= 0 ? "+" : ""}${t.flagged_now - t.flagged_before} since prior`} />
      </section>

      <Group header={`Watchlist hits · ${S.watchlist_hits.length}`}>
        {S.watchlist_hits.map((r) => (
          <ClientRow key={r.login} login={r.login} name={r.name} sub={String(r.watchlist_note ?? "").replace(/^DUMMY note[:,] /, "").replace(/^\w/, (c) => c.toUpperCase())}
            detail={<span className="stack-r"><ChangePill v={n(r.t30_delta)} /><span className="small">T30 change</span></span>} />
        ))}
      </Group>

      <Group header={`Algorithm catches today · ${overnight.length}`} footer="Accounts the algorithms moved or flagged since the session opened.">
        {overnight.slice(0, 5).map((c, i) => (
          <Row key={i} href={hasProfile(c.acc + 99000000) ? `/clients/${c.acc + 99000000}/` : undefined} icon={<i className="mv-dot" style={{ background: ALGO_TONE[c.algo] ?? "var(--gray)" }} />} tint="transparent"
            title={nameOf(c.acc + 99000000)} subtitle={`${ALGO_NAME[c.algo] ?? c.algo} · ${c.from_group ? `${group(c.from_group)} to ${group(c.to_group ?? "")}` : sentence(c.kind)}`}
            detail={c.seen_ago_min !== null && c.seen_ago_min !== undefined ? `${c.seen_ago_min} min` : undefined} />
        ))}
        {overnight.length > 5 && <Row href="/risk/catches/" title={<span className="link-blue">All {overnight.length} in Catches</span>} chevron={false} />}
      </Group>

      <Group header="Upcoming high impact releases">
        {upcoming.map((e) => (
          <Row key={e.id} href="/risk/news/" icon={<Newspaper size={17} strokeWidth={2.4} />} tint="var(--orange)"
            title={e.title} subtitle={`${e.currency} · forecast ${e.forecast ?? "not set"}${e.unit ?? ""}, previous ${e.previous ?? "not set"}${e.unit ?? ""}`}
            detail={when(e.event_time_utc)} />
        ))}
      </Group>

      <p className="fine">Demonstration data. Snapshot taken {when(digest.taken_at)} UTC.<br />Risk Tool, built by Boris Nala for the Palantir design challenge, Lens B.</p>
    </>
  );
}
