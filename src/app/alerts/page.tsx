"use client";

import { useState } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { useApp } from "@/components/app-state";
import { BarButton, Group, NavBar, Row, Segmented } from "@/components/ios";
import { ALERTS, ago, hasProfile, nameOf } from "@/lib/data";

type F = "all" | "critical" | "warn" | "info";
const OPTS: { v: F; label: string }[] = [{ v: "all", label: "All" }, { v: "critical", label: "Critical" }, { v: "warn", label: "Warning" }, { v: "info", label: "Info" }];
const TINT = { critical: "var(--red)", warn: "var(--orange)", info: "var(--gray)" };
const ICON = { critical: CircleAlert, warn: TriangleAlert, info: Info };

export default function Alerts() {
  const { unread, markRead, say } = useApp();
  const [f, setF] = useState<F>("all");
  const list = ALERTS.filter((a) => f === "all" || a.severity === f);

  return (
    <>
      <NavBar title="Alerts" eyebrow={`${unread.size} unread`} back={{ href: "/", label: "Today" }}
        trailing={unread.size > 0 ? <BarButton onClick={() => { markRead(); say("All alerts marked read"); }}>Read All</BarButton> : null} />

      <Segmented label="Severity" value={f} options={OPTS} onChange={setF} />

      <Group className="mail" footer="The same alerts also go to the desk on WhatsApp.">
        {list.map((a) => {
          const I = ICON[a.severity];
          return (
            <Row key={a.id} href={hasProfile(a.login) ? `/clients/${a.login}/` : undefined} onClick={() => markRead(a.id)} unread={unread.has(a.id)}
              icon={<I size={17} strokeWidth={2.4} />} tint={TINT[a.severity]}
              title={<span className="mail-top"><span className={unread.has(a.id) ? "strong" : ""}>{a.title}</span><span className="mail-time">{ago(a.minutesAgo)}</span></span>}
              subtitle={`${nameOf(a.login)} #${a.login} · ${a.detail}`} />
          );
        })}
      </Group>
    </>
  );
}
