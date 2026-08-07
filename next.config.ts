import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  // Board art is regenerated only at build time. Without this every board load re-validates
  // every tile and sprite, which is what makes the battle screen slow on a phone.
  headers: () => Promise.resolve([{
    source: "/battle/:path*",
    headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
  }]),
};

export default nextConfig;
