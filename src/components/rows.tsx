"use client";

// Rows shared by many screens. A client row opens that client's profile only when the demo has a profile for it,
// so no row ever leads to an empty screen.

import { Row } from "./ios";
import { Monogram, Pnl } from "./ui";
import { hasProfile, nameOf } from "@/lib/data";

export function ClientRow({ login, name, sub, detail, value }: {
  login: number; name?: string; sub?: React.ReactNode; detail?: React.ReactNode; value?: number;
}) {
  const n = name ?? nameOf(login);
  const linked = hasProfile(login);
  return (
    <Row href={linked ? `/clients/${login}/` : undefined} icon={<Monogram name={n} size={36} />} tint="transparent"
      title={n} subtitle={sub ?? `#${login}`} detail={detail ?? (value !== undefined ? <Pnl v={value} short /> : undefined)} />
  );
}

/** A Settings-style row that opens a page of the app. */
export function PageRow({ href, Icon, tint, title, sub, detail }: {
  href: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; tint: string; title: string; sub?: string; detail?: React.ReactNode;
}) {
  return <Row href={href} icon={<Icon size={17} strokeWidth={2.4} />} tint={tint} title={title} subtitle={sub} detail={detail} />;
}
