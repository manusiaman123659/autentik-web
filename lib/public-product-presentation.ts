import type { ProductRow } from "./public-data";
import type { ResolvedProductContent } from "./product-translation-types";

// Server-side canonical row and resolved content stay separate until projection.
export interface ResolvedB2BProduct { canonical: ProductRow; content: ResolvedProductContent }
export interface B2BCatalogueView {
  id: string; slug: string; canonicalName: string; canonicalDescription: string;
  brand: string; brandColor: string; category: string; categoryColor: string;
  imageUrl?: string; fulfillmentType: ProductRow["fulfillment_type"];
  display: Pick<ResolvedProductContent, "name" | "description" | "specs">;
}
export interface B2BHomeView {
  id: string; slug: string; brand: string; category: string; imageUrl?: string; model3dUrl?: string;
  display: Pick<ResolvedProductContent, "name" | "description">;
}
export interface B2BSearchView {
  id: string; slug: string; brand: string; category: string;
  canonical: { name: string; description: string };
  display: Pick<ResolvedProductContent, "name" | "description">;
}
export function toB2BCatalogueView({ canonical: row, content }: ResolvedB2BProduct): B2BCatalogueView {
  return {
    id: row.id, slug: row.slug, canonicalName: row.name, canonicalDescription: row.description,
    brand: row.brand, brandColor: row.brand_color ?? "#0EA5A0", category: row.category, categoryColor: row.category_color ?? "teal",
    imageUrl: row.image_url ?? undefined, fulfillmentType: row.fulfillment_type ?? "ready_stock",
    display: { name: content.name, description: content.description, specs: content.specs },
  };
}
export function toB2BHomeView({ canonical: row, content }: ResolvedB2BProduct): B2BHomeView {
  return { id: row.id, slug: row.slug, brand: row.brand, category: row.category, imageUrl: row.image_url ?? undefined, model3dUrl: row.model_3d_url ?? undefined, display: { name: content.name, description: content.description } };
}
export function toB2BSearchView({ canonical: row, content }: ResolvedB2BProduct): B2BSearchView {
  return { id: row.id, slug: row.slug, brand: row.brand, category: row.category, canonical: { name: row.name, description: row.description }, display: { name: content.name, description: content.description } };
}
export function matchesCanonicalB2BSearch(product: B2BSearchView, query: string): boolean {
  const term = query.trim().toLowerCase();
  return [product.canonical.name, product.canonical.description, product.brand, product.category].some(text => text.toLowerCase().includes(term));
}
