"use client";

import { createPortal } from "react-dom";

// Motion and touch, after the Autoply app: the page slides in from the right going deeper, from the left coming back,
// and fades between sections, with a tick on each move; the bars stay still. Pull down at the top to refresh: a
// 12-spoke spinner fills as you pull, and past 60 pt it spins with a firm tick.
// Plus the desktop notice: Risk Tool is built for a phone, so a wide screen gets a sheet with a code to scan.

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useApp } from "./app-state";
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
      main.style.setProperty("--pull", `${d}px`);
    };
    const start = (e: TouchEvent) => {
      const s = st.current;
      if (s.busy || window.scrollY > 0 || e.touches.length > 1 || document.body.style.overflow === "hidden" || document.documentElement.classList.contains("menu-open") || e.touches[0].clientX < 24) return;
      s.y0 = e.touches[0].clientY; s.d = 0; main.classList.remove("pull-settle");
    };
    const move = (e: TouchEvent) => {
      const s = st.current;
      if (s.y0 === null) return;
      const dy = e.touches[0].clientY - s.y0;
      if (dy <= 0 || window.scrollY > 0) { s.y0 = null; paint(0); return; }
      if (e.cancelable) e.preventDefault();
      const was = s.d;
      s.d = Math.min(110, dy * 0.45);
      if (was < 60 && s.d >= 60) buzz(); // the tick when the pull passes the refresh point, as iOS does
      paint(s.d);
    };
    const end = async () => {
      const s = st.current;
      if (s.y0 === null) return;
      s.y0 = null;
      main.classList.add("pull-settle");
      if (s.d < 60) { paint(0); return; }
      s.busy = true;
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

/** A computer or tablet sees the app as Autoply shows itself there: the phone view at iPhone size in a black frame
 *  on a plain gray canvas, one line under it, and a code to open the same page on a phone. The app runs inside the
 *  frame in its own page, so it scrolls, slides and lays out exactly as on a 402 px phone. */
export function DeviceFrame() {
  const [on, setOn] = useState(false);
  const [src, setSrc] = useState("");
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (window.self !== window.top) return;
    const mq = matchMedia("(min-width: 700px) and (min-height: 521px)");
    const sync = () => {
      document.documentElement.classList.toggle("framed", mq.matches);
      setOn(mq.matches);
      if (mq.matches) setSrc((s) => s || location.href);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!on) return;
    QRCode.toString(location.href, { type: "svg", margin: 0, color: { dark: "#1f1e1d", light: "#00000000" } }).then(setSvg).catch(() => setSvg(""));
  }, [on, src]);
  if (!on || !src) return null;
  return createPortal(
    <div className="device-canvas">
      <iframe className="device" src={src} title="Risk Tool" />
      <aside className="device-qr" aria-label="Open on a phone">
        {svg && <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />}
        <p>Scan with a phone camera to open this page there.</p>
      </aside>
      <p className="device-note">Built for mobile. For the best experience, open Risk Tool on your phone.</p>
    </div>,
    document.body,
  );
}

/** Opens the launch screen once, after the first paint, as the Autoply app does: the plus shows for at least 0.7 s,
 *  gathers itself, then bursts open into the app. Only on the first load, never on page changes. */
export function LaunchReady() {
  useEffect(() => {
    const l = document.getElementById("launch");
    if (!l || l.classList.contains("go") || document.documentElement.classList.contains("nolaunch")) return;
    const wait = Math.max(0, 700 - performance.now());
    const t1 = setTimeout(() => {
      l.classList.add("go");
      document.documentElement.classList.add("revealing");
      setTimeout(() => { l.classList.add("gone"); document.documentElement.classList.remove("launching", "revealing"); }, 900); // hide, never remove: React owns this node
      try { sessionStorage.setItem("launched", "1"); } catch { /* private mode */ }
    }, wait);
    return () => clearTimeout(t1);
  }, []);
  return null;
}
