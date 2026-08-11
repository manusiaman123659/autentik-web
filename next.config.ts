import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wzfghzqpuebmzdjrmvph.supabase.co",
      },
    ],
  },
};

export default nextConfig;