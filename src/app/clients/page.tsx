"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Initials, Pnl, SecHead, StatusTag } from "@/components/ui";
import { CLIENTS } from "@/lib/data";

export default function Clients() {
  const { watched } = useApp();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const match = CLIENTS.filter((c) => !query || `${c.login} ${c.name} ${c.group}`.toLowerCase().includes(query));
  const flagged = match.filter((c) => watched.has(c.login));
  const rest = match.filter((c) => !watched.has(c.login));

  const Row = ({ c }: { c: (typeof CLIENTS)[number] }) => (
    <Link href={`/clients/${c.login}/`} className="row">
      <Initials name={c.name} />
      <span className="stack">
        <span className="strong">{c.name}</span>
        <span className="muted">#{c.login} · {c.style}</span>
      </span>
      <span className="stack right">
        <Pnl v={c.t30} short />
        {c.status ? <StatusTag s={c.status} /> : <span className="small">T30</span>}
      </span>
    </Link>
  );

  return (
    <>
      <header className="titlebar"><div><p className="eyebrow">Client 360</p><h1>Clients</h1></div></header>
      <label className="search">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Login, name or group" inputMode="search" aria-label="Search clients" />
      </label>
      {flagged.length > 0 && (
        <section className="section">
          <SecHead title="On your watchlist" count={flagged.length} />
          <div className="group">{flagged.map((c) => <Row key={c.login} c={c} />)}</div>
        </section>
      )}
      {rest.length > 0 && (
        <section className="section">
          <SecHead title="Flagged book" count={rest.length} />
          <div className="group">{rest.map((c) => <Row key={c.login} c={c} />)}</div>
        </section>
      )}
      {match.length === 0 && <p className="clear">No client matches {q}.</p>}
    </>
  );
}
