"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { BarButton, Chip, Confirm, Group, NavBar, Row, Segmented, Sheet } from "@/components/ios";
import { Monogram } from "@/components/ui";
import us from "@/data/users.json";
import { sentence, when } from "@/lib/data";

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
  const added = get<U[]>("users.added", []);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("viewer");
  const [confirmNew, setConfirmNew] = useState(false);
  const [reset, setReset] = useState(false);
  const list = [...us.users, ...added].filter((u) => !removed.includes(u.id));
  const nameOk = /^[a-z][a-z0-9._-]{2,30}$/.test(newName) && !list.some((u) => u.username === newName);
  const roleOf = (u: U) => roles[u.id] ?? (u.role as Role);

  return (
    <>
      <NavBar title="Users" eyebrow={`${list.length} people`} back={{ href: "/account/", label: "Account" }}
        trailing={<BarButton onClick={() => { if (!guard("admin")) return; setNewName(""); setNewRole("viewer"); setCreating(true); }}>New user</BarButton>} />
      <Group footer="Admins change settings and users. Editors change settings. Viewers only read.">
        {list.map((u) => (
          <Row key={u.id} onClick={() => { setSel(u); setRole(roleOf(u)); setOpen(true); }} icon={<Monogram name={u.username.replace("demo.", "").slice(0, 2)} size={36} />} tint="transparent"
            title={u.username} subtitle={`Since ${when(u.created_at, false)}`} detail={<Chip tone={roleOf(u) === "admin" ? "purple" : roleOf(u) === "editor" ? "blue" : "gray"}>{sentence(roleOf(u))}</Chip>} />
        ))}
      </Group>

      <Sheet open={open} onClose={() => setOpen(false)} title={sel?.username ?? "User"}>
        {sel && (
          <>
            <Segmented label="Role" value={role} onChange={setRole} options={[{ v: "viewer", label: "Viewer" }, { v: "editor", label: "Editor" }, { v: "admin", label: "Admin" }]} />
            <button className="btn btn-blue" disabled={role === roleOf(sel)} onClick={() => { if (!guard("admin")) return; set("users.roles", { ...roles, [sel.id]: role }); say(`${sel.username} is now ${role}`); setOpen(false); }}>
              {role === roleOf(sel) ? `Already ${role}` : `Make ${role}`}
            </button>
            <button className="btn btn-gray" onClick={() => setReset(true)}>Reset password</button>
            {sel.username !== "demo.admin" && <button className="btn btn-gray" onClick={() => setDel(true)}><span className="neg">Remove user</span></button>}
          </>
        )}
      </Sheet>

      <Sheet open={creating} onClose={() => setCreating(false)} title="New user">
        <Group footer="Lower case letters, digits, dots and dashes. A temporary password is issued on creation.">
          <label className="field"><span>Username</span><input value={newName} onChange={(e) => setNewName(e.target.value.trim().toLowerCase())} autoCapitalize="none" spellCheck={false} placeholder="demo.analyst2" /></label>
        </Group>
        <Segmented label="Role" value={newRole} onChange={setNewRole} options={[{ v: "viewer", label: "Viewer" }, { v: "editor", label: "Editor" }, { v: "admin", label: "Admin" }]} />
        <button className={`btn btn-blue wide ${nameOk ? "" : "btn-locked"}`} disabled={!nameOk} onClick={() => setConfirmNew(true)}>{nameOk || !newName ? "Create user" : "Username taken or invalid"}</button>
      </Sheet>
      <Confirm need="admin" open={confirmNew} title="Create user" action="Create" onCancel={() => setConfirmNew(false)}
        onConfirm={() => { set("users.added", [...added, { id: 1000 + added.length, username: newName, role: newRole, created_at: new Date().toISOString() } as U]); say(`${newName} created`); setConfirmNew(false); setCreating(false); }}
        lines={[`Username ${newName}`, `Role ${newRole}`, "A temporary password is issued"]} />
      <Confirm need="admin" open={reset} title="Reset password" action="Reset" onCancel={() => setReset(false)}
        onConfirm={() => { if (sel) say(`Temporary password issued to ${sel.username}`); setReset(false); }}
        lines={sel ? [`${sel.username} signs in with a temporary password`, "The current password stops working at once"] : []} />
      <Confirm need="admin" open={del} code={`remove ${sel?.username}`} title="Remove user" action="Remove" destructive onCancel={() => setDel(false)}
        onConfirm={() => { if (sel) { set("users.removed", [...removed, sel.id]); say(`${sel.username} removed`); } setDel(false); setOpen(false); }}
        lines={sel ? [`${sel.username} loses access to the portal and this app.`] : []} />
    </>
  );
}
