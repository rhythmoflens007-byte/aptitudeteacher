import type { NextConfig } from "next";

// The backend's address, set in the hosting dashboard. Requests to /backend/* are forwarded to it.
const backend = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
