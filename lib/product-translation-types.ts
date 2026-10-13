export type ProductTranslationLocale = "en" | "zh-CN";
export type ProductTranslationStatus = "draft" | "published";

export interface ProductSpecification {
  label: string;
  value: string;
  value_kind?: "technical" | "text";
}

export interface ProductTranslationSource {
  id: string;
  name: string;
  description: string;
  features?: unknown[];
  specs?: ProductSpecification[];
  seo_title?: string | null;
  seo_description?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  deleted_at: string | null;
  translation_source_revision?: number;
}

// Presentation only: this type deliberately has no identity, price or stock.
export interface ResolvedProductContent {
  name: string;
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
  seo_title: string | null;
  seo_description: string | null;
}

export interface ProductTranslationContent {
  name: string | null;
  description: string | null;
  features: string[] | null;
  specs: { label: string | null; value_text: string | null }[] | null;
  seo_title: string | null;
  seo_description: string | null;
}

export interface ProductTranslationRow extends ProductTranslationContent {
  product_id: string;
  locale: ProductTranslationLocale;
  status: ProductTranslationStatus;
  source_revision: number;
  id?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}
