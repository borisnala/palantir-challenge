"use client";

// iOS 26 building blocks: large title with the scroll-edge blur, round glass bar buttons, inset grouped lists, rows,
// a floating glass sheet you can drag down, a liquid switch and a segmented control with a liquid thumb.
// Sizes follow Apple's type ramp (17 body, 15 subhead, 13 footnote) and 44 pt minimum touch targets.

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Glass, Spring, stretch, useSpringLoop } from "./liquid";

export function NavBar({ title, eyebrow, trailing, back, large = true }: {
  title: string; eyebrow?: string; trailing?: React.ReactNode; back?: { href: string; label: string }; large?: boolean;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(!large);
  useEffect(() => {
    if (!large || !sentinel.current) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { rootMargin: "-52px 0px 0px 0px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [large]);

  return (
    <>
      {/* iOS 26 has no bar background: content blurs and fades under the top edge instead */}
      <div className="scroll-edge" aria-hidden />
      <div className={`navbar ${scrolled ? "navbar-on" : ""}`}>
        <div className="navbar-row">
          <div className="nav-side">
            {back && (
              <Link href={back.href} aria-label={`Back to ${back.label}`} className="glassbtn-link">
                <Glass className="glassbtn round"><ChevronLeft size={24} strokeWidth={2.4} /></Glass>
              </Link>
            )}
          </div>
          <span className="nav-title" aria-hidden={large && !scrolled}>{title}</span>
          <div className="nav-side nav-trailing">{trailing}</div>
        </div>
      </div>
      {large && (
        <header className="largetitle">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          <div ref={sentinel} className="sentinel" />
        </header>
      )}
    </>
  );
}

/** A glass capsule button for the nav bar, such as "Read All". */
export function BarButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button className="glassbtn-link" onClick={onClick}><Glass className="glassbtn capsule">{children}</Glass></button>;
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
      {icon && <span className="tile-icon" style={{ background: tint }}>{icon}</span>}
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

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  // mounted keeps the sheet in the DOM while it slides out. The slide runs on a spring, and a drag on the top bar
  // pulls the sheet with the finger. Let go past a third of its height, or flick down, and it closes. Otherwise it
  // springs back with a little overshoot.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
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
            <span />
            <span className="nav-title">{title}</span>
            <button className="glassbtn-link" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} aria-label="Done">
              <Glass className="glassbtn round"><span className="xmark" aria-hidden /></Glass>
            </button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
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
