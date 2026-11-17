import type { NextConfig } from "next";

// Static export: `npm run build` writes out/, which Cloudflare Pages serves as plain files.
const nextConfig: NextConfig = {
  output: "export",
  // BASE_PATH=/risk-desk when it is served from a subfolder, such as lab.borisnala.com/risk-desk/
  basePath: process.env.BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
