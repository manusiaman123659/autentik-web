"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  X,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
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
      {/* Hero — simplified */}
      <section className="pt-28 pb-12 relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)" }}>
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "40px 40px" }}
        />
        <div
          className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #0EA5A0, transparent)" }}
        />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-4 backdrop-blur-md">
            <ShoppingBag size={14} className="text-[#0EA5A0]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#0EA5A0]">Marketplace Komponen</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Marketplace Komponen
          </h1>
          <p className="text-slate-200 text-sm sm:text-base max-w-xl font-light">
            Komponen original bergaransi untuk unit Talpha, Cylab, Ullun, dan Epal.
          </p>
          {compatible && (
            <div className="max-w-xl mt-4 p-3 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-200 text-sm flex items-start gap-2">
              <PackageCheck size={16} className="text-[#0EA5A0] mt-0.5 shrink-0" />
              <span>
                Komponen untuk <strong className="text-white uppercase">{compatible.replace(/-/g, " ")}</strong>. Sistem belum bisa filter otomatis —{" "}
                <WhatsAppButton
                  number={ppicAkaNumber}
                  variant="link"
                  label="tanya via WhatsApp"
                  message={`Halo, saya membutuhkan komponen yang kompatibel dengan ${compatible.replace(/-/g, " ")}. Bisa bantu rekomendasinya?`}
                  className="text-teal-200 hover:text-white"
                />
                {" "}untuk rekomendasi yang tepat.
              </span>
            </div>
          )}
        </div>
      </section>

      <StoreTrustStrip />

      {/* Search bar + Category toolbar */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-3 space-y-2.5">
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

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-6">
        <StorePromoBanner />
      </div>

      {/* Catalog */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
        {/* Mobile filter toggle + result count */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{totalCount}</span> produk ditemukan
          </p>
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            <SlidersHorizontal size={15} />
            Filter
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#0EA5A0] text-white text-[10px] font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>

        <div className="flex gap-8">
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
                    label={filters.stockStatus === "available" ? "Tersedia" : filters.stockStatus === "low" ? "Stok Terbatas" : "Habis"}
                    onRemove={() => handleFilterChange({ stockStatus: "all" })}
                  />
                )}
                {filters.priceMin !== "" && (
                  <Chip label={`Min ${filters.priceMin}`} onRemove={() => handleFilterChange({ priceMin: "" })} />
                )}
                {filters.priceMax !== "" && (
                  <Chip label={`Max ${filters.priceMax}`} onRemove={() => handleFilterChange({ priceMax: "" })} />
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <RotateCcw size={11} />
                  Reset Semua
                </button>
              </div>
            )}

            {rpcEnabled && !active ? (
              <p role="status" className="py-8 text-sm" style={{ color: "var(--text-secondary)" }}>Memuat produk Komponen...</p>
            ) : active?.error ? (
              <EmptyState icon={Package} title="Pencarian Komponen belum tersedia" description="Muat ulang pencarian atau coba lagi nanti."
                action={<button type="button" onClick={() => setRetry(value => value + 1)} className="px-5 py-2 rounded-sm bg-[#0EA5A0] text-white text-sm font-semibold">Coba Lagi</button>} />
            ) : pageItems.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Tidak ada produk ditemukan"
                description="Coba ubah filter pencarian atau reset filter Anda."
                action={
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
                >
                  Reset Filter
                </button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {pageItems.map((product) => (
                    <StoreProductCard key={product.canonical.id} product={product} mikaSalesNumber={mikaSalesNumber} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-8">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Halaman <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{safePage}</span> dari{" "}
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{rpcEnabled ? active?.data?.total_pages : totalPages}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => setPage(Math.max(1, safePage - 1))}
                        aria-label="Halaman sebelumnya"
                        className="p-2 rounded-lg border disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                            n === safePage
                              ? "bg-[#0EA5A0] text-white"
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
                        aria-label="Halaman berikutnya"
                        className="p-2 rounded-lg border disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border" style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}>
      {label}
      <button type="button" onClick={onRemove} className="hover:text-red-500 transition-colors">
        <X size={12} />
      </button>
    </span>
  );
}
