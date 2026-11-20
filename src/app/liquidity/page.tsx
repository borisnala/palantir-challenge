"use client";

// Liquidity Management (owner 2026-11-20, "make it a feast for the eye"): a tile board as the CLTL board, each screen
// with its key figure and a small picture of its data. Control first, analysis after.

import { Binoculars, CandlestickChart, Percent, SlidersHorizontal, Waypoints } from "lucide-react";
import { NavBar } from "@/components/ios";
import { HubTile } from "@/components/rows";
import bk from "@/data/book.json";
import cl from "@/data/cltl.json";
import gs from "@/data/groupspread.json";
import ml from "@/data/manuallevel.json";
import pg from "@/data/pgmarkups.json";
import { compact } from "@/lib/data";

const band = (l?: string | null) => (/^(RED|BLACK)/i.test(l ?? "") ? "red" : /^ORANGE/i.test(l ?? "") ? "orange" : /^YELLOW/i.test(l ?? "") ? "yellow" : "basic") as "red" | "orange" | "yellow" | "basic";
const RANK = { red: 0, orange: 1, yellow: 2, basic: 3 };

export default function Liquidity() {
  const levels = cl.symbols.map((s) => band(s.effective_level)).sort((a, b) => RANK[a] - RANK[b]);
  const red = levels.filter((l) => l === "red").length, alert = levels.filter((l) => l !== "basic").length;
  const pgs = pg.pg_order as string[];
  const mk = pg.markups as unknown as Record<string, Record<string, number>>;
  const groups = (gs.groups ?? []) as { accounts: number }[];
  const accounts = groups.reduce((a, g) => a + (g.accounts ?? 0), 0);
  const symbols = Object.keys(ml.assets).length;
  const pgT30 = Object.values(bk.by_pg).map((x) => -x.t30);
  return (
    <>
      <NavBar title="Liquidity Management" eyebrow="Control and analysis" root />
      <h2 className="sub-head">Control</h2>
      <div className="hub-grid">
        <HubTile wide href="/liquidity/cltl/" Icon={CandlestickChart} tint="var(--red)" title="CLTL · LPTL" value={red} unit={red === 1 ? "symbol red" : "symbols red"}
          sub={`${alert} of ${levels.length} on alert, candle and liquidity lights`} art={{ levels }} />
        <HubTile href="/liquidity/pg-markups/" Icon={Percent} tint="var(--blue)" title="PG Markups" value={pgs.length} unit="groups"
          sub="EURUSD markup, PG-A to PG-F" art={{ bars: pgs.map((p) => mk[p]?.EURUSD ?? 0) }} />
        <HubTile href="/liquidity/manual-level/" Icon={SlidersHorizontal} tint="var(--orange)" title="Manual Level" value={symbols} unit="symbols"
          sub={`Spread limits, ${ml.feeds.length} feeds`} art={{ levels: ["basic", "yellow", "yellow", "orange", "orange", "red", "red"] }} />
        <HubTile href="/liquidity/group-spread/" Icon={Waypoints} tint="var(--purple)" title="Group Spread" value={groups.length} unit="groups"
          sub={`${accounts} accounts priced by tier`} art={{ bars: groups.map((g) => g.accounts ?? 0) }} />
        <HubTile href="/liquidity/book/" Icon={Binoculars} tint="var(--green)" title="Book View" value={compact(-bk.totals.t30, true)}
          sub={`Broker P&L, 30 days, ${bk.totals.count} flagged accounts`} art={{ bars: pgT30, tone: "var(--red)" }} />
      </div>
      <p className="hub-note">CandleTL Control and Algo Config remain on the desktop portal.</p>
    </>
  );
}
