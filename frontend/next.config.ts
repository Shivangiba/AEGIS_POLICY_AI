import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // allowedDevOrigins accepts hostnames, IPs, and CIDR ranges (Next.js >= 15.1).
  // Using CIDR notation covers all private network subnets so the HMR WebSocket
  // is never blocked regardless of which DHCP-assigned IP the machine gets.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.0.0.0/8",       // Class A private range  (10.x.x.x)
    "172.16.0.0/12",    // Class B private range  (172.16–31.x.x)
    "192.168.0.0/16",   // Class C private range  (192.168.x.x)
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
