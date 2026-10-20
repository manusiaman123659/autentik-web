"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  X,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  PackageCheck,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import type { PublicLocale } from "@/i18n/locales";
import type { StoreListingResult, StoreSearchItem } from "@/lib/store-search-types";
import StoreFilterSidebar, { type FilterState } from "@/components/store/StoreFilterSidebar";
import StoreProductCard from "@/components/store/StoreProductCard";
import StoreSearchBar from "@/components/store/StoreSearchBar";
import CategoryToolbar from "@/components/store/CategoryToolbar";
import StoreTrustStrip from "@/components/store/StoreTrustStrip";
import StorePromoBanner from "@/components/store/StorePromoBanner";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import EmptyState from "@/components/ui/EmptyState";
import { useTranslations } from "next-intl";

const ITEMS_PER_PAGE = 9;

const INITIAL_FILTERS: FilterState = {
  query: "",
  brands: [],
  categories: [],
  stockStatus: "all",
  priceMin: "",
  priceMax: "",
};

export default function StoreClient({
  products,
  locale,
  rpcEnabled,
  compatible,
  ppicAkaNumber,
  mikaSalesNumber,
  initialQuery,
}: {
  products: StoreSearchItem[];
  locale: PublicLocale;
  rpcEnabled: boolean;
  compatible: string | null;
  ppicAkaNumber: string | null;
  mikaSalesNumber: string | null;
  initialQuery?: string;
}) {
  const t = useTranslations("products.storeUi");
  const [filters, setFilters] = useState<FilterState>({
    ...INITIAL_FILTERS,
    query: initialQuery ?? "",
  });
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [remote, setRemote] = useState<{ key: string; data?: StoreListingResult; error?: boolean } | null>(null);
  const canonicalProducts = useMemo(() => products.map(({ canonical }) => canonical), [products]);
  const requestKey = JSON.stringify([locale, filters, page, retry]);

  useEffect(() => {
    if (!rpcEnabled) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ locale, mode: "listing", q: filters.query,
      stock: filters.stockStatus, page: String(page) });
    filters.brands.forEach(brand => params.append("brand", brand));
    filters.categories.forEach(category => params.append("category", category));
    if (filters.priceMin !== "") params.set("min", filters.priceMin);
    if (filters.priceMax !== "") params.set("max", filters.priceMax);
    fetch(`/api/store/search?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("search");
        const result: unknown = await response.json();
        if (!result || typeof result !== "object" || (result as { data?: { mode?: string } }).data?.mode !== "listing") throw new Error("search");
        setRemote({ key: requestKey, data: (result as { data: StoreListingResult }).data });
      }).catch(() => { if (!controller.signal.aborted) setRemote({ key: requestKey, error: true }); });
    return () => controller.abort();
  }, [rpcEnabled, requestKey, locale, filters, page]);

  const filtered = useMemo(() => {
    let list = products;

    // Text search
    if (filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.canonical.name.toLowerCase().includes(q) ||
          p.canonical.slug.toLowerCase().includes(q) ||
          p.canonical.brand.toLowerCase().includes(q) ||
          p.canonical.category.toLowerCase().includes(q) ||
          (p.canonical.sku && p.canonical.sku.toLowerCase().includes(q)),
      );
    }

    // Brand filter
    if (filters.brands.length > 0) {
      list = list.filter((p) => filters.brands.includes(p.canonical.brand));
    }

    // Category filter
    if (filters.categories.length > 0) {
      list = list.filter((p) => filters.categories.includes(p.canonical.category));
    }

    // Stock status filter
    if (filters.stockStatus === "available") {
      list = list.filter((p) => (p.canonical.stock ?? 0) > 0);
    } else if (filters.stockStatus === "low") {
      list = list.filter((p) => {
        const s = p.canonical.stock ?? 0;
        const l = p.canonical.low_stock_threshold ?? 5;
        return s > 0 && s <= l;
      });
    } else if (filters.stockStatus === "out") {
      list = list.filter((p) => (p.canonical.stock ?? 0) === 0);
    }

    // Price range filter
    if (filters.priceMin !== "") {
      const min = Number(filters.priceMin);
      if (!Number.isNaN(min)) list = list.filter((p) => (p.canonical.price ?? 0) >= min);
    }
    if (filters.priceMax !== "") {
      const max = Number(filters.priceMax);
      if (!Number.isNaN(max)) list = list.filter((p) => (p.canonical.price ?? 0) <= max);
    }

    return list;
  }, [products, filters]);

  const active = rpcEnabled && remote?.key === requestKey ? remote : null;
  const totalPages = rpcEnabled ? Math.max(1, Math.min(2147483647, Number(active?.data?.total_pages ?? "1"))) : Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = rpcEnabled ? active?.data?.resolved_page ?? page : Math.min(page, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = rpcEnabled ? active?.data?.items ?? [] : filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  const totalCount = rpcEnabled ? active?.data?.total ?? "0" : String(filtered.length);
  const facetBrands = active?.data?.facets.brands;
  const facetCategories = active?.data?.facets.categories;

  function handleFilterChange(patch: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }

  const activeFilterCount =
    filters.brands.length +
    filters.categories.length +
    (filters.stockStatus !== "all" ? 1 : 0) +
    (filters.priceMin !== "" ? 1 : 0) +
    (filters.priceMax !== "" ? 1 : 0) +
    (filters.query !== "" ? 1 : 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <section className="border-b border-base">
        <div className="container-custom py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-heading mb-2">
            {t("heading")}
          </h1>
          <p className="text-body text-sm sm:text-base max-w-2xl">
            {t("intro")}
          </p>
          {compatible && (
            <div className="max-w-2xl mt-4 p-3 rounded border border-base text-body text-sm flex items-start gap-2">
              <PackageCheck size={16} className="text-[#0EA5A0] mt-0.5 shrink-0" />
              <span>
                {t("compatible", { name: compatible.replace(/-/g, " ") })}{" "}
                <WhatsAppButton
                  number={ppicAkaNumber}
                  variant="link"
                  label={t("consult")}
                  message={`Halo, saya membutuhkan komponen yang kompatibel dengan ${compatible.replace(/-/g, " ")}. Bisa bantu rekomendasinya?`}
                  className="text-teal-600 dark:text-teal-300 underline"
                />
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Search bar + Category toolbar */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="container-custom py-4 space-y-3">
          <Suspense fallback={<div className="h-9" />}>
            <StoreSearchBar products={products} locale={locale} rpcEnabled={rpcEnabled} onQueryChange={(q) => handleFilterChange({ query: q })} />
          </Suspense>
          <CategoryToolbar
            products={canonicalProducts}
            brands={facetBrands}
            activeBrands={filters.brands}
            onBrandToggle={(brands) => handleFilterChange({ brands })}
          />
        </div>
      </div>

      <StoreTrustStrip />

      {/* Catalog */}
      <div className="container-custom py-6">
        {/* Mobile filter toggle + result count */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }} aria-live="polite">{rpcEnabled && !active ? t("loading") : t("results", { count: totalCount })}</span>
          </p>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={mobileFilterOpen}
            aria-controls="store-filter-drawer"
            className="lg:hidden min-h-11 inline-flex items-center gap-2 px-4 py-2.5 rounded border text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            <SlidersHorizontal size={15} />
            {t("filter")}
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#0EA5A0] text-white text-[10px] font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <StoreFilterSidebar
            products={canonicalProducts}
            brands={facetBrands}
            categories={facetCategories}
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={resetFilters}
            activeCount={activeFilterCount}
            mobileOpen={mobileFilterOpen}
            onMobileClose={() => setMobileFilterOpen(false)}
          />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.query && (
                  <Chip label={`"${filters.query}"`} onRemove={() => handleFilterChange({ query: "" })} />
                )}
                {filters.brands.map((b) => (
                  <Chip key={b} label={b} onRemove={() => handleFilterChange({ brands: filters.brands.filter((v) => v !== b) })} />
                ))}
                {filters.categories.map((c) => (
                  <Chip key={c} label={c} onRemove={() => handleFilterChange({ categories: filters.categories.filter((v) => v !== c) })} />
                ))}
                {filters.stockStatus !== "all" && (
                  <Chip
                    label={t(filters.stockStatus === "available" ? "available" : filters.stockStatus === "low" ? "low" : "out")}
                    onRemove={() => handleFilterChange({ stockStatus: "all" })}
                  />
                )}
                {filters.priceMin !== "" && (
                  <Chip label={`${t("minimumPrice")}: ${filters.priceMin}`} onRemove={() => handleFilterChange({ priceMin: "" })} />
                )}
                {filters.priceMax !== "" && (
                  <Chip label={`${t("maximumPrice")}: ${filters.priceMax}`} onRemove={() => handleFilterChange({ priceMax: "" })} />
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="min-h-11 inline-flex items-center gap-1 px-3 py-2 rounded text-sm font-medium text-red-700 dark:text-red-400 focus-visible:outline-2"
                >
                  <RotateCcw size={11} />
                  {t("clearAll")}
                </button>
              </div>
            )}

            {rpcEnabled && !active ? (
              <div role="status" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"><span className="sr-only">{t("loading")}</span>{[0,1,2].map(n => <div key={n} className="rounded border border-base bg-page-alt h-96 motion-safe:animate-pulse" />)}</div>
            ) : active?.error ? (
              <EmptyState icon={Package} title={t("error")} description={t("errorHint")}
                action={<button type="button" onClick={() => setRetry(value => value + 1)} className="min-h-11 px-5 py-2 rounded-sm bg-teal-700 text-white text-sm font-semibold">{t("retry")}</button>} />
            ) : pageItems.length === 0 ? (
              <EmptyState
                icon={Package}
                title={t("empty")}
                description={t("emptyHint")}
                action={
                <button
                  onClick={resetFilters}
                  className="min-h-11 px-6 py-3 rounded text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600"
                >
                  {t("reset")}
                </button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                  {pageItems.map((product) => (
                    <StoreProductCard key={product.canonical.id} product={product} mikaSalesNumber={mikaSalesNumber} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-8">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {t("page", { page: safePage, pages: String(rpcEnabled ? active?.data?.total_pages : totalPages) })}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => setPage(Math.max(1, safePage - 1))}
                        aria-label={t("previous")}
                        className="w-11 h-11 flex items-center justify-center rounded border disabled:opacity-40 focus-visible:outline-2"
                        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: rpcEnabled ? Math.min(totalPages, 7) : totalPages }, (_, i) => rpcEnabled ? Math.min(totalPages, Math.max(1, safePage - 3)) + i : i + 1)
                        .filter(n => n <= totalPages).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPage(n)}
                          aria-current={n === safePage ? "page" : undefined}
                          className={`w-11 h-11 rounded text-sm font-semibold focus-visible:outline-2 ${
                            n === safePage
                              ? "bg-teal-700 text-white"
                              : "border hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                          style={n === safePage ? {} : { borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safePage === totalPages}
                        onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                        aria-label={t("next")}
                        className="w-11 h-11 flex items-center justify-center rounded border disabled:opacity-40 focus-visible:outline-2"
                        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-8"><StorePromoBanner /></div>
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const t = useTranslations("products.storeUi");
  return (
    <span className="inline-flex max-w-full items-center pl-3 rounded text-sm border border-base text-heading">
      <span className="min-w-0 break-words">{label}</span>
      <button type="button" onClick={onRemove} aria-label={t("removeFilter", { label })} className="w-11 h-11 shrink-0 flex items-center justify-center focus-visible:outline-2">
        <X size={12} />
      </button>
    </span>
  );
}
