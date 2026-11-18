"use client";

// iOS 26 building blocks: large title with the scroll-edge blur, round glass bar buttons, inset grouped lists, rows,
// a floating glass sheet you can drag down, a liquid switch and a segmented control with a liquid thumb.
// Sizes follow Apple's type ramp (17 body, 15 subhead, 13 footnote) and 44 pt minimum touch targets.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, Ellipsis, Link2, Menu, Minus, Plus, RefreshCw, Share, UserRound } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useApp } from "./app-state";
import { Glass, Spring, stretch, useSpringLoop } from "./liquid";
import { buzz } from "@/lib/haptics";

/** Back goes to the screen you came from, or to the parent when the page was opened directly. */
function BackButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const { canGoBack } = useApp();
  return (
    <button className="glassbtn-link" aria-label={`Back to ${label}`}
      onClick={() => (canGoBack() ? router.back() : router.push(href))}>
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
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [status, setStatus] = useState(false);
  const share = async () => {
    setMenu(false);
    try { if (navigator.share) { await navigator.share({ title: `${title} · Risk Tool`, url: location.href }); return; } } catch { return; }
    navigator.clipboard?.writeText(location.href).then(() => say("Link copied"), () => {});
  };
  useEffect(() => { visit(path, title, eyebrow); }, [path, title]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="scroll-edge" aria-hidden />
      <header className="topbar">
        {back ? <BackButton href={back.href} label={back.label} /> : (
          <button className="glassbtn-link" aria-label="Menu" onClick={() => setDrawer(true)}>
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
              <button role="menuitem" onClick={share}><Share size={20} strokeWidth={1.9} />Share</button>
              <button role="menuitem" onClick={() => { setMenu(false); navigator.clipboard?.writeText(location.href).then(() => say("Link copied"), () => {}); }}><Link2 size={20} strokeWidth={1.9} />Copy link</button>
              <button role="menuitem" onClick={() => { setMenu(false); set("refreshedAt", new Date().toISOString()); say("Data refreshed"); }}><RefreshCw size={20} strokeWidth={1.9} />Refresh data</button>
              <i className="popmenu-sep" />
              <button role="menuitem" onClick={() => { setMenu(false); router.push("/account/"); }}><UserRound size={20} strokeWidth={1.9} />Account</button>
            </Glass>
          </>
        )}
      </header>
      <Sheet open={status} onClose={() => setStatus(false)} title="Data status">
        <Group header="Workload">
          <div className="usage"><span className="top"><b>Withdrawals pending</b><span className="muted">{pending.length} of {wdRows.length}</span></span><span className="hbar"><i style={{ width: `${(pending.length / Math.max(1, wdRows.length)) * 100}%` }} /></span></div>
          <div className="usage"><span className="top"><b>Unread alerts</b><span className="muted">{unread.size}</span></span><span className="hbar"><i style={{ width: `${Math.min(100, unread.size * 14)}%` }} /></span></div>
        </Group>
        <Group header="Source" footer="Demonstration data from the Global Risk Portal frontend demo. Snapshot 13 Nov 2026.">
          <Row title="Screen" detail={title} chevron={false} />
          <Row title="Mode" detail="Shadow, read only" chevron={false} />
        </Group>
      </Sheet>
      {trailing && <div className="dock">{trailing}</div>}
    </>
  );
}

/** The screen's main action, as the black "New session" pill of the Claude app. */
export function BarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button className="pillbtn" onClick={onClick}>{children}</button>;
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

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  // mounted keeps the sheet in the DOM while it slides out. The slide runs on a spring, and a drag on the top bar
  // pulls the sheet with the finger. Let go past a third of its height, or flick down, and it closes. Otherwise it
  // springs back with a little overshoot.
  const [mounted, setMounted] = useState(open);
  const [stack, setStack] = useState<SheetPage[]>([]);
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
    <div className="sheet-wrap">
      <button ref={scrim} className="sheet-scrim" aria-label="Close" onClick={onClose} />
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={title} style={{ transform: "translateY(100%)" }}>
        <div className="sheet-grip" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span className="grabber" aria-hidden />
          <div className="sheet-bar">
            {stack.length ? (
              <button className="glassbtn-link" onPointerDown={(e) => e.stopPropagation()} onClick={() => setStack(stack.slice(0, -1))} aria-label="Back">
                <Glass className="glassbtn round"><ChevronLeft size={24} strokeWidth={2.2} /></Glass>
              </button>
            ) : (
              <button className="glassbtn-link" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} aria-label="Close">
                <Glass className="glassbtn round"><span className="xmark" aria-hidden /></Glass>
              </button>
            )}
            <span className="nav-title">{stack.length ? stack[stack.length - 1].title : title}</span>
            <span />
          </div>
        </div>
        <SheetNav.Provider value={(t, node) => { buzz(); setStack((x) => [...x, { title: t, node }]); }}>
          <div key={stack.length} className={`sheet-body ${stack.length ? "sheet-pushed" : ""}`}>{stack.length ? stack[stack.length - 1].node : children}</div>
        </SheetNav.Provider>
      </div>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "switch-on" : ""}`} onClick={onChange}><i /></button>;
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  // The thumb is a drop of glass on a spring: it stretches while it travels and settles with a small wobble.
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const sx = useRef(new Spring(-1, 360, 26));
  const kick = useSpringLoop((dt) => {
    const m = sx.current.step(dt);
    if (thumb.current) { const { sx: kx, sy: ky } = stretch(sx.current.v, 0.25); thumb.current.style.transform = `translateX(${sx.current.x}px) scale(${kx}, ${ky})`; }
    return m;
  });
  useEffect(() => {
    const el = track.current; if (!el) return;
    const place = (instant: boolean) => {
      const w = (el.clientWidth - 4) / options.length;
      if (thumb.current) thumb.current.style.width = `${w}px`;
      sx.current.target = i * w;
      if (instant || sx.current.x < 0) { sx.current.x = i * w; sx.current.v = 0; }
      kick();
    };
    place(false);
    const ro = new ResizeObserver(() => place(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, [i, options.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={track} className="segmented" role="tablist" aria-label={label} style={{ ["--n" as string]: options.length }}>
      <span ref={thumb} className="seg-thumb" aria-hidden />
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={o.v === value} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

/** The iOS stepper: minus and plus in one capsule, the value beside it. */
export function Stepper({ value, onChange, step = 1, min = -Infinity, max = Infinity, digits = 0, label }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; digits?: number; label: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Number(v.toFixed(Math.max(digits, 2))))));
  return (
    <span className="stepper-wrap">
      <span className="stepper-val num">{value.toFixed(digits)}</span>
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
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

/** The confirmation toast at the bottom, above the tab bar. */
export function Toast() {
  const { toast } = useApp();
  return <div className={`toast ${toast ? "toast-on" : ""}`} role="status" aria-live="polite">{toast}</div>;
}

/** Confirm sheet for anything that changes a setting: says what will change, then Cancel or the action. */
export function Confirm({ open, title, lines, action, destructive, onCancel, onConfirm }: {
  open: boolean; title: string; lines: string[]; action: string; destructive?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <Group>{lines.map((l, i) => <Row key={i} title={l} chevron={false} />)}</Group>
      <div className="sheet-actions">
        <button className="btn btn-gray" onClick={onCancel}>Cancel</button>
        <button className={`btn ${destructive ? "btn-red" : "btn-blue"}`} onClick={onConfirm}>{action}</button>
      </div>
    </Sheet>
  );
}
