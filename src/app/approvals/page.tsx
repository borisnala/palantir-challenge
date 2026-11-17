"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { SecHead } from "@/components/ui";
import { DECISIONS_TODAY, money } from "@/lib/data";

export default function Approvals() {
  const { pending, decided, decide, undo } = useApp();
  const [open, setOpen] = useState<string | null>(pending[0]?.id ?? null);

  return (
    <>
      <header className="titlebar">
        <div>
          <p className="eyebrow">Withdrawal screening</p>
          <h1>Approvals</h1>
        </div>
        <span className="shadow-pill"><i />Shadow mode</span>
      </header>

      <section className="stats4" aria-label="Decisions today">
        <div className="stat"><span className="eyebrow">Auto</span><strong>{DECISIONS_TODAY.auto}</strong></div>
        <div className="stat"><span className="eyebrow">Manual</span><strong>{DECISIONS_TODAY.manual + decided.length}</strong></div>
        <div className="stat"><span className="eyebrow">Fail safe</span><strong>{DECISIONS_TODAY.failSafe}</strong></div>
        <div className="stat"><span className="eyebrow">Median</span><strong>{DECISIONS_TODAY.medianSeconds}s</strong></div>
      </section>

      <section className="section">
        <SecHead title="Waiting for you" count={pending.length} />
        {pending.length === 0 && <p className="clear">All withdrawals are decided. New requests show up here.</p>}
        {pending.map((w) => {
          const isOpen = open === w.id;
          const flags = w.reasons.filter((r) => r.level === "flag").length;
          return (
            <article key={w.id} className={`wd card ${isOpen ? "wd-open" : ""}`}>
              <button className="wd-head" onClick={() => setOpen(isOpen ? null : w.id)} aria-expanded={isOpen}>
                <span className="stack">
                  <span className="wd-amount">{money(w.amount)}</span>
                  <span className="muted">#{w.login} · {w.headline}</span>
                </span>
                <span className="stack right">
                  <span className="tag tag-escalated">{flags} {flags === 1 ? "flag" : "flags"}</span>
                  <span className="small">{w.requested}</span>
                </span>
              </button>
              {isOpen && (
                <>
                  <ul className="reasons">
                    {w.reasons.map((r) => (
                      <li key={r.code} className={r.level}>
                        <span className="code">{r.code}</span>
                        <span>{r.text}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/clients/`} className="plainbtn">Open the client profile</Link>
                  <div className="pair">
                    <button className="soft danger" onClick={() => decide(w.id, "rejected")}>Reject</button>
                    <button className="fill" onClick={() => { decide(w.id, "approved"); setOpen(pending.find((p) => p.id !== w.id)?.id ?? null); }}>Approve</button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </section>

      {decided.length > 0 && (
        <section className="section">
          <SecHead title="Decided by you" count={decided.length} />
          <div className="group">
            {decided.map((w) => (
              <div key={w.id} className="row">
                <span className="stack"><span className="strong">{money(w.amount)} · #{w.login}</span><span className={`small ${w.decision === "approved" ? "pos" : "neg"}`}>{w.decision === "approved" ? "Approved" : "Rejected"}</span></span>
                <button className="plainbtn" onClick={() => undo(w.id)}>Undo</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
