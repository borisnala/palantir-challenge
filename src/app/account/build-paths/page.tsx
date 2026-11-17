"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { Group, NavBar, Row } from "@/components/ios";
import bp from "@/data/buildpaths.json";

export default function BuildPaths() {
  const missing = bp.algorithms.filter((a) => !a.exists).length;
  return (
    <>
      <NavBar title="Build paths" eyebrow={missing ? `${missing} missing` : "All found"} back={{ href: "/account/", label: "Account" }} />
      <Group footer="Where the portal reads each algorithm's settings. A missing file means that algorithm runs on its defaults.">
        {bp.algorithms.map((a) => (
          <Row key={a.slug} icon={a.exists ? <CircleCheck size={17} strokeWidth={2.4} /> : <CircleX size={17} strokeWidth={2.4} />} tint={a.exists ? "var(--green)" : "var(--red)"}
            title={a.label} subtitle={<span className="mono wrap">{a.path}</span>} chevron={false} />
        ))}
      </Group>
      <Group header="CandleTL home">
        <Row icon={bp.candletl_home.exists ? <CircleCheck size={17} strokeWidth={2.4} /> : <CircleX size={17} strokeWidth={2.4} />} tint={bp.candletl_home.exists ? "var(--green)" : "var(--red)"}
          title="CandleTL" subtitle={<span className="mono wrap">{bp.candletl_home.path}</span>} chevron={false} />
      </Group>
    </>
  );
}
