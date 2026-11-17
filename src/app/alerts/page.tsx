"use client";

import { useState } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row, Segmented } from "@/components/ios";
import { ALERTS, ago, findClient } from "@/lib/data";

type F = "all" | "critical" | "warn" | "info";
const OPTS: { v: F; label: string }[] = [{ v: "all", label: "All" }, { v: "critical", label: "Critical" }, { v: "warn", label: "Warning" }, { v: "info", label: "Info" }];
const TINT = { critical: "var(--red)", warn: "var(--orange)", info: "var(--gray)" };
const ICON = { critical: CircleAlert, warn: TriangleAlert, info: Info };

export default function Alerts() {
  const { unread, markRead } = useApp();
  const [f, setF] = useState<F>("all");
  const list = ALERTS.filter((a) => f === "all" || a.severity === f);

  return (
    <>
      <NavBar title="Alerts" eyebrow={`${unread.size} unread`}
        trailing={unread.size > 0 ? <button className="textbtn" onClick={() => markRead()}>Read All</button> : null} />

      <Segmented label="Severity" value={f} options={OPTS} onChange={setF} />

      <Group className="mail">
        {list.map((a) => {
          const c = findClient(a.login);
          return (
            <Row key={a.id} href={c ? `/clients/${a.login}/` : "/clients/"} onClick={() => markRead(a.id)} unread={unread.has(a.id)}
              icon={(() => { const I = ICON[a.severity]; return <I size={17} strokeWidth={2.4} aria-label={a.severity} />; })()} tint={TINT[a.severity]}
              title={<span className="mail-top"><span className={unread.has(a.id) ? "strong" : ""}>{a.title}</span><span className="mail-time">{ago(a.minutesAgo)}</span></span>}
              subtitle={`${c?.name ?? "Account"} #${a.login} · ${a.detail}`} />
          );
        })}
      </Group>
    </>
  );
}
