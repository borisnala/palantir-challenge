"use client";

import { MonitorSmartphone } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Chip, Group, NavBar, Row } from "@/components/ios";
import us from "@/data/users.json";
import { when } from "@/lib/data";

type D = (typeof us.pending)[number];

export default function Devices() {
  const { get, set, say, guard } = useApp();
  const decided = get<Record<number, string>>("dev.decided", {});
  const decide = (d: D, s: "approved" | "denied") => { if (!guard("admin")) return; set("dev.decided", { ...decided, [d.id]: s }); say(`${d.label} ${s}`); };
  const waiting = us.pending.filter((d) => !decided[d.id]);
  const done = [...us.pending.filter((d) => decided[d.id]).map((d) => ({ ...d, status: decided[d.id], decided_by: "demo.admin", decided_at: new Date().toISOString() })), ...us.decided];

  return (
    <>
      <NavBar title="Device access" eyebrow={`${waiting.length} waiting`} back={{ href: "/account/", label: "Account" }} />
      {waiting.length === 0 && <Group><Row title="No pending device requests" chevron={false} /></Group>}
      {waiting.map((d) => (
        <Group key={d.id} header={d.label} footer={`First seen from ${d.first_ip} on ${when(d.created_at)}.`}>
          <Row icon={<MonitorSmartphone size={17} strokeWidth={2.4} />} tint="var(--orange)" title={d.purpose} subtitle={d.user_agent} chevron={false} />
          <div className="sheet-actions inset">
            <button className="btn btn-gray" onClick={() => decide(d, "denied")}><span className="neg">Deny</span></button>
            <button className="btn btn-blue" onClick={() => decide(d, "approved")}>Approve</button>
          </div>
        </Group>
      ))}
      <Group header="Decided">
        {done.map((d) => <Row key={d.id} title={d.label} subtitle={`${d.purpose}${d.decided_by ? ` · by ${d.decided_by}` : ""}`} detail={<Chip tone={d.status === "approved" ? "green" : d.status === "denied" ? "red" : "gray"}>{d.status}</Chip>} chevron={false} />)}
      </Group>
    </>
  );
}
