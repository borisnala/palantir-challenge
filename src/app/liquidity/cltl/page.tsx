"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Chip, Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { Bars } from "@/components/ui";
import cl from "@/data/cltl.json";
import { ago, num, pct } from "@/lib/data";
import { levelLabel, levelTone } from "@/lib/levels";

type S = (typeof cl.symbols)[number];
type F = "all" | "alert";

export default function Cltl() {
  const [f, setF] = useState<F>("all");
  const [sel, setSel] = useState<S | null>(null);
  const [open, setOpen] = useState(false);
  const list = cl.symbols.filter((s) => f === "all" || levelTone(s.effective_level) !== "green");

  return (
    <>
      <NavBar title="CLTL · LPTL" eyebrow={cl.profile.label} back={{ href: "/liquidity/", label: "Liquidity" }} />
      <Metrics label="Symbols" items={[{ k: "Symbols", v: cl.symbols.length }, { k: "Red", v: cl.symbols.filter((s) => levelTone(s.effective_level) === "red").length, tone: "neg" }, { k: "Orange", v: cl.symbols.filter((s) => /ORANGE/.test(s.effective_level ?? "")).length, tone: "warn" }]} />
      <Segmented label="Show" value={f} onChange={setF} options={[{ v: "all", label: "All symbols" }, { v: "alert", label: "On alert" }]} />

      <Group footer="The light is the higher of the candle light (M1, M5, daily range) and the liquidity light (spread). A higher light widens client spreads.">
        {list.map((s) => (
          <Row key={s.symbol} onClick={() => { setSel(s); setOpen(true); }} title={s.symbol}
            subtitle={`Spread ${s.spread_points} pts · day ${pct(s.daily_pct, 2)} · led by ${s.live_leader ?? (s.sources ?? []).join(", ")}`}
            detail={<Chip tone={levelTone(s.effective_level)}>{levelLabel(s.effective_level)}</Chip>} />
        ))}
      </Group>

      <Group header="Level changes">
        {cl.events.map((e, i) => (
          <Row key={i} title={e.symbol} subtitle={<span className="inline-flow"><Chip tone={levelTone(e.from)}>{levelLabel(e.from)}</Chip><ArrowRight size={14} /><Chip tone={levelTone(e.to)}>{levelLabel(e.to)}</Chip></span>}
            detail={ago(Math.round(e.ago / 60) || 1)} chevron={false} />
        ))}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title={sel?.symbol ?? "Symbol"}>
        {sel && (
          <>
            <div className="sheet-hero"><span className="eyebrow">Bid {sel.bid} · Ask {sel.ask}</span><b className="hero-amount">{sel.spread_points} pts</b><Chip tone={levelTone(sel.effective_level)}>{levelLabel(sel.effective_level)}</Chip></div>
            <Group header="Spread, last hour"><div className="chartpad"><Bars data={sel.spreads.map((v, i) => ({ label: i === 0 ? "60 min ago" : i === sel.spreads.length - 1 ? "now" : String(i), v }))} tone="var(--orange)" /></div></Group>
            <Group header="Candle light">
              <Row title="M1 range" detail={pct(sel.m1_range_pct, 2)} chevron={false} />
              <Row title="M5 range" detail={pct(sel.m5_range_pct, 2)} chevron={false} />
              <Row title="Daily range" detail={pct(sel.daily_pct, 2)} chevron={false} />
            </Group>
            <Group header="Liquidity light" footer="Spread threshold for each level.">
              <Row title="Now" detail={<Chip tone={levelTone(sel.lptl_level)}>{levelLabel(sel.lptl_level)}</Chip>} chevron={false} />
              {(sel.lptl_thresholds ?? []).map((t) => <Row key={t.level} title={levelLabel(t.level)} detail={`${num(t.y)} pts`} chevron={false} />)}
            </Group>
          </>
        )}
      </Sheet>
    </>
  );
}
