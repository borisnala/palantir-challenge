"use client";

// One withdrawal request in full: the checks the screener ran, the flags it found, the client family. Shared by the
// approvals queue and WD Check, so both show a request the same way.

import { CircleAlert, CircleCheck, CircleX, Info } from "lucide-react";
import { Chip, Group, Row, useSheetPush } from "./ios";
import { ClientRow } from "./rows";
import { group, money, when } from "@/lib/data";

type Check = { name: string; status: string; detail: string; source?: string; ms?: number };
type Flag = { login: number; label: string; at: string; detail: string; source: string; info: boolean };
export type WdLike = {
  request_id: string; ta_id: number; client_id?: string | null; decision?: string; reason_code?: string; reasons?: string[];
  checks?: Check[]; elapsed_ms?: number; status?: string; amount?: number | null; bank_masked?: string | null;
  flags?: Flag[]; history_flags?: Flag[]; family?: { client_id: string; logins: number[]; groups: Record<string, string | undefined>; complete: boolean } | null;
};

const CHECK_ICON = {
  ok: [CircleCheck, "var(--green)"], flag: [CircleAlert, "var(--red)"], warn: [CircleAlert, "var(--orange)"],
  error: [CircleX, "var(--red)"], skip: [Info, "var(--gray)"],
} as const;

export const decisionChip = (r: WdLike) => {
  if (r.status === "approved") return <Chip tone="green">Approved</Chip>;
  if (r.status === "rejected") return <Chip tone="red">Rejected</Chip>;
  if (r.status === "auto") return <Chip tone="blue">Auto approved</Chip>;
  if (r.status === "preview") return <Chip tone={r.decision === "AUTO" ? "green" : "orange"}>{r.decision === "AUTO" ? "Auto approval" : "Manual review"}</Chip>;
  return <Chip tone="orange">Pending review</Chip>;
};

export function WdDetail({ r }: { r: WdLike }) {
  const push = useSheetPush();
  const flags = r.flags ?? r.history_flags ?? [];
  return (
    <>
      <div className="sheet-hero">
        <span className="eyebrow">#{r.ta_id}{r.client_id ? ` · ${r.client_id}` : ""}</span>
        {r.amount ? <b className="hero-amount num">{money(r.amount)}</b> : <b className="hero-amount">Check</b>}
        {decisionChip(r)}
        {r.bank_masked && <span className="row-sub">To bank account {r.bank_masked}</span>}
      </div>

      {r.reasons && r.reasons.length > 0 && (
        <Group header="Reasons">
          {r.reasons.map((x, i) => <Row key={i} title={<span className="wrap">{x}</span>} chevron={false} />)}
        </Group>
      )}

      {r.checks && (
        <Group className="timeline" header={`${r.checks.length} checks completed in ${r.elapsed_ms ?? 0} ms`}>
          {r.checks.map((c) => {
            const [Icon, tint] = CHECK_ICON[(c.status as keyof typeof CHECK_ICON)] ?? CHECK_ICON.skip;
            const name = c.name[0].toUpperCase() + c.name.slice(1);
            return <Row key={c.name} icon={<Icon size={17} strokeWidth={2.4} />} tint={tint} title={name} subtitle={<span className="wrap">{c.detail}</span>}
              onClick={push ? () => push(name, (
                <Group header="Check">
                  <Row title="Result" detail={<Chip tone={c.status === "ok" ? "green" : c.status === "flag" || c.status === "error" ? "red" : "orange"}>{c.status}</Chip>} chevron={false} />
                  <Row title="Source" detail={c.source ?? "Not recorded"} chevron={false} />
                  <Row title="Duration" detail={c.ms !== undefined ? `${c.ms} ms` : "Not recorded"} chevron={false} />
                  <Row title={<span className="wrap">{c.detail}</span>} chevron={false} />
                </Group>
              )) : undefined} />;
          })}
        </Group>
      )}

      {flags.length > 0 && (
        <Group header={`Flags in the last 14 days · ${flags.length}`}>
          {flags.map((f, i) => (
            <Row key={i} icon={f.info ? <Info size={17} strokeWidth={2.4} /> : <CircleAlert size={17} strokeWidth={2.4} />}
              tint={f.info ? "var(--gray)" : "var(--red)"} title={`${f.label} on #${f.login}`}
              subtitle={<span className="wrap">{f.detail}</span>} detail={when(f.at)}
              onClick={push ? () => push(`${f.label} on #${f.login}`, (
                <>
                  <Group header="Flag">
                    <Row title="Detection" detail={f.label} chevron={false} />
                    <Row title="Account" detail={`#${f.login}`} chevron={false} />
                    <Row title="Time" detail={when(f.at)} chevron={false} />
                    <Row title="Source" detail={f.source} chevron={false} />
                    <Row title="Severity" detail={f.info ? "Information" : "Flag"} chevron={false} />
                  </Group>
                  <Group header="Detail"><Row title={<span className="wrap">{f.detail}</span>} chevron={false} /></Group>
                  <Group><ClientRow login={f.login} /></Group>
                </>
              )) : undefined} />
          ))}
        </Group>
      )}

      {r.family && (
        <Group header={`Client family · ${r.family.client_id}`} footer={r.family.complete ? "Every login of this client is listed." : "The family index may be missing logins."}>
          {r.family.logins.map((l) => <ClientRow key={l} login={l} sub={`#${l} · ${group(r.family!.groups[String(l)])}`} />)}
        </Group>
      )}
    </>
  );
}
