"use client";

// Build paths, the portal's build_paths.html: where each algorithm and CandleTL read their settings. An administrator
// can point an algorithm at a new path. The change goes through a Confirm sheet that lists it.

import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Confirm, Group, NavBar, Row, Sheet } from "@/components/ios";
import bp from "@/data/buildpaths.json";

type Item = { slug: string; label: string; path: string; exists: boolean; env?: string };

export default function BuildPaths() {
  const { get, set, say, guard } = useApp();
  const paths = get<Record<string, string>>("bp.paths", {});
  const [sel, setSel] = useState<Item | null>(null);
  const [draft, setDraft] = useState("");
  const [review, setReview] = useState(false);
  const items: Item[] = [...bp.algorithms.map((a) => ({ ...a })), { slug: "candletl_home", label: "CandleTL home", path: bp.candletl_home.path, exists: bp.candletl_home.exists, env: bp.candletl_home.env_var }];
  const pathOf = (i: Item) => paths[i.slug] ?? i.path;
  const missing = items.filter((a) => !a.exists && !paths[a.slug]).length;
  const row = (a: Item) => {
    const changed = !!paths[a.slug], ok = a.exists || changed;
    return (
      <Row key={a.slug} onClick={() => { if (!guard("admin")) return; setSel(a); setDraft(pathOf(a)); }} icon={ok ? <CircleCheck size={17} strokeWidth={2.4} /> : <CircleX size={17} strokeWidth={2.4} />} tint={ok ? "var(--green)" : "var(--red)"}
        title={a.label} subtitle={<span className="mono wrap">{pathOf(a)}{changed ? " · changed" : ""}</span>} />
    );
  };
  return (
    <>
      <NavBar title="Build paths" eyebrow={missing ? `${missing} missing` : "All found"} back={{ href: "/account/", label: "Account" }} />
      <Group footer="Settings file per algorithm. A missing file runs on defaults.">{items.filter((a) => a.slug !== "candletl_home").map(row)}</Group>
      <Group header="CandleTL home">{row(items[items.length - 1])}</Group>

      <Sheet open={sel !== null && !review} onClose={() => setSel(null)} title={sel?.label ?? "Path"}>
        {sel && (
          <>
            <Group header="Current" footer={sel.exists ? "Found on disk." : "Not found on disk."}><Row title={<span className="mono wrap">{pathOf(sel)}</span>} chevron={false} /></Group>
            <Group header="New path"><label className="field"><input value={draft} onChange={(e) => setDraft(e.target.value)} autoCapitalize="none" spellCheck={false} className="mono" aria-label="New path" /></label></Group>
            <button className={`btn btn-blue wide ${draft.trim() && draft.trim() !== pathOf(sel) ? "" : "btn-locked"}`} disabled={!draft.trim() || draft.trim() === pathOf(sel)} onClick={() => setReview(true)}>Save path</button>
          </>
        )}
      </Sheet>
      <Confirm need="admin" open={review} title="Save path" action="Save" onCancel={() => setReview(false)}
        onConfirm={() => { if (sel) { set("bp.paths", { ...paths, [sel.slug]: draft.trim() }); say(`${sel.label} path saved`); } setReview(false); setSel(null); }}
        lines={sel ? [sel.label, `From ${pathOf(sel)}`, `To ${draft.trim()}`, "Takes effect on the next restart of the algorithm"] : []} />
    </>
  );
}
