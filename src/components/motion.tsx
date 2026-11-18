"use client";

// Motion and touch, after the Autoply app: the page slides in from the right going deeper, from the left coming back,
// and fades between sections, with a tick on each move; the bars stay still. Pull down at the top to refresh: a
// 12-spoke spinner fills as you pull, and past 60 pt it spins with a firm tick.
// Plus the desktop notice: Risk Desk is built for a phone, so a wide screen gets a sheet with a code to scan.

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useApp } from "./app-state";
import { Group, Row, Sheet } from "./ios";
import { buzz, listenForChoices } from "@/lib/haptics";

const SECTIONS = ["/risk", "/liquidity", "/withdrawals", "/search", "/clients", "/alerts", "/account"];
const depth = (p: string) => p.split("/").filter(Boolean).length;
const section = (p: string) => SECTIONS.find((s) => p.startsWith(s)) ?? "/";

export function Transitions() {
  const path = usePathname();
  const prev = useRef(path);
  useEffect(() => listenForChoices(), []);
  useEffect(() => {
    const from = prev.current;
    prev.current = path;
    if (from === path) return;
    const main = document.querySelector("main.screen");
    if (!main) return;
    const kind = section(from) !== section(path) && depth(path) <= 1 && depth(from) <= 1 ? "tab"
      : depth(path) > depth(from) ? "push" : depth(path) < depth(from) ? "pop" : "tab";
    main.classList.remove("enter-push", "enter-pop", "enter-tab");
    void (main as HTMLElement).offsetWidth;
    main.classList.add(`enter-${kind}`);
    buzz();
  }, [path]);
  return null;
}

export function PullToRefresh() {
  const { say, set } = useApp();
  const spin = useRef<HTMLDivElement>(null);
  const st = useRef({ y0: null as number | null, d: 0, busy: false });

  useEffect(() => {
    const main = document.querySelector("main.screen") as HTMLElement | null;
    const ptr = spin.current;
    if (!main || !ptr) return;
    const paint = (d: number, spinning = false) => {
      const shown = Math.ceil(Math.min(1, d / 60) * 12);
      ptr.querySelectorAll("span").forEach((s, i) => { (s as HTMLElement).style.opacity = spinning ? "" : i < shown ? "0.75" : "0"; });
      ptr.style.opacity = d > 0 ? "1" : "0";
      ptr.style.translate = `-50% ${Math.max(0, (Math.min(d, 90) - 28) / 2)}px`;
      ptr.classList.toggle("spin", spinning);
      main.style.transform = d ? `translateY(${d}px)` : "";
    };
    const start = (e: TouchEvent) => {
      const s = st.current;
      if (s.busy || window.scrollY > 0 || e.touches.length > 1 || document.body.style.overflow === "hidden") return;
      s.y0 = e.touches[0].clientY; s.d = 0; main.style.transition = "none";
    };
    const move = (e: TouchEvent) => {
      const s = st.current;
      if (s.y0 === null) return;
      const dy = e.touches[0].clientY - s.y0;
      if (dy <= 0 || window.scrollY > 0) { s.y0 = null; paint(0); return; }
      if (e.cancelable) e.preventDefault();
      s.d = Math.min(110, dy * 0.45);
      paint(s.d);
    };
    const end = async () => {
      const s = st.current;
      if (s.y0 === null) return;
      s.y0 = null;
      main.style.transition = "transform .32s cubic-bezier(.32,.72,0,1)";
      if (s.d < 60) { paint(0); return; }
      s.busy = true;
      buzz(true);
      paint(62, true);
      await new Promise((r) => setTimeout(r, 700));
      set("refreshedAt", new Date().toISOString());
      paint(0);
      s.busy = false;
      say("Data refreshed");
    };
    addEventListener("touchstart", start, { passive: true });
    addEventListener("touchmove", move, { passive: false });
    addEventListener("touchend", end);
    return () => { removeEventListener("touchstart", start); removeEventListener("touchmove", move); removeEventListener("touchend", end); };
  }, [say, set]);

  return <div ref={spin} className="ptr" aria-hidden>{Array.from({ length: 12 }, (_, i) => <span key={i} />)}</div>;
}

export function DesktopNotice() {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("desktop-notice") === "1"; } catch { /* private mode */ }
    if (seen || !matchMedia("(min-width: 700px) and (hover: hover)").matches) return;
    QRCode.toString(location.href, { type: "svg", margin: 0, color: { dark: "#1f1e1d", light: "#00000000" } }).then(setSvg).catch(() => setSvg(""));
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, []);
  const close = () => { setOpen(false); try { sessionStorage.setItem("desktop-notice", "1"); } catch { /* private mode */ } };
  return (
    <Sheet open={open} onClose={close} title="Built for mobile">
      <div className="sheet-hero">
        {svg && <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />}
        <p className="row-sub wrap">Risk Desk is designed for a phone screen. Scan the code with your phone camera to open this page there.</p>
      </div>
      <Group><Row title="Continue on this screen" onClick={close} chevron={false} /></Group>
    </Sheet>
  );
}
