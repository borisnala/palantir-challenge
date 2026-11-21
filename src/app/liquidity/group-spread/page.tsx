"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Chip, Confirm, Group, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import gs from "@/data/groupspread.json";

type Cell = { sd: number; bal: number };
type G = { name: string; suggested_tier: string; accounts: number; now: Record<string, Cell>; tier?: string };
const GROUPS = (gs.groups ?? []) as unknown as G[];
const EXP = gs.expected as unknown as Record<string, Record<string, Cell>>;
const sym = (p: string) => p.split("\\").pop() ?? p;
const grp = (n: string) => n.replace(/^DEMO\\/, "").replace(/\\/g, " ");

export default function GroupSpread() {
  const { get, set, say } = useApp();
  const applied = get<Record<string, string>>("gs.applied", {});
  const [sel, setSel] = useState<G | null>(null);
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState("A1");
  const [review, setReview] = useState(false);

  const nowOf = (g: G): Record<string, Cell> => (applied[g.name] ? EXP[applied[g.name]] : g.now);
  const diffs = (g: G, t: string) => gs.paths.filter((p) => nowOf(g)[p] && EXP[t][p] && nowOf(g)[p].sd !== EXP[t][p].sd);
  const pick = (g: G) => { setSel(g); setTier(applied[g.name] ?? g.suggested_tier); setOpen(true); };

  return (
    <>
      <NavBar title="Group Spread" eyebrow="Spread tier per MT5 group" back={{ href: "/liquidity/", label: "Liquidity Management" }} />
      <Group footer={`Tiers ${gs.tiers.join(", ")}. Groups outside their suggested tier are mispriced.`}>
        {GROUPS.map((g) => {
          const d = diffs(g, applied[g.name] ?? g.suggested_tier).length;
          return <Row key={g.name} onClick={() => pick(g)} title={grp(g.name)} subtitle={`${g.accounts} accounts · suggested ${g.suggested_tier}`}
            detail={applied[g.name] ? <Chip tone="green">On {applied[g.name]}</Chip> : d ? <Chip tone="orange">{d} differ</Chip> : <Chip tone="green">Matches</Chip>} />;
        })}
      </Group>
      {gs.not_in_map.length > 0 && (
        <Group header="Unmapped symbol paths" footer="No spread defined in the tier map.">
          {gs.not_in_map.map((p) => <Row key={p} title={sym(p)} subtitle={p.replace(/\\/g, " / ")} chevron={false} />)}
        </Group>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={sel ? grp(sel.name) : "Group"}>
        {sel && (
          <>
            <Segmented label="Tier" value={tier} onChange={setTier} options={gs.tiers.map((t) => ({ v: t, label: t }))} />
            <Group header={`Preview, now to ${tier}`} footer="Spread in points. Balance, extra markup per symbol.">
              {gs.paths.filter((p) => nowOf(sel)[p] && EXP[tier][p]).map((p) => {
                const a = nowOf(sel)[p], b = EXP[tier][p];
                return <Row key={p} title={sym(p)} detail={a.sd === b.sd ? `${b.sd}` : <span><span className="muted">{a.sd} to </span><b className={b.sd > a.sd ? "neg" : "pos"}>{b.sd}</b></span>} chevron={false} />;
              })}
            </Group>
            <button className="btn btn-blue" disabled={diffs(sel, tier).length === 0} onClick={() => setReview(true)}>
              {diffs(sel, tier).length ? `Apply ${tier}, ${diffs(sel, tier).length} symbols change` : "Already on this tier"}
            </button>
          </>
        )}
      </Sheet>

      <Confirm open={review} code="group spread tier" title="Apply tier" action="Apply" onCancel={() => setReview(false)}
        onConfirm={() => { if (sel) { set("gs.applied", { ...applied, [sel.name]: tier }); say(`${grp(sel.name)} set to ${tier}`); } setReview(false); setOpen(false); }}
        lines={sel ? diffs(sel, tier).map((p) => `${sym(p)} ${nowOf(sel)[p].sd} to ${EXP[tier][p].sd} pts`) : []} />
    </>
  );
}
