"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ALERTS, CLIENTS, WITHDRAWALS, type Withdrawal } from "@/lib/data";

type Decision = "approved" | "rejected";

interface State {
  pending: Withdrawal[];
  decided: (Withdrawal & { decision: Decision })[];
  decide: (id: string, d: Decision) => void;
  undo: (id: string) => void;
  unread: Set<number>;
  markRead: (id?: number) => void;
  watched: Set<number>;
  toggleWatch: (login: number) => void;
}

const Ctx = createContext<State | null>(null);

export function AppState({ children }: { children: React.ReactNode }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [unread, setUnread] = useState(() => new Set(ALERTS.filter((a) => a.unread).map((a) => a.id)));
  const [watched, setWatched] = useState(() => new Set(CLIENTS.filter((c) => c.status && c.status !== "cleared").map((c) => c.login)));

  const value = useMemo<State>(() => ({
    pending: WITHDRAWALS.filter((w) => !decisions[w.id]),
    decided: WITHDRAWALS.filter((w) => decisions[w.id]).map((w) => ({ ...w, decision: decisions[w.id] })),
    decide: (id, d) => setDecisions((s) => ({ ...s, [id]: d })),
    undo: (id) => setDecisions((s) => { const n = { ...s }; delete n[id]; return n; }),
    unread,
    markRead: (id) => setUnread((s) => { if (id === undefined) return new Set(); const n = new Set(s); n.delete(id); return n; }),
    watched,
    toggleWatch: (login) => setWatched((s) => { const n = new Set(s); if (n.has(login)) n.delete(login); else n.add(login); return n; }),
  }), [decisions, unread, watched]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppState");
  return v;
}
