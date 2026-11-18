// Haptics, the way the Autoply app does them (owner 2026-11-18). Apple's rule: a light tick when a choice changes
// (switch, segmented control, stepper, a page change), a firm double tick when an action completes (approve, apply,
// pull to refresh). iPhone Safari has no vibrate API, but toggling a hidden <input type="checkbox" switch> ticks the
// Taptic Engine. Android uses navigator.vibrate. Phones without either stay silent.

let hidden: HTMLLabelElement | null = null;

function switchEl() {
  if (hidden || typeof document === "undefined") return hidden;
  try {
    const l = document.createElement("label");
    l.setAttribute("aria-hidden", "true");
    l.style.cssText = "position:fixed;left:-99px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    const i = document.createElement("input");
    i.type = "checkbox";
    i.setAttribute("switch", "");
    i.tabIndex = -1;
    l.append(i);
    document.documentElement.append(l);
    hidden = l;
  } catch { /* not every browser */ }
  return hidden;
}

export function buzz(firm = false) {
  try {
    // Only after the person has touched the page: a tick on its own would be wrong, and browsers refuse it
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (ua && !ua.hasBeenActive) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) { navigator.vibrate(firm ? [12, 40, 12] : 8); return; }
    const s = switchEl();
    if (!s) return;
    s.click();
    if (firm) setTimeout(() => { try { s.click(); } catch { /* one tick is enough */ } }, 90);
  } catch { /* not every phone */ }
}

/** One listener for every choice control, so a new one ticks without being told to. */
export function listenForChoices() {
  const on = (e: Event) => {
    const t = (e.target as Element | null)?.closest?.('[role="switch"], [role="tab"], .stepper button');
    if (t && !(t as HTMLButtonElement).disabled) buzz();
  };
  document.addEventListener("click", on, true);
  return () => document.removeEventListener("click", on, true);
}
