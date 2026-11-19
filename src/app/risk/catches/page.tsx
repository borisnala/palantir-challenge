"use client";

import { useState } from "react";
import { Crosshair, Gauge, NotebookPen, Rocket, Zap } from "lucide-react";
import { Chip, Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import ca from "@/data/catches.json";
import { ago, group, nameOf, sentence } from "@/lib/data";

type A = "all" | "mg" | "scalper" | "fbu" | "etl" | "journal";
const LABEL: Record<string, string> = { mg: "MachineGun", scalper: "ScalperAM", fbu: "FBUv2", etl: "Equity traffic light", journal: "MT5 journal" };
const ICON = { mg: Zap, scalper: Gauge, fbu: Rocket, etl: Crosshair, journal: NotebookPen } as const;
const TINT: Record<string, string> = { mg: "var(--red)", scalper: "var(--orange)", fbu: "var(--purple)", etl: "var(--green)", journal: "var(--gray)" };
const login = (acc: number) => 99000000 + acc;
type K = (typeof ca)[number];

const KINDS: Record<string, string> = { mg: "MachineGun", etl: "ETL", scalper: "ScalperAM", auto_direct: "Auto direct", promote: "Promote", manual: "Manual", intraday: "Intraday", other: "Other" };
const kindLabel = (k: string) => KINDS[k] ?? sentence(k);

export default function Catches() {
  const [a, setA] = useState<A>("all");
  const [sel, setSel] = useState<K | null>(null);
  const [open, setOpen] = useState(false);
  const list = ca.filter((x) => a === "all" || x.algo === a).sort((x, y) => (x.seen_ago_min ?? 0) - (y.seen_ago_min ?? 0));
  const count = (k: string) => ca.filter((x) => x.algo === k).length;

  return (
    <>
      <NavBar title="Catches" eyebrow="Today, most recent first" back={{ href: "/risk/", label: "Risk Management" }} />
      <Metrics label="By algorithm" items={[{ k: "MG", v: count("mg") }, { k: "Scalper", v: count("scalper") }, { k: "FBU", v: count("fbu") }, { k: "ETL", v: count("etl") }]} />
      <Segmented label="Algorithm" value={a} onChange={setA} options={[{ v: "all", label: "All" }, { v: "mg", label: "MG" }, { v: "scalper", label: "SC" }, { v: "fbu", label: "FBU" }, { v: "etl", label: "ETL" }, { v: "journal", label: "Log" }]} />
      <Group>
        {list.map((x, i) => {
          const I = ICON[x.algo as keyof typeof ICON] ?? Crosshair;
          return (
            <Row key={i} onClick={() => { setSel(x); setOpen(true); }} icon={<I size={17} strokeWidth={2.4} />} tint={TINT[x.algo]}
              title={nameOf(login(x.acc))} subtitle={x.reason ?? `${group(x.from_group)} to ${group(x.to_group)}`}
              detail={<span className="stack-r"><span className="small">{x.seen_ago_min !== null && x.seen_ago_min !== undefined ? ago(x.seen_ago_min) : ""}</span><Chip>{kindLabel(x.kind)}</Chip></span>} />
          );
        })}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title={sel ? LABEL[sel.algo] : "Catch"}>
        {sel && (
          <>
            <Group><ClientRow login={login(sel.acc)} /></Group>
            <Group header="Event details">
              <Row title="Kind" detail={kindLabel(sel.kind)} />
              <Row title="From" detail={group(sel.from_group)} />
              <Row title="To" detail={group(sel.to_group)} />
              {sel.reason && <Row title={<span className="wrap">{sel.reason}</span>} chevron={false} />}
              {sel.tpl && <Row title="Template" detail={sel.tpl} />}
              {sel.journal_actor && <Row title="Performed by" detail={`${sel.journal_actor}${sel.journal_by ? ` #${sel.journal_by}` : ""}`} />}
            </Group>
          </>
        )}
      </Sheet>
    </>
  );
}
