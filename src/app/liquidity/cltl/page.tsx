"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Chip, Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { Bars } from "@/components/ui";
import cl from "@/data/cltl.json";
import { ago, num, pct } from "@/lib/data";
import { sentence } from "@/lib/data";
import { levelLabel, levelTone } from "@/lib/levels";

type S = (typeof cl.symbols)[number];
type F = "all" | "alert";
// The board (owner 2026-11-20, "make all complex data compact"): symbols grouped by their light, worst first, each a
// small tile with the three figures a dealer reads at a glance, spread, day move and what leads the light.
const BANDS = [
  { k: "red", label: "Red", rx: /^RED/i }, { k: "orange", label: "Orange", rx: /^ORANGE/i },
  { k: "yellow", label: "Yellow", rx: /^YELLOW/i }, { k: "basic", label: "Basic", rx: /./ },
] as const;
const bandOf = (l?: string | null) => BANDS.find((b) => b.rx.test(l ?? "BASIC"))!.k;

export default function Cltl() {
  const [f, setF] = useState<F>("all");
  const [sel, setSel] = useState<S | null>(null);
  const [open, setOpen] = useState(false);
  const list = cl.symbols.filter((s) => f === "all" || levelTone(s.effective_level) !== "green");
  const groups = BANDS.map((b) => ({ ...b, items: list.filter((s) => bandOf(s.effective_level) === b.k).sort((x, y) => (y.effective_level ?? "").localeCompare(x.effective_level ?? "")) })).filter((g) => g.items.length);

  return (
    <>
      <NavBar title="CLTL · LPTL" eyebrow={cl.profile.label} back={{ href: "/liquidity/", label: "Liquidity Management" }} />
      <Metrics label="Symbols" items={[{ k: "Symbols", v: cl.symbols.length }, { k: "Red", v: cl.symbols.filter((s) => levelTone(s.effective_level) === "red").length, tone: "neg", history: "cltl.red" }, { k: "Orange", v: cl.symbols.filter((s) => /ORANGE/.test(s.effective_level ?? "")).length, tone: "warn", history: "cltl.orange" }]} />
      <Segmented label="Show" value={f} onChange={setF} options={[{ v: "all", label: "All symbols" }, { v: "alert", label: "On alert" }]} />

      {groups.map((g) => (
        <Group key={g.k} header={`${g.label} · ${g.items.length}`}>
          <div className="lvl-board">
            {g.items.map((sy) => (
              <button key={sy.symbol} className={`lvl-tile lvl-${g.k}`} onClick={() => { setSel(sy); setOpen(true); }} aria-label={`${sy.symbol}, ${levelLabel(sy.effective_level)}, spread ${sy.spread_points} points`}>
                <span className="lvl-top"><b>{sy.symbol}</b><i>{levelLabel(sy.effective_level).replace(/^\w+ /, "")}</i></span>
                <span className="lvl-num">{sy.spread_points}<small> pts</small></span>
                <span className={`lvl-sub ${sy.daily_pct >= 0 ? "pos" : "neg"}`}>{sy.daily_pct >= 0 ? "+" : ""}{num(sy.daily_pct, 2)}%<em>{sy.live_leader ?? (sy.sources ?? [])[0] ?? ""}</em></span>
              </button>
            ))}
          </div>
        </Group>
      ))}
      <p className="caption">Light, the higher of the candle light (M1, M5, daily range) and the liquidity light (spread). Higher lights widen client spreads.</p>

      <Group header="Level changes">
        {cl.events.map((e, i) => (
          <Row key={i} title={e.symbol} subtitle={<span className="inline-flow"><Chip tone={levelTone(e.from)}>{levelLabel(e.from)}</Chip><ArrowRight size={14} /><Chip tone={levelTone(e.to)}>{levelLabel(e.to)}</Chip></span>}
            detail={ago(Math.round(e.ago / 60) || 1)} chevron={false} />
        ))}
      </Group>

      <Group header="Profile" footer="The portal's MAD parameter tool edits these thresholds on the desktop. Read only here.">
        <Row title="Profile" detail={cl.profile.label} chevron={false} />
        <Row title="Thresholds from" detail={sentence(cl.profile.threshold_source.replace(/-/g, " "))} chevron={false} />
        {Object.entries(cl.profile.hold_ttl_minutes).map(([k, v]) => <Row key={k} title={`${k} hold`} detail={`${v} min`} chevron={false} />)}
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
