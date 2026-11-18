"use client";

import { Chip, Group, Metrics, NavBar, Row } from "@/components/ios";
import { Share } from "@/components/ui";
import pr from "@/data/promotion.json";
import { group, when } from "@/lib/data";

export default function Promotion() {
  const { population: p, promo_targets: t, expiry: e, operations: o, tier_guard: g } = pr;
  return (
    <>
      <NavBar title="Promotion Analysis" eyebrow={`JamesBond · ${when(pr.generated_at)} UTC`} back={{ href: "/risk/", label: "Risk" }} />
      <Metrics label="Population" items={[{ k: "Accounts", v: p.accounts }, { k: "Promoted", v: p.promotion_landed, tone: "pos" }, { k: "Never landed", v: p.never_landed, tone: "warn" }]} />

      <Group header="By status">
        {p.by_status.map((x) => <Row key={x.status} title={<span className="row-text">{x.status.replace(/_/g, " ").toLowerCase()}<Share v={x.count} of={p.accounts} /></span>} detail={x.count} chevron={false} />)}
      </Group>

      <Group header={`Promo segments · ${t.distinct_moves} moves`}>
        {t.by_promo_segment.map((x) => <Row key={x.segment} title={x.segment} detail={x.count} chevron={false} />)}
      </Group>

      <Group header="Most frequent moves">
        {t.top_moves.map((x, i) => <Row key={i} title={group(x.to)} subtitle={`from ${group(x.from)}`} detail={x.count} chevron={false} />)}
      </Group>

      <Group header="Expiry" footer={e.past_expiry_still_in_promo ? `${e.past_expiry_still_in_promo} accounts are past expiry and still in a promo group.` : undefined}>
        <Row title="With an expiry date" detail={e.with_expiry} chevron={false} />
        <Row title="Missing expiry" detail={e.missing_expiry} chevron={false} />
        <Row title="Earliest" detail={when(e.earliest)} chevron={false} />
        <Row title="Latest" detail={when(e.latest)} chevron={false} />
        <Row title="Past expiry, still promoted" detail={<Chip tone={e.past_expiry_still_in_promo ? "red" : "green"}>{e.past_expiry_still_in_promo}</Chip>} chevron={false} />
      </Group>

      <Group header="Operations">
        <Row title="Storage not committed" detail={o.storage_not_committed} chevron={false} />
        <Row title="Storage flag missing" detail={o.storage_flag_absent} chevron={false} />
        <Row title="Lead source not written" detail={o.lead_source_not_written} chevron={false} />
        <Row title="Lead source flag missing" detail={o.lead_source_flag_absent} chevron={false} />
      </Group>

      <Group header={`Tier guard · cutoff ${g.cutoff}`} footer={g.holds ? "The guard holds. No client above the cutoff tier was promoted." : "The guard was breached."}>
        {g.by_tier.map((x) => <Row key={x.tier} title={`Tier ${x.tier}`} detail={x.count} chevron={false} />)}
        <Row title="Highest tier promoted" detail={<Chip tone={g.holds ? "green" : "red"}>{g.highest_tier_promoted}</Chip>} chevron={false} />
        <Row title="Groups without a tier" detail={g.untiered_groups} chevron={false} />
      </Group>
    </>
  );
}
