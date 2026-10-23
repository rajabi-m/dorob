import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  experimental: {
    // Hosted builders expose more CPUs than their process/memory budget supports.
    cpus: 1,
    // Avoid socket-based PostCSS workers in restricted build environments.
    turbopackPluginRuntimeStrategy: "workerThreads",
  },
};

export default nextConfig;
