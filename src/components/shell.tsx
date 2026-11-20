"use client";

// The app shell, after the Claude iOS app: a side menu instead of a tab bar (every section, then Recents), and a
// search circle at the bottom left. The menu slides on a spring and follows the finger when dragged closed.

import Link from "@/components/nav-link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, Bell, Droplets, Eye, House, Search, Settings, ShieldAlert, SlidersHorizontal, UserRound, Users, X } from "lucide-react";
import { CLIENTS, group, hasProfile, nameOf } from "@/lib/data";
import { Monogram, Pnl } from "./ui";
import { ROLE_LABEL, useApp } from "./app-state";
import { FEATURES, findFeatures, type Feature } from "@/lib/features";
import { Glass, Spring, useSpringLoop } from "./liquid";
import { buzz } from "@/lib/haptics";
import { Wordmark } from "./brand";

const SECTION: Record<string, { label: string; Icon: typeof House }> = {
  risk: { label: "Risk Management", Icon: ShieldAlert }, liquidity: { label: "Liquidity Management", Icon: Droplets },
  withdrawals: { label: "WD Approvals", Icon: ArrowDownUp }, clients: { label: "Client 360", Icon: UserRound },
};

/** One line under each recent screen, so two pages with the same name can be told apart. */
function recentLine(path: string) {
  const seg = path.split("/")[1];
  const login = seg === "clients" ? path.split("/")[2] : null;
  return { sub: login ? `#${login}` : SECTION[seg]?.label ?? "", Icon: SECTION[seg]?.Icon ?? House };
}

const NAV = [
  { href: "/", label: "Morning Digest", Icon: House },
  { href: "/risk/", label: "Risk Management", Icon: ShieldAlert },
  { href: "/liquidity/", label: "Liquidity Management", Icon: Droplets },
  { href: "/withdrawals/", label: "WD Approvals", Icon: ArrowDownUp },
  { href: "/search/", label: "Client 360", Icon: Users },
];

const AREA_ICON: Record<string, typeof House> = { Today: House, Bell, Risk: ShieldAlert, Liquidity: Droplets, Withdrawals: ArrowDownUp, Clients: Users, Account: UserRound };

/** The Claude app's side menu: it sits under the page, and opening it pushes the whole page to the right, where the
 *  page stays visible as a dimmed card with rounded corners. Swipe from the left edge to open, swipe left or tap the
 *  page to close. Everything follows the finger and settles on a spring. */
export function Drawer() {
  const { drawer, setDrawer, recents, pending, unread, watched, user, set } = useApp();
  const path = usePathname();
  const panel = useRef<HTMLElement>(null);
  const x = useRef(new Spring(0, 320, 32)); // 0 closed, 1 open
  const drag = useRef<{ x0: number; y0: number; p0: number; last: number; t: number; v: number; axis: "x" | "y" | null } | null>(null);
  const width = () => panel.current?.offsetWidth || 320;

  const paint = () => {
    const p = Math.max(0, Math.min(1.04, x.current.x));
    const stage = document.querySelector(".stage") as HTMLElement | null;
    const scrim = document.querySelector(".stage-scrim") as HTMLElement | null;
    if (stage) {
      stage.style.transform = p > 0.001 ? `translateX(${p * width()}px)` : "";
      stage.classList.toggle("stage-open", p > 0.001);
    }
    if (scrim) { scrim.style.opacity = String(p * 0.5); scrim.style.pointerEvents = p > 0.02 ? "auto" : "none"; }
    if (panel.current) { panel.current.style.transform = `translateX(${(p - 1) * width() * 0.25}px)`; panel.current.style.visibility = p > 0.001 ? "visible" : "hidden"; }
  };
  const kick = useSpringLoop((dt) => {
    const m = drag.current ? false : x.current.step(dt);
    if (!m && !drag.current) { x.current.x = x.current.target; x.current.v = 0; } // settle exactly, a 0 to 1 spring stops short otherwise
    paint();
    return m;
  });

  useEffect(() => {
    x.current.target = drawer ? 1 : 0;
    // While the menu is open the page behind can not be touched, focused or scrolled
    document.documentElement.classList.toggle("menu-open", drawer);
    const main = document.querySelector("main.screen") as HTMLElement | null;
    if (main) main.inert = drawer;
    if (panel.current) panel.current.inert = !drawer;
    kick();
  }, [drawer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDrawer(false); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edge swipe to open, swipe on the pushed page or the menu to close
  useEffect(() => {
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      const open = x.current.x > 0.5;
      const onPage = (e.target as Element)?.closest?.(".stage-scrim, .drawer");
      if (document.documentElement.classList.contains("gate")) return;
      if ((!open && t.clientX < 32 && !document.querySelector(".sheet-wrap")) || (open && onPage))
        drag.current = { x0: t.clientX, y0: t.clientY, p0: x.current.x, last: t.clientX, t: e.timeStamp, v: 0, axis: null };
    };
    const move = (e: TouchEvent) => {
      const d = drag.current; if (!d) return;
      const t = e.touches[0];
      // Decide once per touch: a mostly vertical move scrolls the menu list, a mostly sideways one moves the menu
      if (!d.axis) {
        const dx = Math.abs(t.clientX - d.x0), dy = Math.abs(t.clientY - d.y0);
        if (dx < 6 && dy < 6) return;
        d.axis = dx > dy ? "x" : "y";
      }
      if (d.axis === "y") { drag.current = null; return; }
      d.v = ((t.clientX - d.last) / Math.max(1, e.timeStamp - d.t)) * 1000; d.last = t.clientX; d.t = e.timeStamp;
      const before = x.current.x;
      x.current.x = Math.max(0, Math.min(1.04, d.p0 + (t.clientX - d.x0) / width()));
      if ((before < 0.5) !== (x.current.x < 0.5)) buzz(); // a tick as the drag passes the point where the menu opens or closes
      x.current.v = d.v / width();
      if (e.cancelable) e.preventDefault();
      kick();
    };
    const end = () => {
      const d = drag.current; if (!d) return;
      drag.current = null;
      if (!d.axis) return; // a tap, not a drag
      const open = d.v > 500 || (d.v > -500 && x.current.x > 0.5);
      if (open !== drawer) { buzz(); setDrawer(open); } else { x.current.target = open ? 1 : 0; kick(); }
    };
    addEventListener("touchstart", start, { passive: true });
    addEventListener("touchmove", move, { passive: false });
    addEventListener("touchend", end);
    addEventListener("touchcancel", end); // the system took the touch: settle open or closed, never stay half way
    return () => { removeEventListener("touchstart", start); removeEventListener("touchmove", move); removeEventListener("touchend", end); removeEventListener("touchcancel", end); };
  }, [drawer, setDrawer, kick]);

  // The menu's search finds features (lib/features.ts), never clients: Client 360 has its own search.
  const [typed, setQ] = useState<string | null>(null);
  const q = drawer ? typed : null; // closing the menu ends the search
  const found = q ? findFeatures(q) : [];
  const openFeature = (f: Feature) => { buzz(); setQ(null); setDrawer(false); if (f.title === "About this demo") set("ui.welcome", "about"); else if (f.title === "Add to Home Screen") set("ui.welcome", "install"); else if (f.settings) set("ui.settings", f.settings); };

  const badge = (href: string) => (href === "/withdrawals/" ? pending.length : href === "/alerts/" ? unread.size : 0);

  return (
    <nav ref={panel} className="drawer" aria-label="Sections" aria-hidden={!drawer}>
      <div className="drawer-head">
        {q === null ? (
          <>
            <Wordmark />
            <button className="glassbtn-link" aria-label="Search features" onClick={() => { buzz(); setQ(""); }}><Glass className="glassbtn round"><Search size={20} strokeWidth={2} /></Glass></button>
          </>
        ) : (
          <div className="drawer-search">
            <label className="drawer-field"><Search size={18} strokeWidth={2.2} aria-hidden />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search features and settings" aria-label="Search features and settings" enterKeyHint="search" />
            </label>
            <button className="drawer-cancel" onClick={() => { buzz(); setQ(null); }}>Cancel</button>
          </div>
        )}
      </div>
      <div className="drawer-scroll">
      {q !== null ? (
        <div className="drawer-nav">
          {found.map((f) => {
            const I = f.settings ? SlidersHorizontal : AREA_ICON[f.where] ?? AREA_ICON[FEATURES.find((x) => x.title === f.where)?.where ?? ""] ?? House;
            const body = <><I size={20} strokeWidth={1.8} /><span className="ellip"><b>{f.title}</b><small>{f.where}</small></span></>;
            return f.href
              ? <Link key={f.title + f.where} href={f.href} transitionTypes={["menu"]} className="drawer-item drawer-two" onClick={() => { buzz(); setQ(null); }}>{body}</Link>
              : <button key={f.title + f.where} className="drawer-item drawer-two" onClick={() => openFeature(f)}>{body}</button>;
          })}
          {q.trim() !== "" && found.length === 0 && <p className="drawer-empty">No feature matches {"\u201c"}{q.trim()}{"\u201d"}.</p>}
          {q.trim() === "" && <p className="drawer-empty">{FEATURES.length} features and settings indexed.</p>}
        </div>
      ) : (<>
      <div className="drawer-nav">
        {NAV.map(({ href, label, Icon }) => {
          const on = href === "/" ? path === "/" : path.startsWith(href.replace(/\/$/, "")) || (href === "/search/" && path.startsWith("/clients"));
          return (
            <Link key={href} href={href} transitionTypes={["menu"]} className={`drawer-item ${on ? "drawer-on" : ""}`} aria-current={on ? "page" : undefined}>
              <Icon size={22} strokeWidth={1.8} /><span>{label}</span>{badge(href) > 0 && <b className="drawer-badge">{badge(href)}</b>}
            </Link>
          );
        })}
      </div>
      {(() => {
        // Recents (clients and analysis screens opened lately) and the watchlist share the space down to the foot.
        const list = recents.filter((r) => r.path !== path).slice(0, 5);
        const seen = new Set(list.map((r) => r.path));
        const watch = [...watched].filter((l) => hasProfile(l) && !seen.has(`/clients/${l}/`)).slice(0, 12);
        return (
          <>
            {list.length > 0 && <p className="drawer-label">Recents</p>}
            {list.length > 0 && (
              <div className="drawer-nav">
                {list.map((r) => {
                  const { sub, Icon } = recentLine(r.path);
                  return (
                    <Link key={r.path} href={r.path} transitionTypes={["menu"]} className="drawer-item drawer-two"><Icon size={20} strokeWidth={1.8} />
                      <span className="ellip"><b>{r.title}</b>{sub && <small>{sub}</small>}</span></Link>
                  );
                })}
              </div>
            )}
            {watch.length > 0 && <p className="drawer-label">Watchlist</p>}
            {watch.length > 0 && (
              <div className="drawer-nav">
                {watch.map((l) => (
                  <Link key={l} href={`/clients/${l}/`} transitionTypes={["menu"]} className="drawer-item drawer-two"><Eye size={20} strokeWidth={1.8} />
                    <span className="ellip"><b>{nameOf(l)}</b><small>#{l}</small></span></Link>
                ))}
              </div>
            )}
          </>
        );
      })()}
      </>)}
      </div>
      <div className="drawer-foot">
        <button className="glassbtn-link drawer-me" aria-label={`Settings, ${user.name}`} onClick={() => { buzz(); set("ui.settings", true); }}>
          <Glass className="drawer-me-cap">
            <span className="avatar-orb">{user.name.replace("demo.", "").slice(0, 2).toUpperCase()}</span>
            <span className="ellip"><b>{user.name}</b><small>{ROLE_LABEL[user.role]}</small></span>
            <Settings size={20} strokeWidth={1.9} aria-hidden />
          </Glass>
        </button>
      </div>
    </nav>
  );
}

/** The dimmed page while the menu is open. Tapping it closes the menu. */
export function StageScrim() {
  const { setDrawer } = useApp();
  return <button className="stage-scrim" aria-label="Close menu" onClick={() => { buzz(); setDrawer(false); }} style={{ opacity: 0, pointerEvents: "none" }} />;
}

/** The bottom search bar, as iOS 26 Mail, Notes and Safari place it (owner 2026-11-19, "that ain't the Apple way"):
 *  a full-width Liquid Glass search capsule floating over the content, and the screen's main action as its own capsule
 *  beside it. Content scrolls under the glass. Inactive while data refreshes. */
let slotEl: HTMLElement | null = null;
const slotSubs = new Set<() => void>();
export const commandSlot = {
  subscribe: (f: () => void) => { slotSubs.add(f); return () => { slotSubs.delete(f); }; },
  get: () => slotEl,
};
export function CommandBar() {
  const path = usePathname();
  const { watched } = useApp();
  const onSearch = path.startsWith("/search");
  // Search (owner 2026-11-20, "act correctly at top bar level"): the bottom capsule opens a search screen. Its field
  // takes the top bar's place with Cancel beside it, the results fill the screen down to the keyboard, the page under
  // it is untouched. The field is focused inside the tap itself, so iOS raises the keyboard at once.
  const [q, setQ] = useState<string | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const open = q !== null;
  const start = () => {
    buzz();
    layer.current?.classList.add("search-on");
    document.documentElement.classList.add("searching");
    input.current?.focus({ preventScroll: true });
    setQ("");
  };
  const close = () => {
    input.current?.blur();
    layer.current?.classList.remove("search-on");
    document.documentElement.classList.remove("searching");
    setQ(null);
  };
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const fit = () => document.documentElement.style.setProperty("--kb", `${vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0}px`);
    fit(); vv?.addEventListener("resize", fit); vv?.addEventListener("scroll", fit);
    return () => { vv?.removeEventListener("resize", fit); vv?.removeEventListener("scroll", fit); document.documentElement.style.setProperty("--kb", "0px"); };
  }, [open]);
  const query = (q ?? "").trim().toLowerCase();
  const match = CLIENTS.filter((c) => !query || `${c.login} ${c.name} ${c.group_now}`.toLowerCase().includes(query));
  const first = match.filter((c) => watched.has(c.login)), rest = match.filter((c) => !watched.has(c.login));
  const row = (c: (typeof CLIENTS)[number]) => (
    <Link key={c.login} href={`/clients/${c.login}/`} transitionTypes={["tab"]} className="row" onClick={() => { buzz(); close(); }}>
      <span className="tile-icon" style={{ color: "transparent" }}><Monogram name={c.name} size={36} /></span>
      <span className="row-main"><span className="row-text"><span className="row-title">{c.name}</span><span className="row-sub">#{c.login} · {group(c.group_now)}</span></span>
        <span className="row-detail"><Pnl v={c.t30} short /></span></span>
    </Link>
  );
  return (
    <>
      <div className="scroll-edge-bottom" aria-hidden />
      <div ref={layer} className="search-layer" role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="Search clients" aria-hidden={!open}>
        <div className="search-head">
          <label className="search-field"><Search size={18} strokeWidth={2.2} aria-hidden />
            <input ref={input} value={q ?? ""} onChange={(e) => setQ(e.target.value)} placeholder="Clients, logins, groups" aria-label="Search clients, logins, groups"
              enterKeyHint="search" inputMode="search" autoCapitalize="none" autoComplete="off" spellCheck={false} tabIndex={open ? 0 : -1}
              onKeyDown={(e) => { if (e.key === "Escape") close(); if (e.key === "Enter") input.current?.blur(); }} />
            {q ? <button className="search-clear" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Clear"><X size={13} strokeWidth={3} /></button> : null}
          </label>
          <button className="search-cancel" onClick={() => { buzz(); close(); }} tabIndex={open ? 0 : -1}>Cancel</button>
        </div>
        {open && (
          <div className="search-results">
            {first.length > 0 && <section className="grp"><h2 className="grp-head">{query ? "On the watchlist" : "Watchlist"} · {first.length}</h2><div className="grp-body">{first.map(row)}</div></section>}
            {rest.length > 0 && <section className="grp"><h2 className="grp-head">{query ? "Other clients" : "All clients"} · {rest.length}</h2><div className="grp-body">{rest.map(row)}</div><p className="grp-foot">Amounts are T30, client profit over 30 days.</p></section>}
            {match.length === 0 && <p className="drawer-empty">No client matches {"\u201c"}{q}{"\u201d"}. Enter a login, for example 99000003.</p>}
          </div>
        )}
      </div>
      <div className={`cmdbar ${onSearch ? "cmd-nofield" : ""}`} role="toolbar" aria-label="Search and actions">
        {!onSearch && (
          <button className="glassbtn-link cmd-link" aria-label="Search clients" onClick={start}>
            <Glass className="cmd-field"><Search size={18} strokeWidth={2.2} aria-hidden /><span>Search clients, logins, groups</span></Glass>
          </button>
        )}
        <span className="cmd-slot" ref={(el) => { if (slotEl !== el) { slotEl = el; slotSubs.forEach((f) => f()); } }} />
      </div>
    </>
  );
}
