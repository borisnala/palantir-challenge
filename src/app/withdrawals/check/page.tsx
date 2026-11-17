"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Group, NavBar, Row } from "@/components/ios";
import { WdDetail, type WdLike } from "@/components/wd";
import wd from "@/data/withdrawals.json";
import { nameOf } from "@/lib/data";

const PREVIEWS = wd.previews as unknown as Record<string, WdLike>;
const KNOWN = Object.keys(PREVIEWS).filter((k) => k !== "unknown");

export default function WdCheck() {
  const [q, setQ] = useState(String(wd.default_ta));
  const [ran, setRan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = (ta: string) => {
    const t = ta.trim();
    if (!/^\d{6,9}$/.test(t)) return;
    setQ(t); setBusy(true); setRan(null);
    setTimeout(() => { setRan(t); setBusy(false); }, 450); // the real screener answers in about half a second
  };
  const result = ran ? PREVIEWS[ran] ?? PREVIEWS.unknown : null;

  return (
    <>
      <NavBar title="WD Check" back={{ href: "/withdrawals/", label: "Withdrawals" }} eyebrow="One account, before it asks" />

      <form className="checkform" onSubmit={(e) => { e.preventDefault(); run(q); }}>
        <label className="searchfield">
          <Search size={17} strokeWidth={2.4} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Trading account" aria-label="Trading account number" />
        </label>
        <button className="btn btn-blue" type="submit" disabled={busy || !/^\d{6,9}$/.test(q)}>{busy ? "Checking" : "Run check"}</button>
      </form>

      {!result && !busy && (
        <Group header="Accounts with screening data" footer="Tap one to check it, or type any account number.">
          {KNOWN.map((k) => <Row key={k} onClick={() => run(k)} title={nameOf(Number(k))} subtitle={`#${k}`} />)}
        </Group>
      )}

      {result && ran && (
        PREVIEWS[ran]
          ? <WdDetail r={result} />
          : <Group header="Result"><Row title={`No client found for #${ran}`} subtitle="The family index has no record of this account, so the screener sends it to Risk." chevron={false} /></Group>
      )}
    </>
  );
}
