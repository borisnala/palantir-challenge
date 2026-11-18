"use client";

// The app shell, after the Claude iOS app: a side menu instead of a tab bar (every section, then Recents), and a
// search circle at the bottom left. The menu slides on a spring and follows the finger when dragged closed.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowDownUp, Bell, Clock, Droplets, House, Search, ShieldAlert, Users } from "lucide-react";
import { useApp } from "./app-state";
import { Glass, Spring, useSpringLoop } from "./liquid";
import { buzz } from "@/lib/haptics";
import { Monogram } from "./ui";

const NAV = [
  { href: "/", label: "Today", Icon: House },
  { href: "/risk/", label: "Risk", Icon: ShieldAlert },
  { href: "/liquidity/", label: "Liquidity", Icon: Droplets },
  { href: "/withdrawals/", label: "Withdrawals", Icon: ArrowDownUp },
  { href: "/search/", label: "Clients", Icon: Users },
  { href: "/alerts/", label: "Alerts", Icon: Bell },
];

/** The Claude app's side menu: it sits under the page, and opening it pushes the whole page to the right, where the
 *  page stays visible as a dimmed card with rounded corners. Swipe from the left edge to open, swipe left or tap the
 *  page to close. Everything follows the finger and settles on a spring. */
export function Drawer() {
  const { drawer, setDrawer, recents, pending, unread } = useApp();
  const path = usePathname();
  const panel = useRef<HTMLElement>(null);
  const x = useRef(new Spring(0, 320, 32)); // 0 closed, 1 open
  const drag = useRef<{ x0: number; p0: number; last: number; t: number; v: number } | null>(null);
  const width = () => panel.current?.offsetWidth || 320;

  const paint = () => {
    const p = Math.max(0, Math.min(1.04, x.current.x));
    const stage = document.querySelector(".stage") as HTMLElement | null;
    const scrim = document.querySelector(".stage-scrim") as HTMLElement | null;
    if (stage) {
      stage.style.transform = p > 0.001 ? `translateX(${p * width()}px)` : "";
      stage.classList.toggle("stage-open", p > 0.001);
    }
    if (scrim) { scrim.style.opacity = String(p * 0.35); scrim.style.pointerEvents = p > 0.02 ? "auto" : "none"; }
    if (panel.current) panel.current.style.transform = `translateX(${(p - 1) * width() * 0.25}px)`;
  };
  const kick = useSpringLoop((dt) => {
    const m = drag.current ? false : x.current.step(dt);
    if (!m && !drag.current) { x.current.x = x.current.target; x.current.v = 0; } // settle exactly, a 0 to 1 spring stops short otherwise
    paint();
    return m;
  });

  useEffect(() => { x.current.target = drawer ? 1 : 0; if (drawer) buzz(); kick(); }, [drawer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDrawer(false); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edge swipe to open, swipe on the pushed page or the menu to close
  useEffect(() => {
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      const open = x.current.x > 0.5;
      const onPage = (e.target as Element)?.closest?.(".stage-scrim, .drawer");
      if ((!open && t.clientX < 24 && !document.querySelector(".sheet-wrap")) || (open && onPage))
        drag.current = { x0: t.clientX, p0: x.current.x, last: t.clientX, t: e.timeStamp, v: 0 };
    };
    const move = (e: TouchEvent) => {
      const d = drag.current; if (!d) return;
      const t = e.touches[0];
      d.v = ((t.clientX - d.last) / Math.max(1, e.timeStamp - d.t)) * 1000; d.last = t.clientX; d.t = e.timeStamp;
      x.current.x = Math.max(0, Math.min(1.04, d.p0 + (t.clientX - d.x0) / width()));
      x.current.v = d.v / width();
      if (e.cancelable) e.preventDefault();
      kick();
    };
    const end = () => {
      const d = drag.current; if (!d) return;
      drag.current = null;
      const open = d.v > 500 || (d.v > -500 && x.current.x > 0.5);
      if (open !== drawer) setDrawer(open); else { x.current.target = open ? 1 : 0; kick(); }
    };
    addEventListener("touchstart", start, { passive: true });
    addEventListener("touchmove", move, { passive: false });
    addEventListener("touchend", end);
    return () => { removeEventListener("touchstart", start); removeEventListener("touchmove", move); removeEventListener("touchend", end); };
  }, [drawer, setDrawer, kick]);

  const badge = (href: string) => (href === "/withdrawals/" ? pending.length : href === "/alerts/" ? unread.size : 0);

  return (
    <nav ref={panel} className="drawer" aria-label="Sections" aria-hidden={!drawer}>
      <div className="drawer-head">
        <Wordmark />
        <Link href="/search/" className="glassbtn-link" aria-label="Search clients"><Glass className="glassbtn round"><Search size={20} strokeWidth={2} /></Glass></Link>
      </div>
      <div className="drawer-nav">
        {NAV.map(({ href, label, Icon }) => {
          const on = href === "/" ? path === "/" : path.startsWith(href.replace(/\/$/, "")) || (href === "/search/" && path.startsWith("/clients"));
          return (
            <Link key={href} href={href} className={`drawer-item ${on ? "drawer-on" : ""}`} aria-current={on ? "page" : undefined}>
              <Icon size={22} strokeWidth={1.8} /><span>{label}</span>{badge(href) > 0 && <b className="drawer-badge">{badge(href)}</b>}
            </Link>
          );
        })}
      </div>
      {recents.length > 1 && (
        <>
          <p className="drawer-label">Recents</p>
          <div className="drawer-nav">
            {recents.filter((r) => r.path !== path).slice(0, 5).map((r) => (
              <Link key={r.path} href={r.path} className="drawer-item"><Clock size={20} strokeWidth={1.8} /><span className="ellip">{r.title}</span></Link>
            ))}
          </div>
        </>
      )}
      <Link href="/account/" className="drawer-account"><Monogram name="DA" size={40} /><span>demo.admin<small>Administrator</small></span></Link>
    </nav>
  );
}

/** The wordmark, drawn the way Luma draws theirs: lowercase, soft, a small mark raised at the top right. */
export function Wordmark() {
  return <span className="wordmark" aria-label="Risk Tool">risk tool<sup aria-hidden>+</sup></span>;
}

/** The dimmed page while the menu is open. Tapping it closes the menu. */
export function StageScrim() {
  const { setDrawer } = useApp();
  return <button className="stage-scrim" aria-label="Close menu" onClick={() => setDrawer(false)} style={{ opacity: 0, pointerEvents: "none" }} />;
}

export function SearchOrb() {
  const path = usePathname();
  if (path.startsWith("/search")) return null;
  return (
    <Link href="/search/" className="glassbtn-link searchdock" aria-label="Search clients">
      <Glass className="glassbtn round big"><Search size={22} strokeWidth={2} /></Glass>
    </Link>
  );
}
