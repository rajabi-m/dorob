import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Avoid socket-based PostCSS workers in restricted build environments.
    turbopackPluginRuntimeStrategy: "workerThreads",
  },
};

export default nextConfig;
