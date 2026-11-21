"use client";

// Settings, laid out as the Claude app's Settings sheet (owner 2026-11-19): an account card with a way to switch,
// an Account section, an App section with pickers and switches, Appearance tiles, and Sign out at the foot. The i
// button opens the build and legal menu. Every row does its job: switching user changes the clearance level that
// gates each change in the app, the switches and pickers change the app at once and are kept on this phone.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, Bell, Info, LogOut, MonitorSmartphone, Plus, ShieldCheck, UserRound, Users, Vibrate, ChartCandlestick, Compass, Eye } from "lucide-react";
import { ROLE_CAN, ROLE_LABEL, ROLE_RANK, USERS, alertShown, useApp, type Prefs, type Role, type Sev } from "./app-state";
import { Confirm, Group, PullDown, Row, Segmented, Sheet, Switch, useSheetPush } from "./ios";
import { Monogram } from "./ui";
import { Glass } from "./liquid";
import { ALERTS, ALERT_KINDS, when, type AlertKind } from "@/lib/data";
import us from "@/data/users.json";
import { UsersPanel } from "./admin/users";
import { DevicesPanel } from "./admin/devices";

const START: { v: Prefs["start"]; label: string }[] = [
  { v: "/", label: "Morning Digest" }, { v: "/withdrawals/", label: "WD Approvals" }, { v: "/search/", label: "Client 360" }, { v: "/risk/", label: "Risk Management" },
];
const LICENSES = [
  ["Next.js", "MIT"], ["React", "MIT"], ["Lucide icons", "ISC"], ["qrcode", "MIT"],
  ["TradingView Lightweight Charts", "Apache 2.0, charts by TradingView"], ["Website cloner template", "MIT"],
];

/** A row whose value is picked from a list, as Claude's "Open links in": the value and an up-down mark that opens an
 *  iOS pull-down menu. */
function Picker<T extends string>({ icon, title, value, options, onChange }: { icon: React.ReactNode; title: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return <Row icon={icon} title={title} chevron={false} detail={<PullDown label={title} value={value} options={options} onChange={onChange} />} />;
}

function Pages() {
  const app = useApp();
  const push = useSheetPush();
  const router = useRouter();
  // Users and roles and Device access open inside Settings (owner 2026-11-20, "every setting shall live in
  // the Settings window"), as pages pushed into the sheet, never as screens of their own
  const PANEL = { users: ["Users and roles", "admin", <UsersPanel key="u" />], devices: ["Device access", "viewer", <DevicesPanel key="d" />] } as const;
  const open = (k: keyof typeof PANEL) => { const [t, need, node] = PANEL[k]; if (!app.guard(need as Role)) return; push?.(t, node); };
  const waiting = us.pending.filter((d) => !app.get<Record<number, string>>("dev.decided", {})[d.id]).length + app.get<unknown[]>("dev.requests", []).length;
  const asked = app.get<boolean | string>("ui.settings", false);
  useEffect(() => { if (typeof asked === "string" && asked in PANEL) { open(asked as keyof typeof PANEL); app.set("ui.settings", true); } }, [asked]); // eslint-disable-line react-hooks/exhaustive-deps
  const on = Object.values(app.prefs.notify).filter(Boolean).length;
  const devices = us.decided.filter((d) => d.status === "approved").length;
  const [out, setOut] = useState(false);

  const switchUser = () => push?.("Switch user", (
    <Group footer="Clearance follows the portal role.">
      {USERS.map((u) => (
        <Row key={u.name} onClick={() => app.setUser(u.name)} icon={<Monogram name={u.name.replace("demo.", "").slice(0, 2)} size={36} />} tint="transparent"
          title={u.name} subtitle={ROLE_LABEL[u.role]} detail={app.user.name === u.name ? <b className="tick">✓</b> : undefined} chevron={false} />
      ))}
    </Group>
  ));
  const profile = () => push?.("Profile", (
    <Group>
      <Row title="Username" detail={app.user.name} chevron={false} />
      <Row title="Clearance" detail={ROLE_LABEL[app.user.role]} chevron={false} />
      <Row title="Member since" detail={when(USERS.find((u) => u.name === app.user.name)?.since, false)} chevron={false} />
      <Row title="Approved devices" detail={String(devices)} chevron={false} />
      <Row title="Actions this session" detail={String(app.activity.length)} chevron={false} />
    </Group>
  ));
  const clearance = () => push?.("Clearance level", (
    <>
      {(["viewer", "editor", "admin"] as Role[]).map((r) => (
        <Group key={r} header={`${ROLE_LABEL[r]}${r === app.user.role ? ", current" : ""}`}>
          {ROLE_CAN[r].map((c) => <Row key={c} title={c} detail={ROLE_RANK[app.user.role] >= ROLE_RANK[r] ? <b className="tick">✓</b> : <span className="muted">Locked</span>} chevron={false} />)}
        </Group>
      ))}
      <p className="caption">Each level includes the one above. Administrators assign roles in Users.</p>
    </>
  ));
  const activity = () => push?.("Activity", (
    <Group footer="This session, newest first. Cleared on sign out.">
      {app.activity.length === 0 && <Row title="No actions yet" chevron={false} />}
      {app.activity.map((a, i) => <Row key={i} title={a.text} subtitle={a.by} detail={new Date(a.at).toTimeString().slice(0, 5)} chevron={false} />)}
    </Group>
  ));
  const notifications = () => push?.("Notifications", <NotifyPage />);

  return (
    <>
      <Group>
        <Row icon={<Monogram name={app.user.name.replace("demo.", "").slice(0, 2)} size={44} />} tint="transparent" title={app.user.name} subtitle={`${ROLE_LABEL[app.user.role]} · Risk desk`} chevron={false} />
        <Row onClick={switchUser} icon={<Plus size={20} strokeWidth={2} />} tint="var(--blue)" title={<span className="link-blue">Switch user</span>} chevron={false} />
      </Group>

      <Group header="Account">
        <Row onClick={profile} icon={<UserRound size={20} strokeWidth={1.8} />} title="Profile" />
        <Row onClick={clearance} icon={<ShieldCheck size={20} strokeWidth={1.8} />} title="Clearance level" detail={ROLE_LABEL[app.user.role]} />
        <Row onClick={activity} icon={<Activity size={20} strokeWidth={1.8} />} title="Activity" detail={app.activity.length ? String(app.activity.length) : undefined} />
        <Row onClick={notifications} icon={<Bell size={20} strokeWidth={1.8} />} title="Notifications" detail={`${on} of ${ALERT_KINDS.length} on`} />
        <Row onClick={() => open("users")} icon={<Users size={20} strokeWidth={1.8} />} title="Users and roles" detail={app.can("admin") ? `${us.users.length}` : "Administrator"} />
        <Row onClick={() => open("devices")} icon={<MonitorSmartphone size={20} strokeWidth={1.8} />} title="Device access" detail={waiting ? `${waiting} waiting` : undefined} />
      </Group>

      <Group header="App">
        <Picker icon={<Compass size={20} strokeWidth={1.8} />} title="Start screen" value={app.prefs.start} options={START} onChange={(v) => app.setPref("start", v)} />
        <Picker icon={<Eye size={20} strokeWidth={1.8} />} title="Point of view" value={app.prefs.pov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} onChange={(v) => app.setPref("pov", v)} />
        <Row icon={<ChartCandlestick size={20} strokeWidth={1.8} />} title="Live prices" chevron={false}><Switch on={app.prefs.live} onChange={() => app.setPref("live", !app.prefs.live)} label="Live prices" /></Row>
        <Row icon={<Vibrate size={20} strokeWidth={1.8} />} title="Haptic feedback" chevron={false}><Switch on={app.prefs.haptics} onChange={() => app.setPref("haptics", !app.prefs.haptics)} label="Haptic feedback" /></Row>
      </Group>

      <Group header="Appearance">
        <div className="themes" role="radiogroup" aria-label="Appearance">
          {(["light", "dark", "system"] as const).map((t) => (
            <button key={t} role="radio" aria-checked={app.prefs.theme === t} className={`theme ${app.prefs.theme === t ? "theme-on" : ""}`} onClick={() => app.setPref("theme", t)}>
              <span className={`theme-art theme-${t}`} aria-hidden><i /><i /><b /></span>
              <span>{t === "light" ? "Light" : t === "dark" ? "Dark" : "System"}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group>
        <Row onClick={() => setOut(true)} icon={<LogOut size={20} strokeWidth={1.8} />} tint="var(--red)" title={<span className="neg">Sign out</span>} chevron={false} />
      </Group>
      <Confirm need="viewer" open={out} title="Sign out" action="Sign out" destructive onCancel={() => setOut(false)}
        lines={["Clears the decisions, notes, statuses and moves made this session", "Returns to the sign in screen"]}
        onConfirm={() => { setOut(false); app.signOut(); app.set("ui.settings", false); router.push("/login/", { transitionTypes: ["tab"] }); }} />
    </>
  );
}

/** Notification settings (owner 2026-11-21, "various and rich notification settings, in groups"): a master switch,
 *  delivery (bell dot, previews, WhatsApp status), then the alert kinds grouped by desk area. A kind pushes its own
 *  page with Allow and a minimum severity, and shows how many of today's alerts pass. */
const AREAS: { title: string; kinds: AlertKind[] }[] = [
  { title: "Client activity", kinds: ["news", "tier", "swing", "book", "growth"] },
  { title: "Algorithms and exposure", kinds: ["algo", "exposure"] },
  { title: "Liquidity", kinds: ["level"] },
  { title: "Withdrawals", kinds: ["wd"] },
  { title: "System", kinds: ["system"] },
];
const SEV_LABEL: Record<Sev, string> = { info: "All", warn: "Warning and above", critical: "Critical only" };

function KindPage({ k }: { k: AlertKind }) {
  const app = useApp();
  const meta = ALERT_KINDS.find((x) => x.k === k)!;
  const all = ALERTS.filter((a) => a.kind === k);
  const by = (s: string) => all.filter((a) => a.severity === s).length;
  const passing = all.filter((a) => alertShown(a, app.prefs)).length;
  return (
    <>
      <Group footer={meta.sub}>
        <Row title="Allow" chevron={false}>
          <Switch on={app.prefs.notify[k]} label={`Allow ${meta.label}`} onChange={() => app.setPref("notify", { ...app.prefs.notify, [k]: !app.prefs.notify[k] })} />
        </Row>
      </Group>
      <Group header="Minimum severity" footer={`${passing} of ${all.length} alerts in the current list pass.`}>
        <div className="seg-row">
          <Segmented label="Minimum severity" value={app.prefs.notifySev[k]} onChange={(v) => app.setPref("notifySev", { ...app.prefs.notifySev, [k]: v })}
            options={[{ v: "info", label: "All" }, { v: "warn", label: "Warning" }, { v: "critical", label: "Critical" }]} />
        </div>
        <Row title="Critical" detail={<span className="num">{by("critical")}</span>} chevron={false} />
        <Row title="Warning" detail={<span className="num">{by("warn")}</span>} chevron={false} />
        <Row title="Info" detail={<span className="num">{by("info")}</span>} chevron={false} />
      </Group>
    </>
  );
}

function NotifyPage() {
  const app = useApp();
  const push = useSheetPush();
  const p = app.prefs;
  const on = ALERT_KINDS.filter((k) => p.notify[k.k]).length;
  const passing = ALERTS.filter((a) => alertShown(a, p)).length;
  const state = (k: AlertKind) => (!p.notify[k] ? "Off" : p.notifySev[k] === "info" ? "On" : SEV_LABEL[p.notifySev[k]]);
  const reset = () => {
    app.setPref("notifyOn", true); app.setPref("notifyDot", true); app.setPref("notifyPreview", "full"); app.setPref("notifyWa", true);
    app.setPref("notify", Object.fromEntries(ALERT_KINDS.map((k) => [k.k, true])) as Record<AlertKind, boolean>);
    app.setPref("notifySev", Object.fromEntries(ALERT_KINDS.map((k) => [k.k, "info"])) as Record<AlertKind, Sev>);
    app.say("Notification settings restored");
  };
  return (
    <>
      <Group footer={p.notifyOn ? `${passing} of ${ALERTS.length} alerts reach the list and the bell. ${on} of ${ALERT_KINDS.length} kinds on.` : "No alerts reach the list or the bell."}>
        <Row icon={<Bell size={20} strokeWidth={1.8} />} title="Allow notifications" chevron={false}>
          <Switch on={p.notifyOn} label="Allow notifications" onChange={() => app.setPref("notifyOn", !p.notifyOn)} />
        </Row>
      </Group>

      <Group header="Delivery">
        <Row title="Bell dot" subtitle="Red dot on the bell while alerts are unread" chevron={false}>
          <Switch on={p.notifyDot} label="Bell dot" onChange={() => app.setPref("notifyDot", !p.notifyDot)} />
        </Row>
        <Row title="Previews" chevron={false} detail={<PullDown label="Previews" value={p.notifyPreview} onChange={(v) => app.setPref("notifyPreview", v)} options={[{ v: "full", label: "Full detail" }, { v: "title", label: "Title only" }]} />} />
        <Row title="WhatsApp status" subtitle="Sent or pending, on news profit alerts" chevron={false}>
          <Switch on={p.notifyWa} label="WhatsApp status" onChange={() => app.setPref("notifyWa", !p.notifyWa)} />
        </Row>
      </Group>

      {AREAS.map((area) => (
        <Group key={area.title} header={area.title}>
          {area.kinds.map((k) => {
            const meta = ALERT_KINDS.find((x) => x.k === k)!;
            return <Row key={k} title={meta.label} subtitle={meta.sub} detail={<span className={p.notify[k] && p.notifyOn ? "" : "muted"}>{state(k)}</span>} onClick={() => push?.(meta.label, <KindPage k={k} />)} />;
          })}
        </Group>
      ))}

      <Group>
        <Row onClick={reset} title={<span className="link-blue">Restore defaults</span>} chevron={false} />
      </Group>
    </>
  );
}

/** The i menu: build, data and the open-source licences, as in the Claude app. */
function InfoMenu() {
  const [open, setOpen] = useState(false);
  const app = useApp();
  const show = (which: "about" | "install") => { setOpen(false); app.set("ui.settings", false); app.set("ui.welcome", which); };
  const push = useSheetPush();
  return (
    <span className="info-wrap">
      <button className="glassbtn-link" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen(!open)} aria-label="About" aria-expanded={open}>
        <Glass className="glassbtn round"><Info size={20} strokeWidth={2} /></Glass>
      </button>
      {open && (
        <>
          <button className="menu-scrim" aria-label="Close menu" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen(false)} />
          <Glass className="popmenu info-menu" role="menu" onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}>
            <p className="info-build">Risk Tool 1.0<br /><span className="muted">Build 2026.11.20, demonstration data</span></p>
            <i className="popmenu-sep" />
            <button role="menuitem" onClick={() => show("about")}>About this demo</button>
            <button role="menuitem" onClick={() => show("install")}>Add to Home Screen</button>
            <i className="popmenu-sep" />
            <button role="menuitem" onClick={() => { setOpen(false); push?.("Data", (
              <Group footer="Global Risk Portal demo, snapshot 13 Nov 2026. Logins 99000001 onward.">
                <Row title="Source" detail="Portal demo payloads" chevron={false} />
                <Row title="Snapshot" detail="13 Nov 2026" chevron={false} />
                <Row title="Live prices" detail="Simulated" chevron={false} />
              </Group>
            )); }}>Data source</button>
            <button role="menuitem" onClick={() => { setOpen(false); push?.("Licenses", (
              <Group>{LICENSES.map(([n, l]) => <Row key={n} title={n} subtitle={l} chevron={false} />)}</Group>
            )); }}>Licenses</button>
          </Glass>
        </>
      )}
    </span>
  );
}

export function SettingsSheet() {
  const app = useApp();
  const open = !!app.get<boolean | string>("ui.settings", false);
  return (
    <Sheet open={open} onClose={() => app.set("ui.settings", false)} title="Settings" trailing={<InfoMenu />} tall>
      <Pages />
    </Sheet>
  );
}
