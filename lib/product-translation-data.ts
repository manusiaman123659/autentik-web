import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicLocale } from "@/i18n/locales";
import type { ProductTranslationRow, ProductTranslationSource } from "./product-translation-types";
import { getUsableProductTranslation, isPublicTranslationParent } from "./product-translations";
import { logError } from "./logger";
import { productTranslationParentProofSchema } from "./validations/productTranslationSchema";

export const PRODUCT_TRANSLATION_SELECT = "product_id,locale,name,description,features,specs,seo_title,seo_description,status,source_revision";

// Caller supplies already-selected canonical Products; translations never select Products.
export async function readPublicProductTranslations(
  client: SupabaseClient,
  products: readonly ProductTranslationSource[],
  locale: PublicLocale,
): Promise<Map<string, ProductTranslationRow>> {
  const result = new Map<string, ProductTranslationRow>();
  if (locale === "id") return result;
  const parents = new Map(products.filter(isPublicTranslationParent).map(product => [product.id, product]));
  if (!parents.size) return result;
  try {
    const { data, error } = await client.from("product_translations")
      .select(`${PRODUCT_TRANSLATION_SELECT},parent:products!inner(id,status,is_active,deleted_at,translation_source_revision)`)
      .eq("locale", locale).eq("status", "published")
      .eq("parent.status", "published").eq("parent.is_active", true).is("parent.deleted_at", null)
      .in("product_id", [...parents.keys()]);
    if (error) { logError("product.translation.read", "Terjemahan produk tidak tersedia.", { code: error.code }); return result; }
    for (const candidate of data ?? []) {
      if (!candidate || typeof candidate !== "object") continue;
      const parent = parents.get(candidate.product_id);
      const { parent: current, ...translation } = candidate;
      const proof = productTranslationParentProofSchema.safeParse(current);
      if (!parent || !proof.success || proof.data.id !== parent.id
        || proof.data.translation_source_revision !== parent.translation_source_revision) continue;
      const row = getUsableProductTranslation(parent, translation, locale);
      if (row) result.set(row.product_id, row);
    }
  } catch { logError("product.translation.read", "Terjemahan produk tidak tersedia."); }
  return result;
}
