"use client";

// The app shell, after the Claude iOS app: a side menu instead of a tab bar (every section, then Recents), and a
// search circle at the bottom left. The menu slides on a spring and follows the finger when dragged closed.

import Link from "@/components/nav-link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, Bell, ChevronDown, Droplets, Eye, House, Search, Settings, ShieldAlert, SlidersHorizontal, UserRound, Users, X } from "lucide-react";
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
  const x = useRef(new Spring(0, 480, 42, 0.002)); // 0 closed, 1 open, a quick critically damped slide
  const drag = useRef<{ x0: number; y0: number; p0: number; last: number; t: number; v: number; axis: "x" | "y" | null } | null>(null);
  const width = () => panel.current?.offsetWidth || 320;
  const held = useRef<{ y: number; path: string } | null>(null);
  const lastTouch = useRef(0), still = useRef(0), lastX = useRef(0);
  const [moreW, setMoreW] = useState(false);

  const paint = () => {
    const p = Math.max(0, Math.min(1.04, x.current.x));
    const stage = document.querySelector(".stage") as HTMLElement | null;
    const scrim = document.querySelector(".stage-scrim") as HTMLElement | null;
    if (stage) {
      stage.style.transform = p > 0.001 ? `translateX(${p * width()}px)` : "";
      // The open card is one screen tall, which would clamp the page's scroll to the top (owner 2026-11-20, "the
      // page scrolled up again"). Hold the scroll as an offset on main while open and put it back on close.
      const open = p > 0.001, was = stage.classList.contains("stage-open");
      if (open && !was) { held.current = { y: window.scrollY, path: location.pathname }; stage.style.setProperty("--menu-y", `${-window.scrollY}px`); }
      stage.classList.toggle("stage-open", open);
      if (!open && was) {
        stage.style.removeProperty("--menu-y");
        if (held.current && held.current.path === location.pathname) window.scrollTo(0, held.current.y);
        held.current = null;
      }
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
  useEffect(() => { document.querySelector<HTMLElement>(".stage")?.style.removeProperty("--menu-y"); setDrawer(false); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edge swipe to open, swipe on the pushed page or the menu to close
  useEffect(() => {
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      // A drag whose touchend never arrived (iOS can drop it) is dropped here, and the menu settles first
      if (drag.current) { drag.current = null; x.current.target = drawer ? 1 : 0; kick(); }
      const open = x.current.x > 0.5;
      const onPage = (e.target as Element)?.closest?.(".stage-scrim, .drawer");
      if (document.documentElement.classList.contains("gate")) return;
      if ((!open && t.clientX < 20 && !document.querySelector(".sheet-wrap")) || (open && onPage))
        drag.current = { x0: t.clientX, y0: t.clientY, p0: x.current.x, last: t.clientX, t: e.timeStamp, v: 0, axis: null };
    };
    const move = (e: TouchEvent) => {
      const d = drag.current; if (!d) return;
      const t = e.touches[0];
      // Decide once per touch: a mostly vertical move scrolls the menu list, a mostly sideways one moves the menu
      if (!d.axis) {
        const dx = Math.abs(t.clientX - d.x0), dy = Math.abs(t.clientY - d.y0);
        if (dx < 10 && dy < 10) return;
        d.axis = dx > dy * 1.5 ? "x" : "y";
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
    const end = (e?: Event) => {
      const d = drag.current; if (!d) return;
      drag.current = null;
      // The system took the touch (iOS Safari's own back swipe from the edge sends touchcancel): put the menu back where
      // it was, never open it on a gesture the app did not own (owner 2026-11-21, "it stops at 80 percent")
      if (e?.type === "touchcancel") { x.current.target = drawer ? 1 : 0; kick(); return; }
      // A tap, not a drag: still settle, so a menu left half way by a lost touch never stays there (owner 2026-11-21)
      if (!d.axis) { x.current.target = drawer ? 1 : 0; kick(); return; }
      const open = (d.v > 500 && x.current.x > 0.2) || (d.v > -500 && x.current.x > 0.5);
      if (open !== drawer) { buzz(); setDrawer(open); } else { x.current.target = open ? 1 : 0; kick(); }
    };
    addEventListener("touchstart", start, { passive: true });
    addEventListener("touchmove", move, { passive: false });
    addEventListener("touchend", end);
    addEventListener("touchcancel", end); // the system took the touch: settle open or closed, never stay half way
    const close = () => { drag.current = null; x.current.target = 0; kick(); };
    addEventListener("menu-close", close);
    // Watchdog (owner 2026-11-21, "sometimes it is still stuck"): a drag with no touch event for 0.8 s lost its
    // touchend, so it is dropped. Whenever no finger drags, the menu rests exactly open or closed, never in between.
    const seen = () => { lastTouch.current = performance.now(); };
    addEventListener("touchstart", seen, { passive: true });
    addEventListener("touchmove", seen, { passive: true });
    const dog = setInterval(() => {
      if (drag.current && performance.now() - lastTouch.current > 800) drag.current = null;
      if (drag.current) { still.current = 0; return; }
      const want = drawer ? 1 : 0;
      if (Math.abs(x.current.x - want) <= 0.001) { still.current = 0; return; }
      // Off its resting point: spring there, and if two checks in a row (0.5 s) find it not moving, put it there
      if (Math.abs(x.current.x - lastX.current) < 0.0005) still.current += 1; else still.current = 0;
      lastX.current = x.current.x;
      x.current.target = want;
      if (still.current >= 2) { x.current.x = want; x.current.v = 0; still.current = 0; paint(); } else kick();
    }, 250);
    return () => { clearInterval(dog); removeEventListener("touchstart", seen); removeEventListener("touchmove", seen); removeEventListener("menu-close", close); removeEventListener("touchstart", start); removeEventListener("touchmove", move); removeEventListener("touchend", end); removeEventListener("touchcancel", end); };
  }, [drawer, setDrawer, kick]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const list = recents.filter((r) => r.path !== path).slice(0, 3);
        const seen = new Set(list.map((r) => r.path));
        const allW = [...watched].filter((l) => hasProfile(l) && !seen.has(`/clients/${l}/`));
        const watch = moreW ? allW : allW.slice(0, 5);
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
                {allW.length > 5 && (
                  <button className="drawer-item drawer-more" onClick={() => { buzz(); setMoreW(!moreW); }}>
                    <ChevronDown size={20} strokeWidth={1.8} style={{ transform: moreW ? "rotate(180deg)" : undefined, transition: "transform .3s" }} />
                    <span className="ellip"><b>{moreW ? "Show fewer" : `${allW.length - 5} more`}</b></span>
                  </button>
                )}
              </div>
            )}
          </>
        );
      })()}
      </>)}
        <p className="drawer-credit">Risk Tool · Palantir design challenge, Lens B<br />Boris Nala · Demonstration data</p>
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
  return <button className="stage-scrim" aria-label="Close menu" onClick={() => { buzz(); setDrawer(false); dispatchEvent(new Event("menu-close")); }} style={{ opacity: 0, pointerEvents: "none" }} />;
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
/** A client as a search result (owner 2026-11-20, "a preview of each client, not a crop of Client 360"): who it is,
 *  three figures a dealer checks first, and what is happening on the account now. */
function ClientPreview({ c, onPick }: { c: (typeof CLIENTS)[number]; onPick: () => void }) {
  const live = ((c.open as { positions?: number } | null)?.positions ?? 0) > 0;
  return (
    <Link href={`/clients/${c.login}/`} transitionTypes={["tab"]} className="cpv" onClick={onPick}>
      <span className="cpv-top">
        <Monogram name={c.name} size={40} />
        <span className="cpv-id"><b>{c.name}</b><small>#{c.login} · {group(c.group_now)}</small></span>
        <span className="cpv-tags">{live && <i className="cpv-live">Live</i>}{c.momentum && <i>{c.momentum.charAt(0).toUpperCase() + c.momentum.slice(1)}</i>}</span>
      </span>
      <span className="cpv-figs">
        <span><small>T30</small><Pnl v={c.t30 ?? 0} short /></span>
        <span><small>Floating</small><Pnl v={c.fpl} short /></span>
        <span><small>Win rate</small><b>{Math.round(c.win_rate ?? 0)}%</b></span>
        <span><small>Lots 30 d</small><b>{Math.round(c.lots_30d ?? 0)}</b></span>
      </span>
    </Link>
  );
}

export function CommandBar() {
  const path = usePathname();
  const { recents } = useApp();
  const onSearch = path.startsWith("/search");
  // Search (owner 2026-11-20, "expansion of the search bar with liquid glass"): the bottom capsule grows into the search
  // field at the top bar on a spring, the glass stretching on the way, Cancel fades in beside it and the keyboard
  // rises in the same tap. Results are client previews. A tap anywhere outside the field and results, or Cancel,
  // shrinks the field back into the capsule.
  const [q, setQ] = useState<string | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLLabelElement>(null);
  const capsule = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const open = q !== null;
  // FLIP: the field starts where the capsule is and springs to its own place
  const travel = (fromCapsule: boolean) => {
    const f = field.current, c = capsule.current; if (!f || !c) return;
    const a = c.getBoundingClientRect(), z = f.getBoundingClientRect();
    const dx = a.left - z.left, dy = a.top - z.top, sx = a.width / z.width, sy = a.height / z.height;
    const from = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    f.style.transition = "none";
    f.style.transform = fromCapsule ? from : "none";
    void f.offsetWidth;
    f.style.transition = "transform .5s cubic-bezier(.2,1.12,.3,1), border-radius .5s";
    f.style.transform = fromCapsule ? "none" : from;
  };
  const start = () => {
    buzz();
    layer.current?.classList.add("search-on");
    document.documentElement.classList.add("searching");
    input.current?.focus({ preventScroll: true });
    travel(true);
    setQ("");
  };
  const close = () => {
    input.current?.blur();
    travel(false);
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
  const match = query ? CLIENTS.filter((c) => `${c.login} ${c.name} ${c.group_now}`.toLowerCase().includes(query)) : [];
  const recent = recents.map((r) => r.path.match(/\/clients\/(\d+)/)?.[1]).filter(Boolean).map((l) => CLIENTS.find((c) => String(c.login) === l)).filter((c): c is (typeof CLIENTS)[number] => !!c).slice(0, 3);
  const movers = [...CLIENTS].sort((x, y) => Math.abs(y.t30) - Math.abs(x.t30)).filter((c) => !recent.includes(c)).slice(0, 4);
  const pick = () => { buzz(); close(); };
  return (
    <>
      {!onSearch && <div className="scroll-edge-bottom" aria-hidden />}
      <div ref={layer} className="search-layer" role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="Search clients" aria-hidden={!open}
        onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as Element).classList?.contains("search-results")) close(); }}>
        <div className="search-head">
          <label ref={field} className="search-field lg"><Search size={18} strokeWidth={2.2} aria-hidden />
            <input ref={input} value={q ?? ""} onChange={(e) => setQ(e.target.value)} placeholder="Clients, logins, groups" aria-label="Search clients, logins, groups"
              enterKeyHint="search" inputMode="search" autoCapitalize="none" autoComplete="off" spellCheck={false} tabIndex={open ? 0 : -1}
              onKeyDown={(e) => { if (e.key === "Escape") close(); if (e.key === "Enter") input.current?.blur(); }} />
            {q ? <button className="search-clear" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Clear"><X size={13} strokeWidth={3} /></button> : null}
          </label>
          <button className="search-cancel" onClick={() => { buzz(); close(); }} tabIndex={open ? 0 : -1}>Cancel</button>
        </div>
        {open && (
          <div className="search-results">
            {query === "" && recent.length > 0 && <section className="cpv-sec"><h2 className="grp-head">Recently viewed</h2>{recent.map((c) => <ClientPreview key={c.login} c={c} onPick={pick} />)}</section>}
            {query === "" && <section className="cpv-sec"><h2 className="grp-head">Largest 30 day moves</h2>{movers.map((c) => <ClientPreview key={c.login} c={c} onPick={pick} />)}</section>}
            {query !== "" && match.length > 0 && <section className="cpv-sec"><h2 className="grp-head">{match.length} {match.length === 1 ? "client" : "clients"}</h2>{match.map((c) => <ClientPreview key={c.login} c={c} onPick={pick} />)}</section>}
            {query !== "" && match.length === 0 && <p className="drawer-empty">No client matches {"\u201c"}{q}{"\u201d"}. Enter a login, for example 99000003.</p>}
          </div>
        )}
      </div>
      <div className={`cmdbar ${onSearch ? "cmd-nofield" : ""}`} role="toolbar" aria-label="Search and actions">
        {!onSearch && (
          <button ref={capsule} className="glassbtn-link cmd-link" aria-label="Search clients" onClick={start}>
            <Glass className="cmd-field"><Search size={18} strokeWidth={2.2} aria-hidden /><span>Search clients, logins, groups</span></Glass>
          </button>
        )}
        <span className="cmd-slot" ref={(el) => { if (slotEl !== el) { slotEl = el; slotSubs.forEach((f) => f()); } }} />
      </div>
    </>
  );
}
