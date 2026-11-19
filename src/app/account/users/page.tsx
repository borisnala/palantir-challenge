"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Chip, Confirm, Group, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { Monogram } from "@/components/ui";
import us from "@/data/users.json";
import { when } from "@/lib/data";

type U = (typeof us.users)[number];
type Role = "admin" | "editor" | "viewer";

export default function UsersPage() {
  const { get, set, say, guard } = useApp();
  const roles = get<Record<number, Role>>("users.roles", {});
  const removed = get<number[]>("users.removed", []);
  const [sel, setSel] = useState<U | null>(null);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("viewer");
  const [del, setDel] = useState(false);
  const list = us.users.filter((u) => !removed.includes(u.id));
  const roleOf = (u: U) => roles[u.id] ?? (u.role as Role);

  return (
    <>
      <NavBar title="Users" eyebrow={`${list.length} people`} back={{ href: "/account/", label: "Account" }} />
      <Group footer="Admins change settings and users. Editors change settings. Viewers only read.">
        {list.map((u) => (
          <Row key={u.id} onClick={() => { setSel(u); setRole(roleOf(u)); setOpen(true); }} icon={<Monogram name={u.username.replace("demo.", "").slice(0, 2)} size={36} />} tint="transparent"
            title={u.username} subtitle={`Since ${when(u.created_at, false)}`} detail={<Chip tone={roleOf(u) === "admin" ? "purple" : roleOf(u) === "editor" ? "blue" : "gray"}>{roleOf(u)}</Chip>} />
        ))}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title={sel?.username ?? "User"}>
        {sel && (
          <>
            <Segmented label="Role" value={role} onChange={setRole} options={[{ v: "viewer", label: "Viewer" }, { v: "editor", label: "Editor" }, { v: "admin", label: "Admin" }]} />
            <button className="btn btn-blue" disabled={role === roleOf(sel)} onClick={() => { if (!guard("admin")) return; set("users.roles", { ...roles, [sel.id]: role }); say(`${sel.username} is now ${role}`); setOpen(false); }}>
              {role === roleOf(sel) ? `Already ${role}` : `Make ${role}`}
            </button>
            {sel.username !== "demo.admin" && <button className="btn btn-gray" onClick={() => setDel(true)}><span className="neg">Remove user</span></button>}
          </>
        )}
      </Sheet>

      <Confirm need="admin" open={del} title="Remove user" action="Remove" destructive onCancel={() => setDel(false)}
        onConfirm={() => { if (sel) { set("users.removed", [...removed, sel.id]); say(`${sel.username} removed`); } setDel(false); setOpen(false); }}
        lines={sel ? [`${sel.username} loses access to the portal and this app.`] : []} />
    </>
  );
}
