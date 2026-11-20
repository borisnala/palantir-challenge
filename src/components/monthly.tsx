"use client";

// Monthly history over the account's life, the portal's MONTHLY HISTORY panel as a sheet (owner 2026-11-20, "make this
// just a pop up window"). Lifetime figures and asset mix on top, one row a month with its own mix bar, a month pushes
// its figures and symbols inside the sheet. P&L follows the point of view, balance and equity never flip.

import { Group, Row, useSheetPush } from "./ios";
import { Pnl } from "./ui";
import { compact, num } from "@/lib/data";

type Asset = { symbol: string; pct: number };
type Sym = { symbol: string; trades: number; lots: number; net_exposure: number; pl: number; win_rate: number; hold_days: number };
type Month = { month: string; open_lot: number; close_lot: number; trades: number; win_rate: number; net_exposure: number; hold_days: number; pl: number; balance: number; equity: number; assets: Asset[]; symbols: Sym[] };
type Total = Omit<Month, "month" | "symbols">;
export type Monthly = { months: Month[]; total: Total };

const HUE = ["var(--orange)", "var(--blue)", "var(--green)", "var(--purple)", "var(--red)", "var(--gray)"];
const NAME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (m: string, long = false) => { const [y, k] = m.split("-"); return long ? `${new Date(Number(y), Number(k) - 1).toLocaleString("en-GB", { month: "long" })} ${y}` : `${NAME[Number(k) - 1]} ${y}`; };
const signed = (v: number, d = 2) => `${v > 0 ? "+" : ""}${v.toFixed(d)}`;

function Mix({ assets, hue }: { assets: Asset[]; hue: (s: string) => string }) {
  const shown = assets.filter((a) => a.pct > 0);
  return <span className="mix" aria-hidden>{shown.map((a) => <i key={a.symbol} style={{ flex: a.pct, background: hue(a.symbol) }} />)}</span>;
}

function MonthPage({ m, sg, hue }: { m: Month; sg: number; hue: (s: string) => string }) {
  return (
    <>
      <div className="metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div><span>P&L</span><b className={m.pl * sg >= 0 ? "pos" : "neg"}>{compact(m.pl * sg, true)}</b></div>
        <div><span>Trades</span><b>{m.trades}</b></div>
        <div><span>Win rate</span><b>{Math.round(m.win_rate)}%</b></div>
        <div><span>Lots</span><b>{num(m.open_lot, 1)}</b></div>
      </div>
      <Group header="Month">
        <Row title="Open lots" detail={<span className="num">{num(m.open_lot, 2)}</span>} chevron={false} />
        <Row title="Close lots" detail={<span className="num">{num(m.close_lot, 2)}</span>} chevron={false} />
        <Row title="Net exposure" detail={<span className={`num ${m.net_exposure >= 0 ? "pos" : "neg"}`}>{signed(m.net_exposure)} lots</span>} chevron={false} />
        <Row title="Average hold" detail={<span className="num">{m.hold_days.toFixed(1)} d</span>} chevron={false} />
        <Row title="Balance at month end" detail={<span className="num">{compact(m.balance)}</span>} chevron={false} />
        <Row title="Equity at month end" detail={<span className="num">{compact(m.equity)}</span>} chevron={false} />
      </Group>
      <Group header="Asset mix"><div className="mix-wrap"><Mix assets={m.assets} hue={hue} /><span className="mix-keys">{m.assets.filter((a) => a.pct > 0).map((a) => <span key={a.symbol}><i style={{ background: hue(a.symbol) }} />{a.symbol} {a.pct}%</span>)}</span></div></Group>
      <Group header="By symbol" footer="Lots traded, net exposure in lots, average hold in days.">
        {m.symbols.map((x) => (
          <Row key={x.symbol} chevron={false} icon={<i className="mix-dot" style={{ background: hue(x.symbol) }} />}
            title={x.symbol} subtitle={`${x.trades} trades · ${Math.round(x.win_rate)}% win · ${num(x.lots, 2)} lots · net ${signed(x.net_exposure)} · ${x.hold_days.toFixed(1)} d`}
            detail={<Pnl v={x.pl * sg} short />} />
        ))}
      </Group>
    </>
  );
}

export function MonthlyHistory({ data, sg }: { data: Monthly; sg: number }) {
  const push = useSheetPush();
  const order = data.total.assets.map((a) => a.symbol);
  const hue = (s: string) => HUE[Math.min(order.indexOf(s) < 0 ? 5 : order.indexOf(s), 5)];
  const t = data.total;
  const best = data.months.reduce((a, b) => (b.pl * sg > a.pl * sg ? b : a), data.months[0]);
  return (
    <>
      <div className="metrics" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div><span>P&L</span><b className={t.pl * sg >= 0 ? "pos" : "neg"}>{compact(t.pl * sg, true)}</b></div>
        <div><span>Trades</span><b>{t.trades}</b></div>
        <div><span>Win rate</span><b>{Math.round(t.win_rate)}%</b></div>
        <div><span>Lots</span><b>{num(t.open_lot, 0)}</b></div>
      </div>
      <Group header={`Account life, since ${label(data.months[0].month)}`}>
        <Row title="Balance" detail={<span className="num">{compact(t.balance)}</span>} chevron={false} />
        <Row title="Net exposure" detail={<span className={`num ${t.net_exposure >= 0 ? "pos" : "neg"}`}>{signed(t.net_exposure)} lots</span>} chevron={false} />
        <Row title="Average hold" detail={<span className="num">{t.hold_days.toFixed(1)} d</span>} chevron={false} />
        {best && <Row title="Best month" detail={<span className="num">{label(best.month)} · <Pnl v={best.pl * sg} short /></span>} chevron={false} />}
      </Group>
      <Group header="Asset mix, account life">
        <div className="mix-wrap"><Mix assets={t.assets} hue={hue} /><span className="mix-keys">{t.assets.filter((a) => a.pct > 0).map((a) => <span key={a.symbol}><i style={{ background: hue(a.symbol) }} />{a.symbol} {a.pct}%</span>)}</span></div>
      </Group>
      <Group header="By month, newest first" footer="Balance is reconstructed from closed deals and balance operations. The latest month shows live equity.">
        {[...data.months].reverse().map((m) => (
          <Row key={m.month} onClick={() => push?.(label(m.month, true), <MonthPage m={m} sg={sg} hue={hue} />)}
            title={label(m.month)} subtitle={<span className="mrow-sub"><span>{m.trades} trades · {Math.round(m.win_rate)}% win · {num(m.open_lot, 1)} lots · balance {compact(m.balance)}</span><Mix assets={m.assets} hue={hue} /></span>}
            detail={<Pnl v={m.pl * sg} short />} />
        ))}
      </Group>
    </>
  );
}
