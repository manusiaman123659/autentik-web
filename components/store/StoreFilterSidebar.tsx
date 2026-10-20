"use client";

import { useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";

export interface FilterState {
  query: string;
  brands: string[];
  categories: string[];
  stockStatus: string;
  priceMin: string;
  priceMax: string;
}

interface StoreFilterSidebarProps {
  products: Pick<ProductRow, "brand" | "category">[];
  brands?: { name: string; count: string }[];
  categories?: { name: string; count: string }[];
  filters: FilterState;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  activeCount: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function StoreFilterSidebar({
  products,
  brands,
  categories,
  filters,
  onFilterChange,
  onReset,
  activeCount,
  mobileOpen,
  onMobileClose,
}: StoreFilterSidebarProps) {
  const allBrands = useMemo(() => {
    if (brands) return brands;
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.brand) counts[p.brand] = (counts[p.brand] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [products, brands]);

  const allCategories = useMemo(() => {
    if (categories) return categories;
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [products, categories]);

  function toggleArrayFilter(key: "brands" | "categories", value: string) {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFilterChange({ [key]: next });
  }

  const sidebarContent = (
    <div className="space-y-5 [&_label]:text-sm [&_label]:text-body [&_label]:leading-relaxed [&_label]:py-1 [&_input]:min-w-0 [&_input[type=checkbox]]:size-4 [&_input[type=radio]]:size-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-[#0EA5A0]" />
          <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Filter Produk</h3>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] font-semibold text-red-500 hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
          Kategori
        </label>
        <div className="space-y-0.5 max-h-32 overflow-y-auto thin-scrollbar">
          {allCategories.map(({ name, count }) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer group py-0.5">
              <input
                type="checkbox"
                checked={filters.categories.includes(name)}
                onChange={() => toggleArrayFilter("categories", name)}
                className="rounded-sm border-slate-300 dark:border-slate-600 text-[#0EA5A0] focus:ring-[#0EA5A0]/30 w-3 h-3"
              />
              <span className="text-sm flex-1 min-w-0 break-words group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                {name}
              </span>
              <span className="text-[10px] tabular-nums text-slate-400">{count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Brand */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
          Merek
        </label>
        <div className="space-y-0.5 max-h-32 overflow-y-auto thin-scrollbar">
          {allBrands.map(({ name, count }) => (
            <label key={name} className="flex items-center gap-2 cursor-pointer group py-0.5">
              <input
                type="checkbox"
                checked={filters.brands.includes(name)}
                onChange={() => toggleArrayFilter("brands", name)}
                className="rounded-sm border-slate-300 dark:border-slate-600 text-[#0EA5A0] focus:ring-[#0EA5A0]/30 w-3 h-3"
              />
              <span className="text-sm flex-1 min-w-0 break-words group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                {name}
              </span>
              <span className="text-[10px] tabular-nums text-slate-400">{count}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
          Harga
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            value={filters.priceMin}
            onChange={(e) => onFilterChange({ priceMin: e.target.value })}
            placeholder="Min"
            aria-label="Harga minimum"
            className="w-full rounded-sm border px-2 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
          />
          <span className="text-[10px] font-bold text-slate-400">–</span>
          <input
            type="number"
            min={0}
            value={filters.priceMax}
            onChange={(e) => onFilterChange({ priceMax: e.target.value })}
            placeholder="Max"
            aria-label="Harga maksimum"
            className="w-full rounded-sm border px-2 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Stock Status */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
          Stok
        </label>
        <div className="space-y-0.5">
          {[
            { value: "all", label: "Semua" },
            { value: "available", label: "Tersedia" },
            { value: "low", label: "Terbatas" },
            { value: "out", label: "Habis" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer group py-0.5">
              <input
                type="radio"
                name="stockStatus"
                checked={filters.stockStatus === opt.value}
                onChange={() => onFilterChange({ stockStatus: opt.value })}
                className="border-slate-300 dark:border-slate-600 text-[#0EA5A0] focus:ring-[#0EA5A0]/30 w-3 h-3"
              />
              <span className="text-sm group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div
          className="sticky top-24 rounded-sm border p-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <div
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[calc(100vw-32px)] overflow-y-auto p-5"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Filter</h3>
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Tutup filter"
                className="p-3 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-teal-500"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={16} />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
