"use client";

import { createPortal } from "react-dom";

// Motion and touch, after the Autoply app: the page slides in from the right going deeper, from the left coming back,
// and fades between sections, with a tick on each move; the bars stay still. Pull down at the top to refresh: a
// 12-spoke spinner fills as you pull, and past 60 pt it spins with a firm tick.
// Plus the desktop notice: Risk Tool is built for a phone, so a wide screen gets a sheet with a code to scan.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { readPrefs, useApp } from "./app-state";
import { buzz, listenForChoices } from "@/lib/haptics";
import { Wordmark } from "./brand";

const SECTIONS = ["/risk", "/liquidity", "/withdrawals", "/search", "/clients", "/alerts", "/account"];
const depth = (p: string) => p.split("/").filter(Boolean).length;
const section = (p: string) => SECTIONS.find((s) => p.startsWith(s)) ?? "/";

/** Loading outlines, as the Autoply app draws them (owner 2026-11-19): while a screen loads, its own outline shows in
 *  shimmering grey, the same blocks where the words, numbers, icons and charts will be, never the words. Shown the
 *  first time each screen opens in a visit, and while data refreshes. */
let ghostTimer: ReturnType<typeof setTimeout> | null = null;
export function ghost(ms: number) {
  if (typeof document === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  // Each outline block covers exactly its own line of text, measured from the text, so a label keeps the empty space
  // around it (owner 2026-11-19, "still attached"). Padding, margins and layout stay as they are.
  const marked: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>("main.screen > :not(.topbar):not(.scroll-edge) :is(span, b, p, h1, h2, h3, small, strong, em, label, a, button)").forEach((el) => {
    if (el.children.length || !el.textContent?.trim()) return;
    const box = el.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(el);
    const t = range.getBoundingClientRect();
    if (!t.width || !box.width) return;
    const top = Math.max(0, t.top - box.top + 2), bottom = Math.max(0, box.bottom - t.bottom + 2);
    const left = Math.max(0, t.left - box.left), right = Math.max(0, box.right - t.right);
    el.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round 6px)`;
    marked.push(el);
  });
  root.classList.add("ghosting");
  if (ghostTimer) clearTimeout(ghostTimer);
  ghostTimer = setTimeout(() => { root.classList.remove("ghosting"); marked.forEach((el) => { el.style.clipPath = ""; }); }, ms);
}

export function Transitions() {
  const path = usePathname();
  const prev = useRef(path);
  useEffect(() => listenForChoices(), []);
  // Sign in and Access stand outside the app: no menu, no bars (globals.css html.gate)
  useEffect(() => { document.documentElement.classList.toggle("gate", /^\/(login|access)\b/.test(path)); }, [path]);
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
    // no outline on a plain page change: the screen's data is already here, so it draws at once (owner 2026-11-19)
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
      document.documentElement.classList.toggle("refreshing", spinning); // the command bar is inactive while data loads
      main.style.setProperty("--pull", `${d}px`);
    };
    const start = (e: TouchEvent) => {
      const s = st.current;
      if (s.busy || window.scrollY > 0 || e.touches.length > 1 || document.body.style.overflow === "hidden" || document.documentElement.classList.contains("menu-open") || document.documentElement.classList.contains("gate") || e.touches[0].clientX < 24) return;
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
      ghost(760);
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
      <aside className="device-credit" aria-label="About">
        <Wordmark />
        <p><b>Palantir design challenge</b>Lens B, make it click</p>
        <p><b>Boris Nala</b>The Global Risk Portal, rebuilt for a phone</p>
      </aside>
      <aside className="device-qr" aria-label="Open on a phone">
        {svg && <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />}
        <p><b>Built for mobile</b>Scan to open on a phone.</p>
      </aside>
    </div>,
    document.body,
  );
}

/** Opens the launch screen once, after the first paint, as the Autoply app does: the plus shows for at least 0.7 s,
 *  gathers itself, then bursts open into the app. Only on the first load, never on page changes. */
export function LaunchReady() {
  const router = useRouter();
  // Settings, Start screen: an app opened at its front door goes to the screen this viewer chose
  useEffect(() => {
    if (location.pathname.replace(/\/$/, "").endsWith("risktool-prototype") || location.pathname === "/") {
      const start = readPrefs().start;
      if (start && start !== "/") router.replace(start);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
