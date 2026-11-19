"use client";

// Notifications as iOS Mail (owner 2026-11-19, "make all this Apple layout"): the unread dot in the margin, the alert as
// the bold first line with its time and chevron, the client on the second line, the detail under it.

import Link from "next/link";
import { useState } from "react";
import { BellRing, ChevronRight, CircleAlert, Copy, Info, ListFilter, TriangleAlert } from "lucide-react";
import { useApp } from "@/components/app-state";
import { BarButton, Group, NavBar, Segmented, copyText, usePageMenu } from "@/components/ios";
import { ALERTS, ago, hasProfile, nameOf } from "@/lib/data";

type F = "all" | "critical" | "warn" | "info";
type A = (typeof ALERTS)[number];
const OPTS: { v: F; label: string }[] = [{ v: "all", label: "All" }, { v: "critical", label: "Critical" }, { v: "warn", label: "Warning" }, { v: "info", label: "Info" }];
const TINT = { critical: "var(--red)", warn: "var(--orange)", info: "var(--gray)" };
const ICON = { critical: CircleAlert, warn: TriangleAlert, info: Info };

function MailRow({ a, unread, onOpen }: { a: A; unread: boolean; onOpen: () => void }) {
  const I = ICON[a.severity];
  const body = (
    <>
      <span className={`unread ${unread ? "unread-on" : ""}`} aria-label={unread ? "Unread" : undefined} />
      <span className="mailrow-main">
        <span className="mailrow-top">
          <span className={`mailrow-title ${unread ? "strong" : ""}`}><I size={15} strokeWidth={2.4} color={TINT[a.severity]} aria-label={a.severity} />{a.title}</span>
          <span className="mailrow-time">{ago(a.minutesAgo)}</span>
          {hasProfile(a.login) && <ChevronRight className="row-chev" size={16} strokeWidth={2.6} aria-hidden />}
        </span>
        <span className="mailrow-from">{nameOf(a.login)} #{a.login}</span>
        <span className="mailrow-sub">{a.detail}</span>
      </span>
    </>
  );
  return hasProfile(a.login)
    ? <Link href={`/clients/${a.login}/`} className="mailrow" onClick={onOpen}>{body}</Link>
    : <button className="mailrow" onClick={onOpen}>{body}</button>;
}

export default function Alerts() {
  const { unread, markRead, say, set } = useApp();
  const [f, setF] = useState<F>("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const list = ALERTS.filter((a) => (f === "all" || a.severity === f) && (!onlyUnread || unread.has(a.id)));

  usePageMenu([
    { icon: <ListFilter size={20} strokeWidth={1.9} />, label: onlyUnread ? "Show all alerts" : "Show unread only", run: () => setOnlyUnread(!onlyUnread) },
    { icon: <Copy size={20} strokeWidth={1.9} />, label: "Copy logins in view", run: () => copyText([...new Set(list.map((a) => a.login))].join("\n"), say, `${new Set(list.map((a) => a.login)).size} logins`) },
    { icon: <BellRing size={20} strokeWidth={1.9} />, label: "Alert settings", run: () => set("ui.settings", true) },
  ], [onlyUnread, f, unread.size]);

  return (
    <>
      <NavBar title="Notifications" eyebrow={onlyUnread ? `${unread.size} unread, filtered` : `${unread.size} unread`} back={{ href: "/", label: "Morning Digest" }}
        trailing={unread.size > 0 ? <BarButton onClick={() => { markRead(); say("All alerts marked read"); }}>Read All</BarButton> : null} />

      <Segmented label="Severity" value={f} options={OPTS} onChange={setF} />

      <Group footer="Also sent to the desk WhatsApp group.">
        {list.map((a) => <MailRow key={a.id} a={a} unread={unread.has(a.id)} onOpen={() => markRead(a.id)} />)}
        {list.length === 0 && <div className="mailrow"><span className="mailrow-main"><span className="mailrow-sub">No alerts.</span></span></div>}
      </Group>
    </>
  );
}
