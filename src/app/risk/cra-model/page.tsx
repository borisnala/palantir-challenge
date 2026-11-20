"use client";

import { useState } from "react";
import { FlaskConical, History, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app-state";
import { BarButton, Chip, Confirm, Group, NavBar, PullDown, Row, Segmented, Sheet, Stepper } from "@/components/ios";
import cr from "@/data/cra.json";
import { sentence, when } from "@/lib/data";

type Dim = "region" | "profile" | "product" | "delivery_channel";
type Score = "tppt" | "tppu";
const M = cr.model.model;
type Cat = { key: string; label: string; tppt: number | null; tppu: number | null };
type Version = { version: string; note: string; created_by: string; created_at: string; status: string; changes: string[] };

export default function CraModel() {
  const { get, set, say, user } = useApp();
  const [mode, setMode] = useState<"shadow" | "enforce" | null>(null);
  const [trying, setTrying] = useState(false);
  const [signing, setSigning] = useState(false);
  const [restore, setRestore] = useState<Version | null>(null);
  const effective = get<"shadow" | "enforce">("cra.mode", cr.model.mode.effective as "shadow" | "enforce");
  const signedBy = get<string | null>("cra.signed", null);
  const maker = cr.model.created_by;
  const DIMS: Dim[] = ["region", "profile", "product", "delivery_channel"];
  const [pick, setPick] = useState<Record<Dim, string>>(() => Object.fromEntries(DIMS.map((d) => [d, (M.dimensions[d].categories as Cat[])[0].key])) as Record<Dim, string>);
  // Try a customer: each dimension's points for the chosen category, the highest wins, the weight breaks a tie (model aggregation)
  const trial = (sc: Score) => {
    const parts = DIMS.map((d) => { const c = (M.dimensions[d].categories as Cat[]).find((x) => x.key === pick[d])!; return { d, label: M.dimensions[d].label, v: val(`dimensions.${d}.${c.key}.${sc}`, c[sc]) ?? M.unmapped_point, w: val(`weights.${d}`, M.aggregation.weights[d as keyof typeof M.aggregation.weights]) ?? 0 }; });
    const top = [...parts].sort((a, b) => b.v - a.v || b.w - a.w)[0];
    return { v: top.v, by: top.label, rating: top.v > hi ? "High" : top.v >= med ? "Medium" : "Low" };
  };
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

      <Group header="Mode" footer={effective === "shadow" ? "Shadow scores every customer and records the rating, without acting on it." : "Enforce applies the rating to onboarding and reviews."}>
        <div className="seg-row"><Segmented label="Mode" value={effective} onChange={(m) => { if (m !== effective) setMode(m); }} options={[{ v: "shadow", label: "Shadow" }, { v: "enforce", label: "Enforce" }]} /></div>
      </Group>

      <Group header="Sign-off" footer="A second person signs off each version. The maker can not sign off their own version.">
        <Row icon={<ShieldCheck size={17} strokeWidth={2.4} />} tint={signedBy ? "var(--green)" : "var(--orange)"} title={cr.model.version} subtitle={`${cr.model.note} · by ${maker}`}
          detail={<Chip tone={signedBy ? "green" : "orange"}>{signedBy ? `Signed by ${signedBy}` : "Pending sign-off"}</Chip>} chevron={false} />
        {!signedBy && <Row onClick={() => setSigning(true)} title={user.name === maker ? "You made this version" : `Sign off ${cr.model.version}`} subtitle={user.name === maker ? "Sign in as another user to sign off" : undefined} />}
      </Group>

      <Group>
        <Row icon={<FlaskConical size={17} strokeWidth={2.4} />} tint="var(--blue)" title="Try a customer" subtitle="Score a profile against the model as edited" onClick={() => setTrying(true)} />
      </Group>

      <Group header="Rating thresholds" footer={`Scores run from ${M.scale.min} to ${M.scale.max}.`}>
        <Row title="High above" chevron={false}><Stepper label="High threshold" value={hi} step={0.1} digits={1} min={med + 0.1} max={M.scale.max} onChange={(v) => edit("thresholds.high_above", v)} /></Row>
        <Row title="Medium from" chevron={false}><Stepper label="Medium threshold" value={med} step={0.1} digits={1} min={M.scale.min} max={hi - 0.1} onChange={(v) => edit("thresholds.medium_from", v)} /></Row>
      </Group>

      <Group header="Weights" footer={"Highest risk wins. Weights break ties."}>
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
          onClick={v.status === "active" ? undefined : () => setRestore(v)}
          detail={<Chip tone={v.status === "active" ? "green" : v.status.startsWith("pending") ? "orange" : "gray"}>{sentence(v.status)}</Chip>} chevron={v.status !== "active"} />)}
      </Group>

      <Confirm open={mode !== null} title="Change mode" action={mode === "enforce" ? "Enforce" : "Shadow"} need="admin" onCancel={() => setMode(null)}
        onConfirm={() => { set("cra.mode", mode); say(`CRA in ${mode} mode`); setMode(null); }}
        lines={[`Mode ${effective} to ${mode ?? ""}`, mode === "enforce" ? "Ratings start to act on onboarding and reviews" : "Ratings are recorded only"]} />
      <Confirm open={signing} title="Sign off" action="Sign off" onCancel={() => setSigning(false)}
        onConfirm={() => { if (user.name === maker) { say("The maker can not sign off"); setSigning(false); return; } set("cra.signed", user.name); say(`${cr.model.version} signed off`); setSigning(false); }}
        lines={[cr.model.version, cr.model.note, `Made by ${maker}, signed by ${user.name}`]} />
      <Confirm open={restore !== null} title="Restore version" action="Restore" onCancel={() => setRestore(null)}
        onConfirm={() => { if (!restore) return; set("cra.versions", [{ ...restore, version: `restore of ${restore.version}`, created_by: user.name, created_at: new Date().toISOString(), status: "pending sign off" }, ...versions]); say("Restore saved, pending sign-off"); setRestore(null); }}
        lines={restore ? [restore.version, restore.note, "Saved as a new draft. A second person signs off."] : []} />
      <Sheet open={trying} onClose={() => setTrying(false)} title="Try a customer">
        <Group header="Customer">
          {DIMS.map((d) => <Row key={d} title={M.dimensions[d].label} chevron={false} detail={<PullDown label={M.dimensions[d].label} value={pick[d]}
            options={(M.dimensions[d].categories as Cat[]).map((c) => ({ v: c.key, label: c.label }))} onChange={(v) => setPick({ ...pick, [d]: v })} />} />)}
        </Group>
        {(["tppu", "tppt"] as Score[]).map((sc) => { const r = trial(sc); return (
          <Group key={sc} header={sc === "tppu" ? "TPPU, money laundering" : "TPPT, terror funding"}>
            <Row title="Rating" detail={<Chip tone={r.rating === "High" ? "red" : r.rating === "Medium" ? "orange" : "green"}>{r.rating}</Chip>} chevron={false} />
            <Row title="Score" detail={`${r.v.toFixed(1)} of ${M.scale.max}`} chevron={false} />
            <Row title="Decided by" detail={r.by} chevron={false} />
          </Group>
        ); })}
      </Sheet>
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
