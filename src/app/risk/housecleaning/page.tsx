"use client";

import { useState } from "react";
import { FolderTree } from "lucide-react";
import { useApp } from "@/components/app-state";
import { BarButton, Chip, Confirm, Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import hc from "@/data/housecleaning.json";
import { sentence, when } from "@/lib/data";

type F = "review" | "cutlist" | "active" | "all";
type G = (typeof hc.groups)[number];
const STATUS: Record<string, [string, "red" | "orange" | "green" | "gray" | "blue"]> = {
  CUTLIST_EMPTY_REVIEW: ["Empty, review", "orange"], CUTLIST_UNKNOWN_HISTORY: ["No history", "orange"],
  REINSTATE_RECENT_ACTIVITY: ["Reinstate", "red"], REINSTATE_CUTLIST_ACTIVE: ["Reinstate", "red"],
  ACTIVE_DIRECT: ["Active", "green"], ACTIVE_STRUCTURAL: ["Has subgroups", "blue"], EMPTY_NOT_CUTLISTED: ["Empty", "gray"],
};
const path = (p: string) => p.replace(/\\/g, " / ");

export default function HouseCleaning() {
  const { get, set, say } = useApp();
  const [f, setF] = useState<F>("review");
  const [sel, setSel] = useState<G | null>(null);
  const [open, setOpen] = useState(false);
  const [dry, setDry] = useState(false);
  const cut = get<Record<string, boolean>>("hc.cut", {});
  const snap = get<string>("hc.snapshot", hc.snapshot);
  const isCut = (g: G) => cut[g.group_path] ?? g.cutlisted;
  const list = hc.groups.filter((g) => f === "all" ? true : f === "cutlist" ? isCut(g) : f === "active" ? g.status.startsWith("ACTIVE") : g.status.startsWith("REINSTATE") || g.status.startsWith("CUTLIST"));
  const deletable = hc.groups.filter((g) => isCut(g) && g.group_path.startsWith(hc.config.delete_allow_prefix));
  const s = hc.summary;

  const toggleCut = (g: G) => {
    const v = !isCut(g);
    set("hc.cut", { ...cut, [g.group_path]: v });
    say(v ? "Added to the cutlist" : "Removed from the cutlist");
    setOpen(false);
  };

  return (
    <>
      <NavBar title="HouseCleaning" eyebrow={`Snapshot ${when(snap)} UTC`} back={{ href: "/risk/", label: "Risk Management" }}
        trailing={<BarButton onClick={() => { set("hc.snapshot", new Date().toISOString()); say("Snapshot refreshed"); }}>Refresh</BarButton>} />

      <Metrics label="Groups" items={[{ k: "Groups", v: s.total_groups }, { k: "Cutlist", v: hc.groups.filter(isCut).length }, { k: "Reinstate", v: s.reinstate, tone: "neg" }, { k: "Review", v: s.cutlist_empty_review + s.cutlist_unknown, tone: "warn" }]} />

      {hc.alerts.length > 0 && (
        <Group header="Requires review">
          {hc.alerts.map((a) => <Row key={a.alert_key} title={path(a.group_path)} subtitle={a.code === "REINSTATE_CUTLIST" ? "On the cutlist but has accounts again" : a.code.replace(/_/g, " ").toLowerCase()} detail={<Chip tone="red">Alert</Chip>} chevron={false} />)}
        </Group>
      )}

      <Segmented label="Show" value={f} onChange={setF} options={[{ v: "review", label: "Review" }, { v: "cutlist", label: "Cutlist" }, { v: "active", label: "Active" }, { v: "all", label: "All" }]} />

      <Group>
        {list.map((g) => {
          const [label, tone] = STATUS[g.status] ?? [g.status, "gray"];
          return <Row key={g.group_path} onClick={() => { setSel(g); setOpen(true); }} icon={<FolderTree size={17} strokeWidth={2.4} />} tint={isCut(g) ? "var(--orange)" : "var(--gray)"}
            title={path(g.group_path)} subtitle={`${g.direct_accounts} accounts · ${g.descendant_accounts} below`} detail={<Chip tone={tone}>{label}</Chip>} />;
        })}
      </Group>

      <Group header="Delete" footer={`Only groups under ${hc.config.delete_allow_prefix.replace(/\\/g, " / ")} can be deleted, ${hc.config.delete_max_rows} at a time, test server only.`}>
        <Row onClick={() => setDry(true)} title={<span className="link">Dry run</span>} subtitle={`${deletable.length} cutlisted ${deletable.length === 1 ? "group matches" : "groups match"}`} />
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title="Group">
        {sel && (
          <>
            <div className="sheet-hero"><b className="contact-name wrap">{path(sel.group_path)}</b><Chip tone={(STATUS[sel.status] ?? ["", "gray"])[1]}>{(STATUS[sel.status] ?? [sel.status])[0]}</Chip></div>
            <Group>
              <Row title="Accounts in this group" detail={sel.direct_accounts} />
              <Row title="Accounts below it" detail={sel.descendant_accounts} />
              <Row title="Last activity" detail={sel.last_activity_at ? when(sel.last_activity_at) : "Unknown"} />
              <Row title="Activity source" detail={sentence(sel.last_activity_source.replace(/^CFG_/, "Config "))} />
              <Row title="On the cutlist" detail={isCut(sel) ? "Yes" : "No"} />
            </Group>
            <button className={`btn ${isCut(sel) ? "btn-gray" : "btn-blue"}`} onClick={() => toggleCut(sel)}>{isCut(sel) ? "Remove from cutlist" : "Add to cutlist"}</button>
          </>
        )}
      </Sheet>

      <Confirm open={dry} title="Dry run" action="Done" onCancel={() => setDry(false)} onConfirm={() => setDry(false)}
        lines={deletable.length ? deletable.map((g) => `Would delete ${path(g.group_path)}`) : ["No cutlisted group is under the test prefix, so nothing would be deleted."]} />
    </>
  );
}
