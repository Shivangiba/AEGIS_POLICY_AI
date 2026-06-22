import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Hostnames only (not full URLs) — required for LAN access to dev server / HMR.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.152.183.197",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
