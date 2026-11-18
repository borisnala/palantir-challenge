"use client";

import { useState } from "react";
import { Activity, ArrowDownUp, ScanSearch } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, Metrics, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { PageRow } from "@/components/rows";
import { WdDetail, decisionChip } from "@/components/wd";
import wd from "@/data/withdrawals.json";
import { money, when } from "@/lib/data";

type F = "waiting" | "decided" | "auto";

export default function Withdrawals() {
  const { wdRows, pending, decide, undo, decisionOf, say } = useApp();
  const [f, setF] = useState<F>("waiting");
  const [sel, setSel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const r = wdRows.find((x) => x.request_id === sel) ?? null;
  const list = wdRows.filter((x) => (f === "waiting" ? x.status === "pending" : f === "decided" ? x.status === "approved" || x.status === "rejected" : x.status === "auto"));
  const warn = wd.health.checks.filter((c) => c.status !== "ok").length;

  const act = (d: "approved" | "rejected") => {
    if (!r) return;
    decide(r.request_id, d);
    say(`${money(r.amount)} for #${r.ta_id} ${d}`);
    setOpen(false);
  };

  return (
    <>
      <NavBar title="WD Approvals" eyebrow="Withdrawal screening" root />

      <Metrics label="Today" items={[
        { k: "Pending", v: pending.length, tone: pending.length ? "warn" : undefined },
        { k: "Auto", v: wdRows.filter((x) => x.status === "auto").length },
        { k: "Approved", v: wdRows.filter((x) => x.status === "approved").length, tone: "pos" },
        { k: "Rejected", v: wdRows.filter((x) => x.status === "rejected").length, tone: "neg" },
      ]} />

      <Group footer={wd.mode === "shadow" ? "Shadow mode. The screener records its recommendation and Risk makes the final decision. No payouts are executed from this app." : undefined}>
        <PageRow href="/withdrawals/check/" Icon={ScanSearch} tint="var(--blue)" title="WD Check" sub="Pre-screen an account before it requests a withdrawal" />
        <PageRow href="/withdrawals/health/" Icon={Activity} tint={warn ? "var(--orange)" : "var(--green)"} title="System health"
          sub={`${wd.health.checks.length} checks, ${warn} need attention`} />
      </Group>

      <Segmented label="Requests" value={f} onChange={setF} options={[{ v: "waiting", label: `Pending ${pending.length}` }, { v: "decided", label: "Decided" }, { v: "auto", label: "Auto" }]} />

      <Group>
        {list.length === 0 && <Row title="No requests" subtitle="New requests appear as the CRM submits them." chevron={false} />}
        {list.map((x) => (
          <Row key={x.request_id} onClick={() => { setSel(x.request_id); setOpen(true); }} icon={<ArrowDownUp size={17} strokeWidth={2.4} />}
            tint={x.status === "pending" ? "var(--orange)" : x.status === "rejected" ? "var(--red)" : x.status === "approved" ? "var(--green)" : "var(--blue)"}
            title={<span className="num">{money(x.amount)}</span>} subtitle={`#${x.ta_id} · ${(x.reason_code ?? "").replace(/_/g, " ").toLowerCase()}${x.flags?.length ? ` · ${x.flags.length} flags` : ""}`}
            detail={<span className="stack-r">{decisionChip(x)}{x.decided_at && <span className="small">{when(x.decided_at)}</span>}</span>} />
        ))}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title={r?.request_id ?? "Request"}>
        {r && (
          <>
            <WdDetail r={r} />
            {r.status === "pending" && (
              <div className="sheet-actions">
                <button className="btn btn-gray" onClick={() => act("rejected")}><span className="neg">Reject</span></button>
                <button className="btn btn-blue" onClick={() => act("approved")}>Approve</button>
              </div>
            )}
            {decisionOf(r.request_id) && (
              <button className="btn btn-gray" onClick={() => { undo(r.request_id); say("Decision reverted"); }}>Revert decision</button>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
