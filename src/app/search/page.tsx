"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { CLIENTS, group } from "@/lib/data";

export default function SearchClients() {
  const { watched } = useApp();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const match = CLIENTS.filter((c) => !query || `${c.login} ${c.name} ${c.group_now}`.toLowerCase().includes(query));
  const flagged = match.filter((c) => watched.has(c.login));
  const rest = match.filter((c) => !watched.has(c.login));
  const row = (c: (typeof CLIENTS)[number]) => <ClientRow key={c.login} login={c.login} name={c.name} sub={`#${c.login} · ${group(c.group_now)}`} value={c.t30} />;

  return (
    <>
      <NavBar title="Client 360" eyebrow="Search by login, name or group" root />
      <label className="searchfield">
        <Search size={17} strokeWidth={2.4} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Login, name or group" inputMode="search" aria-label="Search by login, name or group" autoFocus />
        {q && <button onClick={() => setQ("")} aria-label="Clear"><X size={14} strokeWidth={3} /></button>}
      </label>
      {flagged.length > 0 && <Group header={`On the watchlist · ${flagged.length}`} footer="T30, client profit over 30 days.">{flagged.map(row)}</Group>}
      {rest.length > 0 && <Group header={`Other clients · ${rest.length}`}>{rest.map(row)}</Group>}
      {match.length === 0 && <Group><Row title={`No client matches “${q}”`} subtitle="Enter a login, for example 99000003." chevron={false} /></Group>}
    </>
  );
}
