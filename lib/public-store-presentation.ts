import type { PublicLocale } from "@/i18n/locales";
import type { ProductRow } from "@/lib/admin-data";
import type { ProductTranslationRow, ResolvedProductContent } from "./product-translation-types";
import { resolveLocalizedProductContent } from "./product-translations";

export interface ResolvedStoreProduct {
  canonical: ProductRow;
  display: ResolvedProductContent;
}

export function isPublicStoreProduct(row: ProductRow): boolean {
  return row.product_type === "sparepart" && row.is_store_visible === true
    && row.status === "published" && row.is_active === true && row.deleted_at === null;
}

export function projectStoreProduct(canonical: ProductRow, candidate: ProductTranslationRow | null | undefined, locale: PublicLocale): ResolvedStoreProduct {
  if (!isPublicStoreProduct(canonical)) throw new Error("Produk Komponen tidak tersedia untuk publik.");
  return { canonical, display: resolveLocalizedProductContent({ ...canonical, deleted_at: null }, candidate, locale) };
}

export function toStoreRecentView({ canonical, display }: ResolvedStoreProduct) {
  return {
    id: canonical.id, slug: canonical.slug, brand: canonical.brand,
    image_url: canonical.image_url ?? null, price: canonical.price ?? null,
    displayName: display.name,
  };
}
