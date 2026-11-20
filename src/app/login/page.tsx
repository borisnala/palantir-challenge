"use client";

// Sign in, the portal's login.html (owner 2026-11-20, "make sure literally all pages exist"). No app chrome here: the
// mark, two fields in one inset group, the main action as a full-width capsule, view only as a plain text button, and
// the way to ask for a new device under it. Any demo user signs in, the password is not checked in the demonstration.

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "@/components/nav-link";
import { Mark } from "@/components/brand";
import { USERS, useApp } from "@/components/app-state";
import { buzz } from "@/lib/haptics";

export default function Login() {
  const app = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  const enter = (u: string) => { buzz(); app.setUser(u); router.replace(app.prefs.start ?? "/"); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = USERS.find((x) => x.name === name.trim().toLowerCase());
    if (!u || !pass) { buzz(); setError(true); return; }
    enter(u.name);
  };

  return (
    <div className="gatepage">
      <div className="gate-mark"><Mark size={64} /></div>
      <h1 className="gate-title">Sign in</h1>
      <p className="gate-sub">Global Risk Portal</p>
      <form onSubmit={submit} className="gate-form">
        <div className="grp"><div className="grp-body">
          <label className="field"><span>Username</span><input value={name} onChange={(e) => { setName(e.target.value); setError(false); }} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="demo.admin" /></label>
          <label className="field"><span>Password</span><input value={pass} onChange={(e) => { setPass(e.target.value); setError(false); }} type="password" autoComplete="current-password" placeholder="Required" /></label>
        </div>{error && <p className="grp-foot neg" role="alert">Unknown user or missing password.</p>}</div>
        <button className="btn btn-blue wide" type="submit">Sign in</button>
      </form>
      <button className="gate-link" onClick={() => enter("demo.viewer")}>Continue as view only</button>
      <p className="gate-foot">New device. <Link href="/access/" transitionTypes={["push"]}>Request access</Link></p>
      <p className="gate-fine">Demonstration data. Users demo.admin, demo.editor, demo.viewer.</p>
    </div>
  );
}
