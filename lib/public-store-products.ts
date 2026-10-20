import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { productIdSchema } from "./validations/productSchema";
import { toProductAttributes } from "./product-attributes";
import { readPublicProductTranslations } from "./product-translation-data";
import { isPublicStoreProduct, projectStoreProduct, toStoreRecentView, type ResolvedStoreProduct } from "./public-store-presentation";
import type { ProductRow } from "./admin-data";
import type { ProductTranslationRow } from "./product-translation-types";
import type { PublicLocale } from "@/i18n/locales";

type PublicClient = ReturnType<typeof createClient>;

async function storeClient(): Promise<PublicClient> {
  return createClient(await cookies());
}

function publicProducts(client: PublicClient) {
  return client.from("products").select("*").eq("product_type", "sparepart").eq("is_store_visible", true)
    .eq("status", "published").eq("is_active", true).is("deleted_at", null);
}

async function resolveProducts(rows: readonly ProductRow[], locale: PublicLocale, client?: PublicClient): Promise<ResolvedStoreProduct[]> {
  const eligible = rows.filter(isPublicStoreProduct);
  const translations = new Map<string, ProductTranslationRow>();
  if (locale !== "id" && eligible.length) {
    const unique = [...new Map(eligible.map(row => [row.id, row])).values()];
    const supabase = client ?? await storeClient();
    let batch: ProductRow[] = []; let bytes = 0;
    const readBatch = async () => {
      const source = batch.map(row => ({ ...row, deleted_at: null }));
      for (const [id, translation] of await readPublicProductTranslations(supabase, source, locale)) translations.set(id, translation);
      batch = []; bytes = 0;
    };
    for (const row of unique) {
      const size = encodeURIComponent(row.id).length + 12;
      if (size > 6000) continue;
      if (batch.length && (batch.length >= 100 || bytes + size > 6000)) await readBatch();
      batch.push(row); bytes += size;
    }
    if (batch.length) await readBatch();
  }
  return eligible.map(row => projectStoreProduct(row, translations.get(row.id), locale));
}

// Accepts only previously selected canonical rows; does not fetch an unbounded listing.
export async function resolvePublicStoreProducts(rows: readonly ProductRow[], locale: PublicLocale): Promise<ResolvedStoreProduct[]> {
  return resolveProducts(rows, locale);
}

async function relatedProducts(client: PublicClient, product: ProductRow, limit = 4): Promise<ProductRow[]> {
  if (product.related_ids?.length) {
    const ids = product.related_ids.filter(id => id !== product.id).slice(0, limit);
    if (ids.length) {
      const { data } = await publicProducts(client).in("id", ids);
      if (data?.length) return (data as ProductRow[]).filter(isPublicStoreProduct);
    }
  }
  const { data: byBrand } = await publicProducts(client)
    .eq("brand", product.brand).neq("id", product.id).limit(limit);
  const brandResults = ((byBrand ?? []) as ProductRow[]).filter(isPublicStoreProduct);
  if (brandResults.length >= limit) return brandResults.slice(0, limit);
  const { data: byCategory } = await publicProducts(client)
    .eq("category", product.category).neq("id", product.id).limit(limit - brandResults.length);
  const categoryResults = ((byCategory ?? []) as ProductRow[]).filter(isPublicStoreProduct);
  // Preserve existing getRelatedProducts() category fallback behavior in 004.
  const seen = new Set([...brandResults.map(row => row.id), ...categoryResults.map(row => row.id)]);
  return [...brandResults, ...categoryResults.filter(row => !seen.has(row.id))].slice(0, limit);
}

// Request-only memoization lets page and metadata share a canonical/translation snapshot.
export const getPublicStoreDetail = cache(async (slug: string, locale: PublicLocale): Promise<{ product: ResolvedStoreProduct; related: ResolvedStoreProduct[] } | null> => {
  const client = await storeClient();
  const { data, error } = await publicProducts(client).eq("slug", slug).maybeSingle();
  if (error) throw new Error("Produk Komponen belum dapat dimuat.");
  if (!data || !isPublicStoreProduct(data as ProductRow)) return null;
  const product = { ...(data as ProductRow), ...toProductAttributes(data as ProductRow) };
  const related = await relatedProducts(client, product);
  const views = await resolveProducts([product, ...related], locale, client);
  return { product: views[0], related: views.slice(1) };
});

export async function getPublicStoreRecentProducts(ids: readonly string[], locale: PublicLocale) {
  const unique = [...new Set(ids.slice(0, 8).map(id => productIdSchema.safeParse(id)).filter(result => result.success).map(result => result.data))];
  if (!unique.length) return [];
  const client = await storeClient();
  const { data, error } = await publicProducts(client).in("id", unique).limit(8);
  if (error) throw new Error("Produk yang baru dilihat belum dapat dimuat.");
  const byId = new Map(((data ?? []) as ProductRow[]).filter(isPublicStoreProduct).map(row => [row.id, row]));
  const ordered = unique.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  return (await resolveProducts(ordered, locale, client)).map(toStoreRecentView);
}
