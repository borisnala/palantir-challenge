"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleCheck, House, Users } from "lucide-react";
import { useApp } from "./app-state";

// The iOS 26 floating tab bar: one glass capsule, filled symbol on the selected tab.
export function TabBar() {
  const path = usePathname();
  const { pending, unread } = useApp();
  const tabs = [
    { href: "/", label: "Today", Icon: House, badge: 0 },
    { href: "/approvals/", label: "Approvals", Icon: CircleCheck, badge: pending.length },
    { href: "/clients/", label: "Clients", Icon: Users, badge: 0 },
    { href: "/alerts/", label: "Alerts", Icon: Bell, badge: unread.size },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.replace(/\/$/, "")));

  return (
    <nav className="tabnav" aria-label="Main">
      <div className="tabbar glass">
        {tabs.map(({ href, label, Icon, badge }) => {
          const on = active(href);
          return (
            <Link key={href} href={href} className={on ? "tab tab-on" : "tab"} aria-current={on ? "page" : undefined}>
              <span className="tab-icon">
                <Icon size={24} strokeWidth={on ? 2.1 : 1.8} fill={on ? "currentColor" : "none"} fillOpacity={on ? 0.22 : 0} />
                {badge > 0 && <b className="tabbadge" aria-label={`${badge} waiting`}>{badge}</b>}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
