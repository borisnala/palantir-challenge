import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppState } from "@/components/app-state";
import { Drawer, SearchOrb, StageScrim } from "@/components/shell";
import { DesktopNotice, LaunchReady, PullToRefresh, Transitions } from "@/components/motion";
import { Launch } from "@/components/brand";
import { LightSource } from "@/components/liquid";
import { Toast } from "@/components/ios";

export const metadata: Metadata = {
  title: "Risk Tool",
  description: "The Global Risk Portal, rebuilt for a phone. Demonstration data.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Risk Tool", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8f7f4" }, { media: "(prefers-color-scheme: dark)", color: "#1c1b1a" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="launching">
      <body>
        <Launch />
        <LightSource />
        <AppState>
          <Drawer />
          <div className="stage">
            <main className="screen">{children}</main>
            <Toast />
            <Transitions />
            <LaunchReady />
            <PullToRefresh />
            <DesktopNotice />
            <SearchOrb />
            <StageScrim />
          </div>
        </AppState>
      </body>
    </html>
  );
}
