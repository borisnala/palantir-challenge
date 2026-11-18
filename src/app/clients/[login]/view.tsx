"use client";

import { NavBar } from "@/components/ios";
import { Client360 } from "@/components/c360";
import type { Client } from "@/lib/data";

export function ClientView({ c }: { c: Client }) {
  return (
    <>
      <NavBar title={c.name} large={false} back={{ href: "/search/", label: "Client 360" }} />
      <Client360 c={c} />
    </>
  );
}
