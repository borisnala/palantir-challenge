"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./app-state";

const ICONS: Record<string, React.ReactNode> = {
  today: <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  approvals: <><path d="M5 4h14v16H5z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  clients: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  alerts: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
};

export function TabBar() {
  const path = usePathname();
  const { pending, unread } = useApp();
  const tabs = [
    { href: "/", key: "today", label: "Today", badge: 0 },
    { href: "/approvals/", key: "approvals", label: "Approvals", badge: pending.length },
    { href: "/clients/", key: "clients", label: "Clients", badge: 0 },
    { href: "/alerts/", key: "alerts", label: "Alerts", badge: unread.size },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.replace(/\/$/, "")));

  return (
    <nav className="tabnav" aria-label="Main">
      <div className="pill glass">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={active(t.href) ? "now-tab" : ""} aria-current={active(t.href) ? "page" : undefined}>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">{ICONS[t.key]}</svg>
            <span>{t.label}</span>
            {t.badge > 0 && <b className="tabbadge" aria-label={`${t.badge} waiting`}>{t.badge}</b>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
