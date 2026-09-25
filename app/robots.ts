import type { MetadataRoute } from "next";
import { getCanonicalOrigin } from "@/lib/public-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getCanonicalOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
