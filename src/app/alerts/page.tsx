"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { ALERTS, ago, findClient } from "@/lib/data";

const FILTERS = ["all", "critical", "warn", "info"] as const;
const LABEL = { all: "All", critical: "Critical", warn: "Warning", info: "Info" };

export default function Alerts() {
  const { unread, markRead } = useApp();
  const [f, setF] = useState<(typeof FILTERS)[number]>("all");
  const list = ALERTS.filter((a) => f === "all" || a.severity === f);

  return (
    <>
      <header className="titlebar">
        <div>
          <p className="eyebrow">{unread.size} unread</p>
          <h1>Alerts</h1>
        </div>
        {unread.size > 0 && <button className="plainbtn" onClick={() => markRead()}>Mark all read</button>}
      </header>

      <div className="chips" role="tablist" aria-label="Severity">
        {FILTERS.map((x) => (
          <button key={x} role="tab" aria-selected={f === x} className={`chip ${f === x ? "chip-on" : ""}`} onClick={() => setF(x)}>{LABEL[x]}</button>
        ))}
      </div>

      <div className="group">
        {list.map((a) => {
          const c = findClient(a.login);
          const isNew = unread.has(a.id);
          return (
            <Link key={a.id} href={c ? `/clients/${a.login}/` : "/clients/"} className="row alert" onClick={() => markRead(a.id)}>
              <span className={`sev sev-${a.severity}`} aria-label={LABEL[a.severity]} />
              <span className="stack">
                <span className={isNew ? "strong" : ""}>{a.title}</span>
                <span className="muted">{c?.name ?? "Account"} #{a.login} · {a.detail}</span>
              </span>
              <span className="stack right"><span className="small">{ago(a.minutesAgo)}</span>{isNew && <i className="dot" aria-label="Unread" />}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
