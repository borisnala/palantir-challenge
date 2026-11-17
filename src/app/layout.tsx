import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppState } from "@/components/app-state";
import { TabBar } from "@/components/tab-bar";
import { LightSource } from "@/components/liquid";
import { Toast } from "@/components/ios";

export const metadata: Metadata = {
  title: "Risk Desk",
  description: "The Global Risk Portal, rebuilt for a phone. Dummy data.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Risk Desk", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f2f2f7" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LightSource />
        <AppState>
          <main className="screen">{children}</main>
          <Toast />
          <TabBar />
        </AppState>
      </body>
    </html>
  );
}
