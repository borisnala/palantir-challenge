"use client";

// Device access, the portal's access.html: an unknown device asks for access and waits for an administrator. The
// request lands in Account, Device access, where an administrator approves or denies it, and this screen follows.

import { useState } from "react";
import { Clock, ShieldCheck, ShieldX } from "lucide-react";
import Link from "@/components/nav-link";
import { Mark } from "@/components/brand";
import { useApp, type DeviceRequest } from "@/components/app-state";
import { buzz } from "@/lib/haptics";


/** A readable name for the browser asking, as the portal lists it, never the raw user agent. */
const deviceName = (ua: string) => `${/iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : "Desktop"}, ${/CriOS|Chrome/.test(ua) ? "Chrome" : /Firefox|FxiOS/.test(ua) ? "Firefox" : "Safari"}`;

export default function Access() {
  const app = useApp();
  const mine = app.get<DeviceRequest | null>("access.mine", null);
  const decided = app.get<Record<number, string>>("dev.decided", {});
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const state = !mine ? "form" : decided[mine.id] === "approved" ? "approved" : decided[mine.id] === "denied" ? "denied" : "pending";

  const request = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !purpose.trim()) return;
    const r: DeviceRequest = { id: 900 + Math.floor(performance.now() % 99), label: label.trim(), purpose: purpose.trim(), first_ip: "192.0.2.50",
      user_agent: deviceName(navigator.userAgent), created_at: new Date().toISOString() };
    app.set("access.mine", r);
    app.set("dev.requests", [...app.get<DeviceRequest[]>("dev.requests", []), r]);
    app.say("Access requested");
  };

  return (
    <div className="gatepage">
      <div className="gate-mark"><Mark size={64} /></div>
      <h1 className="gate-title">Request access</h1>
      <p className="gate-sub">This device is not approved yet</p>
      {state === "form" && (
        <form onSubmit={request} className="gate-form">
          <div className="grp"><div className="grp-body">
            <label className="field"><span>Device</span><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Desk iPhone" /></label>
            <label className="field"><span>Purpose</span><input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Overnight monitoring" /></label>
          </div><p className="grp-foot">An administrator approves each device in Device access.</p></div>
          <button className={`btn btn-blue wide ${label.trim() && purpose.trim() ? "" : "btn-locked"}`} disabled={!label.trim() || !purpose.trim()} type="submit">Request access</button>
        </form>
      )}
      {state !== "form" && mine && (
        <div className="gate-form">
          <div className="grp"><div className="grp-body">
            <div className="gate-status">
              {state === "pending" && <Clock size={28} strokeWidth={1.8} className="gate-ic warn" />}
              {state === "approved" && <ShieldCheck size={28} strokeWidth={1.8} className="gate-ic pos" />}
              {state === "denied" && <ShieldX size={28} strokeWidth={1.8} className="gate-ic neg" />}
              <b>{state === "pending" ? "Pending approval" : state === "approved" ? "Access approved" : "Access denied"}</b>
              <span>{mine.label}, {mine.purpose}</span>
            </div>
          </div><p className="grp-foot">{state === "pending" ? "Requested from 192.0.2.50. This screen updates when an administrator decides." : state === "approved" ? "This device can now sign in." : "Contact an administrator to request again."}</p></div>
          {state === "approved" && <Link href="/login/" transitionTypes={["pop"]} className="btn btn-blue wide gate-btn" onClick={() => buzz()}>Sign in</Link>}
          {state !== "approved" && <button className="btn btn-gray wide" onClick={() => { buzz(); app.set("access.mine", null); }}>{state === "denied" ? "Request again" : "Withdraw request"}</button>}
        </div>
      )}
      <p className="gate-foot"><Link href="/login/" transitionTypes={["pop"]}>Back to sign in</Link></p>
    </div>
  );
}
