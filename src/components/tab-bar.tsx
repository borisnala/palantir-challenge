"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CircleCheck, House, Users } from "lucide-react";
import { useApp } from "./app-state";
import { Glass, Spring, stretch, useSpringLoop } from "./liquid";

// iOS 26 tab bar: a floating Liquid Glass capsule. The selection is a drop of glass on springs. Press and drag across
// the bar and the drop lifts into a lens that follows the finger, then snaps to the nearest tab. Scrolling down
// shrinks the bar, scrolling up brings it back.
export function TabBar() {
  const path = usePathname();
  const router = useRouter();
  const { pending, unread } = useApp();
  const tabs = [
    { href: "/", label: "Today", Icon: House, badge: 0 },
    { href: "/approvals/", label: "Approvals", Icon: CircleCheck, badge: pending.length },
    { href: "/clients/", label: "Clients", Icon: Users, badge: 0 },
    { href: "/alerts/", label: "Alerts", Icon: Bell, badge: unread.size },
  ];
  const activeIdx = Math.max(0, tabs.findIndex((t) => (t.href === "/" ? path === "/" : path.startsWith(t.href.replace(/\/$/, "")))));

  const bar = useRef<HTMLDivElement>(null);
  const blob = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLAnchorElement | null)[]>([]);
  const sx = useRef(new Spring(0, 380, 30));
  const sw = useRef(new Spring(0, 380, 30));
  const drag = useRef<{ x0: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [lifted, setLifted] = useState(false);
  const [mini, setMini] = useState(false);

  const kick = useSpringLoop((dt) => {
    const a = sx.current.step(dt), b = sw.current.step(dt);
    const el = blob.current;
    if (el) {
      const { sx: kx, sy: ky } = stretch(sx.current.v);
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

  // Follow the route, and re-measure when the bar changes size (shrink on scroll, rotation).
  useEffect(() => {
    const el = bar.current; if (!el) return;
    let first = true;
    const ro = new ResizeObserver(() => { goTo(activeIdx, first); first = false; });
    ro.observe(el);
    goTo(activeIdx);
    return () => ro.disconnect();
  }, [activeIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let last = scrollY;
    const on = () => {
      const y = scrollY, d = y - last;
      if (Math.abs(d) > 6) { setMini(d > 0 && y > 90); last = y; }
    };
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  const nearest = (clientX: number) => {
    const x = clientX - bar.current!.getBoundingClientRect().left;
    let best = 0, d = Infinity;
    items.current.forEach((t, i) => { if (!t) return; const c = t.offsetLeft + t.offsetWidth / 2; if (Math.abs(c - x) < d) { d = Math.abs(c - x); best = i; } });
    return best;
  };

  const onDown = (e: React.PointerEvent) => { drag.current = { x0: e.clientX, moved: false }; suppressClick.current = false; setLifted(true); };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x0) > 6) { d.moved = true; bar.current?.setPointerCapture(e.pointerId); }
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
    if (i !== activeIdx) router.push(tabs[i].href);
  };

  return (
    <nav className={`tabnav ${mini ? "tab-mini" : ""}`} aria-label="Main">
      <Glass className="tabbar" depth={1.1}>
        <div ref={bar} className="tabtrack" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); suppressClick.current = false; } }}>
          <span ref={blob} className={`tabdrop ${lifted ? "tabdrop-lift" : ""}`} aria-hidden />
          {tabs.map(({ href, label, Icon, badge }, i) => {
            const on = i === activeIdx;
            return (
              <Link key={href} ref={(el) => { items.current[i] = el; }} href={href} className={on ? "tab tab-on" : "tab"} aria-current={on ? "page" : undefined} draggable={false}>
                <span className="tab-icon">
                  <Icon size={24} strokeWidth={on ? 2.1 : 1.8} fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.22 : 0} />
                  {badge > 0 && <b className="tabbadge" aria-label={`${badge} waiting`}>{badge}</b>}
                </span>
                <span className="tab-label">{label}</span>
              </Link>
            );
          })}
        </div>
      </Glass>
    </nav>
  );
}
