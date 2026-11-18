"use client";

import { Binoculars, CandlestickChart, Percent, SlidersHorizontal, Waypoints } from "lucide-react";
import { Group, NavBar } from "@/components/ios";
import { PageRow } from "@/components/rows";
import cl from "@/data/cltl.json";
import gs from "@/data/groupspread.json";
import ml from "@/data/manuallevel.json";
import pg from "@/data/pgmarkups.json";

export default function Liquidity() {
  const hot = cl.symbols.filter((s) => /RED|BLACK/.test(s.effective_level ?? "")).length;
  return (
    <>
      <NavBar title="Liquidity Management" eyebrow="Control and analysis" root />
      <Group header="Control">
        <PageRow href="/liquidity/cltl/" Icon={CandlestickChart} tint="var(--red)" title="CLTL · LPTL" sub="Candle and liquidity traffic lights" detail={hot ? `${hot} red` : `${cl.symbols.length} symbols`} />
        <PageRow href="/liquidity/pg-markups/" Icon={Percent} tint="var(--blue)" title="PG Markups" sub="Spread markup per price group" detail={`${pg.pg_order.length} groups`} />
        <PageRow href="/liquidity/manual-level/" Icon={SlidersHorizontal} tint="var(--orange)" title="Manual Level" sub="Spread limits per alert level" detail={`${Object.keys(ml.assets).length} symbols`} />
        <PageRow href="/liquidity/group-spread/" Icon={Waypoints} tint="var(--purple)" title="Group Spread" sub="Spread tier per MT5 group" detail={`${gs.groups?.length ?? 0} groups`} />
      </Group>
      <Group header="Analysis" footer="CandleTL Control and the Algo Config page are confidential and stay on the desktop portal.">
        <PageRow href="/liquidity/book/" Icon={Binoculars} tint="var(--green)" title="Book View" sub="Book exposure and loss analysis" />
      </Group>
    </>
  );
}
