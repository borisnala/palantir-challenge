"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row } from "@/components/ios";
import { Monogram, Pnl } from "@/components/ui";
import { CLIENTS } from "@/lib/data";

export default function Clients() {
  const { watched } = useApp();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const match = CLIENTS.filter((c) => !query || `${c.login} ${c.name} ${c.group}`.toLowerCase().includes(query));
  const flagged = match.filter((c) => watched.has(c.login));
  const rest = match.filter((c) => !watched.has(c.login));

  const row = (c: (typeof CLIENTS)[number]) => (
    <Row key={c.login} href={`/clients/${c.login}/`} icon={<Monogram name={c.name} size={36} />} tint="transparent"
      title={c.name} subtitle={`#${c.login} · ${c.style}`} detail={<Pnl v={c.t30} short />} />
  );

  return (
    <>
      <NavBar title="Clients" eyebrow="Client 360" tone="teal" />
      <label className="searchfield">
        <Search size={17} strokeWidth={2.4} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" inputMode="search" aria-label="Search by login, name or group" />
        {q && <button onClick={() => setQ("")} aria-label="Clear"><X size={14} strokeWidth={3} /></button>}
      </label>
      {flagged.length > 0 && <Group header="Watchlist" footer="T30 is the client's profit over the last 30 days.">{flagged.map(row)}</Group>}
      {rest.length > 0 && <Group header="Flagged book">{rest.map(row)}</Group>}
      {match.length === 0 && <p className="empty">No Results for &ldquo;{q}&rdquo;</p>}
    </>
  );
}
