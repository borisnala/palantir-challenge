import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppState } from "@/components/app-state";
import { TabBar } from "@/components/tab-bar";

export const metadata: Metadata = {
  title: "Risk Desk",
  description: "The Global Risk Portal, rebuilt for a phone. Dummy data.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f2f2f7" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppState>
          <div className="demo-banner">Dummy data demo</div>
          <main className="screen">{children}</main>
          <TabBar />
        </AppState>
      </body>
    </html>
  );
}
