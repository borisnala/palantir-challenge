"use client";

// Client 360 (owner 2026-11-18, "everything in one page is confusing"). One client, four tabs, the way the Health and
// Stocks apps split a deep subject: Overview (live equity, the verdict, the P&L chart), Trading (days, sessions,
// symbols, holding time), Risk (score, detections, evidence, group history) and Account (money, positions, flows,
// notes). The verdict comes first in plain words, the evidence after it, the detail one tap away.
// Data: src/data/client360.json from distill.py. 99000001 is the portal's own payload, every other client a variant
// shaped from it with that client's own figures.

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Bell, Flag, NotebookPen } from "lucide-react";
import { useApp } from "./app-state";
import { Chip, Confirm, Group, Metrics, Row, Segmented, Sheet, Switch } from "./ios";
import { Monogram, Pnl, Share } from "./ui";
import c3 from "@/data/client360.json";
import { ALERTS, compact, day, money, num, pct, when, type Client } from "@/lib/data";

type Profile = (typeof c3.profiles)[keyof typeof c3.profiles];
type Tab = "overview" | "trading" | "risk" | "account";
type Pov = "client" | "broker";
type Status = "none" | "watch" | "escalated" | "cleared";

const PROFILES = c3.profiles as Record<string, Profile>;
export const profileOf = (login: number) => PROFILES[String(login)];

const BAND: Record<string, { label: string; tone: "green" | "orange" | "red"; color: string }> = {
  low: { label: "Low risk", tone: "green", color: "var(--green)" },
  elevated: { label: "Elevated risk", tone: "orange", color: "var(--orange)" },
  high: { label: "High risk", tone: "red", color: "var(--red)" },
};
const VERDICT: Record<string, string> = { hedge: "Hedge", warehouse: "Warehouse", "insufficient-evidence": "More evidence required" };
const STATUS: Record<Status, string> = { none: "No status", watch: "Watch", escalated: "Escalated", cleared: "Cleared" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COND: Record<string, string> = { c1_baseline: "Quiet baseline before the build-up", c2_deposit: "Deposit before the build-up", c3_exposure: "Exposure jump", c4_equity: "Large equity swing" };

/** The Activity ring. It fills from empty when it appears. */
function Ring({ score, color, size = 84 }: { score: number; color: string; size?: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg className="score-ring" viewBox="0 0 84 84" width={size} height={size} role="img" aria-label={`Toxicity score ${score} of 100`}>
      <circle cx="42" cy="42" r={r} className="ring-track" />
      <circle cx="42" cy="42" r={r} stroke={color} className="ring-fill" strokeDasharray={`${(score / 100) * c} ${c}`} style={{ ["--len" as string]: `${c}` }} transform="rotate(-90 42 42)" />
      <text x="42" y="47" textAnchor="middle" className="ring-num">{score}</text>
    </svg>
  );
}

/** Round numbers for an axis: 4 or 5 steps of 1, 2, 2.5 or 5 times a power of ten. */
function ticks(lo: number, hi: number) {
  const span = hi - lo || 1, raw = span / 4, p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.001; v += step) out.push(+v.toFixed(6));
  if (out[out.length - 1] < hi) out.push(out[out.length - 1] + step);
  return out;
}

/** The Stocks chart: a line with a y axis on the right, a zero line, and a finger that scrubs through the days. While
 *  the finger is down the headline shows that day's value and date. */
function LineChart({ days, values, onScrub }: { days: number[]; values: number[]; onScrub: (i: number | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [at, setAt] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const H = 190, axis = 52, top = 10, bottom = 24, cw = Math.max(80, w - axis);
  const lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  const t = ticks(lo, hi), y0 = t[0], y1 = t[t.length - 1];
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * cw;
  const y = (v: number) => top + (1 - (v - y0) / (y1 - y0 || 1)) * (H - top - bottom);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const up = values[values.length - 1] >= 0;
  const months = useMemo(() => {
    const seen: { i: number; label: string }[] = [];
    days.forEach((dd, i) => { const m = new Date(dd * 1000).getUTCMonth(); if (!seen.length || new Date(days[seen[seen.length - 1].i] * 1000).getUTCMonth() !== m) seen.push({ i, label: MONTHS[m] }); });
    return seen.filter((_, k, a) => k % Math.ceil(a.length / 4) === 0);
  }, [days]);
  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect(); if (!r) return;
    const i = Math.round(Math.max(0, Math.min(1, (clientX - r.left) / cw)) * (values.length - 1));
    setAt(i); onScrub(i);
  };
  const end = () => { setAt(null); onScrub(null); };
  return (
    <div ref={box} className={`lchart ${up ? "lchart-up" : "lchart-down"}`}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); pick(e.clientX); }}
      onPointerMove={(e) => { if (at !== null || e.pointerType === "mouse") pick(e.clientX); }}
      onPointerUp={end} onPointerCancel={end} onPointerLeave={(e) => { if (e.pointerType === "mouse") end(); }}>
      <svg width={w} height={H} role="img" aria-label="Cumulative P&L chart">
        <defs><linearGradient id="lfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".22" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
        {t.map((v) => (
          <g key={v}>
            <line x1="0" x2={cw} y1={y(v)} y2={y(v)} className={v === 0 ? "lc-zero" : "lc-grid"} />
            <text x={cw + 8} y={y(v) + 4} className="lc-label">{compact(v)}</text>
          </g>
        ))}
        {months.map((m) => <text key={m.i} x={Math.min(cw - 20, x(m.i))} y={H - 6} className="lc-label">{m.label}</text>)}
        <path d={`${d}L${cw},${y(Math.max(y0, Math.min(y1, 0)))}L0,${y(Math.max(y0, Math.min(y1, 0)))}Z`} fill="url(#lfill)" className="lc-area" />
        <path d={d} className="lc-line" pathLength={1} />
        {at !== null && (
          <g>
            <line x1={x(at)} x2={x(at)} y1={top} y2={H - bottom} className="lc-cursor" />
            <circle cx={x(at)} cy={y(values[at])} r="5.5" className="lc-dot" />
          </g>
        )}
      </svg>
    </div>
  );
}

/** The live book, read the way a dealer reads it: each open position has an open price and a current price, and its
 *  floating P&L is (current - open) x lots x contract size, in USD (divided by the price for a USD-base pair). The
 *  prices move every second, a little and with a pull back toward where they started, the way a quiet market does.
 *  Equity is balance + credit + floating, margin level is equity over used margin. Simulated, the demo has no feed. */
type Pos = Profile["exposure"]["symbols"][number];
const pnlOf = (r: Pos, price: number) => (price - r.open_price) * r.gross_lots * r.contract_size * (r.direction === "LONG" ? 1 : -1) / (r.usd_base ? price : 1);
const WINDOW = 120; // seconds of history on the chart

function seeded(seed: number) {
  let x = seed % 2147483647 || 1;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}
function walk(r: Pos, price: number, u: number) {
  return price + (u - 0.5) * 2 * r.price * 0.00006 - (price - r.price) * 0.03;
}

function useLive(p: Profile, seed: number) {
  const rows = p.exposure.symbols;
  // the two minutes before the page opened, so the chart has history from the first frame
  const [hist] = useState(() => {
    const rnd = seeded(seed);
    let px = rows.map((r) => r.price);
    const out: number[][] = [px];
    for (let t = 1; t < WINDOW; t++) { px = px.map((v, i) => walk(rows[i], v, rnd())); out.unshift(px); }
    return out;
  });
  const [prices, setPrices] = useState(() => hist[hist.length - 1]);
  const [series, setSeries] = useState(() => hist.map((px) => px.reduce((a, v, i) => a + pnlOf(rows[i], v), 0)));
  const [moves, setMoves] = useState<number[]>(() => rows.map(() => 0));
  useEffect(() => {
    if (!rows.length) return;
    const id = setInterval(() => {
      setPrices((prev) => {
        const next = prev.map((v, i) => walk(rows[i], v, Math.random()));
        setMoves(next.map((v, i) => Math.sign(v - prev[i])));
        setSeries((sr) => [...sr.slice(-(WINDOW - 1)), next.reduce((a, v, i) => a + pnlOf(rows[i], v), 0)]);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rows]);
  const fl = rows.map((r, i) => pnlOf(r, prices[i]));
  const floating = fl.reduce((a, b) => a + b, 0);
  const equity = (p.identity.balance ?? 0) + (p.identity.credit ?? 0) + floating;
  const margin = rows.reduce((a, r) => a + r.gross_notional, 0) / (p.identity.leverage || 100);
  return { prices, fl, floating, equity, margin, level: margin ? (equity / margin) * 100 : null, series, moves };
}

/** Floating P&L over the last two minutes: green above zero, red below, the zero line dashed, a y axis on the right,
 *  a time axis under it, and the latest value in a tag at the right edge, as a trading terminal draws it. */
function FloatChart({ values }: { values: number[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const H = 132, axis = 58, top = 8, bottom = 20, cw = Math.max(80, w - axis);
  // scaled to the range the book actually moved through, as a terminal autoscales; zero shows only when it is crossed
  const mn = Math.min(...values), mx = Math.max(...values), pad = Math.max((mx - mn) * 0.2, Math.abs(mx) * 0.004, 1);
  const lo = mn - pad, hi = mx + pad;
  const t = ticks(lo, hi), y0 = t[0], y1 = t[t.length - 1];
  const x = (i: number) => ((i + WINDOW - values.length) / (WINDOW - 1)) * cw;
  const y = (v: number) => top + (1 - (v - y0) / (y1 - y0 || 1)) * (H - top - bottom);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const zy = Math.max(top, Math.min(H - bottom, y(0))), last = values[values.length - 1];
  const area = `${line}L${x(values.length - 1)},${zy}L${x(0)},${zy}Z`;
  return (
    <div ref={box} className="fchart">
      <svg width={w} height={H} role="img" aria-label={`Floating P&L over the last two minutes, now ${money(last, true)}`}>
        <defs>
          <clipPath id="f-above"><rect x="0" y="0" width={cw} height={zy} /></clipPath>
          <clipPath id="f-below"><rect x="0" y={zy} width={cw} height={H} /></clipPath>
        </defs>
        {t.map((v) => (
          <g key={v}>
            <line x1="0" x2={cw} y1={y(v)} y2={y(v)} className={v === 0 ? "lc-zero" : "lc-grid"} />
            <text x={cw + 8} y={y(v) + 4} className="lc-label">{compact(v)}</text>
          </g>
        ))}
        {[[0, "2 min"], [WINDOW / 2, "1 min"], [WINDOW - 1, "Now"]].map(([i, l]) => (
          <text key={l} x={Math.min(cw - 22, (Number(i) / (WINDOW - 1)) * cw)} y={H - 4} className="lc-label">{l}</text>
        ))}
        <path d={area} clipPath="url(#f-above)" className="f-area-pos" />
        <path d={area} clipPath="url(#f-below)" className="f-area-neg" />
        <path d={line} clipPath="url(#f-above)" className="f-line-pos" />
        <path d={line} clipPath="url(#f-below)" className="f-line-neg" />
        <circle cx={x(values.length - 1)} cy={y(last)} r="3.5" className={last >= 0 ? "f-dot-pos" : "f-dot-neg"} />
      </svg>
      <span className={`f-tag ${last >= 0 ? "f-tag-pos" : "f-tag-neg"}`} style={{ top: y(last) - 11 }}>{compact(last, true)}</span>
    </div>
  );
}

const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Months of trading days, Monday to Friday, each day green or red, as a Fitness month grid. */
function monthsOf(daily: number[][]) {
  const byDay = new Map(daily.map(([d, v]) => [new Date(d * 1000).toISOString().slice(0, 10), v]));
  const first = new Date(daily[0][0] * 1000), last = new Date(c3.as_of * 1000);
  const months: { key: string; y: number; m: number; cells: (null | { d: string; v: number | undefined })[]; total: number; days: number }[] = [];
  for (let y = first.getUTCFullYear(), m = first.getUTCMonth(); y < last.getUTCFullYear() || (y === last.getUTCFullYear() && m <= last.getUTCMonth()); m === 11 ? (y++, m = 0) : m++) {
    const cells: (null | { d: string; v: number | undefined })[] = [];
    let total = 0, n = 0;
    for (let dd = 1; dd <= new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); dd++) {
      const dt = new Date(Date.UTC(y, m, dd)), wd = dt.getUTCDay();
      if (wd === 0 || wd === 6) continue;
      if (cells.length === 0) for (let i = 1; i < wd; i++) cells.push(null);
      const k = dt.toISOString().slice(0, 10), v = byDay.get(k);
      if (v !== undefined) { total += v; n++; }
      cells.push({ d: k, v });
    }
    months.push({ key: `${y}-${m}`, y, m, cells, total, days: n });
  }
  return months;
}

/** Running total of the daily values. */
function cumulative(daily: number[][]) {
  const out: number[] = [];
  for (const [, v] of daily) out.push((out[out.length - 1] ?? 0) + v);
  return out;
}

/** Seconds since 1970, read when a move is made. */
function nowSec() { return Math.floor(Date.now() / 1000); }

const tiersFor = (tier: string) => (/^D\d/.test(tier) ? ["D1", "D2", "D3", "D4", "D5"] : /^F\d/.test(tier) ? ["F1", "F2", "F3", "F4", "F5"] : ["Std", "Premium", "VIP1", "MVIP"]);

export function Client360({ c }: { c: Client }) {
  const p = profileOf(c.login);
  const app = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [pov, setPov] = useState<Pov>("client");
  const [scrub, setScrub] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | "status" | "note" | "move" | "mg" | "sc" | "fb" | { month: string }>(null);
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const live = useLive(p, c.login);

  const status = app.get<Status>(`status-${c.login}`, app.watched.has(c.login) ? "watch" : "none");
  const pinned = app.get<boolean>(`pin-${c.login}`, false);
  const note = app.get<{ text: string; at: string } | null>(`note-${c.login}`, null);
  const moves = app.get<{ from: string; to: string; at: number }[]>(`moves-${c.login}`, []);
  const tier = moves.length ? moves[moves.length - 1].to : p.identity.group_tier;
  const [draftStatus, setDraftStatus] = useState<Status>(status);
  const [draftPin, setDraftPin] = useState(pinned);
  const [draftNote, setDraftNote] = useState(note?.text ?? "");

  const b = BAND[p.toxicity.band] ?? BAND.elevated;
  const daily = pov === "client" ? p.daily : p.daily_hpov;
  const st = pov === "client" ? p.stats : p.stats_hpov;
  const cum = useMemo(() => cumulative(daily), [daily]);
  const months = useMemo(() => monthsOf(daily), [daily]);
  const month = sheet && typeof sheet === "object" ? months.find((m) => m.key === sheet.month) : undefined;
  const alerts = ALERTS.filter((a) => a.login === c.login);
  const fbMet = Object.values(p.force_buildup.conditions).filter(Boolean).length;
  const maxSession = Math.max(...p.sessions.map((s) => Math.abs(s.net_pl)));
  const maxHold = Math.max(...p.holding.map((h) => h.trades));
  const w = p.windows, x = p.exposure.totals, wd = p.withdrawals;
  const isLive = p.exposure.symbols.length > 0;

  const saveStatus = () => {
    app.set(`status-${c.login}`, draftStatus); app.set(`pin-${c.login}`, draftPin);
    if ((draftStatus !== "none") !== app.watched.has(c.login)) app.toggleWatch(c.login);
    setSheet(null); app.say(draftStatus === "none" ? "Status removed" : `Status set to ${STATUS[draftStatus]}`);
  };
  const saveNote = () => { app.set(`note-${c.login}`, draftNote.trim() ? { text: draftNote.trim(), at: new Date().toISOString() } : null); setSheet(null); app.say(draftNote.trim() ? "Note saved" : "Note removed"); };
  const doMove = () => {
    if (!moveTo) return;
    app.set(`moves-${c.login}`, [...moves, { from: tier, to: moveTo, at: nowSec() }]);
    setMoveTo(null); setSheet(null); app.say(`Moved to ${moveTo}`);
  };

  return (
    <>
      <header className="contact c360-head">
        <Monogram name={c.name} size={76} />
        <h1 className="contact-name">{c.name}</h1>
        <p className="row-sub">#{c.login} · {tier}, {p.identity.country}</p>
        <span className="tags">
          <Chip tone={b.tone}>{b.label}</Chip><Chip>{p.classification}</Chip>
          {status !== "none" && <Chip tone={status === "escalated" ? "red" : status === "cleared" ? "green" : "purple"}>{STATUS[status]}</Chip>}
          {isLive && <Chip tone="green"><i className="live-dot" />Live</Chip>}
        </span>
        <div className="actions">
          <button className={`action ${status !== "none" ? "action-on" : ""}`} onClick={() => { setDraftStatus(status); setDraftPin(pinned); setSheet("status"); }}><Flag size={20} strokeWidth={2.2} /><span>{status === "none" ? "Set status" : STATUS[status]}</span></button>
          <button className={`action ${note ? "action-on" : ""}`} onClick={() => { setDraftNote(note?.text ?? ""); setSheet("note"); }}><NotebookPen size={20} strokeWidth={2.2} /><span>{note ? "Edit note" : "Add note"}</span></button>
          <button className="action" onClick={() => setSheet("move")}><ArrowRightLeft size={20} strokeWidth={2.2} /><span>Move group</span></button>
        </div>
      </header>

      <Segmented label="Section" value={tab} onChange={setTab} options={[{ v: "overview", label: "Overview" }, { v: "trading", label: "Trading" }, { v: "risk", label: "Risk" }, { v: "account", label: "Account" }]} />

      <div key={tab} className="c360-tab">
        {tab === "overview" && (
          <>
            {isLive && (
              <>
              <section className="livecard" aria-live="off">
                <span className="live-head"><span className="eyebrow"><i className="live-dot" />Live account</span><span className="muted">Simulated feed, 1 s</span></span>
                <span className="live-k">Equity</span>
                <b className="live-equity">{money(live.equity)}</b>
                <div className="live-grid">
                  <div><span>Balance</span><b>{compact(p.identity.balance)}</b></div>
                  <div><span>Floating</span><b className={live.floating >= 0 ? "pos" : "neg"}>{compact(live.floating, true)}</b></div>
                  <div><span>Margin level</span><b>{live.level === null ? "None" : `${num(live.level, 0)}%`}</b></div>
                </div>
                <FloatChart values={live.series} />
              </section>
              <Group header={`Open positions · ${p.exposure.symbols.length}`} footer="Price moves every second. P&L is the price change times lots times contract size.">
                {p.exposure.symbols.map((r, i) => (
                  <Row key={r.symbol} title={<span>{r.symbol} <Chip tone={r.direction === "LONG" ? "green" : "red"}>{r.direction === "LONG" ? "Buy" : "Sell"} {num(r.gross_lots, 2)}</Chip></span>}
                    subtitle={<span className="px"><span>Open {fmt(r.open_price, r.digits)}</span><span className={`px-now ${live.moves[i] > 0 ? "px-up" : live.moves[i] < 0 ? "px-down" : ""}`} key={live.prices[i]}>{fmt(live.prices[i], r.digits)}</span></span>}
                    detail={<Pnl v={live.fl[i]} />} chevron={false} />
                ))}
              </Group>
              </>
            )}

            <Group header="Assessment">
              <button className="verdict" onClick={() => setTab("risk")}>
                <Ring score={p.toxicity.score} color={b.color} />
                <span className="verdict-text">
                  <span className="verdict-tags"><Chip tone={b.tone}>{b.label}</Chip><Chip tone="blue">{VERDICT[p.decision.verdict] ?? p.decision.verdict}</Chip></span>
                  <b>{p.decision.headline.split(". ")[0]}.</b>
                  <span className="row-sub">{p.toxicity.factors[0]?.label}</span>
                </span>
              </button>
            </Group>

            <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} />
            <section className="chartcard">
              <span className="eyebrow">{scrub === null ? "Realized P&L, all time" : day(daily[scrub][0])}</span>
              <b className="chart-value"><Pnl v={scrub === null ? st.net_pl : cum[scrub]} /></b>
              <LineChart days={daily.map((d) => d[0])} values={cum} onScrub={setScrub} />
              <div className="chart-stats">
                <div><span>Drawdown</span><b>{compact(st.max_drawdown)}</b></div>
                <div><span>Best day</span><Pnl v={st.best_day} short /></div>
                <div><span>Worst day</span><Pnl v={st.worst_day} short /></div>
                <div><span>Win rate</span><b>{pct(p.behaviour.win_rate_pct, 0)}</b></div>
              </div>
            </section>
            <p className="caption">Touch and drag the chart to read a day.</p>

            <Group header="At a glance">
              <Row onClick={() => setTab("trading")} title="Trades" detail={num(p.behaviour.trade_count)} />
              <Row onClick={() => setTab("trading")} title="Top symbol" detail={`${p.symbols[0].symbol}, ${pct(p.symbols[0].pct, 0)}`} />
              <Row onClick={() => setTab("trading")} title="Best session" detail={[...p.sessions].sort((a, z) => z.net_pl - a.net_pl)[0].session} />
              <Row onClick={() => setTab("account")} title="Balance" detail={money(p.identity.balance)} />
              <Row onClick={() => setTab("risk")} title="Group moves" detail={num(p.group_changes.length + moves.length)} />
            </Group>
          </>
        )}

        {tab === "trading" && (
          <>
            <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} />
            <Group header="By trading day" footer={`Each square is a trading day, green for ${pov} profit, red for loss. Select a month for its days.`}>
              <div className="calgrid">
                {months.map((m, k) => (
                  <button key={m.key} className="calmonth" style={{ ["--i" as string]: k }} onClick={() => setSheet({ month: m.key })} aria-label={`${FULL[m.m]} ${m.y}, ${money(m.total, true)}`}>
                    <span className="calname">{MONTHS[m.m]}{m.m === 0 || k === 0 ? ` ${m.y}` : ""}</span>
                    <span className="caldays">{m.cells.map((cl, i) => <i key={i} className={!cl ? "cal-x" : cl.v === undefined ? "" : cl.v >= 0 ? "cal-pos" : "cal-neg"} />)}</span>
                    <span className={`caltotal ${m.days === 0 ? "" : m.total >= 0 ? "pos" : "neg"}`}>{m.days ? compact(m.total, true) : "No trades"}</span>
                  </button>
                ))}
              </div>
            </Group>

            <Group header="When the client makes money" footer="Sessions in UTC, all time. Client view.">
              {p.sessions.map((s) => (
                <div key={s.session} className="barrow">
                  <span className="barrow-top"><b>{s.session}</b><Pnl v={s.net_pl} /></span>
                  <Share v={Math.abs(s.net_pl)} of={maxSession} tone={s.net_pl >= 0 ? "var(--pos)" : "var(--neg)"} />
                  <span className="row-sub">{s.trades} {s.trades === 1 ? "trade" : "trades"}, win {pct(s.win_rate, 0)}</span>
                </div>
              ))}
            </Group>

            <Group header="Top symbols" footer="Share of all lots traded. P&L follows the point of view.">
              {p.symbols.map((s) => (
                <div key={s.symbol} className="barrow">
                  <span className="barrow-top"><b>{s.symbol}</b><span className="muted">{pct(s.pct, 1)}</span></span>
                  <Share v={s.pct} of={p.symbols[0].pct} />
                  <span className="barrow-top row-sub"><span>{num(s.lots, 2)} lots{s.trades ? `, ${s.trades} trades, win ${pct(s.win, 0)}` : ""}</span>{s.pl !== null && s.pl !== undefined && <Pnl v={pov === "client" ? s.pl : (s.hpov ?? -s.pl)} short />}</span>
                </div>
              ))}
            </Group>

            <Group header="Holding time" footer={`Median hold ${p.behaviour.median_hold_label}. ${pct(p.behaviour.overnight_pct, 0)} of positions held overnight.`}>
              {p.holding.map((h) => (
                <div key={h.bucket} className="barrow">
                  <span className="barrow-top"><b>{h.bucket.replace("<", "Under ").replace(">", "Over ")}</b><Pnl v={h.total_pl} short /></span>
                  <Share v={h.trades} of={maxHold} tone="var(--purple)" />
                  <span className="row-sub">{h.trades} trades, {pct(h.trade_share_pct, 0)} of all, win {pct(h.win_rate, 0)}</span>
                </div>
              ))}
            </Group>
          </>
        )}

        {tab === "risk" && (
          <>
            <section className="riskhero">
              <Ring score={p.toxicity.score} color={b.color} size={120} />
              <span className="verdict-tags"><Chip tone={b.tone}>{b.label}</Chip><Chip tone="blue">{VERDICT[p.decision.verdict] ?? p.decision.verdict}</Chip></span>
              <p>{p.decision.headline}</p>
            </section>
            <Group header="Reasons" footer="Points added to the toxicity score, out of 100.">
              {p.toxicity.factors.map((f) => <Row key={f.label} title={f.label} detail={<b className="neg">+{f.points}</b>} chevron={false} />)}
            </Group>
            <Group header="Detections">
              <Row onClick={() => setSheet("sc")} title="ScalperAM" subtitle="Profitable fast in and out" detail={p.scalper.detected ? <Chip tone="orange">Caught {p.scalper.tier}</Chip> : <Chip tone="green">Clear</Chip>} />
              <Row onClick={() => setSheet("mg")} title="MachineGun" subtitle="Burst execution, rapid high lot" detail={p.machinegun.detected ? <Chip tone="red">Caught tier {p.machinegun.tier}</Chip> : <Chip tone="green">Clear</Chip>} />
              <Row onClick={() => setSheet("fb")} title="Force Build-Up" subtitle={`Sleeper then slam, ${fbMet} of 4 conditions met`} detail={p.force_buildup.detected ? <Chip tone="red">Caught</Chip> : <Chip tone="green">Clear</Chip>} />
            </Group>
            <Group header="Evidence">
              {p.metrics.map((m) => <Row key={m.metric} title={m.metric} subtitle={m.note} detail={<b>{m.result}</b>} chevron={false} />)}
            </Group>
            <Group header="Findings">{p.findings.map((f) => <Row key={f} title={f} chevron={false} />)}</Group>
            <Group header="Group history" className="timeline" footer={`Now in ${tier}.`}>
              {[...moves.map((m) => ({ day: m.at, title: `${m.from} to ${m.to}`, sub: "Manual move by demo.admin" })), ...p.group_changes]
                .sort((a, z) => z.day - a.day).map((r, i) => <Row key={i} title={r.title} subtitle={r.sub} detail={day(r.day)} chevron={false} />)}
            </Group>
          </>
        )}

        {tab === "account" && (
          <>
            <Group header="Account">
              <Row title="Balance" detail={money(p.identity.balance)} chevron={false} />
              <Row title="Equity" detail={money(isLive ? live.equity : p.identity.equity)} chevron={false} />
              <Row title="Free margin" detail={money(p.identity.margin_free)} chevron={false} />
              <Row title="Credit" detail={money(p.identity.credit)} chevron={false} />
              <Row title="Leverage" detail={`1 to ${p.identity.leverage}`} chevron={false} />
              <Row title="Registered" detail={day(p.identity.registration)} chevron={false} />
              {p.lead && <Row title="Lead source" detail={p.lead} chevron={false} />}
            </Group>

            <Metrics label="Profit windows, broker view" items={[
              { k: "All time", v: compact(w.hpov.t_all), tone: w.hpov.t_all >= 0 ? "pos" : "neg" },
              { k: "180 days", v: compact(w.hpov.t180), tone: w.hpov.t180 >= 0 ? "pos" : "neg" },
              { k: "30 days", v: compact(w.hpov.t30), tone: w.hpov.t30 >= 0 ? "pos" : "neg" },
              { k: "Floating", v: compact(w.fpl), tone: w.fpl >= 0 ? "pos" : "neg" },
            ]} />
            <p className="caption">Broker side, excluding commission and swap.{w.fpl_check.status === "mismatch" ? ` Account floating ${money(w.fpl_check.account_fpl)} differs from open positions ${money(w.fpl_check.position_floating)} by ${money(w.fpl_check.difference)}.` : ""}</p>

            {isLive && (
              <Group header={`Open positions · ${x.position_count}`} footer={`Gross ${compact(x.gross_notional)}, ${pct(x.gross_notional_pct_of_balance, 0)} of balance. Floating moves live.`}>
                {p.exposure.symbols.map((s, i) => (
                  <Row key={s.symbol} title={s.symbol} subtitle={`${num(s.gross_lots, 2)} lots, ${compact(s.gross_notional)} gross`}
                    detail={<span className="stack-r"><Pnl v={live.fl[i]} short /><Chip tone={s.direction === "LONG" ? "green" : "red"}>{s.direction === "LONG" ? "Long" : "Short"}</Chip></span>} chevron={false} />
                ))}
              </Group>
            )}

            <Group header="Reconciliation, client view" footer="Matches the MT5 Manager figures. Not affected by the point of view.">
              <Row title="Lifetime net" subtitle="Including commission and swap" detail={<Pnl v={w.t_all_net} />} chevron={false} />
              <Row title="Deposits" detail={money(w.lifetime_deposits)} chevron={false} />
              <Row title="Withdrawals" detail={money(w.lifetime_withdrawals)} chevron={false} />
              <Row title="Commission" detail={money(w.t_all_commission)} chevron={false} />
              <Row title="Swap" detail={money(w.t_all_swap)} chevron={false} />
            </Group>

            <Metrics label="Withdrawals" items={[
              { k: "Net flow", v: compact(wd.net_flow), tone: wd.net_flow >= 0 ? "pos" : "neg" },
              { k: "Withdrawals", v: wd.withdrawal_count },
              { k: "After profit", v: wd.fastest_withdraw_after_profit_days ? `${num(wd.fastest_withdraw_after_profit_days)} d` : "None" },
              { k: "Average gap", v: wd.avg_days_between_withdrawals ? `${num(wd.avg_days_between_withdrawals)} d` : "None" },
            ]} />
            {wd.history.length > 0 && (
              <Group footer={wd.fast_withdrawer ? "Flagged as a fast withdrawer." : "Not a fast withdrawer."}>
                {wd.history.map((h) => <Row key={h.epoch} title={money(h.amount)} subtitle="Withdrawal" detail={day(h.epoch)} chevron={false} />)}
              </Group>
            )}

            <Group header="Note">
              {note ? <Row onClick={() => { setDraftNote(note.text); setSheet("note"); }} title={note.text} subtitle={`demo.admin, ${when(note.at)}`} />
                : <Row onClick={() => { setDraftNote(""); setSheet("note"); }} title="Add a note" />}
            </Group>

            <Group header={`Alerts · ${alerts.length}`}>
              {alerts.length === 0 && <Row title="No alerts for this client" chevron={false} />}
              {alerts.map((a) => <Row key={a.id} href="/alerts/" icon={<Bell size={17} strokeWidth={2.4} />} title={a.title} subtitle={a.detail} />)}
            </Group>
          </>
        )}
      </div>

      <p className="fine">Demonstration data{p.source === "portal" ? ", the portal's own Client 360 sample." : ", shaped from the portal's Client 360 sample with this client's own figures."}</p>

      {/* Sheets */}
      <Sheet open={sheet === "status"} onClose={() => setSheet(null)} title="Status">
        <Group footer="Watch and Escalated add the client to the watchlist. Pinned clients show on Morning Digest.">
          {(["none", "watch", "escalated", "cleared"] as Status[]).map((s) => (
            <Row key={s} onClick={() => setDraftStatus(s)} title={STATUS[s]} detail={draftStatus === s ? <b className="tick">✓</b> : undefined} chevron={false} />
          ))}
        </Group>
        <Group><Row title="Pin on Morning Digest" chevron={false}><Switch on={draftPin} onChange={() => setDraftPin(!draftPin)} label="Pin on Morning Digest" /></Row></Group>
        <button className="btn btn-blue wide" onClick={saveStatus}>Save</button>
      </Sheet>

      <Sheet open={sheet === "note"} onClose={() => setSheet(null)} title="Note">
        <textarea className="notebox" value={draftNote} onChange={(e) => setDraftNote(e.target.value)} placeholder="Observation for the desk" rows={5} aria-label="Note" />
        <button className="btn btn-blue wide" onClick={saveNote}>{draftNote.trim() ? "Save note" : note ? "Remove note" : "Save note"}</button>
      </Sheet>

      <Sheet open={sheet === "move"} onClose={() => setSheet(null)} title="Move group">
        <Group header={`Now in ${tier}`} footer="The move goes through a confirmation and is recorded in the group history.">
          {tiersFor(tier).filter((t2) => t2 !== tier).map((t2) => <Row key={t2} onClick={() => setMoveTo(t2)} title={t2} />)}
        </Group>
      </Sheet>
      <Confirm open={moveTo !== null} title="Confirm move" lines={[`${c.name}, #${c.login}`, `Group ${tier} to ${moveTo ?? ""}`, "Applies to new positions"]} action="Move"
        onCancel={() => setMoveTo(null)} onConfirm={doMove} />

      <Sheet open={sheet === "sc"} onClose={() => setSheet(null)} title="ScalperAM">
        <Group header={p.scalper.detected ? `Caught, tier ${p.scalper.tier}` : "Clear"} footer={`Based on the last ${p.scalper.evidence.lookback} positions. Fast means held up to ${p.scalper.evidence.hold_max_seconds} s.`}>
          <Row title="Fast trades" detail={num(p.scalper.evidence.radar_count)} chevron={false} />
          <Row title="Win rate" detail={pct(p.scalper.evidence.win_rate, 1)} chevron={false} />
          <Row title="P&L" detail={<Pnl v={p.scalper.evidence.total_pl} />} chevron={false} />
          {p.catches.map((k) => <Row key={k.time} title={`Moved ${k.from.split("\\").pop()} to ${k.to.split("\\").pop()}`} subtitle={`By ${k.algo}`} detail={day(k.time)} chevron={false} />)}
        </Group>
      </Sheet>
      <Sheet open={sheet === "mg"} onClose={() => setSheet(null)} title="MachineGun">
        <Group header={p.machinegun.detected ? `Caught, tier ${p.machinegun.tier}` : "Clear"} footer="MachineGun looks for bursts of high lot orders in a short window.">
          <Row title="Pattern" detail={p.machinegun.detected ? "Burst found" : "No burst"} chevron={false} />
          <Row title="Client type" detail={p.machinegun.client_type === "micro" ? "Micro" : "Normal"} chevron={false} />
        </Group>
      </Sheet>
      <Sheet open={sheet === "fb"} onClose={() => setSheet(null)} title="Force Build-Up">
        <Group header={`${fbMet} of 4 conditions met`} footer={`Largest ticket ${num(p.force_buildup.evidence.max_ticket_lots, 2)} lots. Peak exposure in 15 min ${num(p.force_buildup.evidence.peak_15m_exposure_lots, 2)} lots.`}>
          {Object.entries(p.force_buildup.conditions).map(([k, v]) => <Row key={k} title={COND[k] ?? k} detail={v ? <Chip tone="orange">Met</Chip> : <Chip>Not met</Chip>} chevron={false} />)}
        </Group>
      </Sheet>
      <Sheet open={!!month} onClose={() => setSheet(null)} title={month ? `${FULL[month.m]} ${month.y}` : ""}>
        {month && (
          <Group header={`${month.days} trading days, ${money(month.total, true)}`} footer={pov === "client" ? "Client P&L per day." : "Broker P&L per day."}>
            {month.cells.filter((cl) => cl && cl.v !== undefined).map((cl) => <Row key={cl!.d} title={when(cl!.d, false)} detail={<Pnl v={cl!.v!} />} chevron={false} />)}
            {month.days === 0 && <Row title="No trades this month" chevron={false} />}
          </Group>
        )}
      </Sheet>
    </>
  );
}
