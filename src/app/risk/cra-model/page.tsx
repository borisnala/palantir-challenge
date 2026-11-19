"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { useApp } from "@/components/app-state";
import { BarButton, Chip, Confirm, Group, NavBar, Row, Segmented, Stepper } from "@/components/ios";
import cr from "@/data/cra.json";
import { when } from "@/lib/data";

type Dim = "region" | "profile" | "product" | "delivery_channel";
type Score = "tppt" | "tppu";
const M = cr.model.model;
type Cat = { key: string; label: string; tppt: number | null; tppu: number | null };
type Version = { version: string; note: string; created_by: string; created_at: string; status: string; changes: string[] };

export default function CraModel() {
  const { get, set, say } = useApp();
  const [dim, setDim] = useState<Dim>("region");
  const [score, setScore] = useState<Score>("tppu");
  const [review, setReview] = useState(false);
  const edits = get<Record<string, number>>("cra.edits", {});
  const versions = get<Version[]>("cra.versions", cr.history?.versions as Version[] ?? []);
  const val = (k: string, base: number | null) => edits[k] ?? base;
  const edit = (k: string, v: number) => set("cra.edits", { ...edits, [k]: v });
  const changes = Object.entries(edits).filter(([k, v]) => v !== baseOf(k)).map(([k, v]) => `${label(k)} ${baseOf(k) ?? "None"} to ${v}`);
  const hi = val("thresholds.high_above", M.thresholds.high_above);
  const med = val("thresholds.medium_from", M.thresholds.medium_from);

  const save = () => {
    const v: Version = { version: `draft ${versions.length + 1}`, note: `${changes.length} ${changes.length === 1 ? "change" : "changes"} from the phone`, created_by: "demo.admin", created_at: new Date().toISOString(), status: "pending sign off", changes };
    set("cra.versions", [v, ...versions]);
    set("cra.edits", {});
    setReview(false);
    say("Draft saved, pending approval");
  };

  return (
    <>
      <NavBar title="CRA Model" eyebrow={`Version ${cr.model.base_version} · ${cr.model.mode.effective} mode`} back={{ href: "/risk/", label: "Risk Management" }}
        trailing={changes.length > 0 ? <BarButton onClick={() => setReview(true)}>Save {changes.length}</BarButton> : null} />

      <Group header="Rating thresholds" footer={`Scores run from ${M.scale.min} to ${M.scale.max}. Above High is high risk, from Medium up is medium risk.`}>
        <Row title="High above" chevron={false}><Stepper label="High threshold" value={hi} step={0.1} digits={1} min={med + 0.1} max={M.scale.max} onChange={(v) => edit("thresholds.high_above", v)} /></Row>
        <Row title="Medium from" chevron={false}><Stepper label="Medium threshold" value={med} step={0.1} digits={1} min={M.scale.min} max={hi - 0.1} onChange={(v) => edit("thresholds.medium_from", v)} /></Row>
      </Group>

      <Group header="Weights" footer={`Highest risk wins. Weights set which dimension decides a tie.`}>
        {(Object.keys(M.aggregation.weights) as (keyof typeof M.aggregation.weights)[]).map((k) => (
          <Row key={k} title={M.dimensions[k].label} chevron={false}><Stepper label={`${M.dimensions[k].label} weight`} value={val(`weights.${k}`, M.aggregation.weights[k])} min={0} max={5} onChange={(v) => edit(`weights.${k}`, v)} /></Row>
        ))}
      </Group>

      <Segmented label="Dimension" value={dim} onChange={setDim} options={[{ v: "region", label: "Region" }, { v: "profile", label: "Profile" }, { v: "product", label: "Product" }, { v: "delivery_channel", label: "Channel" }]} />
      <Segmented label="Score" value={score} onChange={setScore} options={[{ v: "tppu", label: "TPPU, money laundering" }, { v: "tppt", label: "TPPT, terror funding" }]} />

      <Group header={M.dimensions[dim].label}>
        {(M.dimensions[dim].categories as Cat[]).map((c) => {
          const k = `dimensions.${dim}.${c.key}.${score}`;
          const v = val(k, c[score]);
          return <Row key={c.key} title={c.label} subtitle={v === null || v === undefined ? <Chip>Not scored</Chip> : <Chip tone={v > hi ? "red" : v >= med ? "orange" : "green"}>{v > hi ? "High" : v >= med ? "Medium" : "Low"}</Chip>} chevron={false}>
            <Stepper label={`${c.label} ${score.toUpperCase()}`} value={v} step={0.1} digits={1} min={M.scale.min} max={M.scale.max} onChange={(n) => edit(k, n)} />
          </Row>;
        })}
      </Group>

      <Group header="Versions">
        {versions.map((v) => <Row key={v.version} icon={<History size={17} strokeWidth={2.4} />} tint="var(--gray)" title={v.note} subtitle={`${v.version} · ${v.created_by} · ${when(v.created_at)}`}
          detail={<Chip tone={v.status === "active" ? "green" : v.status.startsWith("pending") ? "orange" : "gray"}>{v.status}</Chip>} chevron={false} />)}
      </Group>

      <Confirm open={review} title="Save draft" action="Save draft" onCancel={() => setReview(false)} onConfirm={save}
        lines={[...changes, "A second person signs off before the draft goes live."]} />
    </>
  );
}

function baseOf(k: string): number | null {
  const p = k.split(".");
  if (p[0] === "thresholds") return M.thresholds[p[1] as keyof typeof M.thresholds];
  if (p[0] === "weights") return M.aggregation.weights[p[1] as keyof typeof M.aggregation.weights];
  const cat = (M.dimensions[p[1] as Dim].categories as Cat[]).find((c) => c.key === p[2])!;
  return cat[p[3] as Score];
}
function label(k: string): string {
  const p = k.split(".");
  if (p[0] === "thresholds") return p[1] === "high_above" ? "High threshold" : "Medium threshold";
  if (p[0] === "weights") return `${M.dimensions[p[1] as Dim].label} weight`;
  const cat = (M.dimensions[p[1] as Dim].categories as Cat[]).find((c) => c.key === p[2])!;
  return `${cat.label} ${p[3].toUpperCase()}`;
}
