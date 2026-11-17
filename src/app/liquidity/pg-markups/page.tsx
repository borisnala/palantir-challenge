"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { BarButton, Chip, Confirm, Group, NavBar, Row, Segmented, Stepper, Switch } from "@/components/ios";
import pg from "@/data/pgmarkups.json";

type Mk = Record<string, Record<string, number>>;
type Field = { key: string; value: string; kind: string };
const nice = (k: string) => k.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default function PgMarkups() {
  const { get, set, say } = useApp();
  const [g, setG] = useState(pg.pg_order[0]);
  const [review, setReview] = useState(false);
  const saved = get<Mk>("pg.markups", pg.markups as Mk);
  const [draft, setDraft] = useState<Mk>(saved);
  const cfgSaved = get<Field[]>("pg.fields", pg.fields);
  const [cfg, setCfg] = useState<Field[]>(cfgSaved);
  const changes = [
    ...pg.pg_order.flatMap((p) => pg.symbols.filter((s) => draft[p][s] !== saved[p][s]).map((s) => `${p} ${s} ${saved[p][s]} to ${draft[p][s]} pts`)),
    ...cfg.filter((f, i) => f.value !== cfgSaved[i].value).map((f, i) => `${nice(f.key)} ${cfgSaved[i]?.value} to ${f.value}`),
  ];
  const labels = pg.labels as unknown as Record<string, Record<string, string[]>>;
  const sim = cfg.find((f) => f.key === "SIMULATION_MODE")?.value === "true";

  const apply = () => {
    set("pg.markups", draft); set("pg.fields", cfg);
    setReview(false);
    say(sim ? "Applied in simulation mode" : "Markups applied");
  };

  return (
    <>
      <NavBar title="PG Markups" eyebrow="Spread markup per price group, in points" back={{ href: "/liquidity/", label: "Liquidity" }}
        trailing={changes.length ? <BarButton onClick={() => setReview(true)}>Apply {changes.length}</BarButton> : null} />

      <Segmented label="Price group" value={g} onChange={setG} options={pg.pg_order.map((p) => ({ v: p, label: p.replace("PG-", "") }))} />

      <Group header={`${g} · groups`} footer="MT5 groups priced with this markup.">
        <Row title="Direct" detail={(labels.direct[g] ?? []).join(", ") || "No groups"} chevron={false} />
        <Row title="IB" detail={(labels.ib[g] ?? []).join(", ") || "No groups"} chevron={false} />
      </Group>

      <Group header={`${g} · markups`}>
        {pg.symbols.map((s) => (
          <Row key={s} title={s} subtitle={draft[g][s] !== saved[g][s] ? <Chip tone="orange">Changed</Chip> : undefined} chevron={false}>
            <Stepper label={`${s} markup`} value={draft[g][s]} min={0} max={500} onChange={(v) => setDraft({ ...draft, [g]: { ...draft[g], [s]: v } })} />
          </Row>
        ))}
      </Group>

      <Group header="IB rebate bands" footer="An IB's rebate decides which price group its clients get.">
        {pg.ib_rebate_bands.map((b) => <Row key={b.pg} title={`${b.low} to ${b.high} pips rebate`} detail={b.pg} chevron={false} />)}
      </Group>

      <Group header="Settings" footer={sim ? "Simulation mode is on, so applying only logs what would change." : "Simulation mode is off. Applying changes MT5 groups."}>
        {cfg.map((f, i) => f.kind === "bool" ? (
          <Row key={f.key} title={nice(f.key)} chevron={false}>
            <Switch on={f.value === "true"} label={nice(f.key)} onChange={() => setCfg(cfg.map((x, j) => j === i ? { ...x, value: x.value === "true" ? "false" : "true" } : x))} />
          </Row>
        ) : f.kind === "number" ? (
          <Row key={f.key} title={nice(f.key)} chevron={false}>
            <Stepper label={nice(f.key)} value={Number(f.value)} step={f.key.endsWith("_MS") ? 1000 : 1} min={0} onChange={(v) => setCfg(cfg.map((x, j) => j === i ? { ...x, value: String(v) } : x))} />
          </Row>
        ) : null)}
      </Group>

      <Confirm open={review} title="Apply changes" action={sim ? "Apply in simulation" : "Apply to MT5"} onCancel={() => setReview(false)} onConfirm={apply} lines={changes} />
    </>
  );
}
