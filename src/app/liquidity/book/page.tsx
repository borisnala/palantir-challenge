"use client";

import { useState } from "react";
import { Chip, Group, Metrics, NavBar, Row, Segmented } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import bk from "@/data/book.json";
import { compact, nameOf, num, pct } from "@/lib/data";
import { buzz } from "@/lib/haptics";

type V = "accounts" | "toxicity" | "cost" | "symbols" | "exposure" | "hours";
const VIEWS: { v: V; label: string }[] = [
  { v: "accounts", label: "Accounts" }, { v: "toxicity", label: "Symbol toxicity" }, { v: "cost", label: "Cost per $1m" },
  { v: "symbols", label: "Symbols" }, { v: "exposure", label: "Exposure" }, { v: "hours", label: "Loss clock" },
];
type Scope = "flagged" | "bbook";
type Loss = { accounts_in_pool: number; accounts_with_activity: number; deals_counted: number; summary: { net_broker: number; gross_wins: number; gross_losses: number };
  board: { symbol: string; net_broker: number; deals: number; lots: number; activity_share_pct: number; profit_share_pct: number | null; profit_lift_pp: number | null; loss_share_pct: number | null; loss_lift_pp: number | null; side: string; material: boolean }[] };
const LOSS = bk.loss as unknown as Record<string, Loss>;
const MM = bk.pnlmm as unknown as Record<Scope, { totals: { hpov_usd: number; notional_usd: number; pnl_per_mm: number; logins_ranked: number }; rows: { login: number; hpov_usd: number; notional_usd: number; pnl_per_mm: number; deals: number; lots: number; tier: string; reliable: boolean }[] }>;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Book() {
  const [v, setV] = useState<V>("accounts");
  const [pov, setPov] = useState<"client" | "broker">("broker");
  const [scope, setScope] = useState<Scope>("flagged");
  const [days, setDays] = useState<"7" | "30" | "90">("30");
  const loss = LOSS[`${scope}|${days}`];
  const mm = MM[scope];
  const k = pov === "client" ? 1 : -1;
  const t = bk.totals;
  const h = bk.heatmap;
  const cells = h.cells as number[][];
  const span = Math.max(Math.abs(h.min), Math.abs(h.max)) || 1;

  return (
    <>
      <NavBar title="Book View" eyebrow="The flagged book" back={{ href: "/liquidity/", label: "Liquidity Management" }} />
      <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "broker", label: "Broker P&L" }, { v: "client", label: "Client P&L" }]} />
      <Metrics label="Totals" items={[
        { k: "Accounts", v: t.count },
        { k: "30 days", v: compact(t.t30 * k), tone: t.t30 * k >= 0 ? "pos" : "neg" },
        { k: "180 days", v: compact(t.t180 * k), tone: t.t180 * k >= 0 ? "pos" : "neg" },
        { k: "Floating", v: compact(t.fpl * k), tone: t.fpl * k >= 0 ? "pos" : "neg" },
      ]} />

      <Group header="By price group">
        {Object.entries(bk.by_pg).map(([pg, x]) => <Row key={pg} title={`${pg} · ${x.tier}`} subtitle={`${x.count} accounts · 180 days ${compact(x.t180 * k)}`} detail={<Pnl v={x.t30 * k} short />} chevron={false} />)}
      </Group>

      <div className="tchips" role="radiogroup" aria-label="View">
        {VIEWS.map((o) => <button key={o.v} role="radio" aria-checked={v === o.v} className={`tchip ${v === o.v ? "on" : ""}`} onClick={() => { buzz(); setV(o.v); }}>{o.label}</button>)}
      </div>

      {(v === "toxicity" || v === "cost") && (
        <>
          <Segmented label="Scope" value={scope} onChange={setScope} options={[{ v: "flagged", label: "Flagged, D to F" }, { v: "bbook", label: "Whole B-book" }]} />
          {v === "toxicity" && <Segmented label="Window" value={days} onChange={setDays} options={[{ v: "7", label: "7 days" }, { v: "30", label: "30 days" }, { v: "90", label: "90 days" }]} />}
        </>
      )}

      {v === "toxicity" && loss && (
        <>
          <Metrics label="Toxicity totals" items={[
            { k: pov === "broker" ? "Broker net" : "Client net", v: compact(-k * loss.summary.net_broker, true), tone: -k * loss.summary.net_broker >= 0 ? "pos" : "neg" },
            { k: "Accounts", v: `${loss.accounts_with_activity} of ${loss.accounts_in_pool}` },
            { k: "Deals", v: num(loss.deals_counted) },
          ]} />
          <Group header="Symbol toxicity board" footer="Gray, share of activity. Red, share of book losses. Green, share of wins. Lift, the gap in points.">
            {loss.board.map((r) => {
              const lossSide = r.side === "broker_loss";
              const share = (lossSide ? r.loss_share_pct : r.profit_share_pct) ?? 0;
              const lift = (lossSide ? r.loss_lift_pp : r.profit_lift_pp) ?? 0;
              return (
                <div key={r.symbol} className="tox">
                  <span className="tox-top"><b>{r.symbol}</b>{r.material && <Chip tone={lossSide ? "red" : "green"}>{lossSide ? "Costs the book" : "Pays the book"}</Chip>}<Pnl v={-k * r.net_broker} short /></span>
                  <span className="tox-bars"><i className="tox-act" style={{ width: `${r.activity_share_pct}%` }} /><i className={lossSide ? "tox-loss" : "tox-win"} style={{ width: `${share}%` }} /></span>
                  <span className="tox-sub">{pct(r.activity_share_pct, 0)} of activity, {pct(share, 0)} of {lossSide ? "losses" : "wins"}, lift {lift >= 0 ? "+" : ""}{num(lift, 1)} pts · {r.deals} deals</span>
                </div>
              );
            })}
          </Group>
        </>
      )}

      {v === "cost" && mm && (
        <>
          <Metrics label="Cost totals" items={[
            { k: "Broker P&L", v: compact(mm.totals.hpov_usd, true), tone: mm.totals.hpov_usd >= 0 ? "pos" : "neg" },
            { k: "Notional", v: compact(mm.totals.notional_usd) },
            { k: "Per $1m", v: compact(mm.totals.pnl_per_mm, true), tone: mm.totals.pnl_per_mm >= 0 ? "pos" : "neg" },
          ]} />
          <Group header="Which clients cost the broker most" footer="Broker P&L per USD 1m notional traded. Negative, the client costs the book.">
            {[...mm.rows].sort((a, b) => a.pnl_per_mm - b.pnl_per_mm).map((r) => (
              <ClientRow key={r.login} login={r.login} name={nameOf(r.login)} sub={`${r.tier} · ${compact(r.notional_usd)} notional · ${r.deals} deals${r.reliable ? "" : " · partial notional"}`}
                detail={<span className="stack-r"><Pnl v={r.pnl_per_mm} short /><span className="small">per $1m</span></span>} />
            ))}
          </Group>
        </>
      )}

      {v === "accounts" && (
        <Group footer="30 day P&L per flagged account.">
          {[...bk.accounts].sort((a, b) => b.t30 - a.t30).map((a) => <ClientRow key={a.login} login={a.login} name={a.name} sub={`${a.pg} · ${a.tier} · all time ${compact(a.t_all * k)}`} value={a.t30 * k} />)}
        </Group>
      )}
      {v === "symbols" && (
        <Group footer="Ranked by client profit against the book.">
          {bk.symbols.map((s) => <Row key={s.symbol} title={s.symbol} subtitle={`${s.trades} trades · net ${s.net_lots} lots`} detail={<Pnl v={s.net_client_profit * k} short />} chevron={false} />)}
        </Group>
      )}
      {v === "exposure" && (
        <Group header={`Gross ${compact(bk.exposure.gross_notional)} · net ${compact(bk.exposure.net_notional)}`} footer="Open notional by symbol.">
          {bk.exposure.by_symbol.map((s) => <Row key={s.symbol} title={s.symbol} subtitle={`Long ${compact(s.long_notional)} · short ${compact(s.short_notional)}`} detail={<Chip tone={s.net_notional >= 0 ? "blue" : "orange"}>{compact(s.net_notional)}</Chip>} chevron={false} />)}
        </Group>
      )}
      {v === "hours" && (
        <Group header="Loss by weekday and hour, WIB" footer={`Worst hour ${DAYS[h.worst.weekday]} ${String(h.worst.hour).padStart(2, "0")}.00, ${compact(h.worst.value)}. Darker red, larger loss.`}>
          <div className="heat">
            {cells.map((row, d) => (
              <div key={d} className="heat-row"><span>{DAYS[d]}</span>
                {row.map((c, hr) => <i key={hr} title={`${DAYS[d]} ${hr}.00 ${compact(c)}`} style={{ background: c > 0 ? `color-mix(in srgb, var(--red) ${Math.round((c / span) * 100)}%, var(--fill))` : `color-mix(in srgb, var(--green) ${Math.round((-c / span) * 100)}%, var(--fill))` }} />)}
              </div>
            ))}
            <div className="heat-row heat-axis"><span /><b>0</b><b>6</b><b>12</b><b>18</b><b>23</b></div>
          </div>
        </Group>
      )}
    </>
  );
}
