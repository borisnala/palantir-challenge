"use client";

// iOS 26 building blocks: large title with the scroll-edge blur, round glass bar buttons, inset grouped lists, rows,
// a floating glass sheet you can drag down, a liquid switch and a segmented control with a liquid thumb.
// Sizes follow Apple's type ramp (17 body, 15 subhead, 13 footnote) and 44 pt minimum touch targets.

import Link from "@/components/nav-link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Check, ChevronLeft, ChevronRight, ChevronsUpDown, Ellipsis, Menu, Minus, Plus, RefreshCw, Settings } from "lucide-react";
import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { commandSlot } from "./shell";
import { ROLE_LABEL, useApp, type Role } from "./app-state";
import { Glass, Spring, stretch, useSpringLoop } from "./liquid";
import { buzz } from "@/lib/haptics";
import { ghost } from "./motion";

/** What the ⋯ button offers on this screen (owner 2026-11-19, "make it tailored, what the user needs most"). A screen
 *  registers its own items with usePageMenu; Refresh data and Settings always close the list. */
export type MenuItem = { icon: React.ReactNode; label: string; run: () => void };
let menuItems: MenuItem[] = [];
const menuSubs = new Set<() => void>();
const pageMenu = {
  subscribe: (f: () => void) => { menuSubs.add(f); return () => { menuSubs.delete(f); }; },
  get: () => menuItems,
};
export function usePageMenu(items: MenuItem[], deps: unknown[]) {
  useEffect(() => {
    menuItems = items; menuSubs.forEach((f) => f());
    return () => { menuItems = []; menuSubs.forEach((f) => f()); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Copy a value and say so, as the desk does with logins and groups. */
export function copyText(text: string, say: (m: string) => void, what: string) {
  navigator.clipboard?.writeText(text).then(() => say(`${what} copied`), () => say("Copy unavailable"));
}

/** Back goes to the screen you came from, or to the parent when the page was opened directly. */
function BackButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const { backPath } = useApp();
  return (
    <button className="glassbtn-link" aria-label={`Back to ${label}`}
      onClick={() => { buzz(); router.push(backPath() ?? href, { transitionTypes: ["pop"] }); }}>
      <Glass className="glassbtn round"><ChevronLeft size={24} strokeWidth={2.2} /></Glass>
    </button>
  );
}

/** The top bar of the Claude iOS app: a round button each side, the title in a glass capsule with a second line,
 *  and nothing else. The screen's main action (Read All, Apply, Edit) sits in a black pill at the bottom right. */
export function NavBar({ title, eyebrow, trailing, back }: {
  title: string; eyebrow?: string; trailing?: React.ReactNode; back?: { href: string; label: string }; large?: boolean; root?: boolean;
}) {
  const { unread, setDrawer, visit, wdRows, pending, say, set } = useApp();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const slot = useSyncExternalStore(commandSlot.subscribe, commandSlot.get, () => null); // the command bar's action slot
  const [status, setStatus] = useState(false);
  const items = useSyncExternalStore(pageMenu.subscribe, pageMenu.get, () => menuItems);
  useEffect(() => { visit(path, title, eyebrow); }, [path, title]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="scroll-edge" aria-hidden />
      <header className="topbar">
        {back ? <BackButton href={back.href} label={back.label} /> : (
          <button className="glassbtn-link" aria-label="Menu" onClick={() => { buzz(); setDrawer(true); }}>
            <Glass className="glassbtn round"><Menu size={22} strokeWidth={2} /></Glass>
          </button>
        )}
        <button className="glassbtn-link titlebtn" onClick={() => setStatus(true)} aria-label={`${title}, data status`}>
          <Glass className="titlecap"><h1>{title}</h1>{eyebrow && <p>{eyebrow}</p>}</Glass>
        </button>
        <span className="nav-actions">
          <Link href="/alerts/" className="glassbtn-link" aria-label={`Alerts, ${unread.size} unread`}>
            <Glass className="glassbtn round"><Bell size={20} strokeWidth={2} />{unread.size > 0 && <b className="navbadge">{unread.size}</b>}</Glass>
          </Link>
          <button className="glassbtn-link" aria-label="More" aria-expanded={menu} onClick={() => { buzz(); setMenu(!menu); }}>
            <Glass className="glassbtn round"><Ellipsis size={22} strokeWidth={2} /></Glass>
          </button>
        </span>
        {menu && (
          <>
            <button className="menu-scrim" aria-label="Close menu" onClick={() => setMenu(false)} />
            <Glass className="popmenu" role="menu">
              {items.map((it) => <button key={it.label} role="menuitem" onClick={() => { buzz(); setMenu(false); it.run(); }}>{it.icon}{it.label}</button>)}
              {items.length > 0 && <i className="popmenu-sep" />}
              <button role="menuitem" onClick={() => { setMenu(false); ghost(760); setTimeout(() => { set("refreshedAt", new Date().toISOString()); say("Data refreshed"); }, 760); }}><RefreshCw size={20} strokeWidth={1.9} />Refresh data</button>
              <button role="menuitem" onClick={() => { setMenu(false); set("ui.settings", true); }}><Settings size={20} strokeWidth={1.9} />Settings</button>
            </Glass>
          </>
        )}
      </header>
      <Sheet open={status} onClose={() => setStatus(false)} title="Data status">
        <Group header="Workload">
          <div className="usage"><span className="top"><b>Withdrawals pending</b><span className="muted">{pending.length} of {wdRows.length}</span></span><span className="hbar"><i style={{ width: `${(pending.length / Math.max(1, wdRows.length)) * 100}%` }} /></span></div>
          <div className="usage"><span className="top"><b>Unread alerts</b><span className="muted">{unread.size}</span></span><span className="hbar"><i style={{ width: `${Math.min(100, unread.size * 14)}%` }} /></span></div>
        </Group>
        <Group header="Source" footer="Global Risk Portal demo. Snapshot 13 Nov 2026.">
          <Row title="Screen" detail={title} chevron={false} />
          <Row title="Mode" detail="Shadow, read only" chevron={false} />
        </Group>
      </Sheet>
      {trailing && slot && createPortal(<span className="cmd-action">{trailing}</span>, slot)}
    </>
  );
}

/** An iOS pull-down button (owner 2026-11-19, "figure 2, what is that"): the value with an up-down mark, and on tap a
 *  glass menu that grows out of it with a check on the current choice. Never the browser's own select list. */
export function PullDown<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const open = () => {
    buzz();
    const r = btn.current!.getBoundingClientRect();
    const up = r.bottom + 60 * options.length + 24 > innerHeight;
    setAt({ top: up ? r.top - 8 : r.bottom + 8, right: innerWidth - r.right, up });
  };
  return (
    <>
      <button ref={btn} type="button" className="pick" aria-haspopup="menu" aria-expanded={!!at} aria-label={`${label}, ${options.find((o) => o.v === value)?.label}`} onClick={open}>
        <span>{options.find((o) => o.v === value)?.label}</span><ChevronsUpDown size={15} strokeWidth={2} aria-hidden />
      </button>
      {at && createPortal(
        <>
          <button className="menu-scrim pd-scrim" aria-label="Close menu" onClick={() => setAt(null)} />
          <Glass className={`popmenu pulldown ${at.up ? "pd-up" : ""}`} role="menu" style={{ top: at.top, right: at.right }}>
            {options.map((o) => (
              <button key={o.v} role="menuitemradio" aria-checked={o.v === value} onClick={() => { buzz(); setAt(null); if (o.v !== value) onChange(o.v); }}>
                <span className="pd-check">{o.v === value && <Check size={18} strokeWidth={2.4} />}</span>{o.label}
              </button>
            ))}
          </Glass>
        </>, document.body)}
    </>
  );
}

/** The screen's main action, as the black "New session" pill of the Claude app. */
export function BarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button className="cmd-key" onClick={() => { buzz(); onClick(); }}>{children}</button>;
}

export function Group({ header, footer, children, className = "" }: { header?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`grp ${className}`}>
      {header && <h2 className="grp-head">{header}</h2>}
      <div className="grp-body">{children}</div>
      {footer && <p className="grp-foot">{footer}</p>}
    </section>
  );
}

export function Row({ href, onClick, icon, tint, title, subtitle, detail, chevron = true, unread, children }: {
  href?: string; onClick?: () => void; icon?: React.ReactNode; tint?: string; title: React.ReactNode; subtitle?: React.ReactNode;
  detail?: React.ReactNode; chevron?: boolean; unread?: boolean; children?: React.ReactNode;
}) {
  const body = (
    <>
      {unread !== undefined && <span className={`unread ${unread ? "unread-on" : ""}`} aria-label={unread ? "Unread" : undefined} />}
      {icon && <span className="tile-icon" style={{ color: tint }}>{icon}</span>}
      <span className="row-main">
        <span className="row-text">
          <span className="row-title">{title}</span>
          {subtitle && <span className="row-sub">{subtitle}</span>}
        </span>
        {children}
        {detail !== undefined && <span className="row-detail">{detail}</span>}
        {chevron && (href || onClick) && <ChevronRight className="row-chev" size={18} strokeWidth={2.6} aria-hidden />}
      </span>
    </>
  );
  if (href) return <Link href={href} className="row" onClick={onClick}>{body}</Link>;
  if (onClick) return <button className="row" onClick={onClick}>{body}</button>;
  return <div className="row">{body}</div>;
}

type SheetPage = { title: string; node: React.ReactNode };
const SheetNav = createContext<((title: string, node: React.ReactNode) => void) | null>(null);
/** Inside a sheet: push a detail page, as the Claude app does when a step row is tapped. */
export const useSheetPush = () => useContext(SheetNav);

/** Open sheets, oldest first (owner 2026-11-20, "one popup window at a time"): only the newest shows. One opened from
 *  another sheet hides the one beneath it and shows a back button instead of the X. Closing it brings the one beneath back. */
let sheetIds: string[] = [];
const sheetSubs = new Set<() => void>();
const sheetStack = {
  subscribe: (f: () => void) => { sheetSubs.add(f); return () => { sheetSubs.delete(f); }; },
  get: () => sheetIds,
  set: (next: string[]) => { sheetIds = next; sheetSubs.forEach((f) => f()); },
};

export function Sheet({ open, onClose, title, children, trailing, tall }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; trailing?: React.ReactNode; tall?: boolean }) {
  // mounted keeps the sheet in the DOM while it slides out. The slide runs on a spring, and a drag on the top bar
  // pulls the sheet with the finger. Let go past a third of its height, or flick down, and it closes. Otherwise it
  // springs back with a little overshoot.
  const [mounted, setMounted] = useState(open);
  const [stack, setStack] = useState<SheetPage[]>([]);
  const id = useId();
  const ids = useSyncExternalStore(sheetStack.subscribe, sheetStack.get, () => sheetIds);
  useEffect(() => {
    if (!open) return;
    sheetStack.set([...sheetStack.get().filter((x) => x !== id), id]);
    return () => sheetStack.set(sheetStack.get().filter((x) => x !== id));
  }, [open, id]);
  const pos = ids.indexOf(id);
  const under = pos >= 0 && pos < ids.length - 1; // another sheet is open over this one
  const child = pos > 0; // this one opened over another: back, not close
  if (open && !mounted) setMounted(true);
  if (!open && stack.length) setStack([]);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLButtonElement>(null);
  const y = useRef(new Spring(900, 300, 28));
  const drag = useRef<{ y0: number; t0: number; last: number; lt: number } | null>(null);
  const closing = useRef(false);

  const kick = useSpringLoop((dt) => {
    const moving = drag.current ? false : y.current.step(dt);
    const h = panel.current?.offsetHeight || 600;
    const yy = Math.max(-24, y.current.x);
    if (panel.current) panel.current.style.transform = `translateY(${yy}px)`;
    if (scrim.current) scrim.current.style.opacity = String(Math.max(0, Math.min(1, 1 - yy / h)));
    if (!moving && closing.current) { closing.current = false; setMounted(false); }
    return moving;
  });

  useEffect(() => {
    if (!mounted) return;
    const h = panel.current?.offsetHeight || 600;
    if (open) { document.body.style.overflow = "hidden"; y.current.x = h; y.current.v = 0; y.current.target = 0; }
    else { document.body.style.overflow = ""; y.current.target = h + 40; closing.current = true; }
    kick();
  }, [open, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY - y.current.x, t0: e.timeStamp, last: e.clientY, lt: e.timeStamp };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    let ny = e.clientY - d.y0;
    if (ny < 0) ny = -Math.sqrt(-ny) * 3; // rubber band past the top
    const h = panel.current?.offsetHeight || 600;
    if ((y.current.x > h / 3) !== (ny > h / 3)) buzz(); // a tick when the drag passes the dismiss point
    y.current.v = ((e.clientY - d.last) / Math.max(1, e.timeStamp - d.lt)) * 1000;
    d.last = e.clientY; d.lt = e.timeStamp;
    y.current.x = ny; kick();
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    const h = panel.current?.offsetHeight || 600;
    if (y.current.x > h / 3 || y.current.v > 900) onClose();
    else { y.current.target = 0; kick(); }
  };

  if (!mounted) return null;
  return (
    <div className={`sheet-wrap ${under ? "sheet-under" : ""}`} aria-hidden={under || undefined}>
      <button ref={scrim} className="sheet-scrim" aria-label="Close" onClick={onClose} />
      <SheetNav.Provider value={(t, node) => { buzz(); setStack((x) => [...x, { title: t, node }]); }}>
      <div ref={panel} className={`sheet ${tall ? "sheet-tall" : ""}`} role="dialog" aria-modal="true" aria-label={title} style={{ transform: "translateY(100%)" }}>
        <div className="sheet-grip" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span className="grabber" aria-hidden />
          <div className="sheet-bar">
            {stack.length ? (
              <button className="glassbtn-link" onPointerDown={(e) => e.stopPropagation()} onClick={() => setStack(stack.slice(0, -1))} aria-label="Back">
                <Glass className="glassbtn round"><ChevronLeft size={24} strokeWidth={2.2} /></Glass>
              </button>
            ) : (
              <button className="glassbtn-link" onPointerDown={(e) => e.stopPropagation()} onClick={() => { buzz(); onClose(); }} aria-label={child ? "Back" : "Close"}>
                <Glass className="glassbtn round">{child ? <ChevronLeft size={24} strokeWidth={2.2} /> : <span className="xmark" aria-hidden />}</Glass>
              </button>
            )}
            <span className="nav-title">{stack.length ? stack[stack.length - 1].title : title}</span>
            {stack.length ? <span /> : trailing ?? <span />}
          </div>
        </div>
        <div key={stack.length} className={`sheet-body ${stack.length ? "sheet-pushed" : ""}`}>{stack.length ? stack[stack.length - 1].node : children}</div>
      </div>
      </SheetNav.Provider>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "switch-on" : ""}`} onClick={onChange}><i /></button>;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  // iOS 26 segmented control, from the owner's screen recording (2026-11-19). At rest the thumb is a solid pill. Touch
  // it and it lifts out of the track into a clear lens, taller than the track, with a thin bright rim: the labels under
  // it are magnified, and the curved edges split the light into a red and a blue fringe. It follows the finger on a
  // stiff spring (React Bits FluidGlass: omega 30, damping 0.86), stretches along its travel (1 + speed / 1800, at
  // most 0.55 x 0.5), rubber-bands past the ends, and on release sinks back into the track and springs to the nearest
  // segment with a small overshoot. Built from the page itself, so it works in Safari as well as Chromium.
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const copy = useRef<HTMLSpanElement>(null);
  const sx = useRef(new Spring(-1, 300, 24));
  const lift = useRef(new Spring(0, 340, 22)); // slower lift and sink, a small overshoot (owner: "way too fast")
  const drag = useRef<{ off: number; x0: number; last: number; t: number; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const unit = () => { const el = track.current; return el ? (el.clientWidth - 4) / options.length : 0; };

  const kick = useSpringLoop((dt) => {
    const d = drag.current;
    const m1 = d ? false : sx.current.step(dt);
    const m2 = lift.current.step(dt);
    const L = Math.max(0, lift.current.x);
    const { sx: kx, sy: ky } = stretch(sx.current.v * 1.2, 0.27);
    if (thumb.current) {
      thumb.current.style.transform = `translateX(${sx.current.x}px) scale(${kx * (1 + 0.14 * L)}, ${ky * (1 + 0.42 * L)})`;
      thumb.current.style.setProperty("--lift", L.toFixed(3));
      thumb.current.style.zIndex = L > 0.02 ? "2" : "0"; // the fill sits under the labels, the lifted lens over them
    }
    if (copy.current) copy.current.style.setProperty("--cx", `${-sx.current.x}px`);
    return m1 || m2 || !!d;
  });

  useEffect(() => {
    const el = track.current; if (!el) return;
    const place = (instant: boolean) => {
      const w = unit();
      if (thumb.current) thumb.current.style.width = `${w}px`;
      if (copy.current) copy.current.style.setProperty("--tw", `${el.clientWidth - 4}px`);
      if (drag.current) return;
      sx.current.target = i * w;
      if (instant || sx.current.x < 0) { sx.current.x = i * w; sx.current.v = 0; }
      kick();
    };
    place(false);
    const ro = new ResizeObserver(() => place(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, [i, options.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const local = (e: React.PointerEvent) => e.clientX - (track.current?.getBoundingClientRect().left ?? 0) - 2;
  const down = (e: React.PointerEvent) => {
    const w = unit(), px = local(e);
    const onThumb = px >= sx.current.x && px <= sx.current.x + w;
    drag.current = { off: onThumb ? px - sx.current.x : w / 2, x0: px, last: px, t: e.timeStamp, moved: false };
    lift.current.target = 1;
    kick();
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const px = local(e), w = unit(), max = w * (options.length - 1);
    if (!d.moved && Math.abs(px - d.x0) > 5) {
      d.moved = true;
      // capture only once it is a drag: a captured tap would land on the track instead of the segment's button
      track.current?.setPointerCapture?.(e.pointerId);
    }
    if (!d.moved) return;
    let x = px - d.off;
    if (x < 0) x = -Math.sqrt(-x) * 3; else if (x > max) x = max + Math.sqrt(x - max) * 3; // rubber band past the ends
    // and never past the screen: the lifted lens (14% wider than the thumb) stays 6 px inside either edge
    const left = track.current?.getBoundingClientRect().left ?? 0, half = w * 0.07 + 6;
    x = Math.max(-left - 2 + half, Math.min(innerWidth - left - 2 - w - half, x));
    const dt = Math.max(1, e.timeStamp - d.t) / 1000;
    sx.current.v = sx.current.v * 0.4 + ((x - sx.current.x) / dt) * 0.6;
    sx.current.x = x; d.last = px; d.t = e.timeStamp;
    kick();
  };
  const up = (cancel: boolean) => {
    const d = drag.current; if (!d) return;
    drag.current = null;
    lift.current.target = 0;
    const w = unit();
    if (d.moved && !cancel) {
      const j = Math.max(0, Math.min(options.length - 1, Math.round(sx.current.x / w)));
      skipClick.current = true;
      sx.current.target = j * w;
      if (j !== i) { buzz(); onChange(options[j].v); }
    } else sx.current.target = i * w;
    kick();
  };

  return (
    <div ref={track} className="segmented" role="tablist" aria-label={label} style={{ ["--n" as string]: options.length }}
      onPointerDown={down} onPointerMove={move} onPointerUp={() => up(false)} onPointerCancel={() => up(true)}>
      <span ref={thumb} className="seg-thumb" aria-hidden>
        <span className="seg-fill" />
        <span ref={copy} className="seg-lens">
          <span className="seg-copy">{options.map((o) => <span key={o.v} className={o.v === value ? "on" : ""}>{o.label}</span>)}</span>
          <span className="seg-edge">
            <span className="seg-copy seg-fr">{options.map((o) => <span key={o.v}>{o.label}</span>)}</span>
            <span className="seg-copy seg-fb">{options.map((o) => <span key={o.v}>{o.label}</span>)}</span>
          </span>
        </span>
      </span>
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={o.v === value}
          onClick={() => { if (skipClick.current) { skipClick.current = false; return; } onChange(o.v); }}>{o.label}</button>
      ))}
    </div>
  );
}

/** The iOS stepper: minus and plus in one capsule, the value beside it. A value the portal never set shows as None and
 *  the first press starts it from the lowest allowed value. */
export function Stepper({ value: raw, onChange, step = 1, min = -Infinity, max = Infinity, digits = 0, label }: {
  value: number | null; onChange: (v: number) => void; step?: number; min?: number; max?: number; digits?: number; label: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Number(v.toFixed(Math.max(digits, 2))))));
  const unset = raw === null || raw === undefined || Number.isNaN(raw);
  const value = unset ? (Number.isFinite(min) ? min : 0) : raw;
  return (
    <span className="stepper-wrap">
      <span className={`stepper-val num ${unset ? "muted" : ""}`}>{unset ? "None" : value.toFixed(digits)}</span>
      <span className="stepper" role="group" aria-label={label}>
        <button aria-label={`Lower ${label}`} onClick={() => set(value - step)} disabled={value - step < min}><Minus size={16} strokeWidth={2.6} /></button>
        <i aria-hidden />
        <button aria-label={`Raise ${label}`} onClick={() => set(value + step)} disabled={value + step > max}><Plus size={16} strokeWidth={2.6} /></button>
      </span>
    </span>
  );
}

/** A strip of headline numbers, as on the Approvals screen. */
export function Metrics({ items, label }: { items: { k: string; v: React.ReactNode; tone?: "pos" | "neg" | "warn" }[]; label: string }) {
  return (
    <div className="metrics" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }} aria-label={label}>
      {items.map((m) => <div key={m.k}><span>{m.k}</span><b className={m.tone ?? ""}>{m.v}</b></div>)}
    </div>
  );
}

/** A small status chip. */
export function Chip({ tone = "gray", children }: { tone?: "gray" | "green" | "orange" | "red" | "blue" | "purple"; children: React.ReactNode }) {
  // Tags read in sentence case whatever the portal sent (owner register): "admin" shows as "Admin", codes stay as sent
  const text = typeof children === "string" && children ? children.charAt(0).toUpperCase() + children.slice(1) : children;
  return <span className={`chip chip-${tone}`}>{text}</span>;
}

/** The confirmation toast at the bottom, above the tab bar. */
export function Toast() {
  const { toast } = useApp();
  return <div className={`toast ${toast ? "toast-on" : ""}`} role="status" aria-live="polite">{toast}</div>;
}

/** Confirm sheet for anything that changes a setting: says what will change, then Cancel or the action. */
/** A short code a person types back before a change that can not be undone by accident (owner 2026-11-20, "more
 *  security layer"): the first six characters of a SHA-256 of what is being changed and the moment the sheet opened,
 *  in capitals, without the easily confused 0, O, 1 and I. A new code each time the sheet opens. */
async function changeCode(seed: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${seed}|${Date.now()}`)));
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(bytes.slice(0, 6), (b) => A[b % A.length]).join("");
}

export function Confirm({ open, title, lines, action, destructive, onCancel, onConfirm, need = "editor", code }: {
  open: boolean; title: string; lines: string[]; action: string; destructive?: boolean; onCancel: () => void; onConfirm: () => void; need?: Role;
  /** what is being changed: when given, the person types the code before the action unlocks */
  code?: string;
}) {
  // Every change in the app passes through here, so this is where clearance is checked (Settings, Clearance level)
  const { can, guard, user } = useApp();
  const ok = can(need);
  const [expect, setExpect] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!open || !code) return;
    let live = true;
    changeCode(code).then((c) => { if (live) { setExpect(c); setTyped(""); } });
    return () => { live = false; };
  }, [open, code]);
  const matched = !code || (expect !== null && typed.trim().toUpperCase() === expect);
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <Group footer={ok ? undefined : `Signed in as ${user.name}, ${ROLE_LABEL[user.role]}. This change requires ${ROLE_LABEL[need]} clearance.`}>{lines.map((l, i) => <Row key={i} title={l} chevron={false} />)}</Group>
      {code && ok && (
        <Group header="Confirmation code" footer="Type the code to unlock the change. A new code is issued each time.">
          <div className="code-show" aria-label={`Code ${expect ?? ""}`}>{(expect ?? "······").split("").map((ch, i) => <b key={i}>{ch}</b>)}</div>
          <label className="field"><span>Code</span><input value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase().slice(0, 6))} autoCapitalize="characters" autoComplete="off" spellCheck={false} inputMode="text" placeholder="6 characters" aria-label="Confirmation code" className="mono" /></label>
        </Group>
      )}
      <div className="sheet-actions">
        <button className="btn btn-gray" onClick={onCancel}>Cancel</button>
        <button className={`btn ${destructive ? "btn-red" : "btn-blue"} ${ok && matched ? "" : "btn-locked"}`} disabled={ok && !matched}
          onClick={() => { if (!matched) return; if (guard(need)) onConfirm(); }}>{!ok ? "Not permitted" : action}</button>
      </div>
    </Sheet>
  );
}
