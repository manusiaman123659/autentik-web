import type { ProductRow } from "./admin-data";

// The RPC intentionally returns only the canonical commerce fields needed by Store cards.
export interface StoreSearchItem {
  canonical: Pick<ProductRow, "id" | "slug" | "name" | "brand" | "category"> &
    Partial<Pick<ProductRow, "sku" | "image_url" | "price" | "compare_at_price" | "stock" |
      "low_stock_threshold" | "fulfillment_type" | "min_purchase_qty" | "unit" | "has_active_variants">>;
  display: { name: string };
}

export interface StoreSuggestion {
  id: string;
  slug: string;
  displayName: string;
  brand: string;
  sku: string | null;
  image_url: string | null;
  price: number | null;
}

export interface StoreSearchFacets {
  brands: { name: string; count: string }[];
  categories: { name: string; count: string }[];
}

export interface StoreListingResult {
  mode: "listing";
  items: StoreSearchItem[];
  total: string;
  resolved_page: number;
  total_pages: string;
  page_size: 9;
  facets: StoreSearchFacets;
}

export interface StoreSuggestResult {
  mode: "suggest";
  items: StoreSuggestion[];
  total: null;
  resolved_page: 1;
  total_pages: null;
  page_size: 6;
  facets: StoreSearchFacets;
}

export type StoreSearchResult = StoreListingResult | StoreSuggestResult;
