"use client";

import { useState } from "react";
import { CircleAlert, Info, Wallet } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row, Sheet } from "@/components/ios";
import { DECISIONS_TODAY, WITHDRAWALS, money } from "@/lib/data";

export default function Approvals() {
  const { pending, decided, decide, undo } = useApp();
  // selId stays set while the sheet slides out, so its content does not vanish mid-animation.
  const [selId, setSelId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const w = WITHDRAWALS.find((p) => p.id === selId) ?? null;
  const show = (id: string) => { setSelId(id); setOpen(true); };
  const act = (d: "approved" | "rejected") => { if (w) decide(w.id, d); setOpen(false); };

  return (
    <>
      <NavBar title="Approvals" eyebrow="Withdrawal screening" tone="orange" />

      <div className="metrics" aria-label="Decisions today">
        <div><span>Auto</span><b>{DECISIONS_TODAY.auto}</b></div>
        <div><span>Manual</span><b>{DECISIONS_TODAY.manual + decided.length}</b></div>
        <div><span>Fail safe</span><b>{DECISIONS_TODAY.failSafe}</b></div>
        <div><span>Median</span><b>{DECISIONS_TODAY.medianSeconds}<small>s</small></b></div>
      </div>

      <Group header={`Waiting for you · ${pending.length}`} footer="Shadow mode is on. Decisions are logged and nothing is paid out.">
        {pending.length === 0 && <Row title="All decided" subtitle="New requests show up here." chevron={false} />}
        {pending.map((p) => {
          const flags = p.reasons.filter((r) => r.level === "flag").length;
          return (
            <Row key={p.id} onClick={() => show(p.id)} icon={<Wallet size={17} strokeWidth={2.4} />} tint="var(--orange)"
              title={<span className="num">{money(p.amount)}</span>} subtitle={`#${p.login} · ${p.headline}`}
              detail={<span className="stack-r"><span>{p.requested}</span><span className="flagcount">{flags} {flags === 1 ? "flag" : "flags"}</span></span>} />
          );
        })}
      </Group>

      {decided.length > 0 && (
        <Group header="Decided by you">
          {decided.map((d) => (
            <Row key={d.id} title={<span className="num">{money(d.amount)}</span>} subtitle={`#${d.login}`} chevron={false}
              detail={<span className="decided"><span className={d.decision === "approved" ? "pos" : "neg"}>{d.decision === "approved" ? "Approved" : "Rejected"}</span><button className="textbtn" onClick={() => undo(d.id)}>Undo</button></span>} />
          ))}
        </Group>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Withdrawal">
        {w && (
          <>
            <div className="sheet-hero">
              <span className="eyebrow">#{w.login} · requested {w.requested}</span>
              <b className="hero-amount num">{money(w.amount)}</b>
              <span className="row-sub">{w.headline}</span>
            </div>
            <Group header="Why it was flagged">
              {w.reasons.map((r) => (
                <Row key={r.code} chevron={false}
                  icon={r.level === "flag" ? <CircleAlert size={17} strokeWidth={2.4} /> : <Info size={17} strokeWidth={2.4} />}
                  tint={r.level === "flag" ? "var(--red)" : "var(--gray)"} title={r.code} subtitle={r.text} />
              ))}
            </Group>
            <Group>
              <Row href="/clients/" title={<span className="link">Open client profile</span>} />
            </Group>
            <div className="sheet-actions">
              <button className="btn btn-gray" onClick={() => act("rejected")}><span className="neg">Reject</span></button>
              <button className="btn btn-blue" onClick={() => act("approved")}>Approve</button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
