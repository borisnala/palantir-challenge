"use client";

import { Activity, BarChart3, BrainCircuit, Brush, Crosshair, Eye, FileCheck2, Gift, Layers, Newspaper, TrendingUp, Trophy } from "lucide-react";
import { useApp } from "@/components/app-state";
import { NavBar } from "@/components/ios";
import { HubTile } from "@/components/rows";
import pr from "@/data/promotion.json";
import ra from "@/data/riskanalysis.json";
import t10json from "@/data/top10.json";
import { WATCHLIST, compact, num } from "@/lib/data";
import aa from "@/data/algoactivity.json";
import cr from "@/data/cra.json";
import ca from "@/data/catches.json";
import gr from "@/data/growth.json";
import hc from "@/data/housecleaning.json";
import nw from "@/data/news.json";
import ol from "@/data/openlots.json";

export default function Risk() {
  const { watched } = useApp();
  const A = aa["30"].algos as unknown as Record<string, { count: number }>;
  const moves30 = Object.values(A).reduce((a, x) => a + x.count, 0);
  const wl = WATCHLIST.filter((w) => watched.has(w.login));
  const wlT30 = wl.reduce((a, w) => a + (w.t30 ?? 0), 0);
  const steady = gr["30"].rows.filter((r) => (r.r_squared ?? 0) >= 0.85 && r.net_change > 0).length;
  const today = ca.filter((x) => x.day === 0);
  const byAlgo = ["mg", "scalper", "fbu", "etl", "journal"].map((k) => ca.filter((x) => x.algo === k).length);
  const det = (ra.analysis.machinegun.detections_over_time.per_month as { count: number }[]).map((x) => x.count);
  const t10 = (t10json as unknown as Record<string, { totals: Record<string, number>; winners: { pl: number }[] }>)["month|clients|net_fpl"];
  const lpc = cr.stats.latest_per_customer.overall as Record<string, number>;
  const pop = pr.population;
  return (
    <>
      <NavBar title="Risk Management" eyebrow="Analysis, algorithms, CRA, promotion" root />
      <h2 className="sub-head">Monitoring</h2>
      <div className="hub-grid">
        <HubTile wide href="/risk/watchlist/" Icon={Eye} tint="var(--purple)" title="Watchlist" value={wl.length} unit="accounts"
          sub={`T30 ${compact(wlT30, true)}, client P&L`} art={{ bars: wl.slice(0, 24).map((w) => w.t30 ?? 0), tone: "var(--purple)" }} />
        <HubTile href="/risk/open-lots/" Icon={Layers} tint="var(--blue)" title="Open Lots" value={num(ol.totals.gross_lots, 1)} unit="lots"
          sub={`${ol.totals.positions} positions, ${ol.totals.mg_triggered} MG hits`} art={{ split: [ol.totals.mg_triggered, Math.max(0, ol.totals.clients - ol.totals.mg_triggered)], tones: ["var(--red)", "var(--fill2)"] }} />
        <HubTile href="/risk/growth/" Icon={TrendingUp} tint="var(--green)" title="Growth" value={steady} unit="consistent"
          sub={`of ${gr["30"].rows.length} accounts, 30 days`} art={{ split: [steady, gr["30"].rows.length - steady] }} />
        <HubTile href="/risk/top10/" Icon={Trophy} tint="var(--orange)" title="Top 10" value={compact(t10?.totals.client_total ?? t10?.totals.client_pl ?? 0, true)}
          sub="Client P&L this month, top winners" art={{ bars: (t10?.winners ?? []).map((w) => w.pl) }} />
        <HubTile href="/risk/catches/" Icon={Crosshair} tint="var(--red)" title="Catches" value={today.length} unit="today"
          sub={`${ca.length} this month, MG, SC, FBU, ETL, journal`} art={{ bars: byAlgo }} />
        <HubTile wide href="/risk/news/" Icon={Newspaper} tint="var(--orange)" title="News" value={nw.lists["30d|high"].totals.events_computed} unit="releases, 30 d"
          sub={`Broker net ${compact(nw.lists["30d|high"].totals.broker_net, true)}, ${nw.lists["7d|high"].pending} pending`} art={{ bars: nw.lists["30d|high"].events.filter((e) => e.closed_net !== null).map((e) => e.closed_net ?? 0), tone: "var(--orange)" }} />
      </div>

      <h2 className="sub-head">Algorithms</h2>
      <div className="hub-grid">
        <HubTile wide href="/risk/analysis/" Icon={BarChart3} tint="var(--blue)" title="Risk Analysis" value={det.reduce((a, b) => a + b, 0)} unit="MG detections"
          sub="MachineGun, ScalperAM, FBUv2, a month each" art={{ bars: det }} />
        <HubTile href="/risk/activity/" Icon={Activity} tint="var(--purple)" title="Algo Activity" value={moves30} unit="moves"
          sub="Last 30 days" art={{ bars: Object.values(A).map((x) => x.count) }} />
        <HubTile href="/risk/housecleaning/" Icon={Brush} tint="var(--gray)" title="HouseCleaning" value={hc.summary.cutlisted} unit="cutlisted"
          sub={`${hc.summary.total_groups} groups, ${hc.summary.reinstate} to reinstate`} art={{ split: [hc.summary.cutlisted, hc.summary.total_groups - hc.summary.cutlisted] }} />
      </div>

      <h2 className="sub-head">Customer risk and promotion</h2>
      <div className="hub-grid">
        <HubTile href="/risk/cra-model/" Icon={BrainCircuit} tint="var(--purple)" title="CRA Model" value={cr.model.mode.effective === "shadow" ? "Shadow" : "Enforce"}
          sub={`Version ${cr.model.version.slice(0, 10)}`} art={{ levels: ["basic", "yellow", "orange", "red"] }} />
        <HubTile href="/risk/cra-analysis/" Icon={FileCheck2} tint="var(--blue)" title="CRA Analysis" value={lpc.High ?? 0} unit="high"
          sub={`${cr.stats.latest_per_customer.customers} customers rated`} art={{ split: [lpc.High ?? 0, (lpc.Medium ?? 0) + (lpc.Low ?? 0)], tones: ["var(--red)", "var(--orange)"] }} />
        <HubTile wide href="/risk/promotion/" Icon={Gift} tint="var(--pink, #ff2d55)" title="Promotion Analysis" value={pop.promotion_landed} unit={`of ${pop.accounts} landed`}
          sub="JamesBond promotions" art={{ split: [pop.promotion_landed, pop.never_landed], tones: ["var(--green)", "var(--red)"] }} />
      </div>
    </>
  );
}
