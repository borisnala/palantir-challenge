"use client";

import { useState } from "react";
import { Chip, Group, Metrics, NavBar, Segmented, Sheet, Row } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import { Pnl } from "@/components/ui";
import ol from "@/data/openlots.json";
import { group, money, nameOf, num, when } from "@/lib/data";

type Sort = "gross" | "fpl" | "positions";
type C = (typeof ol.clients)[number];

export default function OpenLots() {
  const [sort, setSort] = useState<Sort>("gross");
  const [sel, setSel] = useState<C | null>(null);
  const [open, setOpen] = useState(false);
  const list = [...ol.clients].sort((a, b) => (sort === "fpl" ? Math.abs(b.fpl) - Math.abs(a.fpl) : b[sort] - a[sort]));
  const t = ol.totals;

  return (
    <>
      <NavBar title="Open Lots" eyebrow={`Live · as of ${when(new Date(ol.as_of * 1000).toISOString())} UTC`} back={{ href: "/risk/", label: "Risk" }} />

      <Metrics label="Open now" items={[
        { k: "Clients", v: t.clients }, { k: "Positions", v: t.positions },
        { k: "Gross lots", v: num(t.gross_lots, 1) }, { k: "MG hits", v: t.mg_triggered, tone: t.mg_triggered ? "warn" : undefined },
      ]} />

      <Segmented label="Sort by" value={sort} onChange={setSort} options={[{ v: "gross", label: "Gross lots" }, { v: "fpl", label: "Floating" }, { v: "positions", label: "Positions" }]} />

      <Group footer={`MachineGun trips at ${ol.mg1.normal["60"]} lots in 60 s for normal groups, ${ol.mg1.micro["60"]} for micro.`}>
        {list.map((c) => (
          <Row key={c.login} onClick={() => { setSel(c); setOpen(true); }} title={nameOf(c.login)}
            subtitle={`${c.positions} positions · ${c.top_symbols.map((s) => s[0]).join(", ")}`}
            detail={<span className="stack-r">{sort === "fpl" ? <Pnl v={c.fpl} short /> : <span>{num(c.gross, 2)} lots</span>}
              {c.mg && c.mg.tier ? <Chip tone="red">MG{c.mg.tier}</Chip> : c.excluded ? <Chip>Excluded</Chip> : null}</span>} />
        ))}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title={sel ? `#${sel.login}` : "Account"}>
        {sel && (
          <>
            <Group><ClientRow login={sel.login} sub={`#${sel.login} · ${group(sel.group)}`} /></Group>
            <Group header="Account">
              <Row title="Balance" detail={money(sel.balance)} />
              <Row title="Equity" detail={money(sel.equity)} />
              <Row title="Floating" detail={<Pnl v={sel.fpl} />} />
              <Row title="Gross lots" detail={num(sel.gross, 2)} />
              <Row title="Net lots" detail={num(sel.net, 2)} />
            </Group>
            <Group header="By symbol">{sel.top_symbols.map(([s, l]) => <Row key={s} title={s} detail={`${num(l as number, 2)} lots`} />)}</Group>
            <Group header="Position age" footer={sel.mg && sel.mg.tier ? `MachineGun tier ${sel.mg.tier}: ${sel.mg.lots} lots in ${sel.mg.window} s.` : "No MachineGun trigger."}>
              <Row title="Up to 60 s" detail={`${num(sel.age.le60, 2)} lots`} />
              <Row title="61 to 180 s" detail={`${num(sel.age["61_180"], 2)} lots`} />
              <Row title="181 to 900 s" detail={`${num(sel.age["181_900"], 2)} lots`} />
              <Row title="Over 900 s" detail={`${num(sel.age.gt900, 2)} lots`} />
            </Group>
          </>
        )}
      </Sheet>
    </>
  );
}
