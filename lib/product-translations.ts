import type { PublicLocale } from "@/i18n/locales";
import type { ProductTranslationSource, ProductTranslationRow, ResolvedProductContent } from "./product-translation-types";
import { productTranslationPayloadSchema, productTranslationRowSchema, type ProductTranslationPayload } from "./validations/productTranslationSchema";

export function isPublicTranslationParent(source: Pick<ProductTranslationSource, "status" | "is_active" | "deleted_at">): boolean {
  return source.status === "published" && source.is_active === true && source.deleted_at === null;
}

export function validateProductTranslationBlocks(source: ProductTranslationSource, payload: ProductTranslationPayload): boolean {
  if (payload.features != null) {
    if (!Array.isArray(source.features) || source.features.some(feature => typeof feature !== "string") || payload.features.length !== source.features.length) return false;
    if (payload.features.some((feature, index) => feature.source_index !== index)) return false;
  }
  if (payload.specs != null) {
    if (!Array.isArray(source.specs) || payload.specs.length !== source.specs.length) return false;
    for (const [index, spec] of payload.specs.entries()) {
      const original = source.specs[index];
      if (!original || typeof original.label !== "string" || typeof original.value !== "string" || spec.source_index !== index) return false;
      if (spec.value_text != null && original.value_kind !== "text") return false;
    }
  }
  return true;
}

export function getUsableProductTranslation(source: ProductTranslationSource, candidate: unknown, locale: PublicLocale): ProductTranslationRow | null {
  if (locale === "id" || !isPublicTranslationParent(source)) return null;
  const parsed = productTranslationRowSchema.safeParse(candidate);
  if (!parsed.success) return null;
  const row = parsed.data;
  if (row.product_id !== source.id || row.locale !== locale || row.status !== "published" || row.source_revision !== source.translation_source_revision) return null;
  const blocks = productTranslationPayloadSchema.safeParse({
    ...rowContent(row),
    features: row.features?.map((text, source_index) => ({ text, source_index })) ?? null,
    specs: row.specs?.map((spec, source_index) => ({ ...spec, source_index })) ?? null,
  });
  return blocks.success && validateProductTranslationBlocks(source, blocks.data) ? row : null;
}

function rowContent(row: ProductTranslationRow) {
  return { name: row.name, description: row.description, features: row.features, specs: row.specs, seo_title: row.seo_title, seo_description: row.seo_description };
}

export function resolveLocalizedProductContent(source: ProductTranslationSource, candidate: unknown, locale: PublicLocale): ResolvedProductContent {
  const row = getUsableProductTranslation(source, candidate, locale);
  const specs = Array.isArray(source.specs) ? source.specs.filter(spec => spec && typeof spec.label === "string" && typeof spec.value === "string") : [];
  return {
    name: row?.name ?? source.name,
    description: row?.description ?? source.description,
    features: row?.features ? [...row.features] : (Array.isArray(source.features) ? source.features : []).filter((feature): feature is string => typeof feature === "string"),
    specs: specs.map((spec, index) => ({
      label: row?.specs?.[index]?.label ?? spec.label,
      value: spec.value_kind === "text" ? row?.specs?.[index]?.value_text ?? spec.value : spec.value,
    })),
    seo_title: row?.seo_title ?? source.seo_title ?? null,
    seo_description: row?.seo_description ?? source.seo_description ?? null,
  };
}
