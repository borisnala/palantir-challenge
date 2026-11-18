"use client";

// Client 360 in full, from the desktop demo's one complete payload (src/data/client360.json, made by distill.py).
// Laid out the way the Claude app presents a complex answer: the conclusion first in plain words, then the evidence in
// order of weight, and the detail one tap away in a sheet. Every block is an Apple pattern: a ring like Activity, inset
// grouped rows, bars like Screen Time, a month grid like Fitness, a timeline for the group history.

import { useState } from "react";
import { Chip, Group, Metrics, Row, Segmented, Sheet } from "./ios";
import { Pnl, Share, Sparkline } from "./ui";
import c3 from "@/data/client360.json";
import { compact, day, money, num, pct, when } from "@/lib/data";

type Pov = "client" | "broker";
type Open = { kind: "assessment" } | { kind: "detection"; id: "mg" | "sc" | "fb" } | { kind: "month"; key: string } | null;

const BAND: Record<string, { label: string; tone: "green" | "orange" | "red"; color: string }> = {
  low: { label: "Low", tone: "green", color: "var(--green)" },
  elevated: { label: "Elevated", tone: "orange", color: "var(--orange)" },
  high: { label: "High", tone: "red", color: "var(--red)" },
};
const VERDICT: Record<string, string> = { hedge: "Hedge", warehouse: "Warehouse", "insufficient-evidence": "More evidence required" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const COND: Record<string, string> = { c1_baseline: "Quiet baseline before the build-up", c2_deposit: "Deposit before the build-up", c3_exposure: "Exposure jump", c4_equity: "Large equity swing" };

/** The Activity ring: one stroke, the score as its share of 100. */
function Ring({ score, color }: { score: number; color: string }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg className="score-ring" viewBox="0 0 84 84" width="84" height="84" role="img" aria-label={`Toxicity score ${score} of 100`}>
      <circle cx="42" cy="42" r={r} className="ring-track" />
      <circle cx="42" cy="42" r={r} stroke={color} className="ring-fill" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 42 42)" />
      <text x="42" y="47" textAnchor="middle" className="ring-num">{score}</text>
    </svg>
  );
}

/** Months of trading days, Monday to Friday, each day green or red by its P&L, as a Fitness month grid. */
function useMonths(daily: number[][]) {
  const byDay = new Map(daily.map(([d, v]) => [new Date(d * 1000).toISOString().slice(0, 10), v]));
  const first = new Date(daily[0][0] * 1000), last = new Date(c3.as_of * 1000);
  const months: { key: string; y: number; m: number; cells: (null | { d: string; v: number | undefined })[]; total: number; days: number }[] = [];
  for (let y = first.getUTCFullYear(), m = first.getUTCMonth(); y < last.getUTCFullYear() || (y === last.getUTCFullYear() && m <= last.getUTCMonth()); m === 11 ? (y++, m = 0) : m++) {
    const cells: (null | { d: string; v: number | undefined })[] = [];
    let total = 0, days = 0;
    for (let dd = 1; dd <= new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); dd++) {
      const dt = new Date(Date.UTC(y, m, dd)), wd = dt.getUTCDay();
      if (wd === 0 || wd === 6) continue;
      if (cells.length === 0) for (let i = 1; i < wd; i++) cells.push(null); // the first weekday sits under its own column
      const k = dt.toISOString().slice(0, 10), v = byDay.get(k);
      if (v !== undefined) { total += v; days++; }
      cells.push({ d: k, v });
    }
    months.push({ key: `${y}-${m}`, y, m, cells, total, days });
  }
  return months;
}

export function ClientAnalysis() {
  const [pov, setPov] = useState<Pov>("client");
  const [open, setOpen] = useState<Open>(null);
  const b = BAND[c3.toxicity.band] ?? BAND.elevated;
  const daily = pov === "client" ? c3.daily : c3.daily_hpov;
  const st = pov === "client" ? c3.stats : c3.stats_hpov;
  const months = useMonths(daily);
  const w = c3.windows, x = c3.exposure.totals, wd = c3.withdrawals, bh = c3.behaviour;
  const maxSession = Math.max(...c3.sessions.map((s) => Math.abs(s.net_pl)));
  const maxHold = Math.max(...c3.holding.map((h) => h.trades));
  const fbMet = Object.values(c3.force_buildup.conditions).filter(Boolean).length;
  const month = open?.kind === "month" ? months.find((m) => m.key === open.key) : undefined;

  return (
    <>
      {/* 1. The conclusion */}
      <Group header="Assessment">
        <button className="verdict" onClick={() => setOpen({ kind: "assessment" })}>
          <Ring score={c3.toxicity.score} color={b.color} />
          <span className="verdict-text">
            <span className="verdict-tags"><Chip tone={b.tone}>{b.label} risk</Chip><Chip tone="blue">{VERDICT[c3.decision.verdict] ?? c3.decision.verdict}</Chip></span>
            <b>{c3.decision.headline.split(". ")[0]}.</b>
            <span className="row-sub">Toxicity {c3.toxicity.score} of 100. {c3.classification}.</span>
          </span>
        </button>
      </Group>
      <Group header="Reasons" footer="Points added to the toxicity score.">
        {c3.toxicity.factors.map((f) => <Row key={f.label} title={f.label} detail={<b className="neg">+{f.points}</b>} chevron={false} />)}
      </Group>

      {/* 2. The detections behind it */}
      <Group header="Detections">
        <Row onClick={() => setOpen({ kind: "detection", id: "sc" })} title="ScalperAM" subtitle="Profitable fast in and out"
          detail={c3.scalper.detected ? <Chip tone="orange">Caught {c3.scalper.tier}</Chip> : <Chip tone="green">Clear</Chip>} />
        <Row onClick={() => setOpen({ kind: "detection", id: "mg" })} title="MachineGun" subtitle="Burst execution, rapid high lot"
          detail={c3.machinegun.detected ? <Chip tone="red">Caught {c3.machinegun.tier}</Chip> : <Chip tone="green">Clear</Chip>} />
        <Row onClick={() => setOpen({ kind: "detection", id: "fb" })} title="Force Build-Up" subtitle={`Sleeper then slam, ${fbMet} of 4 conditions met`}
          detail={c3.force_buildup.detected ? <Chip tone="red">Caught</Chip> : <Chip tone="green">Clear</Chip>} />
      </Group>

      {/* 3. The money, from either side */}
      <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} />
      <section className="chartcard">
        <span className="eyebrow">Realized P&L, all time</span>
        <b className="chart-value"><Pnl v={st.net_pl} /></b>
        <Sparkline values={daily.map((d) => d[1])} height={110} fill id={`c360-${pov}`} />
        <span className="chart-axis"><span>{day(daily[0][0])}</span><span>{day(daily[daily.length - 1][0])}</span></span>
        <div className="chart-stats">
          <div><span>Drawdown</span><b>{compact(st.max_drawdown)}</b></div>
          <div><span>Best trade</span><Pnl v={st.best_trade} short /></div>
          <div><span>Worst trade</span><Pnl v={st.worst_trade} short /></div>
          <div><span>Win rate</span><b>{pct(bh.win_rate_pct, 0)}</b></div>
        </div>
      </section>

      <Group header="By trading day" footer={`Each square is a trading day, green for ${pov === "client" ? "client" : "broker"} profit, red for loss. Select a month for its days.`}>
        <div className="calgrid">
          {months.map((m) => (
            <button key={m.key} className="calmonth" onClick={() => setOpen({ kind: "month", key: m.key })} aria-label={`${FULL[m.m]} ${m.y}, ${money(m.total, true)}`}>
              <span className="calname">{MONTHS[m.m]}{m.m === 0 || m === months[0] ? ` ${m.y}` : ""}</span>
              <span className="caldays">
                {m.cells.map((c, i) => <i key={i} className={!c ? "cal-x" : c.v === undefined ? "" : c.v >= 0 ? "cal-pos" : "cal-neg"} />)}
              </span>
              <span className={`caltotal ${m.days === 0 ? "" : m.total >= 0 ? "pos" : "neg"}`}>{m.days ? compact(m.total, true) : "No trades"}</span>
            </button>
          ))}
        </div>
      </Group>

      {/* 4. How the client trades */}
      <Group header="When the client makes money" footer="Sessions in UTC, all time.">
        {c3.sessions.map((s) => (
          <div key={s.session} className="barrow">
            <span className="barrow-top"><b>{s.session}</b><Pnl v={s.net_pl} /></span>
            <Share v={Math.abs(s.net_pl)} of={maxSession} tone={s.net_pl >= 0 ? "var(--pos)" : "var(--neg)"} />
            <span className="row-sub">{s.trades} {s.trades === 1 ? "trade" : "trades"}, win {pct(s.win_rate, 0)}</span>
          </div>
        ))}
      </Group>

      <Group header="Top symbols" footer="Share of all lots traded. P&L follows the point of view above.">
        {c3.symbols.map((s) => (
          <div key={s.symbol} className="barrow">
            <span className="barrow-top"><b>{s.symbol}</b><span className="muted">{pct(s.pct, 1)}</span></span>
            <Share v={s.pct} of={c3.symbols[0].pct} />
            <span className="barrow-top row-sub"><span>{num(s.lots, 2)} lots{s.trades ? `, ${s.trades} trades, win ${pct(s.win, 0)}` : ""}</span>{s.pl !== null && s.pl !== undefined && <Pnl v={pov === "client" ? s.pl : (s.hpov ?? -s.pl)} short />}</span>
          </div>
        ))}
      </Group>

      <Group header="Holding time" footer={`Median hold ${bh.median_hold_label}. ${pct(bh.overnight_pct, 0)} of positions held overnight.`}>
        {c3.holding.map((h) => (
          <div key={h.bucket} className="barrow">
            <span className="barrow-top"><b>{h.bucket.replace("<", "Under ").replace(">", "Over ")}</b><Pnl v={h.total_pl} short /></span>
            <Share v={h.trades} of={maxHold} tone="var(--purple)" />
            <span className="row-sub">{h.trades} trades, {pct(h.trade_share_pct, 0)} of all, win {pct(h.win_rate, 0)}</span>
          </div>
        ))}
      </Group>

      {/* 5. Account, positions, flows */}
      <Metrics label="Profit windows, broker view" items={[
        { k: "All time", v: compact(w.hpov.t_all), tone: w.hpov.t_all >= 0 ? "pos" : "neg" },
        { k: "180 days", v: compact(w.hpov.t180), tone: w.hpov.t180 >= 0 ? "pos" : "neg" },
        { k: "30 days", v: compact(w.hpov.t30), tone: w.hpov.t30 >= 0 ? "pos" : "neg" },
        { k: "Floating", v: compact(w.fpl), tone: w.fpl >= 0 ? "pos" : "neg" },
      ]} />
      <p className="caption">Profit windows from the broker side, excluding commission and swap.{w.fpl_check.status === "mismatch" ? ` Account floating ${money(w.fpl_check.account_fpl)} differs from open positions ${money(w.fpl_check.position_floating)} by ${money(w.fpl_check.difference)}.` : ""}</p>

      <Group header="Reconciliation, client view" footer="Matches the MT5 Manager figures. Not affected by the point of view.">
        <Row title="Lifetime net" subtitle="Including commission and swap" detail={<Pnl v={w.t_all_net} />} chevron={false} />
        <Row title="Deposits" detail={money(w.lifetime_deposits)} chevron={false} />
        <Row title="Withdrawals" detail={money(w.lifetime_withdrawals)} chevron={false} />
        <Row title="Commission" detail={money(w.t_all_commission)} chevron={false} />
        <Row title="Swap" detail={money(w.t_all_swap)} chevron={false} />
      </Group>

      <Group header={`Open positions · ${x.position_count}`} footer={`Gross ${compact(x.gross_notional)}, ${pct(x.gross_notional_pct_of_balance, 0)} of balance. Net ${x.net_notional >= 0 ? "long" : "short"} ${compact(Math.abs(x.net_notional))}.`}>
        {c3.exposure.symbols.map((s) => (
          <Row key={s.symbol} title={s.symbol} subtitle={`${num(s.gross_lots, 2)} lots, ${compact(s.gross_notional)} gross`}
            detail={<span className="stack-r"><Pnl v={s.floating} short /><Chip tone={s.direction === "LONG" ? "green" : "red"}>{s.direction === "LONG" ? "Long" : "Short"}</Chip></span>} chevron={false} />
        ))}
      </Group>

      <Group header="Group history" className="timeline" footer={`Now in ${c3.identity.group_tier}. ${c3.group_changes.length} changes, ${c3.etl.length} by the equity traffic light.`}>
        {[...c3.group_changes.map((g) => ({ t: g.day, title: g.from_tier ? `${g.from_tier} to ${g.to_tier}` : `Opened in ${g.to_tier}`, sub: g.source === "manual" ? "Manual move" : g.source })),
          ...c3.etl.map((e) => ({ t: Date.parse(e.time_wib.replace(" ", "T") + "+07:00") / 1000, title: `${e.from_tier} to ${e.to_tier}`, sub: `Equity traffic light, ${e.kind === "promote" ? "promotion" : "demotion"}` }))]
          .sort((p, q) => q.t - p.t).map((r, i) => <Row key={i} title={r.title} subtitle={r.sub} detail={day(r.t)} chevron={false} />)}
      </Group>

      <Metrics label="Withdrawals" items={[
        { k: "Net flow", v: compact(wd.net_flow), tone: "pos" },
        { k: "Withdrawals", v: wd.withdrawal_count },
        { k: "After profit", v: `${num(wd.fastest_withdraw_after_profit_days)} d` },
        { k: "Average gap", v: `${num(wd.avg_days_between_withdrawals)} d` },
      ]} />
      <Group footer={wd.fast_withdrawer ? "Flagged as a fast withdrawer." : "Not a fast withdrawer. Fastest withdrawal after a profit is the days between them."}>
        {wd.history.map((h) => <Row key={h.epoch} title={money(h.amount)} subtitle="Withdrawal" detail={day(h.epoch)} chevron={false} />)}
      </Group>

      <Sheet open={open !== null} onClose={() => setOpen(null)}
        title={open?.kind === "assessment" ? "Assessment" : open?.kind === "detection" ? { mg: "MachineGun", sc: "ScalperAM", fb: "Force Build-Up" }[open.id] : month ? `${FULL[month.m]} ${month.y}` : ""}>
        {open?.kind === "assessment" && (
          <>
            <p className="sheet-lead">{c3.decision.headline}</p>
            <Group header="Evidence">
              {c3.metrics.map((m) => <Row key={m.metric} title={m.metric} subtitle={m.note} detail={<b>{m.result}</b>} chevron={false} />)}
            </Group>
            <Group header="Findings">{c3.findings.map((f) => <Row key={f} title={f} chevron={false} />)}</Group>
          </>
        )}
        {open?.kind === "detection" && open.id === "sc" && (
          <Group header={c3.scalper.detected ? `Caught, tier ${c3.scalper.tier}` : "Clear"} footer={`Based on the last ${c3.scalper.evidence.lookback} positions. Fast means held up to ${c3.scalper.evidence.hold_max_seconds} s.`}>
            <Row title="Fast trades" detail={num(c3.scalper.evidence.radar_count)} chevron={false} />
            <Row title="Win rate" detail={pct(c3.scalper.evidence.win_rate, 1)} chevron={false} />
            <Row title="P&L" detail={<Pnl v={c3.scalper.evidence.total_pl} />} chevron={false} />
            {c3.catches.map((k) => <Row key={k.time} title={`Moved ${k.from.split("\\").pop()} to ${k.to.split("\\").pop()}`} subtitle={`By ${k.algo}`} detail={day(k.time)} chevron={false} />)}
          </Group>
        )}
        {open?.kind === "detection" && open.id === "mg" && (
          <Group header={c3.machinegun.detected ? `Caught, tier ${c3.machinegun.tier}` : "Clear"} footer="MachineGun looks for bursts of high lot orders in a short window.">
            <Row title="Pattern" detail="No burst" chevron={false} />
            <Row title="Client type" detail={c3.machinegun.client_type === "normal" ? "Normal" : c3.machinegun.client_type} chevron={false} />
          </Group>
        )}
        {open?.kind === "detection" && open.id === "fb" && (
          <Group header={`${fbMet} of 4 conditions met`} footer={`Largest ticket ${num(c3.force_buildup.evidence.max_ticket_lots, 2)} lots. Peak exposure in 15 min ${num(c3.force_buildup.evidence.peak_15m_exposure_lots, 2)} lots.`}>
            {Object.entries(c3.force_buildup.conditions).map(([k, v]) => <Row key={k} title={COND[k] ?? k} detail={v ? <Chip tone="orange">Met</Chip> : <Chip>Not met</Chip>} chevron={false} />)}
          </Group>
        )}
        {month && (
          <Group header={`${month.days} trading days`} footer={pov === "client" ? "Client P&L per day." : "Broker P&L per day."}>
            {month.cells.filter((c) => c && c.v !== undefined).map((c) => <Row key={c!.d} title={when(c!.d, false)} detail={<Pnl v={c!.v!} />} chevron={false} />)}
            {month.days === 0 && <Row title="No trades this month" chevron={false} />}
          </Group>
        )}
      </Sheet>
    </>
  );
}
