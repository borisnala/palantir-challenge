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

export function Drawer() {
  const { drawer, setDrawer, recents, pending, unread } = useApp();
  const path = usePathname();
  const panel = useRef<HTMLElement>(null);
  const scrim = useRef<HTMLButtonElement>(null);
  const x = useRef(new Spring(-340, 340, 32));
  const drag = useRef<{ x0: number; last: number; t: number } | null>(null);

  const kick = useSpringLoop((dt) => {
    const moving = drag.current ? false : x.current.step(dt);
    const w = panel.current?.offsetWidth || 320;
    const v = Math.min(0, x.current.x);
    if (panel.current) panel.current.style.transform = `translateX(${v}px)`;
    if (scrim.current) { scrim.current.style.opacity = String(1 + v / w); scrim.current.style.pointerEvents = v > -w + 4 ? "auto" : "none"; }
    return moving;
  });

  useEffect(() => {
    const w = panel.current?.offsetWidth || 320;
    x.current.target = drawer ? 0 : -w - 20;
    if (drawer) buzz();
    kick();
  }, [drawer]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setDrawer(false); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const down = (e: React.PointerEvent) => { drag.current = { x0: e.clientX - x.current.x, last: e.clientX, t: e.timeStamp }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const nx = Math.min(0, e.clientX - d.x0);
    if (Math.abs(nx) > 6) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    x.current.v = ((e.clientX - d.last) / Math.max(1, e.timeStamp - d.t)) * 1000; d.last = e.clientX; d.t = e.timeStamp;
    x.current.x = nx; kick();
  };
  const up = () => {
    if (!drag.current) return; drag.current = null;
    const w = panel.current?.offsetWidth || 320;
    if (x.current.x < -w / 3 || x.current.v < -700) setDrawer(false); else { x.current.target = 0; kick(); }
  };
  const badge = (href: string) => (href === "/withdrawals/" ? pending.length : href === "/alerts/" ? unread.size : 0);

  return (
    <>
      <button ref={scrim} className="drawer-scrim" aria-label="Close menu" onClick={() => setDrawer(false)} style={{ opacity: 0, pointerEvents: "none" }} />
      <nav ref={panel} className="drawer" aria-label="Sections" aria-hidden={!drawer} style={{ transform: "translateX(-110%)" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="drawer-head"><span className="brand" aria-label="R+ Risk Desk">R+</span>
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
        <Link href="/account/" className="drawer-account"><Monogram name="DA" size={40} /><span>demo.admin<small>Admin</small></span></Link>
      </nav>
    </>
  );
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
