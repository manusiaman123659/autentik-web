import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import type { PublicLocale } from "@/i18n/locales";
import type { StoreSearchResult } from "./store-search-types";

const decimal = z.string().regex(/^(0|[1-9]\d*)$/);
const facet = z.object({ name: z.string(), count: decimal }).strict();
const facets = z.object({ brands: z.array(facet), categories: z.array(facet) }).strict();
const price = z.number().finite().nonnegative().nullable();
const item = z.object({
  canonical: z.object({
    id: z.string(), slug: z.string(), name: z.string(), brand: z.string(), category: z.string(),
    sku: z.string().nullable(), image_url: z.string().nullable(), price,
    compare_at_price: price, stock: z.number().int().nonnegative(),
    low_stock_threshold: z.number().int().nonnegative(),
    fulfillment_type: z.enum(["ready_stock", "custom_request", "third_party"]),
    min_purchase_qty: z.number().int().positive(), unit: z.string().nullable(),
    has_active_variants: z.boolean(),
  }).strict(),
  display: z.object({ name: z.string() }).strict(),
}).strict();
const suggestion = z.object({ id: z.string(), slug: z.string(), displayName: z.string(),
  brand: z.string(), sku: z.string().nullable(), image_url: z.string().nullable(), price }).strict();
const response = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("listing"), items: z.array(item).max(9), total: decimal,
    resolved_page: z.number().int().positive(), total_pages: decimal, page_size: z.literal(9), facets }).strict(),
  z.object({ mode: z.literal("suggest"), items: z.array(suggestion).max(6), total: z.null(),
    resolved_page: z.literal(1), total_pages: z.null(), page_size: z.literal(6), facets }).strict(),
]);

export interface StoreSearchInput {
  locale: PublicLocale;
  query?: string;
  brands?: string[];
  categories?: string[];
  stock?: "all" | "available" | "low" | "out";
  priceMin?: number | null;
  priceMax?: number | null;
  page?: number;
  mode?: "listing" | "suggest";
}

export function isStoreSearchEnabled() {
  return process.env.STORE_SEARCH_RPC_ENABLED === "true";
}

export async function searchStoreProducts(input: StoreSearchInput): Promise<StoreSearchResult> {
  if (!isStoreSearchEnabled()) throw new Error("Pencarian terjemahan nonaktif.");
  const query = input.query ?? "";
  const brands = input.brands ?? [];
  const categories = input.categories ?? [];
  const page = input.page ?? 1;
  const mode = input.mode ?? "listing";
  if (!["id", "en", "zh-CN"].includes(input.locale) || typeof query !== "string" || [...query].length > 120
    || !Array.isArray(brands) || !Array.isArray(categories) || brands.length > 20 || categories.length > 20
    || [...brands, ...categories].some(value => !value || typeof value !== "string")
    || !["all", "available", "low", "out"].includes(input.stock ?? "all")
    || !["listing", "suggest"].includes(mode)
    || !Number.isInteger(page) || page < 1 || page > 2147483647
    || (mode === "suggest" && page !== 1)
    || [input.priceMin, input.priceMax].some(value => value != null && (!Number.isFinite(value) || value < 0))) {
    throw new Error("Parameter pencarian tidak valid.");
  }
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.rpc("search_store_products_v1", {
    p_locale: input.locale, p_query: query, p_brands: brands, p_categories: categories,
    p_stock: input.stock ?? "all", p_price_min: input.priceMin ?? null, p_price_max: input.priceMax ?? null,
    p_page: page, p_mode: mode,
  });
  if (error) throw new Error("Pencarian Komponen belum tersedia.");
  const parsed = response.safeParse(data);
  if (!parsed.success || parsed.data.mode !== mode) throw new Error("Pencarian Komponen belum tersedia.");
  const ids = parsed.data.mode === "listing"
    ? parsed.data.items.map(entry => entry.canonical.id)
    : parsed.data.items.map(entry => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Pencarian Komponen belum tersedia.");
  }
  return parsed.data;
}
