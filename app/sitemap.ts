import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getCanonicalOrigin } from "@/lib/public-url";
import { getAllPublicMikaJobs } from "@/lib/api/mika-career";
import { localeAlternates } from "@/i18n/locales";

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/products", priority: 0.9 },
  { path: "/distributors", priority: 0.8 },
  { path: "/store", priority: 0.9 },
  { path: "/careers", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/research-partnership", priority: 0.8 },
  { path: "/services", priority: 0.8 },
  { path: "/contact", priority: 0.8 },
  { path: "/custom-request", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getCanonicalOrigin();
  const today = new Date();

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const [{ data: b2bProducts }, { data: spareparts }, careers] =
    await Promise.all([
      supabase
        .from("products")
        .select("slug, updated_at")
        .eq("product_type", "b2b_system")
        .eq("status", "published")
        .is("deleted_at", null),
      supabase
        .from("products")
        .select("slug, updated_at")
        .eq("product_type", "sparepart")
        .eq("is_store_visible", true)
        .eq("status", "published")
        .eq("is_active", true)
        .is("deleted_at", null),
      getAllPublicMikaJobs(),
    ]);

  const toEntry = (
    path: string,
    updatedAt: string | null
  ): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path}`,
    lastModified: updatedAt ? new Date(updatedAt) : today,
  });

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: today,
    changeFrequency: r.path === "/" ? "monthly" : "weekly",
    priority: r.priority,
  }));

  const catalogEntries = (b2bProducts ?? []).map((p) =>
    toEntry(`/products/${p.slug}`, p.updated_at)
  );
  const storeEntries = (spareparts ?? []).map((p) =>
    toEntry(`/store/${p.slug}`, p.updated_at)
  );
  const careerEntries = (careers ?? []).map((c) =>
    toEntry(`/careers/${c.id}`, c.created_at ?? null)
  );

  const entries = [
    ...staticEntries,
    ...catalogEntries,
    ...storeEntries,
    ...careerEntries,
  ];
  return entries.flatMap(entry => {
    const pathname = new URL(entry.url).pathname;
    const languages = Object.fromEntries(Object.entries(localeAlternates(pathname)).map(([locale, path]) => [locale, `${baseUrl}${path}`]));
    return ["id", "en", "zh-CN"].map(locale => ({ ...entry, url: languages[locale], alternates: { languages } }));
  });
}
