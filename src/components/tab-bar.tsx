"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, Droplets, House, Search, ShieldAlert } from "lucide-react";
import { useApp } from "./app-state";
import { Glass, Spring, stretch, useSpringLoop } from "./liquid";

// iOS 26 tab bar: four tabs in one glass capsule, search in its own glass circle beside it (as in Music and Safari).
// The bar stays put. The selection is a drop of glass on springs, and you can drag it across the tabs.
const TABS = [
  { href: "/", label: "Today", Icon: House },
  { href: "/risk/", label: "Risk", Icon: ShieldAlert },
  { href: "/liquidity/", label: "Liquidity", Icon: Droplets },
  { href: "/withdrawals/", label: "Withdrawals", Icon: ArrowDownUp },
];

const sectionOf = (path: string) => {
  if (path.startsWith("/search") || path.startsWith("/clients")) return 4;
  const i = TABS.findIndex((t) => t.href !== "/" && path.startsWith(t.href.replace(/\/$/, "")));
  return i >= 0 ? i : path === "/" ? 0 : -1;
};

export function TabBar() {
  const path = usePathname();
  const router = useRouter();
  const { pending } = useApp();
  const active = sectionOf(path);

  const bar = useRef<HTMLDivElement>(null);
  const blob = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLAnchorElement | null)[]>([]);
  const sx = useRef(new Spring(0, 420, 34));
  const sw = useRef(new Spring(0, 420, 34));
  const drag = useRef<{ x0: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [lifted, setLifted] = useState(false);

  const kick = useSpringLoop((dt) => {
    const a = sx.current.step(dt), b = sw.current.step(dt);
    const el = blob.current;
    if (el) {
      const { sx: kx, sy: ky } = stretch(sx.current.v, 0.1);
      el.style.width = `${sw.current.x}px`;
      el.style.transform = `translateX(${sx.current.x}px) scale(${kx}, ${ky})`;
    }
    return a || b;
  });

  const goTo = (i: number, instant = false) => {
    const t = items.current[i]; if (!t) return;
    sx.current.target = t.offsetLeft; sw.current.target = t.offsetWidth;
    if (instant) { sx.current.x = t.offsetLeft; sw.current.x = t.offsetWidth; sx.current.v = 0; sw.current.v = 0; }
    kick();
  };

  useEffect(() => {
    const el = bar.current; if (!el || active < 0 || active > 3) return;
    let first = true;
    const ro = new ResizeObserver(() => { goTo(active, first); first = false; });
    ro.observe(el);
    goTo(active);
    return () => ro.disconnect();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const nearest = (clientX: number) => {
    const x = clientX - bar.current!.getBoundingClientRect().left;
    let best = 0, d = Infinity;
    items.current.forEach((t, i) => { if (!t) return; const c = t.offsetLeft + t.offsetWidth / 2; if (Math.abs(c - x) < d) { d = Math.abs(c - x); best = i; } });
    return best;
  };
  const onDown = (e: React.PointerEvent) => { drag.current = { x0: e.clientX, moved: false }; suppressClick.current = false; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x0) > 8) { d.moved = true; setLifted(true); bar.current?.setPointerCapture(e.pointerId); }
    if (!d.moved) return;
    const width = bar.current!.offsetWidth, w = sw.current.target || 80;
    sx.current.target = Math.max(0, Math.min(width - w, e.clientX - bar.current!.getBoundingClientRect().left - w / 2));
    kick();
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null; setLifted(false);
    if (!d?.moved) return;
    suppressClick.current = true;
    const i = nearest(e.clientX);
    goTo(i);
    if (i !== active) router.push(TABS[i].href);
  };

  return (
    <nav className="tabnav" aria-label="Main">
      <Glass className="tabbar" depth={0.6}>
        <div ref={bar} className="tabtrack" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); suppressClick.current = false; } }}>
          <span ref={blob} className={`tabdrop ${lifted ? "tabdrop-lift" : ""} ${active < 0 || active > 3 ? "tabdrop-off" : ""}`} aria-hidden />
          {TABS.map(({ href, label, Icon }, i) => {
            const on = i === active;
            const badge = href === "/withdrawals/" ? pending.length : 0;
            return (
              <Link key={href} ref={(el) => { items.current[i] = el; }} href={href} className={on ? "tab tab-on" : "tab"} aria-current={on ? "page" : undefined} draggable={false}>
                <span className="tab-icon">
                  <Icon size={23} strokeWidth={on ? 2.2 : 1.8} />
                  {badge > 0 && <b className="tabbadge" aria-label={`${badge} waiting`}>{badge}</b>}
                </span>
                <span className="tab-label">{label}</span>
              </Link>
            );
          })}
        </div>
      </Glass>
      <Link href="/search/" className="glassbtn-link searchorb-link" aria-label="Search clients" aria-current={active === 4 ? "page" : undefined}>
        <Glass className={`searchorb ${active === 4 ? "searchorb-on" : ""}`} depth={0.6}><Search size={22} strokeWidth={2.2} /></Glass>
      </Link>
    </nav>
  );
}
