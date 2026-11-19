"use client";

import { Activity, BarChart3, Binoculars, BrainCircuit, Brush, Crosshair, Eye, FileCheck2, Gift, Layers, Newspaper, TrendingUp, Trophy } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar } from "@/components/ios";
import { PageRow } from "@/components/rows";
import aa from "@/data/algoactivity.json";
import cr from "@/data/cra.json";
import ca from "@/data/catches.json";
import gr from "@/data/growth.json";
import hc from "@/data/housecleaning.json";
import nw from "@/data/news.json";
import ol from "@/data/openlots.json";

export default function Risk() {
  const { watched } = useApp();
  const moves30 = Object.values(aa["30"].algos).reduce((a, x) => a + x.count, 0);
  return (
    <>
      <NavBar title="Risk Management" eyebrow="Analysis, algorithms, CRA, promotion" root />

      <Group header="Monitoring">
        <PageRow href="/risk/watchlist/" Icon={Eye} tint="var(--purple)" title="Watchlist" detail={String(watched.size)} />
        <PageRow href="/risk/open-lots/" Icon={Layers} tint="var(--blue)" title="Open Lots" sub="Live positions" detail={`${ol.totals.positions}`} />
        <PageRow href="/risk/growth/" Icon={TrendingUp} tint="var(--green)" title="Growth Detection" sub="Consistent client profit" detail={String(gr["30"].rows.length)} />
        <PageRow href="/risk/top10/" Icon={Trophy} tint="var(--orange)" title="Top 10" sub="Winners, losers, volume" />
        <PageRow href="/risk/catches/" Icon={Crosshair} tint="var(--red)" title="Catches" sub="Detections and group moves today" detail={String(ca.length)} />
        <PageRow href="/risk/news/" Icon={Newspaper} tint="var(--orange)" title="News" sub="Client P&L around economic releases" detail={nw.lists["7d|high"].pending ? `${nw.lists["7d|high"].pending} pending` : undefined} />
      </Group>

      <Group header="Algorithms">
        <PageRow href="/risk/analysis/" Icon={BarChart3} tint="var(--blue)" title="Risk Analysis" sub="MachineGun, ScalperAM, FBUv2" />
        <PageRow href="/risk/activity/" Icon={Activity} tint="var(--purple)" title="Algo Activity" sub="Moves and risk score" detail={`${moves30} in 30 d`} />
        <PageRow href="/risk/housecleaning/" Icon={Brush} tint="var(--gray)" title="HouseCleaning" sub="Inactive group cleanup" detail={`${hc.summary.cutlisted} on cutlist`} />
      </Group>

      <Group header="Customer risk (CRA)">
        <PageRow href="/risk/cra-model/" Icon={BrainCircuit} tint="var(--purple)" title="CRA Model" sub="Scores and thresholds" />
        <PageRow href="/risk/cra-analysis/" Icon={FileCheck2} tint="var(--blue)" title="CRA Analysis" sub="Assessments" detail={String(cr.stats.assessments)} />
      </Group>

      <Group header="Promotion">
        <PageRow href="/risk/promotion/" Icon={Gift} tint="var(--pink, #ff2d55)" title="Promotion Analysis" sub="JamesBond promotions" />
      </Group>

      <Group header="Related">
        <PageRow href="/liquidity/book/" Icon={Binoculars} tint="var(--green)" title="Book View" sub="In Liquidity" />
      </Group>
    </>
  );
}
