"use client";

import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { Group, NavBar, Row } from "@/components/ios";
import wd from "@/data/withdrawals.json";

const ICON = { ok: [CircleCheck, "var(--green)"], warn: [CircleAlert, "var(--orange)"], bad: [CircleX, "var(--red)"] } as const;
const age = (s?: number | null) => (s === null || s === undefined ? "" : s < 60 ? `${s} s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`);

export default function Health() {
  const bad = wd.health.checks.filter((c) => c.status === "bad").length;
  const warn = wd.health.checks.filter((c) => c.status === "warn").length;
  return (
    <>
      <NavBar title="System health" back={{ href: "/withdrawals/", label: "Withdrawals" }} eyebrow={`${bad} down, ${warn} warnings`} />
      <Group footer="Every check the screener needs to answer a withdrawal. A check that is down sends requests to Risk.">
        {wd.health.checks.map((c) => {
          const [Icon, tint] = ICON[c.status as keyof typeof ICON] ?? ICON.warn;
          return <Row key={c.name} icon={<Icon size={17} strokeWidth={2.4} />} tint={tint} title={c.name}
            subtitle={<span className="wrap">{c.detail}</span>} detail={age((c as { age_s?: number | null }).age_s)} chevron={false} />;
        })}
      </Group>
    </>
  );
}
