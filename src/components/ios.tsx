"use client";

// iOS building blocks: collapsing large-title nav bar, inset grouped lists, rows, sheet, switch, segmented control.
// Sizes follow Apple's type ramp (17 body, 15 subhead, 13 footnote) and 44 pt minimum touch targets.

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
      <div className={`navbar ${scrolled ? "navbar-on" : ""}`}>
        <div className="navbar-row">
          <div className="nav-side">
            {back && <Link href={back.href} className="nav-back"><ChevronLeft size={26} strokeWidth={2.4} />{back.label}</Link>}
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
  // mounted keeps the sheet in the DOM while it slides out; visible drives the slide, one frame after mount.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(r);
    }
    document.body.style.overflow = "";
    const r = requestAnimationFrame(() => setVisible(false));
    const t = setTimeout(() => setMounted(false), 340);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, [open]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!mounted) return null;
  return (
    <div className={`sheet-wrap ${visible ? "sheet-open" : ""}`}>
      <button className="sheet-scrim" aria-label="Close" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="grabber" aria-hidden />
        <div className="sheet-bar">
          <span />
          <span className="nav-title">{title}</span>
          <button className="textbtn strong" onClick={onClose}>Done</button>
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
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  return (
    <div className="segmented" role="tablist" aria-label={label} style={{ ["--n" as string]: options.length, ["--i" as string]: i }}>
      <span className="seg-thumb" aria-hidden />
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={o.v === value} onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}
