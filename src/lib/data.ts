// Shared data and formatters. Screen data lives in src/data/*.json, made by scripts/distill.py from the desktop
// portal's own dummy payloads, so the phone app shows the same numbers as the portal. Everything is dummy.

import clientsJson from "@/data/clients.json";
import watchJson from "@/data/watchlist.json";
import alertsJson from "@/data/alerts.json";

export interface Client {
  login: number; name: string; group_now: string; balance: number; credit: number; equity: number;
  tall: number; t180: number; t30: number; fpl: number; lots_30d: number | null; win_rate: number; deals_30d: number | null;
  momentum?: string; watched_by?: string;
  pg_moves?: { time_wib: string; from: string; to: string; from_tier: string; to_tier: string; source: string }[];
  etl?: { time_wib: string; kind: string; reason: string; tpl: string }[];
  open?: { positions: number; gross: number; net: number; fpl: number; top_symbols: [string, number][]; mg?: { tier: number; window: number; lots: number } };
}

export const CLIENTS = clientsJson as Client[];
export const WATCHLIST = watchJson as { login: number; name: string; group: string; pg: string; watched_at: string; watched_by: string; balance: number; equity: number; fpl: number; t30: number; t_all: number; closed_since: number; float_delta: number; since_total: number }[];

const NAMES = new Map<number, string>([...WATCHLIST.map((w) => [w.login, w.name] as [number, string]), ...CLIENTS.map((c) => [c.login, c.name] as [number, string])]);
export const findClient = (login: number) => CLIENTS.find((c) => c.login === login);
export const nameOf = (login: number) => NAMES.get(login) ?? `Account ${login}`;
export const hasProfile = (login: number) => CLIENTS.some((c) => c.login === login);

export type Severity = "critical" | "warn" | "info";
export type AlertKind = "news" | "tier" | "swing" | "book" | "algo" | "wd" | "level" | "exposure" | "growth" | "system";
export interface Alert { id: number; minutesAgo: number; severity: Severity; login: number | null; title: string; detail: string; unread: boolean; kind: AlertKind; wa: string; href?: string; source?: string }

// What the desk is told during a day (distill.py, alerts): the portal's own news profit notifications, the Morning
// Digest changes, today's algorithm moves and the withdrawals waiting for Risk.
export const ALERTS = alertsJson as Alert[];

/** The kinds of alert, so Settings can switch each kind on or off. */
export const ALERT_KINDS: { k: AlertKind; label: string; sub: string }[] = [
  { k: "algo", label: "Algorithm moves", sub: "MachineGun, FBUv2, ScalperAM and equity traffic light moves" },
  { k: "wd", label: "Withdrawals", sub: "A withdrawal waits for Risk" },
  { k: "news", label: "News profit", sub: "Client profit around a high impact release" },
  { k: "tier", label: "Tier moves", sub: "A client moves to a worse or better tier" },
  { k: "swing", label: "Floating swings", sub: "A large change in floating P&L" },
  { k: "book", label: "Flagged book", sub: "A client enters or leaves the flagged book" },
  { k: "exposure", label: "Open exposure", sub: "MachineGun tier tripped on open lots" },
  { k: "level", label: "Spread levels", sub: "A symbol changes CLTL level" },
  { k: "growth", label: "Growth detection", sub: "A consistent profit curve in the 30 day scan" },
  { k: "system", label: "System and access", sub: "Screener checks, device requests, housecleaning" },
];
export const alertKind = (a: Alert): AlertKind => a.kind;

/* ---------- formatters ---------- */

export const money = (v: number | null | undefined, sign = false) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "No data";
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 ? "-$" : sign ? "+$" : "$") + s;
};

export const compact = (v: number | null | undefined, sign = false) => {
  if (v === null || v === undefined || Number.isNaN(v)) return "No data";
  const a = Math.abs(v);
  if (a < 0.5) return "$0";
  const pre = v < 0 ? "-$" : sign ? "+$" : "$";
  if (a >= 1e6) return pre + (a / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1000) return pre + (a / 1000).toFixed(a >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k";
  return pre + a.toFixed(0);
};

export const num = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined ? "No data" : v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? "No data" : `${v.toFixed(d)}%`);

export const ago = (m: number) => (m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`);

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-11-12 15:58:00" or ISO, to "12 Nov, 15.58" (dots in times, the owner writes no colons). */
export const when = (s: string | null | undefined, withTime = true) => {
  if (!s) return "No data";
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return s;
  const d = `${Number(m[3])} ${MON[Number(m[2]) - 1]}`;
  return withTime && m[4] ? `${d}, ${m[4]}.${m[5]}` : d;
};
/** Unix seconds to "12 Nov". */
export const day = (ts: number | null | undefined) => (ts ? when(new Date(ts * 1000).toISOString(), false) : "None");

/** "DUMMY\Direct\VIP1" to "Direct VIP1". */
export const group = (g: string | null | undefined) => (g ? g.replace(/^DUMMY\d?\\/, "").replace(/^DEMO\\?/, "").replace(/\\/g, " ") : "None");

export const title = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
/** Sentence case for portal codes on screen (owner register): promoted_confirmed to "Promoted confirmed". */
export const sentence = (s: string) => { const t = s.replace(/_/g, " ").toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
