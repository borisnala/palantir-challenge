"use client";

// Notifications as iOS Mail (owner 2026-11-19, "make all this Apple layout"): the unread dot in the margin, the alert as
// the bold first line with its time and chevron, the client on the second line, the detail under it.

import Link from "@/components/nav-link";
import { useState } from "react";
import { BellRing, ChevronRight, CircleAlert, Copy, Info, ListFilter, TriangleAlert } from "lucide-react";
import { alertShown, useApp } from "@/components/app-state";
import { BarButton, Group, NavBar, Segmented, copyText, usePageMenu } from "@/components/ios";
import { ALERTS, ALERT_KINDS, ago, hasProfile, nameOf } from "@/lib/data";
import { buzz } from "@/lib/haptics";

type F = "all" | "critical" | "warn" | "info";
type A = (typeof ALERTS)[number];
const OPTS: { v: F; label: string }[] = [{ v: "all", label: "All" }, { v: "critical", label: "Critical" }, { v: "warn", label: "Warning" }, { v: "info", label: "Info" }];
const TINT = { critical: "var(--red)", warn: "var(--orange)", info: "var(--gray)" };
const ICON = { critical: CircleAlert, warn: TriangleAlert, info: Info };

// The snapshot was taken at 08.57, so the first 537 minutes are today (iOS Mail groups by day the same way)
const DAY_OF = (m: number) => (m < 537 ? "Today" : m < 537 + 1440 ? "Yesterday" : m < 537 + 6 * 1440 ? "This week" : "Earlier");
const KIND_LABEL: Record<string, string> = Object.fromEntries(ALERT_KINDS.map((k) => [k.k, k.label]));
const WA: Record<string, string> = { sent: "Sent to WhatsApp", pending: "WhatsApp pending" };

function MailRow({ a, unread, onOpen }: { a: A; unread: boolean; onOpen: () => void }) {
  const { set, prefs } = useApp();
  const I = ICON[a.severity];
  const toSettings = a.href?.startsWith("settings:");
  const href = toSettings ? undefined : a.href ?? (a.login !== null && hasProfile(a.login) ? `/clients/${a.login}/` : undefined);
  const linked = !!href || !!toSettings;
  const body = (
    <>
      <span className={`unread ${unread ? "unread-on" : ""}`} aria-label={unread ? "Unread" : undefined} />
      <span className="mailrow-main">
        <span className="mailrow-top">
          <span className={`mailrow-title ${unread ? "strong" : ""}`}><I size={15} strokeWidth={2.4} color={TINT[a.severity]} aria-label={a.severity} /><span className="mailrow-tt">{a.title}</span></span>
          <span className="mailrow-time">{ago(a.minutesAgo)}</span>
          {linked && <ChevronRight className="row-chev" size={16} strokeWidth={2.6} aria-hidden />}
        </span>
        <span className="mailrow-from">{a.login !== null ? `${nameOf(a.login)} #${a.login}` : a.source ?? "Desk"}{prefs.notifyWa && WA[a.wa] ? <span className="mailrow-wa"> · {WA[a.wa]}</span> : null}</span>
        {prefs.notifyPreview === "full" && <span className="mailrow-sub">{a.detail}</span>}
      </span>
    </>
  );
  if (href) return <Link href={href} className="mailrow" onClick={onOpen}>{body}</Link>;
  return <button className="mailrow" onClick={() => { onOpen(); if (toSettings) set("ui.settings", a.href!.slice(9)); }}>{body}</button>;
}

export default function Alerts() {
  const { unread, markRead, say, set, prefs } = useApp();
  const [f, setF] = useState<F>("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [kind, setKind] = useState("all");
  // Settings decide what reaches the list (app-state alertShown): notifications on, kind on, severity at its minimum
  const on = ALERTS.filter((a) => alertShown(a, prefs));
  const list = on.filter((a) => (f === "all" || a.severity === f) && (kind === "all" || a.kind === kind) && (!onlyUnread || unread.has(a.id)));
  const kinds = ALERT_KINDS.map((k) => k.k).filter((k) => on.some((a) => a.kind === k));
  const days = [...new Set(list.map((a) => DAY_OF(a.minutesAgo)))];

  usePageMenu([
    { icon: <ListFilter size={20} strokeWidth={1.9} />, label: onlyUnread ? "Show all alerts" : "Show unread only", run: () => setOnlyUnread(!onlyUnread) },
    { icon: <Copy size={20} strokeWidth={1.9} />, label: "Copy logins in view", run: () => copyText([...new Set(list.map((a) => a.login).filter(Boolean))].join("\n"), say, `${new Set(list.map((a) => a.login).filter(Boolean)).size} logins`) },
    { icon: <BellRing size={20} strokeWidth={1.9} />, label: "Alert settings", run: () => set("ui.settings", true) },
  ], [onlyUnread, f, unread.size, kind]);

  return (
    <>
      <NavBar title="Notifications" eyebrow={onlyUnread ? `${unread.size} unread, filtered` : `${unread.size} unread`} back={{ href: "/", label: "Morning Digest" }}
        trailing={unread.size > 0 ? <BarButton onClick={() => { markRead(); say("All alerts marked read"); }}>Read All</BarButton> : null} />

      <Segmented label="Severity" value={f} options={OPTS} onChange={setF} />

      <div className="tchips" role="radiogroup" aria-label="Kind">
        <button role="radio" aria-checked={kind === "all"} className={`tchip ${kind === "all" ? "on" : ""}`} onClick={() => { buzz(); setKind("all"); }}>All {on.length}</button>
        {kinds.map((k) => <button key={k} role="radio" aria-checked={kind === k} className={`tchip ${kind === k ? "on" : ""}`} onClick={() => { buzz(); setKind(k); }}>{KIND_LABEL[k]} {on.filter((a) => a.kind === k).length}</button>)}
      </div>

      {days.map((d) => (
        <Group key={d} header={d}>{list.filter((a) => DAY_OF(a.minutesAgo) === d).map((a) => <MailRow key={a.id} a={a} unread={unread.has(a.id)} onOpen={() => markRead(a.id)} />)}</Group>
      ))}
      {list.length === 0 && <Group><div className="mailrow"><span className="mailrow-main"><span className="mailrow-sub">{prefs.notifyOn ? "No alerts." : "Notifications are off in Settings."}</span></span></div></Group>}
      {prefs.notifyWa && <p className="fine">News profit alerts also post to the desk WhatsApp group.</p>}
    </>
  );
}
