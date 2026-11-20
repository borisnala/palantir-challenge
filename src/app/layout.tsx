import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import "./globals.css";
import { RotateCcw } from "lucide-react";
import { DEVICE_SCRIPT } from "@/lib/device";
import { AppState } from "@/components/app-state";
import { CommandBar, Drawer, StageScrim } from "@/components/shell";
import { DeviceFrame, LaunchReady, PullToRefresh, Transitions } from "@/components/motion";
import { Launch } from "@/components/brand";
import { LightSource } from "@/components/liquid";
import { Toast } from "@/components/ios";
import { SettingsSheet } from "@/components/settings";
import { Welcome } from "@/components/welcome";

export const metadata: Metadata = {
  title: "Risk Tool",
  description: "The Global Risk Portal, rebuilt for a phone. Demonstration data.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Risk Tool", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  // One CSS px per point, no zoom (owner 2026-11-19): the layout is measured for each iPhone and must stay at 1x
  width: "device-width", initialScale: 1, minimumScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8f7f4" }, { media: "(prefers-color-scheme: dark)", color: "#1c1b1a" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="launching">
      <body>
        <script dangerouslySetInnerHTML={{ __html: DEVICE_SCRIPT }} />
        <div className="rotate" role="alert" aria-live="polite"><RotateCcw size={34} strokeWidth={1.6} aria-hidden /><b>Turn your phone upright</b><span>Risk Tool is built for portrait.</span></div>
        <Launch />
        <LightSource />
        <AppState>
          <Drawer />
          <SettingsSheet />
          <Welcome />
          <div className="stage">
            <ViewTransition update={{ push: "vt-push", pop: "vt-pop", tab: "vt-tab", default: "none" }} default="none"><main className="screen">{children}</main></ViewTransition>
            <Toast />
            <Transitions />
            <LaunchReady />
            <PullToRefresh />
            <DeviceFrame />
            <CommandBar />
            <StageScrim />
          </div>
        </AppState>
      </body>
    </html>
  );
}
