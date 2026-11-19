import type { MetadataRoute } from "next";

// Portrait only (owner 2026-11-19). Android honours the orientation here, iPhone shows the rotate notice instead.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Risk Tool", short_name: "Risk Tool", description: "The Global Risk Portal, rebuilt for a phone. Demonstration data.",
    start_url: ".", scope: ".", display: "standalone", orientation: "portrait",
    background_color: "#f8f7f4", theme_color: "#f8f7f4",
    icons: [{ src: "apple-icon.png", sizes: "180x180", type: "image/png" }],
  };
}
