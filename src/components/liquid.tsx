"use client";

// Liquid Glass for the web: a lens that refracts what is behind the glass, a specular rim and sheen that follow the
// light (pointer or touch), and spring physics for anything that moves. Chromium gets true refraction through an SVG
// displacement filter. Safari and Firefox cannot run SVG filters on a backdrop, so they get blur, rim and sheen.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/* ---------- springs ---------- */

export class Spring {
  x: number; v = 0; target: number;
  /** eps is where the spring counts as settled. 0.1 suits pixels; a 0 to 1 value (menu, lens) needs a finer one, or
   *  its last tenth snaps (owner 2026-11-21, the lens release ended in a jump). */
  constructor(x: number, public k = 420, public c = 32, public eps = 0.1) { this.x = x; this.target = x; }
  step(dt: number) {
    const f = -this.k * (this.x - this.target) - this.c * this.v;
    this.v += f * dt; this.x += this.v * dt;
    return Math.abs(this.v) > this.eps * 5 || Math.abs(this.x - this.target) > this.eps;
  }
}

/** Runs a frame loop while draw(dt) returns true (something still moving). Returns kick() to (re)start it. */
export function useSpringLoop(draw: (dt: number) => boolean) {
  const raf = useRef(0);
  const drawRef = useRef(draw);
  useLayoutEffect(() => { drawRef.current = draw; });
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return () => {
    if (raf.current) return;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (t - last) / 1000)); last = t;
      raf.current = drawRef.current(dt) ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };
}

/** Squash and stretch from velocity: fast motion stretches along the motion and thins across it, like a drop. */
export const stretch = (v: number, max = 0.32) => {
  const s = Math.min(Math.abs(v) / 2200, max);
  return { sx: 1 + s, sy: 1 - s * 0.5 };
};

/* ---------- light ---------- */

/** The press on glass (owner 2026-11-19, "natural Apple, no light following the finger"): the pressed control swells
 *  and lightens evenly. The light itself is fixed above the screen, so rims and sheen never follow the pointer. */
export function LightSource() {
  useEffect(() => {
    const root = document.documentElement;
    const ua = navigator.userAgent;
    root.classList.toggle("lg-refract", /Chrome\//.test(ua) && !/iPhone|iPad|CriOS/.test(ua));
    let pressed: HTMLElement | null = null;
    const press = (e: PointerEvent) => {
      const host = (e.target as Element)?.closest?.(".glassbtn-link, .titlebtn, .pillbtn");
      pressed = (host?.matches(".lg") ? host : host?.querySelector(".lg")) as HTMLElement | null ?? (host?.classList.contains("pillbtn") ? host as HTMLElement : null);
      pressed?.classList.add("lg-press");
    };
    const release = () => { pressed?.classList.remove("lg-press"); pressed = null; };
    addEventListener("pointerdown", press, { passive: true });
    addEventListener("pointerup", release, { passive: true });
    addEventListener("pointercancel", release, { passive: true });
    return () => { removeEventListener("pointerdown", press); removeEventListener("pointerup", release); removeEventListener("pointercancel", release); };
  }, []);
  return null;
}

/* ---------- glass ---------- */

function lensMap(w: number, h: number, r: number, edge: number) {
  // Red ramps left to right, green top to bottom, a blurred neutral gray center: the edges bend, the middle stays clear.
  const b = Math.max(4, edge);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="r" x1="0" x2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>
<linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#0f0"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="${(b / 2).toFixed(1)}"/></filter></defs>
<rect width="${w}" height="${h}" fill="#000"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#r)"/>
<rect width="${w}" height="${h}" rx="${r}" fill="url(#g)" style="mix-blend-mode:screen"/>
<rect x="${b}" y="${b}" width="${Math.max(1, w - 2 * b)}" height="${Math.max(1, h - 2 * b)}" rx="${Math.max(0, r - b)}" fill="#808080" filter="url(#b)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** A Liquid Glass surface. Measures itself and builds a lens filter of its exact size. */
export function Glass({ as: Tag = "div", className = "", radius, depth = 1, children, style, ...rest }: {
  as?: "div" | "nav" | "span"; className?: string; radius?: number; depth?: number; children?: React.ReactNode; style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const id = "lg" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [size, setSize] = useState<{ w: number; h: number; r: number } | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      const r = radius ?? Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, h / 2);
      setSize((s) => (s && s.w === w && s.h === h && s.r === r ? s : { w, h, r }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [radius]);
  const edge = size ? Math.min(size.h, size.w) * 0.18 : 10;
  const Comp = Tag as React.ElementType;
  return (
    <Comp ref={ref} className={`lg ${className}`} style={{ ...style, ["--lens" as string]: size ? `url(#${id})` : "none" }} {...rest}>
      {size && (
        <svg className="lg-defs" width="0" height="0" aria-hidden>
          <filter id={id} x="0" y="0" width={size.w} height={size.h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feImage href={lensMap(size.w, size.h, size.r, edge)} x="0" y="0" width={size.w} height={size.h} preserveAspectRatio="none" result="map" />
            <feGaussianBlur in="SourceGraphic" stdDeviation={2 + depth * 1.2} result="blur" />
            <feDisplacementMap in="blur" in2="map" scale={-Math.min(36, edge * 1.3) * depth} xChannelSelector="R" yChannelSelector="G" result="bent" />
            <feColorMatrix in="bent" type="saturate" values="1.7" />
          </filter>
        </svg>
      )}
      <span className="lg-sheen" aria-hidden />
      {children}
    </Comp>
  );
}
