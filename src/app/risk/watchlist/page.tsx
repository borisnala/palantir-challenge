"use client";

import { useState } from "react";
import { MinusCircle } from "lucide-react";
import { useApp } from "@/components/app-state";
import { BarButton, Group, Metrics, NavBar, Row, Segmented } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import { WATCHLIST, compact, group, when } from "@/lib/data";

type Sort = "t30" | "fpl" | "balance";

export default function Watchlist() {
  const { watched, toggleWatch, say, guard } = useApp();
  const [sort, setSort] = useState<Sort>("t30");
  const [edit, setEdit] = useState(false);
  const list = WATCHLIST.filter((w) => watched.has(w.login)).sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));
  const fpl = list.reduce((a, w) => a + (w.fpl ?? 0), 0);
  const t30 = list.reduce((a, w) => a + (w.t30 ?? 0), 0);

  return (
    <>
      <NavBar title="Watchlist" eyebrow={`${list.length} accounts`} back={{ href: "/risk/", label: "Risk Management" }}
        trailing={<BarButton onClick={() => setEdit(!edit)}>{edit ? "Done" : "Edit"}</BarButton>} />

      <Metrics label="Watchlist totals" items={[
        { k: "Accounts", v: list.length },
        { k: "T30", v: compact(t30), tone: t30 >= 0 ? "pos" : "neg" },
        { k: "Floating", v: compact(fpl), tone: fpl >= 0 ? "pos" : "neg" },
      ]} />

      <Segmented label="Sort by" value={sort} onChange={setSort} options={[{ v: "t30", label: "T30" }, { v: "fpl", label: "Floating" }, { v: "balance", label: "Balance" }]} />

      <Group footer="Add accounts from Client 360.">
        {list.length === 0 && <Row title="No accounts on the watchlist" chevron={false} />}
        {list.map((w) => edit ? (
          <Row key={w.login} onClick={() => { if (!guard("editor")) return; toggleWatch(w.login); say(`${w.name} removed`); }} icon={<MinusCircle size={20} strokeWidth={2.4} />} tint="var(--red)"
            title={w.name} subtitle={`#${w.login}`} chevron={false} detail="Remove" />
        ) : (
          <ClientRow key={w.login} login={w.login} name={w.name}
            sub={`${group(w.group)} · since ${when(w.watched_at, false)}`}
            detail={<span className="stack-r"><Pnl v={sort === "balance" ? w.balance : sort === "fpl" ? w.fpl : w.t30} short /><span className="small">{sort === "t30" ? "T30" : sort === "fpl" ? "Floating" : "Balance"}</span></span>} />
        ))}
      </Group>
    </>
  );
}
