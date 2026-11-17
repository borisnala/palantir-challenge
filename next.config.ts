import type { NextConfig } from "next";

// Static export: `npm run build` writes out/, which Cloudflare Pages serves as plain files.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
