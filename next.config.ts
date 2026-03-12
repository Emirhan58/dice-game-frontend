import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Ensure Three.js ecosystem is transpiled properly
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // WebSocket proxy still needs a rewrite (can't go through API routes)
  async rewrites() {
    return [
      {
        source: "/ws",
        destination: `${BACKEND_URL}/ws`,
      },
    ];
  },
};

export default nextConfig;
