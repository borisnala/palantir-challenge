"use client";

// In-memory state for the demo. Decisions, reads, watchlist changes and control edits live here for the session, so
// every screen agrees. Nothing is saved or sent anywhere.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import wd from "@/data/withdrawals.json";
import us from "@/data/users.json";
import { ALERTS, WATCHLIST, alertKind, type AlertKind } from "@/lib/data";
import { buzz, setHaptics } from "@/lib/haptics";

/** The portal's three roles, as clearance levels: each level can do everything the one below it can. */
export type Role = "viewer" | "editor" | "admin";
export const ROLE_RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };
export const ROLE_LABEL: Record<Role, string> = { viewer: "Viewer", editor: "Editor", admin: "Administrator" };
export const ROLE_CAN: Record<Role, string[]> = {
  viewer: ["Read every screen", "Mark alerts read"],
  editor: ["Decide withdrawals", "Set status, notes and the watchlist", "Move client groups", "Change liquidity controls and models"],
  admin: ["Approve devices", "Manage users and roles", "Edit build paths"],
};
/** A device asking for access on the Access screen, queued for Account, Device access. */
export type DeviceRequest = { id: number; label: string; purpose: string; first_ip: string; user_agent: string; created_at: string };
export const USERS = us.users.map((u) => ({ name: u.username, role: u.role as Role, since: u.created_at }));

/** Settings that belong to this viewer and survive a reload (kept in the browser only). */
export interface Prefs {
  theme: "light" | "dark" | "system";
  haptics: boolean;
  start: "/" | "/withdrawals/" | "/search/" | "/risk/";
  pov: "client" | "broker";
  live: boolean;
  notify: Record<AlertKind, boolean>;
}
export const DEFAULT_PREFS: Prefs = { theme: "system", haptics: true, start: "/", pov: "client", live: true, notify: { news: true, tier: true, swing: true, book: true, algo: true, wd: true, level: true, exposure: true, growth: true, system: true } };
const PREFS_KEY = "risktool-prefs";
export function readPrefs(): Prefs {
  try { const p = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); return { ...DEFAULT_PREFS, ...p, notify: { ...DEFAULT_PREFS.notify, ...(p.notify ?? {}) } }; } catch { return DEFAULT_PREFS; }
}
/** Applies the theme to the page: data-theme on html and the browser's theme color. */
export function applyTheme(theme: Prefs["theme"]) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", theme);
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#1c1b1a" : "#f8f7f4"));
}

export type Decision = "approved" | "rejected";
export type WdRow = (typeof wd.rows)[number];

interface State {
  wdRows: WdRow[];
  pending: WdRow[];
  decide: (id: string, d: Decision) => void;
  undo: (id: string) => void;
  decisionOf: (id: string) => Decision | undefined;
  unread: Set<number>;
  markRead: (id?: number) => void;
  watched: Set<number>;
  toggleWatch: (login: number) => void;
  /** A small key value store for control screens (markups, levels, model weights, devices). */
  get: <T>(key: string, fallback: T) => T;
  set: <T>(key: string, value: T) => void;
  toast: string | null;
  say: (msg: string) => void;
  /** Side menu, and the pages opened lately (shown under Recents, as in the Claude app). */
  drawer: boolean;
  setDrawer: (v: boolean) => void;
  recents: { path: string; title: string; sub?: string }[];
  visit: (path: string, title: string, sub?: string) => void;
  /** True when the previous history entry is a screen of this app, so Back can go there without leaving the app. */
  canGoBack: () => boolean;
  /** The screen before this one in the app's own history, if there is one. */
  backPath: () => string | null;
  /** Who is signed in, and what their clearance allows. guard() says why an action is refused. */
  user: { name: string; role: Role };
  setUser: (name: string) => void;
  can: (need: Role) => boolean;
  guard: (need: Role) => boolean;
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
  /** Every confirmed action this session, newest first. */
  activity: { at: number; text: string; by: string }[];
  signOut: () => void;
}

// Section pages already sit in the menu, and the account pages sit at its foot, so Recents leaves them out and keeps
// the screens a desk returns to: client profiles, analysis pages, the controls.
const NOT_RECENT = /^\/(risk|liquidity|withdrawals|search|alerts)?\/?$|^\/account\//;

const Ctx = createContext<State | null>(null);

export function AppState({ children }: { children: React.ReactNode }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [unread, setUnread] = useState(() => new Set(ALERTS.filter((a) => a.unread).map((a) => a.id)));
  const [watched, setWatched] = useState(() => new Set(WATCHLIST.map((w) => w.login)));
  const [kv, setKv] = useState<Record<string, unknown>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [recents, setRecents] = useState<{ path: string; title: string; sub?: string }[]>([]);
  const visit = useCallback((path: string, title: string, sub?: string) => {
    if (NOT_RECENT.test(path)) return;
    setRecents((r) => (r[0]?.path === path ? r : [{ path, title, sub }, ...r.filter((x) => x.path !== path)].slice(0, 6)));
  }, []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [user, setUserState] = useState<{ name: string; role: Role }>({ name: "demo.admin", role: "admin" });
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [activity, setActivity] = useState<{ at: number; text: string; by: string }[]>([]);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  // Saved settings are read once the page is in the browser (the static build has no browser storage)
  useEffect(() => { const p = readPrefs(); setPrefs(p); setHaptics(p.haptics); applyTheme(p.theme); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const setPref = useCallback(<K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    setPrefs((p) => {
      const n = { ...p, [k]: v };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(n)); } catch { /* private mode keeps it for this visit */ }
      if (k === "haptics") setHaptics(v as boolean);
      if (k === "theme") applyTheme(v as Prefs["theme"]);
      return n;
    });
  }, []);

  // The app's own history. history.length counts pages from other sites too, so Back once used router.back() into
  // whatever came before the app, including addresses of screens that no longer exist (the "page not found").
  const path = usePathname();
  const stack = useRef<string[]>([]);
  useEffect(() => {
    const st = stack.current;
    if (st[st.length - 2] === path) st.pop();
    else if (st[st.length - 1] !== path) st.push(path);
    // Inside the desktop phone frame, the address bar follows the screen shown, so a reload or a shared link lands there
    if (window.self !== window.top) try { window.top?.history.replaceState(window.top.history.state, "", location.href); } catch { /* another origin */ }
  }, [path]);
  const canGoBack = useCallback(() => stack.current.length > 1, []);
  const backPath = useCallback(() => stack.current[stack.current.length - 2] ?? null, []);

  const say = useCallback((msg: string) => {
    setToast(msg);
    setActivity((a) => [{ at: Date.now(), text: msg, by: userRef.current.name }, ...a].slice(0, 50));
    buzz(true); // a confirmation means an action completed: the firm double tick
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const can = useCallback((need: Role) => ROLE_RANK[user.role] >= ROLE_RANK[need], [user]);
  const refuse = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guard = useCallback((need: Role) => {
    if (ROLE_RANK[userRef.current.role] >= ROLE_RANK[need]) return true;
    setToast(`Requires ${ROLE_LABEL[need]} clearance`);
    buzz(); buzz();
    if (refuse.current) clearTimeout(refuse.current);
    refuse.current = setTimeout(() => setToast(null), 2200);
    return false;
  }, []);

  const value = useMemo<State>(() => {
    const rows = wd.rows.map((r) => (decisions[r.request_id] ? { ...r, status: decisions[r.request_id], decided_by: user.name } : r)) as WdRow[];
    const shown = new Set([...unread].filter((id) => { const a = ALERTS.find((x) => x.id === id); return a ? prefs.notify[alertKind(a)] : false; }));
    return {
      wdRows: rows,
      pending: rows.filter((r) => r.status === "pending"),
      decide: (id, d) => setDecisions((s) => ({ ...s, [id]: d })),
      undo: (id) => setDecisions((s) => { const n = { ...s }; delete n[id]; return n; }),
      decisionOf: (id) => decisions[id],
      unread: shown,
      markRead: (id) => setUnread((s) => { if (id === undefined) return new Set(); const n = new Set(s); n.delete(id); return n; }),
      watched,
      toggleWatch: (login) => setWatched((s) => { const n = new Set(s); if (n.has(login)) n.delete(login); else n.add(login); return n; }),
      get: <T,>(key: string, fallback: T) => (key in kv ? (kv[key] as T) : fallback),
      set: (key, v) => setKv((s) => ({ ...s, [key]: v })),
      toast,
      say,
      drawer,
      setDrawer,
      recents,
      visit,
      canGoBack,
      backPath,
      user,
      setUser: (name) => { const u = USERS.find((x) => x.name === name); if (u) { setUserState({ name: u.name, role: u.role }); say(`Signed in as ${u.name}`); } },
      can,
      guard,
      prefs,
      setPref,
      activity,
      signOut: () => { setDecisions({}); setKv({}); setActivity([]); setUnread(new Set(ALERTS.filter((a) => a.unread).map((a) => a.id))); setWatched(new Set(WATCHLIST.map((w) => w.login))); setUserState({ name: "demo.admin", role: "admin" }); },
    };
  }, [decisions, unread, watched, kv, toast, say, drawer, recents, visit, canGoBack, backPath, user, can, guard, prefs, setPref, activity]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppState");
  return v;
}
