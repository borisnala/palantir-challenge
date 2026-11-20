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

/** A phone drawn in outline with the control to tap lit up, one per step. */
function StepArt({ kind }: { kind: "share" | "add" | "confirm" | "menu" | "install" | "open" }) {
  return (
    <svg className="step-art" viewBox="0 0 72 120" aria-hidden>
      <rect x="2" y="2" width="68" height="116" rx="14" className="sa-body" />
      <rect x="26" y="7" width="20" height="5" rx="2.5" className="sa-ink" />
      {kind === "share" && (<>
        <rect x="8" y="94" width="56" height="16" rx="8" className="sa-bar" />
        <g className="sa-hit"><circle cx="36" cy="102" r="9" /><path d="M36 97.5v7M33 100l3-3 3 3M32 103.5v3h8v-3" className="sa-glyph" /></g>
      </>)}
      {kind === "add" && (<>
        <rect x="8" y="44" width="56" height="66" rx="10" className="sa-bar" />
        <rect x="12" y="52" width="48" height="10" rx="4" className="sa-line" />
        <g className="sa-hit"><rect x="12" y="66" width="48" height="12" rx="5" /><path d="M18 72h6M21 69v6" className="sa-glyph" /></g>
        <rect x="12" y="82" width="48" height="10" rx="4" className="sa-line" />
      </>)}
      {kind === "confirm" && (<>
        <rect x="8" y="18" width="56" height="34" rx="8" className="sa-bar" />
        <rect x="14" y="26" width="14" height="14" rx="4" className="sa-ink" />
        <rect x="32" y="30" width="20" height="5" rx="2.5" className="sa-line" />
        <g className="sa-hit"><rect x="46" y="20" width="16" height="9" rx="4.5" /></g>
      </>)}
      {kind === "menu" && (<>
        <rect x="8" y="16" width="56" height="12" rx="6" className="sa-bar" />
        <g className="sa-hit"><circle cx="58" cy="22" r="7" /><path d="M58 18.5v.5M58 22v.5M58 25.5v.5" className="sa-glyph" /></g>
      </>)}
      {kind === "install" && (<>
        <rect x="24" y="16" width="42" height="62" rx="8" className="sa-bar" />
        <rect x="28" y="22" width="34" height="8" rx="3" className="sa-line" />
        <g className="sa-hit"><rect x="28" y="34" width="34" height="10" rx="4" /></g>
        <rect x="28" y="48" width="34" height="8" rx="3" className="sa-line" />
        <rect x="28" y="60" width="34" height="8" rx="3" className="sa-line" />
      </>)}
      {kind === "open" && (<>
        {[0, 1, 2, 3].map((i) => <rect key={i} x={10 + i * 14} y="22" width="10" height="10" rx="3" className="sa-line" />)}
        <g className="sa-hit"><rect x="10" y="40" width="14" height="14" rx="4" /><path d="M14 47h6M17 44v6" className="sa-glyph" /></g>
        {[1, 2, 3].map((i) => <rect key={i} x={10 + i * 14} y="40" width="10" height="10" rx="3" className="sa-line" />)}
      </>)}
    </svg>
  );
}

const STEPS: Record<OS, { art: Parameters<typeof StepArt>[0]["kind"]; title: string; sub: string }[]> = {
  ios: [
    { art: "share", title: "Tap Share", sub: "In Safari, the square with the arrow in the toolbar" },
    { art: "add", title: "Tap Add to Home Screen", sub: "Scroll the list down if it is not in view" },
    { art: "confirm", title: "Tap Add", sub: "Top right, the name stays Risk Tool" },
    { art: "open", title: "Open it from the Home Screen", sub: "Full screen, no browser bars, portrait only" },
  ],
  android: [
    { art: "menu", title: "Tap the menu", sub: "In Chrome, the three dots top right" },
    { art: "install", title: "Tap Add to Home screen", sub: "Some phones name it Install app" },
    { art: "confirm", title: "Tap Install", sub: "Or Add, then confirm the name Risk Tool" },
    { art: "open", title: "Open it from the Home Screen", sub: "Full screen, no browser bars, portrait only" },
  ],
};

export function Welcome() {
  const { get, set } = useApp();
  const asked = get<null | "about" | "install">("ui.welcome", null);
  const [step, setStep] = useState<null | "about" | "install">(null);
  const [os, setOs] = useState<OS>("ios");
  // first open on this browser, never inside the desktop frame's outer page
  useEffect(() => {
    if (document.documentElement.classList.contains("framed")) return;
    let seen = false;
    try { seen = localStorage.getItem(SEEN) === "1"; } catch {}
    const ua = navigator.userAgent;
    const t = setTimeout(() => { setOs(/Android/i.test(ua) ? "android" : "ios"); if (!seen) setStep("about"); }, 1400); // after the launch
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
          <Row icon={<ShieldCheck size={20} strokeWidth={1.8} />} title="Changes are safe" subtitle="Moves, spreads and users go through a confirmation, some with a typed code. Nothing leaves this phone." chevron={false} />
          <Row icon={<Hand size={20} strokeWidth={1.8} />} title="Getting around" subtitle="Swipe from the left edge for the menu, search clients from the bottom bar, the bell for alerts." chevron={false} />
        </Group>
        <button className="btn btn-blue wide" onClick={next}>Continue</button>
      </Sheet>

      <Sheet open={shown === "install"} onClose={done} title="Add to Home Screen" tall>
        <Segmented label="Phone" value={os} onChange={setOs} options={[{ v: "ios", label: "iPhone" }, { v: "android", label: "Android" }]} />
        <ol className="steps">
          {STEPS[os].map((s, i) => (
            <li key={`${os}${i}`} className="step" style={{ animationDelay: `${i * 60}ms` }}>
              <StepArt kind={s.art} />
              <span className="step-text"><i>{i + 1}</i><b>{s.title}</b><small>{s.sub}</small></span>
            </li>
          ))}
        </ol>
        <button className="btn btn-blue wide" onClick={() => { buzz(); done(); }}>Done</button>
      </Sheet>
    </>
  );
}
