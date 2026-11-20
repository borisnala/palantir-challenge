"use client";

// Rows shared by many screens. A client row opens that client's profile only when the demo has a profile for it,
// so no row ever leads to an empty screen.

import Link from "./nav-link";
import { Row } from "./ios";
import { Monogram, Pnl } from "./ui";
import { hasProfile, nameOf } from "@/lib/data";

export function ClientRow({ login, name, sub, detail, value }: {
  login: number; name?: string; sub?: React.ReactNode; detail?: React.ReactNode; value?: number;
}) {
  const n = name ?? nameOf(login);
  const linked = hasProfile(login);
  return (
    <Row href={linked ? `/clients/${login}/` : undefined} icon={<Monogram name={n} size={36} />} tint="transparent"
      title={n} subtitle={sub ?? `#${login}`} detail={detail ?? (value !== undefined ? <Pnl v={value} short /> : undefined)} />
  );
}

/** A Settings-style row that opens a page of the app. */
export function PageRow({ href, Icon, tint, title, sub, detail }: {
  href: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; tint: string; title: string; sub?: string; detail?: React.ReactNode;
}) {
  return <Row href={href} icon={<Icon size={17} strokeWidth={2.4} />} tint={tint} title={title} subtitle={sub} detail={detail} />;
}

/** A landing page tile (owner 2026-11-20, "make it more of a feast for the eye"): the screen's icon and name, its key
 *  figure large, one line under it, and a small picture of the data, levels as squares, a series as bars or a split. */
export type TileArt = { levels: ("red" | "orange" | "yellow" | "basic")[] } | { bars: number[]; tone?: string } | { split: [number, number]; tones?: [string, string] };
export function HubTile({ href, Icon, tint, title, value, unit, sub, art, wide }: {
  href: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; tint: string; title: string; value: React.ReactNode; unit?: string; sub?: string; art?: TileArt; wide?: boolean;
}) {
  return (
    <Link href={href} className={`hub-tile ${wide ? "hub-wide" : ""}`} style={{ ["--tint" as string]: tint }}>
      <span className="hub-top"><span className="hub-ic"><Icon size={17} strokeWidth={2.2} /></span><b>{title}</b></span>
      <span className="hub-val">{value}{unit && <small> {unit}</small>}</span>
      {sub && <span className="hub-sub">{sub}</span>}
      {art && "levels" in art && <span className="hub-levels" aria-hidden>{art.levels.map((l, i) => <i key={i} className={`lv-${l}`} />)}</span>}
      {art && "bars" in art && (() => { const mx = Math.max(1, ...art.bars.map(Math.abs)); return <span className="hub-bars" aria-hidden>{art.bars.map((v, i) => <i key={i} style={{ height: `${Math.max(8, (Math.abs(v) / mx) * 100)}%`, background: art.tone ?? "var(--tint)" }} />)}</span>; })()}
      {art && "split" in art && <span className="hub-split" aria-hidden><i style={{ flex: art.split[0], background: art.tones?.[0] ?? "var(--tint)" }} /><i style={{ flex: art.split[1], background: art.tones?.[1] ?? "var(--fill2)" }} /></span>}
    </Link>
  );
}
