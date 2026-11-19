"use client";

import { useState } from "react";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { Chip, Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { Share } from "@/components/ui";
import cr from "@/data/cra.json";
import { sentence, when } from "@/lib/data";

type O = "all" | "High" | "Medium" | "Low";
type A = (typeof cr.recent)[number];
const tone = (r: string) => (r === "High" ? "red" : r === "Medium" ? "orange" : "green") as "red" | "orange" | "green";

export default function CraAnalysis() {
  const [o, setO] = useState<O>("all");
  const [sel, setSel] = useState<A | null>(null);
  const [open, setOpen] = useState(false);
  const s = cr.stats;
  const latest = s.latest_per_customer;
  const list = cr.recent.filter((a) => o === "all" || a.overall === o);

  return (
    <>
      <NavBar title="CRA Analysis" eyebrow="Customer risk assessments" back={{ href: "/risk/", label: "Risk Management" }} />
      <Metrics label="Assessments" items={[{ k: "Assessments", v: s.assessments }, { k: "Customers", v: latest.customers }, { k: "High", v: latest.overall.High, tone: "neg" }, { k: "Provisional", v: latest.provisional, tone: "warn" }]} />

      <Group header="Latest rating per customer">
        {(["High", "Medium", "Low"] as const).map((r) => <Row key={r} title={<span className="row-text">{r}<Share v={latest.overall[r]} of={latest.customers} tone={`var(--${tone(r)})`} /></span>} detail={latest.overall[r]} chevron={false} />)}
      </Group>

      <Group footer={`${cr.verify?.rows ?? 0} rows in the audit chain.`}>
        <Row icon={<ShieldCheck size={17} strokeWidth={2.4} />} tint={cr.verify?.intact ? "var(--green)" : "var(--red)"} title="Audit chain" detail={cr.verify?.intact ? "Intact" : "Broken"} chevron={false} />
      </Group>

      <Segmented label="Rating" value={o} onChange={setO} options={[{ v: "all", label: "All" }, { v: "High", label: "High" }, { v: "Medium", label: "Medium" }, { v: "Low", label: "Low" }]} />
      <Group header={`Recent · ${list.length}`}>
        {list.map((a) => (
          <Row key={a.request_id} onClick={() => { setSel(a); setOpen(true); }} icon={<FileCheck2 size={17} strokeWidth={2.4} />} tint={`var(--${tone(a.overall)})`}
            title={a.customer_id} subtitle={`${a.trigger.replace(/_/g, " ")} · ${when(a.assessed_at)}`}
            detail={<span className="stack-r"><Chip tone={tone(a.overall)}>{a.overall}</Chip>{a.edd_required && <span className="small">EDD</span>}</span>} />
        ))}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title={sel?.request_id ?? "Assessment"}>
        {sel && (
          <>
            <div className="sheet-hero"><span className="eyebrow">{sel.customer_id} · {when(sel.assessed_at)}</span><b className="contact-name">{sel.overall} risk</b>{sel.provisional && <Chip tone="orange">Provisional</Chip>}</div>
            <Group header="Scores">
              <Row title="TPPU, money laundering" subtitle={`from ${sel.tppu.basis.replace(/_/g, " ")}${sel.tppu.overridden ? ", overridden" : ""}`} detail={<span className="stack-r"><Chip tone={tone(sel.tppu.rating)}>{sel.tppu.rating}</Chip><span className="small">{sel.tppu.score}</span></span>} chevron={false} />
              <Row title="TPPT, terror funding" subtitle={`from ${sel.tppt.basis.replace(/_/g, " ")}${sel.tppt.overridden ? ", overridden" : ""}`} detail={<span className="stack-r"><Chip tone={tone(sel.tppt.rating)}>{sel.tppt.rating}</Chip><span className="small">{sel.tppt.score}</span></span>} chevron={false} />
            </Group>
            <Group header="Assessment">
              <Row title="Trigger" detail={sentence(sel.trigger)} chevron={false} />
              <Row title="Enhanced due diligence" detail={sel.edd_required ? "Required" : "Not needed"} chevron={false} />
              <Row title="Mode" detail={sel.mode} chevron={false} />
              <Row title="Model version" detail={sel.config_version} chevron={false} />
              {sel.flags.map((f) => <Row key={f} title={sentence(f.replace(/:/g, ", "))} chevron={false} />)}
            </Group>
            {sel.previous && (
              <Group header="Before">
                <Row title="Previous rating" detail={<Chip tone={tone(sel.previous.overall)}>{sel.previous.overall}</Chip>} chevron={false} />
                <Row title="What changed" detail={sel.previous.changed.join(", ")} chevron={false} />
                <Row title="Assessed" detail={when(sel.previous.assessed_at)} chevron={false} />
              </Group>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
