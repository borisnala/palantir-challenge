"use client";

import { FolderCog, MonitorSmartphone, Users } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Group, NavBar, Row } from "@/components/ios";
import { PageRow } from "@/components/rows";
import { Monogram } from "@/components/ui";
import bp from "@/data/buildpaths.json";
import us from "@/data/users.json";

export default function Account() {
  const { get, set, user } = useApp();
  const pending = us.pending.filter((d) => !get<Record<number, string>>("dev.decided", {})[d.id]).length;
  return (
    <>
      <NavBar title="Account" back={{ href: "/", label: "Morning Digest" }} />
      <Group>
        <Row onClick={() => set("ui.settings", true)} icon={<Monogram name={user.name.replace("demo.", "").slice(0, 2)} size={44} />} tint="transparent" title={user.name} subtitle="Settings, clearance and appearance" />
      </Group>
      <Group header="Admin">
        <PageRow href="/account/users/" Icon={Users} tint="var(--blue)" title="Users" detail={String(us.users.length)} />
        <PageRow href="/account/devices/" Icon={MonitorSmartphone} tint="var(--orange)" title="Device access" sub="Device approval requests" detail={pending ? `${pending} pending` : undefined} />
        <PageRow href="/account/build-paths/" Icon={FolderCog} tint="var(--gray)" title="Build paths" sub="Configuration file locations" detail={`${bp.algorithms.filter((a) => !a.exists).length} missing`} />
      </Group>
      <p className="fine">Risk Tool, the Global Risk Portal for mobile. Demonstration data only.</p>
    </>
  );
}
