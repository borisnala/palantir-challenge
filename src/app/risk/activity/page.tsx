"use client";

import { useState } from "react";
import { Chip, Group, Metrics, NavBar, Row, Segmented } from "@/components/ios";
import { ClientRow } from "@/components/rows";
import aa from "@/data/algoactivity.json";
import { group, when } from "@/lib/data";

type W = "7" | "30" | "90" | "365";
type V = "moves" | "score";
type Algo = "machinegun" | "scalperam" | "fbuv2";

export default function Activity() {
  const [w, setW] = useState<W>("30");
  const [v, setV] = useState<V>("moves");
  const [algo, setAlgo] = useState<Algo>("machinegun");
  const win = aa[w];
  const al = win.algos[algo];

  return (
    <>
      <NavBar title="Algo Activity" eyebrow={`${when(win.start, false)} to ${when(win.end, false)}`} back={{ href: "/risk/", label: "Risk" }} />
      <Segmented label="Window" value={w} onChange={setW} options={[{ v: "7", label: "7 days" }, { v: "30", label: "30 days" }, { v: "90", label: "90 days" }, { v: "365", label: "Year" }]} />
      <Metrics label="Moves" items={(Object.keys(win.algos) as Algo[]).map((k) => ({ k: win.algos[k].label, v: win.algos[k].count }))} />
      <Segmented label="View" value={v} onChange={setV} options={[{ v: "moves", label: "Moves" }, { v: "score", label: "Risk score" }]} />

      {v === "moves" ? (
        <>
          <Segmented label="Algorithm" value={algo} onChange={setAlgo} options={[{ v: "machinegun", label: "MachineGun" }, { v: "scalperam", label: "ScalperAM" }, { v: "fbuv2", label: "FBUv2" }]} />
          <Group footer={`${al.coverage.record_count} records, the newest ${when(al.coverage.last_record_at)}.`}>
            {al.accounts.length === 0 && <Row title="No moves in this window" chevron={false} />}
            {al.accounts.map((x, i) => (
              <ClientRow key={i} login={x.login} sub={`${group(x.from_group)} to ${group(x.to_group)}`}
                detail={<span className="stack-r"><span className="small">{when(x.moved_at)}</span>{x.move_performed ? <Chip tone="green">{x.requested_level}</Chip> : <Chip tone="orange">Not moved</Chip>}</span>} />
            ))}
          </Group>
        </>
      ) : (
        <Group footer="One point for each algorithm that flagged the account in the window. 3 means all three did.">
          {win.risk.map((r) => (
            <ClientRow key={r.login} login={r.login} sub={r.contributing_algos.join(", ")}
              detail={<Chip tone={r.score >= 3 ? "red" : r.score === 2 ? "orange" : "gray"}>Score {r.score}</Chip>} />
          ))}
        </Group>
      )}
    </>
  );
}
