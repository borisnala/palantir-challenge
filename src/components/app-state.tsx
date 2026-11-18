"use client";

// In-memory state for the demo. Decisions, reads, watchlist changes and control edits live here for the session, so
// every screen agrees. Nothing is saved or sent anywhere.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import wd from "@/data/withdrawals.json";
import { ALERTS, WATCHLIST } from "@/lib/data";
import { buzz } from "@/lib/haptics";

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

  // The app's own history. history.length counts pages from other sites too, so Back once used router.back() into
  // whatever came before the app, including addresses of screens that no longer exist (the "page not found").
  const path = usePathname();
  const stack = useRef<string[]>([]);
  useEffect(() => {
    const st = stack.current;
    if (st[st.length - 2] === path) st.pop();
    else if (st[st.length - 1] !== path) st.push(path);
  }, [path]);
  const canGoBack = useCallback(() => stack.current.length > 1, []);

  const say = useCallback((msg: string) => {
    setToast(msg);
    buzz(true); // a confirmation means an action completed: the firm double tick
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const value = useMemo<State>(() => {
    const rows = wd.rows.map((r) => (decisions[r.request_id] ? { ...r, status: decisions[r.request_id], decided_by: "demo.admin" } : r)) as WdRow[];
    return {
      wdRows: rows,
      pending: rows.filter((r) => r.status === "pending"),
      decide: (id, d) => setDecisions((s) => ({ ...s, [id]: d })),
      undo: (id) => setDecisions((s) => { const n = { ...s }; delete n[id]; return n; }),
      decisionOf: (id) => decisions[id],
      unread,
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
    };
  }, [decisions, unread, watched, kv, toast, say, drawer, recents, visit, canGoBack]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppState");
  return v;
}
