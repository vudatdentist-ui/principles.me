import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  cacheComponents: true,
  devIndicators: false,
  experimental: {
    appNewScrollHandler: true,
    cachedNavigations: true,
    inlineCss: true,
    prefetchInlining: true,
    turbopackFileSystemCacheForDev: true,
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
  poweredByHeader: false,
  reactCompiler: true,
  // Production containers must be able to start without Corepack, pnpm, or
  // registry access. Next's standalone server is a self-contained Node entry
  // point that is copied into the runtime image during the Docker build.
  output: "standalone",
};

export default nextConfig;
