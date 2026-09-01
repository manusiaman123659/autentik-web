"use client";

import { Suspense, useMemo, useState } from "react";
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
import type { ProductRow } from "@/lib/admin-data";
import StoreFilterSidebar, { type FilterState } from "@/components/store/StoreFilterSidebar";
import StoreProductCard from "@/components/store/StoreProductCard";
import StoreSearchBar from "@/components/store/StoreSearchBar";
import CategoryToolbar from "@/components/store/CategoryToolbar";
import StoreTrustStrip from "@/components/store/StoreTrustStrip";
import StorePromoBanner from "@/components/store/StorePromoBanner";

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
  compatible,
  waNumber,
  initialQuery,
}: {
  products: ProductRow[];
  compatible: string | null;
  waNumber: string | null;
  initialQuery?: string;
}) {
  const [filters, setFilters] = useState<FilterState>({
    ...INITIAL_FILTERS,
    query: initialQuery ?? "",
  });
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = products;

    // Text search
    if (filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
      );
    }

    // Brand filter
    if (filters.brands.length > 0) {
      list = list.filter((p) => filters.brands.includes(p.brand));
    }

    // Category filter
    if (filters.categories.length > 0) {
      list = list.filter((p) => filters.categories.includes(p.category));
    }

    // Stock status filter
    if (filters.stockStatus === "available") {
      list = list.filter((p) => (p.stock ?? 0) > 0);
    } else if (filters.stockStatus === "low") {
      list = list.filter((p) => {
        const s = p.stock ?? 0;
        const l = p.low_stock_threshold ?? 5;
        return s > 0 && s <= l;
      });
    } else if (filters.stockStatus === "out") {
      list = list.filter((p) => (p.stock ?? 0) === 0);
    }

    // Price range filter
    if (filters.priceMin !== "") {
      const min = Number(filters.priceMin);
      if (!Number.isNaN(min)) list = list.filter((p) => (p.price ?? 0) >= min);
    }
    if (filters.priceMax !== "") {
      const max = Number(filters.priceMax);
      if (!Number.isNaN(max)) list = list.filter((p) => (p.price ?? 0) <= max);
    }

    return list;
  }, [products, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

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
            <span className="text-xs font-semibold uppercase tracking-widest text-[#0EA5A0]">Marketplace Sparepart</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Store Sparepart & Komponen
          </h1>
          <p className="text-slate-200 text-sm sm:text-base max-w-xl font-light">
            Sparepart original bergaransi untuk unit Talpha, Cylab, Ullun, dan Epal.
          </p>
          {compatible && (
            <div className="max-w-xl mt-4 p-3 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-200 text-sm font-medium flex items-center gap-2">
              <PackageCheck size={16} className="text-[#0EA5A0]" />
              <span>
                Kompatibel: <strong className="text-white uppercase">{compatible.replace(/-/g, " ")}</strong>
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
            <StoreSearchBar products={products} onQueryChange={(q) => handleFilterChange({ query: q })} />
          </Suspense>
          <CategoryToolbar
            products={products}
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
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{filtered.length}</span> produk ditemukan
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
            products={products}
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

            {filtered.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <Package size={40} className="mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Tidak ada produk ditemukan</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-light">
                  Coba ubah filter pencarian atau reset filter Anda.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {pageItems.map((product) => (
                    <StoreProductCard key={product.id} product={product} waNumber={waNumber} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-8">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Halaman <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{safePage}</span> dari{" "}
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Halaman sebelumnya"
                        className="p-2 rounded-lg border disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPage(n)}
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
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
