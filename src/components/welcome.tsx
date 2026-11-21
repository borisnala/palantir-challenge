"use client";

// First open (owner 2026-11-20): a sheet that says what Risk Tool is and what its data is, then a sheet that shows how
// to put it on the Home Screen, step by step, for iPhone or Android, each step with a drawing of the phone and the
// control to tap. Shown once on this browser; Settings, About opens either again. Inside the Home Screen app the
// second sheet is skipped, the app is already there.

import { useEffect, useState } from "react";
import { ArrowDownUp, Database, Hand, ShieldCheck, Smartphone } from "lucide-react";
import { useApp } from "./app-state";
import { Group, Row, Segmented, Sheet } from "./ios";
import { Mark } from "./brand";
import { buzz } from "@/lib/haptics";

const SEEN = "risktool-welcome";
type OS = "ios" | "android";

type Art = "dots-bottom" | "share-row" | "add-row" | "webapp" | "share-top" | "dots-top" | "add-top" | "install" | "menu-bottom" | "addto" | "homescreen" | "open";

/** A phone drawn in outline, the browser's bars where that browser puts them, and the control to tap lit up. */
function StepArt({ kind }: { kind: Art }) {
  const bottomBar = <rect x="7" y="96" width="58" height="15" rx="7.5" className="sa-bar" />;
  const topBar = <rect x="7" y="16" width="58" height="12" rx="6" className="sa-bar" />;
  const sheet = (hit: number, rows = 4) => (<>
    <rect x="7" y="40" width="58" height="72" rx="10" className="sa-bar" />
    {Array.from({ length: rows }, (_, i) => i === hit
      ? <g key={i} className="sa-hit"><rect x="11" y={48 + i * 15} width="50" height="11" rx="4.5" /><path d={`M17 ${53.5 + i * 15}h6M20 ${50.5 + i * 15}v6`} className="sa-glyph" /></g>
      : <rect key={i} x="11" y={48 + i * 15} width="50" height="11" rx="4.5" className="sa-line" />)}
  </>);
  return (
    <svg className="step-art" viewBox="0 0 72 120" aria-hidden>
      <rect x="2" y="2" width="68" height="116" rx="14" className="sa-body" />
      <rect x="26" y="7" width="20" height="5" rx="2.5" className="sa-ink" />
      {kind === "dots-bottom" && (<>{bottomBar}<rect x="12" y="100" width="34" height="7" rx="3.5" className="sa-line" />
        <g className="sa-hit"><circle cx="56" cy="103.5" r="7" /><path d="M53 103.5h.5M56 103.5h.5M59 103.5h.5" className="sa-glyph" /></g></>)}
      {kind === "share-row" && sheet(0)}
      {kind === "add-row" && sheet(2)}
      {kind === "webapp" && (<>
        <rect x="7" y="16" width="58" height="40" rx="9" className="sa-bar" />
        <rect x="12" y="24" width="12" height="12" rx="3.5" className="sa-ink" /><rect x="28" y="27" width="20" height="5" rx="2.5" className="sa-line" />
        <rect x="12" y="42" width="30" height="5" rx="2.5" className="sa-line" /><rect x="46" y="40" width="14" height="9" rx="4.5" className="sa-line" />
        <g className="sa-hit"><rect x="47" y="18" width="15" height="8" rx="4" /></g></>)}
      {kind === "share-top" && (<>{topBar}<rect x="11" y="19" width="36" height="6" rx="3" className="sa-line" />
        <g className="sa-hit"><circle cx="57" cy="22" r="7" /><path d="M57 18.5v5M55 20.5l2-2 2 2M54.5 23v2.5h5V23" className="sa-glyph" /></g></>)}
      {kind === "dots-top" && (<>{topBar}<rect x="11" y="19" width="36" height="6" rx="3" className="sa-line" />
        <g className="sa-hit"><circle cx="57" cy="22" r="7" /><path d="M57 18.5v.5M57 22v.5M57 25.5v.5" className="sa-glyph" /></g></>)}
      {kind === "add-top" && (<>
        <rect x="24" y="14" width="42" height="70" rx="8" className="sa-bar" />
        {[0, 1, 2, 3, 4].map((i) => i === 2 ? <g key={i} className="sa-hit"><rect x="28" y={20 + i * 12} width="34" height="9" rx="4" /></g> : <rect key={i} x="28" y={20 + i * 12} width="34" height="8" rx="3" className="sa-line" />)}
      </>)}
      {kind === "install" && (<>
        <rect x="9" y="38" width="54" height="40" rx="9" className="sa-bar" />
        <rect x="14" y="45" width="12" height="12" rx="3.5" className="sa-ink" /><rect x="30" y="48" width="26" height="5" rx="2.5" className="sa-line" />
        <rect x="14" y="64" width="18" height="8" rx="4" className="sa-line" /><g className="sa-hit"><rect x="38" y="63" width="20" height="10" rx="5" /></g></>)}
      {kind === "menu-bottom" && (<>{bottomBar}<rect x="12" y="100" width="34" height="7" rx="3.5" className="sa-line" />
        <g className="sa-hit"><circle cx="56" cy="103.5" r="7" /><path d="M53 101.5h6M53 103.5h6M53 105.5h6" className="sa-glyph" /></g></>)}
      {kind === "addto" && sheet(1)}
      {kind === "homescreen" && sheet(0, 3)}
      {kind === "open" && (<>
        {[0, 1, 2, 3].map((i) => <rect key={i} x={10 + i * 14} y="22" width="10" height="10" rx="3" className="sa-line" />)}
        <g className="sa-hit"><rect x="10" y="40" width="14" height="14" rx="4" /><path d="M14 47h6M17 44v6" className="sa-glyph" /></g>
        {[1, 2, 3].map((i) => <rect key={i} x={10 + i * 14} y="40" width="10" height="10" rx="3" className="sa-line" />)}
      </>)}
    </svg>
  );
}

type Browser = "safari" | "chrome-ios" | "chrome" | "samsung";
const BROWSERS: Record<OS, { v: Browser; label: string }[]> = {
  ios: [{ v: "safari", label: "Safari" }, { v: "chrome-ios", label: "Chrome" }],
  android: [{ v: "chrome", label: "Chrome" }, { v: "samsung", label: "Samsung Internet" }],
};
// Each browser's own path to the Home Screen, with its buttons where that browser draws them (iOS 26, Chrome 14x,
// Samsung Internet 2x). Safari on iOS 26 keeps Share inside the ⋯ menu of its compact bar.
const STEPS: Record<Browser, { art: Art; title: string; sub: string }[]> = {
  safari: [
    { art: "dots-bottom", title: "Tap ⋯ in the address bar", sub: "Bottom right, next to the address" },
    { art: "share-row", title: "Tap Share", sub: "The first row of the menu" },
    { art: "add-row", title: "Tap Add to Home Screen", sub: "Tap More if it is not in the list" },
    { art: "webapp", title: "Keep Open as Web App on, tap Add", sub: "Add is top right, the name stays Risk Tool" },
    { art: "open", title: "Open Risk Tool from the Home Screen", sub: "Full screen, no address bar" },
  ],
  "chrome-ios": [
    { art: "share-top", title: "Tap Share", sub: "In the address bar, top right" },
    { art: "add-row", title: "Tap Add to Home Screen", sub: "Scroll the list down to find it" },
    { art: "webapp", title: "Tap Add", sub: "Top right, the name stays Risk Tool" },
    { art: "open", title: "Open Risk Tool from the Home Screen", sub: "Full screen, no address bar" },
  ],
  chrome: [
    { art: "dots-top", title: "Tap ⋮", sub: "Top right, next to the address" },
    { art: "add-top", title: "Tap Add to Home screen", sub: "Some phones show Install app" },
    { art: "install", title: "Tap Install", sub: "Or Add, then Add automatically" },
    { art: "open", title: "Open Risk Tool from the Home Screen", sub: "Also in the app drawer" },
  ],
  samsung: [
    { art: "menu-bottom", title: "Tap ≡", sub: "Bottom right of the toolbar" },
    { art: "addto", title: "Tap Add page to", sub: "In the second row of the menu" },
    { art: "homescreen", title: "Tap Home screen, then Add", sub: "The name stays Risk Tool" },
    { art: "open", title: "Open Risk Tool from the Home Screen", sub: "Full screen, no address bar" },
  ],
};

export function Welcome() {
  const { get, set } = useApp();
  const asked = get<null | "about" | "install">("ui.welcome", null);
  const [step, setStep] = useState<null | "about" | "install">(null);
  const [os, setOs] = useState<OS>("ios");
  const [br, setBr] = useState<Browser>("safari");
  // first open on this browser, never inside the desktop frame's outer page
  useEffect(() => {
    if (document.documentElement.classList.contains("framed")) return;
    let seen = false;
    try { seen = localStorage.getItem(SEEN) === "1"; } catch {}
    const ua = navigator.userAgent;
    const t = setTimeout(() => {
      const android = /Android/i.test(ua);
      setOs(android ? "android" : "ios");
      setBr(android ? (/SamsungBrowser/i.test(ua) ? "samsung" : "chrome") : /CriOS/i.test(ua) ? "chrome-ios" : "safari");
      if (!seen) setStep("about");
    }, 1400); // after the launch
    return () => clearTimeout(t);
  }, []);
  const shown = asked ?? step;
  const standalone = typeof window !== "undefined" && (matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const done = () => { try { localStorage.setItem(SEEN, "1"); } catch {} setStep(null); if (asked) set("ui.welcome", null); };
  const next = () => { buzz(); if (standalone && !asked) { done(); return; } if (asked) set("ui.welcome", "install"); else setStep("install"); };

  return (
    <>
      <Sheet open={shown === "about"} onClose={done} title="Risk Tool" tall>
        <div className="welcome-hero">
          <div className="gate-mark"><Mark size={56} /></div>
          <b>Palantir design challenge</b>
          <span>Lens B, make it click. By Boris Nala.</span>
        </div>
        <Group>
          <Row icon={<Smartphone size={20} strokeWidth={1.8} />} title="The Global Risk Portal, for a phone" subtitle="The desk's portal for B-book risk, liquidity and withdrawals, rebuilt as a native style iPhone app." chevron={false} />
          <Row icon={<Database size={20} strokeWidth={1.8} />} title="Demonstration data" subtitle="Every figure comes from the portal's own demo set, snapshot 13 Nov 2026. Logins 99000001 onward, names Demo Client N. No real client, group or value." chevron={false} />
          <Row icon={<ArrowDownUp size={20} strokeWidth={1.8} />} title="What it shows" subtitle="Who moved overnight, which clients cost the book, the withdrawals waiting for Risk, and each client's full profile in Client 360." chevron={false} />
          <Row icon={<ShieldCheck size={20} strokeWidth={1.8} />} title="Changes need confirmation" subtitle="Group moves, spreads and users pass a confirmation, some with a typed code. Nothing leaves the device." chevron={false} />
          <Row icon={<Hand size={20} strokeWidth={1.8} />} title="Getting around" subtitle="Swipe from the left edge for the menu, search clients from the bottom bar, the bell for alerts." chevron={false} />
        </Group>
        <button className="btn btn-blue wide" onClick={next}>Continue</button>
      </Sheet>

      <Sheet open={shown === "install"} onClose={done} title="Add to Home Screen" tall>
        <p className="install-why"><b>Add Risk Tool to the Home Screen.</b> It then opens full screen as an app, without the browser address bar and toolbars.</p>
        <Segmented label="Phone" value={os} onChange={(o) => { setOs(o); setBr(BROWSERS[o][0].v); }} options={[{ v: "ios", label: "iPhone" }, { v: "android", label: "Android" }]} />
        <Segmented label="Browser" value={br} onChange={setBr} options={BROWSERS[os]} />
        <ol className="steps">
          {STEPS[br].map((s, i) => (
            <li key={`${br}${i}`} className="step" style={{ animationDelay: `${i * 60}ms` }}>
              <StepArt kind={s.art} />
              <span className="step-text"><i>{i + 1}</i><b>{s.title}</b><small>{s.sub}</small></span>
            </li>
          ))}
        </ol>
        <p className="install-why muted">Already opened from the Home Screen, this guide does not appear.</p>
        <button className="btn btn-blue wide" onClick={() => { buzz(); done(); }}>Done</button>
      </Sheet>
    </>
  );
}
