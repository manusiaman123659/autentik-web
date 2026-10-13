import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getPublicProductBySlug, type ProductRow } from "./public-data";
import { readPublicProductTranslations } from "./product-translation-data";
import { resolveLocalizedProductContent } from "./product-translations";
import { toB2BSearchView, type ResolvedB2BProduct } from "./public-product-presentation";
import type { ProductTranslationRow, ProductTranslationSource } from "./product-translation-types";
import type { PublicLocale } from "@/i18n/locales";

export async function resolvePublicB2BProducts(rows: readonly ProductRow[], locale: PublicLocale): Promise<ResolvedB2BProduct[]> {
  if (rows.some(row => row.product_type !== "b2b_system")) throw new Error("Lapisan produk B2B tidak menerima produk marketplace.");
  const translations = new Map<string, ProductTranslationRow>();
  if (locale !== "id" && rows.length) {
    const unique = [...new Map(rows.map(row => [row.id, row])).values()];
    const client = createClient(await cookies());
    let batch: ProductRow[] = []; let bytes = 0;
    const readBatch = async () => {
      for (const [id, row] of await readPublicProductTranslations(client, batch as ProductTranslationSource[], locale)) translations.set(id, row);
      batch = []; bytes = 0;
    };
    for (const row of unique) {
      const size = encodeURIComponent(row.id).length + 12;
      if (size > 6000) continue; // Oversized legacy IDs keep canonical fallback without breaking other batches.
      if (batch.length && (batch.length >= 100 || bytes + size > 6000)) await readBatch();
      batch.push(row); bytes += size;
    }
    if (batch.length) await readBatch();
  }
  return rows.map(canonical => ({ canonical, content: resolveLocalizedProductContent(canonical as ProductTranslationSource, translations.get(canonical.id), locale) }));
}

// Per-request memoization only: metadata and page share a snapshot, not a TTL cache.
export const getResolvedB2BProduct = cache(async (slug: string, locale: PublicLocale): Promise<ResolvedB2BProduct | null> => {
  const row = await getPublicProductBySlug(slug);
  return row ? (await resolvePublicB2BProducts([row], locale))[0] : null;
});

export async function getPublicB2BSearchProducts(locale: PublicLocale) {
  const client = createClient(await cookies());
  const { data, error } = await client.from("products")
    .select("id,slug,name,description,brand,category,product_type,features,specs,seo_title,seo_description,status,is_active,deleted_at,translation_source_revision")
    .eq("product_type", "b2b_system").eq("status", "published").eq("is_active", true).is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw new Error("Pencarian produk belum tersedia.");
  return (await resolvePublicB2BProducts((data ?? []) as ProductRow[], locale)).map(toB2BSearchView);
}
