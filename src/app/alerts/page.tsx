"use client";

// Notifications as iOS Mail (owner 2026-11-19, "make all this Apple layout"): the unread dot in the margin, the alert as
// the bold first line with its time and chevron, the client on the second line, the detail under it.

import Link from "@/components/nav-link";
import { useState } from "react";
import { BellRing, ChevronRight, CircleAlert, Copy, Info, ListFilter, TriangleAlert } from "lucide-react";
import { useApp } from "@/components/app-state";
import { BarButton, Group, NavBar, PullDown, Row, Segmented, copyText, usePageMenu } from "@/components/ios";
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
  const { set } = useApp();
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
        <span className="mailrow-from">{a.login !== null ? `${nameOf(a.login)} #${a.login}` : a.source ?? "Desk"}{WA[a.wa] ? <span className="mailrow-wa"> · {WA[a.wa]}</span> : null}</span>
        <span className="mailrow-sub">{a.detail}</span>
      </span>
    </>
  );
  if (href) return <Link href={href} className="mailrow" onClick={onOpen}>{body}</Link>;
  return <button className="mailrow" onClick={() => { onOpen(); if (toSettings) set("ui.settings", a.href!.slice(9)); }}>{body}</button>;
}

type View = "kind" | "client" | "time";
type Stack = { key: string; title: string; href?: string; items: A[] };

/** The money in an alert, read from its title or detail ("+$5,420", "$480.00"), for the stack's total. */
const amountOf = (a: A) => { const m = `${a.title} ${a.detail}`.match(/([+-]?)\$([\d,]+(?:\.\d+)?)/); return m ? (m[1] === "-" ? -1 : 1) * Number(m[2].replace(/,/g, "")) : 0; };
const money0 = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(1).replace(/\.0$/, "")}k` : Math.round(Math.abs(v))}`;

/** One line that sums a stack up, as iOS summarises a notification group: severity mix, clients, money, time span. */
function summary(items: A[], byClient: boolean) {
  const crit = items.filter((a) => a.severity === "critical").length, warn = items.filter((a) => a.severity === "warn").length;
  const clients = new Set(items.map((a) => a.login).filter((l) => l !== null)).size;
  const total = items.reduce((t, a) => t + amountOf(a), 0);
  const kinds = new Set(items.map((a) => a.kind)).size;
  return [
    crit ? `${crit} critical` : "", warn ? `${warn} warning` : "",
    byClient ? (kinds > 1 ? `${kinds} kinds` : "") : clients > 1 ? `${clients} clients` : "",
    total ? money0(total) : "",
    items.length > 1 ? `over ${ago(items[items.length - 1].minutesAgo).replace(" ago", "")}` : "",
  ].filter(Boolean).join(" · ");
}

function StackGroup({ s, open, onToggle, unread, onRead, byClient }: { s: Stack; open: boolean; onToggle: () => void; unread: Set<number>; onRead: (ids: number[]) => void; byClient: boolean }) {
  const n = s.items.filter((a) => unread.has(a.id)).length;
  const more = s.items.length - 1;
  return (
    <section className={`nstack ${open ? "nstack-open" : ""} ${more > 0 ? "nstack-many" : ""}`} aria-label={s.title}>
      <header className="nstack-head">
        <span className="nstack-title">{s.href ? <Link href={s.href}>{s.title}</Link> : s.title}<small>{s.items.length}</small></span>
        {n > 0 && <button className="nstack-btn" onClick={() => { buzz(); onRead(s.items.map((a) => a.id)); }}>Mark read</button>}
        {more > 0 && <button className="nstack-btn" onClick={onToggle}>{open ? "Show less" : `Show ${more}`}</button>}
      </header>
      <div className="nstack-card">
        {(open ? s.items : s.items.slice(0, 1)).map((a) => <MailRow key={a.id} a={a} unread={unread.has(a.id)} onOpen={() => onRead([a.id])} />)}
        {!open && more > 0 && (
          <button className="nstack-sum" onClick={onToggle} aria-label={`Show ${more} more in ${s.title}`}>
            <span>{more} more · {summary(s.items, byClient)}</span>
          </button>
        )}
      </div>
    </section>
  );
}

export default function Alerts() {
  const { unread, markRead, say, set, prefs } = useApp();
  const [f, setF] = useState<F>("all");
  const [view, setView] = useState<View>("kind");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [kind, setKind] = useState("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const on = ALERTS.filter((a) => prefs.notify[a.kind]);
  const list = on.filter((a) => (f === "all" || a.severity === f) && (kind === "all" || a.kind === kind) && (!onlyUnread || unread.has(a.id)));
  const kinds = ALERT_KINDS.map((k) => k.k).filter((k) => on.some((a) => a.kind === k));
  const days = [...new Set(list.map((a) => DAY_OF(a.minutesAgo)))];
  const newest = (x: Stack, y: Stack) => x.items[0].minutesAgo - y.items[0].minutesAgo;
  const keyOf = (a: A) => (a.login !== null ? `c${a.login}` : `s${a.source ?? "Desk"}`);
  // By kind as iOS groups by app, newest stack first. By client, every alert about one account in one stack, the
  // busiest first, desk sources (CLTL, WD screener, Device access) as their own stacks.
  const stacks: Stack[] = view === "kind"
    ? kinds.map((k) => ({ key: k, title: KIND_LABEL[k], items: list.filter((a) => a.kind === k) })).filter((x) => x.items.length).sort(newest)
    : [...new Set(list.map(keyOf))].map((k) => {
        const items = list.filter((a) => keyOf(a) === k);
        const login = items[0].login;
        return { key: k, title: login !== null ? `${nameOf(login)} #${login}` : items[0].source ?? "Desk", href: login !== null && hasProfile(login) ? `/clients/${login}/` : undefined, items };
      }).sort((x, y) => y.items.length - x.items.length || newest(x, y));
  const toggle = (k: string) => { buzz(); const n = new Set(open); if (n.has(k)) n.delete(k); else n.add(k); setOpen(n); };
  const read = (ids: number[]) => { ids.forEach((id) => markRead(id)); if (ids.length > 1) say(`${ids.length} alerts marked read`); };

  usePageMenu([
    { icon: <ListFilter size={20} strokeWidth={1.9} />, label: onlyUnread ? "Show all alerts" : "Show unread only", run: () => setOnlyUnread(!onlyUnread) },
    { icon: <Copy size={20} strokeWidth={1.9} />, label: "Copy logins in view", run: () => copyText([...new Set(list.map((a) => a.login).filter(Boolean))].join("\n"), say, `${new Set(list.map((a) => a.login).filter(Boolean)).size} logins`) },
    { icon: <BellRing size={20} strokeWidth={1.9} />, label: "Alert settings", run: () => set("ui.settings", true) },
  ], [onlyUnread, f, unread.size, kind]);

  const row = (a: A) => <MailRow key={a.id} a={a} unread={unread.has(a.id)} onOpen={() => markRead(a.id)} />;

  return (
    <>
      <NavBar title="Notifications" eyebrow={onlyUnread ? `${unread.size} unread, filtered` : `${unread.size} unread`} back={{ href: "/", label: "Morning Digest" }}
        trailing={unread.size > 0 ? <BarButton onClick={() => { markRead(); say("All alerts marked read"); }}>Read All</BarButton> : null} />

      <Segmented label="Arrange" value={view} options={[{ v: "kind", label: "By kind" }, { v: "client", label: "By client" }, { v: "time", label: "By time" }]} onChange={(v) => { setView(v); setOpen(new Set()); }} />

      <div className="tchips" role="radiogroup" aria-label="Kind">
        <button role="radio" aria-checked={kind === "all"} className={`tchip ${kind === "all" ? "on" : ""}`} onClick={() => { buzz(); setKind("all"); }}>All {on.length}</button>
        {kinds.map((k) => <button key={k} role="radio" aria-checked={kind === k} className={`tchip ${kind === k ? "on" : ""}`} onClick={() => { buzz(); setKind(k); }}>{KIND_LABEL[k]} {on.filter((a) => a.kind === k).length}</button>)}
      </div>

      <Group>
        <Row title="Severity" chevron={false} detail={<PullDown label="Severity" value={f} options={OPTS} onChange={setF} />} />
      </Group>

      {view !== "time" && stacks.map((x) => (
        <StackGroup key={x.key} s={x} open={open.has(x.key) || (view === "kind" && kind !== "all")} onToggle={() => toggle(x.key)} unread={unread} onRead={read} byClient={view === "client"} />
      ))}

      {view === "time" && days.map((d) => (
        <Group key={d} header={d}>{list.filter((a) => DAY_OF(a.minutesAgo) === d).map(row)}</Group>
      ))}
      {list.length === 0 && <Group><div className="mailrow"><span className="mailrow-main"><span className="mailrow-sub">No alerts.</span></span></div></Group>}
      <p className="fine">News profit alerts also post to the desk WhatsApp group.</p>
    </>
  );
}
