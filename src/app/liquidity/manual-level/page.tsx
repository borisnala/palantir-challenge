"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { BarButton, Chip, Confirm, Group, NavBar, Row, Segmented, Sheet, Stepper, Switch } from "@/components/ios";
import ml from "@/data/manuallevel.json";
import { levelLabel, levelTone } from "@/lib/levels";

type Lv = { enabled: boolean; min: number | null; max: number | null; min_exec: string; max_exec: string };
type Assets = Record<string, { digits: number; levels: Record<string, Record<string, Lv>> }>;
const A = ml.assets as unknown as Assets;
const SYMBOLS = Object.keys(A);

export default function ManualLevel() {
  const { get, set, say } = useApp();
  const saved = get<Assets>("ml.assets", A);
  const [draft, setDraft] = useState<Assets>(saved);
  const [sym, setSym] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState(ml.feeds[0]);
  const [review, setReview] = useState(false);

  const changes: string[] = [];
  for (const s of SYMBOLS) for (const l of Object.keys(A[s].levels)) for (const fd of Object.keys(A[s].levels[l])) {
    const a = saved[s].levels[l][fd], b = draft[s].levels[l][fd];
    if (a.min !== b.min || a.max !== b.max || a.enabled !== b.enabled) changes.push(`${s} ${levelLabel(l)} ${fd}${a.enabled !== b.enabled ? (b.enabled ? " on" : " off") : ""}${a.min !== b.min ? ` min ${a.min} to ${b.min}` : ""}${a.max !== b.max ? ` max ${a.max} to ${b.max}` : ""}`);
  }
  const put = (l: string, patch: Partial<Lv>) => {
    if (!sym) return;
    const lv = draft[sym].levels[l][feed];
    setDraft({ ...draft, [sym]: { ...draft[sym], levels: { ...draft[sym].levels, [l]: { ...draft[sym].levels[l], [feed]: { ...lv, ...patch } } } } });
  };
  const changed = (s: string) => changes.some((c) => c.startsWith(`${s} `));

  return (
    <>
      <NavBar title="Manual Level" eyebrow={`Spread limits in ${ml.unit}`} back={{ href: "/liquidity/", label: "Liquidity" }}
        trailing={changes.length ? <BarButton onClick={() => setReview(true)}>Apply {changes.length}</BarButton> : null} />

      <Group footer="Each symbol has a minimum and maximum spread for every traffic light level, per price feed.">
        {SYMBOLS.map((s) => <Row key={s} onClick={() => { setSym(s); setOpen(true); }} title={s} subtitle={`${Object.keys(A[s].levels).length} levels`} detail={changed(s) ? <Chip tone="orange">Changed</Chip> : undefined} />)}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title={sym ?? "Symbol"}>
        {sym && (
          <>
            <Segmented label="Feed" value={feed} onChange={setFeed} options={ml.feeds.filter((f) => f in Object.values(draft[sym].levels)[0]).map((f) => ({ v: f, label: f }))} />
            {Object.entries(draft[sym].levels).map(([l, feeds]) => {
              const lv = feeds[feed];
              if (!lv) return null;
              return (
                <Group key={l} header={<span className="inline-flow"><Chip tone={levelTone(l.toUpperCase())}>{levelLabel(l)}</Chip></span>}>
                  <Row title="On" chevron={false}><Switch on={lv.enabled} label={`${levelLabel(l)} on`} onChange={() => put(l, { enabled: !lv.enabled })} /></Row>
                  {lv.min !== null && <Row title="Minimum" subtitle={lv.min_exec.toLowerCase()} chevron={false}><Stepper label={`${levelLabel(l)} minimum`} value={lv.min} step={0.1} digits={1} min={0} max={lv.max ?? 9999} onChange={(v) => put(l, { min: v })} /></Row>}
                  {lv.max !== null && <Row title="Maximum" subtitle={lv.max_exec.toLowerCase()} chevron={false}><Stepper label={`${levelLabel(l)} maximum`} value={lv.max} step={0.1} digits={1} min={lv.min ?? 0} onChange={(v) => put(l, { max: v })} /></Row>}
                </Group>
              );
            })}
          </>
        )}
      </Sheet>

      <Confirm open={review} title="Apply levels" action="Apply" onCancel={() => setReview(false)}
        onConfirm={() => { set("ml.assets", draft); setReview(false); say(`${changes.length} level ${changes.length === 1 ? "change" : "changes"} applied`); }} lines={changes} />
    </>
  );
}
