import type { NextConfig } from "next";
import { createSupabasePublicMediaPattern } from "./lib/supabase-public-media";

const supabaseMediaPattern = createSupabasePublicMediaPattern(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NODE_ENV === "production",
);

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      ...(supabaseMediaPattern ? [supabaseMediaPattern] : []),
      // Retained until the external MIKA Careers logo host is finalized.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
