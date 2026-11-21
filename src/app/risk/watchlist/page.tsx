"use client";

import { useState } from "react";
import { MinusCircle } from "lucide-react";
import { useApp } from "@/components/app-state";
import { BarButton, Group, Metrics, NavBar, Row, Segmented } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import { WATCHLIST, compact, group, when } from "@/lib/data";
import { buzz } from "@/lib/haptics";

type Dir = "all" | "up" | "down" | "flat";
// Since watch, as the portal reads it: closed P&L plus the change in floating since the account was added
const dirOf = (w: (typeof WATCHLIST)[number]) => { const v = w.since_total ?? 0; return v > 0 ? "up" : v < 0 ? "down" : "flat"; };

type Sort = "t30" | "fpl" | "balance";

export default function Watchlist() {
  const { watched, toggleWatch, say, guard } = useApp();
  const [sort, setSort] = useState<Sort>("t30");
  const [edit, setEdit] = useState(false);
  const [pov, setPov] = useState<"client" | "broker">("client");
  const [dir, setDir] = useState<Dir>("all");
  const sg = pov === "client" ? 1 : -1;
  const mine = WATCHLIST.filter((w) => watched.has(w.login));
  const count = (d: Dir) => mine.filter((w) => d === "all" || dirOf(w) === d).length;
  const val = (w: (typeof WATCHLIST)[number]) => (sort === "balance" ? w.balance : sg * (w[sort] ?? 0));
  const list = mine.filter((w) => dir === "all" || dirOf(w) === dir).sort((a, b) => val(b) - val(a));
  const fpl = sg * list.reduce((a, w) => a + (w.fpl ?? 0), 0);
  const t30 = sg * list.reduce((a, w) => a + (w.t30 ?? 0), 0);

  return (
    <>
      <NavBar title="Watchlist" eyebrow={`${list.length} accounts`} back={{ href: "/risk/", label: "Risk Management" }}
        trailing={<BarButton onClick={() => setEdit(!edit)}>{edit ? "Done" : "Edit"}</BarButton>} />

      <Metrics label="Watchlist totals" items={[
        { k: "Accounts", v: list.length },
        { k: "T30", v: compact(t30), tone: t30 >= 0 ? "pos" : "neg" },
        { k: "Floating", v: compact(fpl), tone: fpl >= 0 ? "pos" : "neg" },
      ]} />

      <Segmented label="Point of view" value={pov} onChange={setPov} options={[{ v: "client", label: "Client P&L" }, { v: "broker", label: "Broker P&L" }]} />
      <div className="tchips" role="radiogroup" aria-label="Since watch">
        {(["all", "up", "down", "flat"] as Dir[]).map((d) => <button key={d} role="radio" aria-checked={dir === d} className={`tchip ${dir === d ? "on" : ""}`} onClick={() => { buzz(); setDir(d); }}>{d === "all" ? "All" : d === "up" ? "Up" : d === "down" ? "Down" : "Flat"} {count(d)}</button>)}
      </div>
      <Segmented label="Sort by" value={sort} onChange={setSort} options={[{ v: "t30", label: "T30" }, { v: "fpl", label: "Floating" }, { v: "balance", label: "Balance" }]} />

      <Group footer="Up, Down and Flat, P&L since the account joined the watchlist. Accounts join from Client 360.">
        {list.length === 0 && <Row title="No accounts on the watchlist" chevron={false} />}
        {list.map((w) => edit ? (
          <Row key={w.login} onClick={() => { if (!guard("editor")) return; toggleWatch(w.login); say(`${w.name} removed`); }} icon={<MinusCircle size={20} strokeWidth={2.4} />} tint="var(--red)"
            title={w.name} subtitle={`#${w.login}`} chevron={false} detail="Remove" />
        ) : (
          <ClientRow key={w.login} login={w.login} name={w.name}
            sub={`${group(w.group)} · since ${when(w.watched_at, false)} · ${compact(sg * (w.since_total ?? 0), true)} since watch`}
            detail={<span className="stack-r"><Pnl v={val(w)} short /><span className="small">{sort === "t30" ? "T30" : sort === "fpl" ? "Floating" : "Balance"}</span></span>} />
        ))}
      </Group>
    </>
  );
}
