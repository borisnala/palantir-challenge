"use client";

import { useState } from "react";
import { Chip, Group, Metrics, NavBar, Row, Segmented } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import bk from "@/data/book.json";
import { compact } from "@/lib/data";

type V = "accounts" | "symbols" | "exposure" | "hours";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Book() {
  const [v, setV] = useState<V>("accounts");
  const [pov, setPov] = useState<"client" | "broker">("broker");
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

      <Segmented label="View" value={v} onChange={setV} options={[{ v: "accounts", label: "Accounts" }, { v: "symbols", label: "Symbols" }, { v: "exposure", label: "Exposure" }, { v: "hours", label: "Hours" }]} />

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
