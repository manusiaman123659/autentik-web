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
  products: ProductRow[];
  filters: FilterState;
  onFilterChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  activeCount: number;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function StoreFilterSidebar({
  products,
  filters,
  onFilterChange,
  onReset,
  activeCount,
  mobileOpen,
  onMobileClose,
}: StoreFilterSidebarProps) {
  const allBrands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const allCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  function toggleArrayFilter(key: "brands" | "categories", value: string) {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onFilterChange({ [key]: next });
  }

  const sidebarContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[#0EA5A0]" />
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Filter</h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#0EA5A0] text-white text-[10px] font-bold">{activeCount}</span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-[#0EA5A0] hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Cari Produk
        </label>
        <input
          type="text"
          value={filters.query}
          onChange={(e) => onFilterChange({ query: e.target.value })}
          placeholder="Nama, SKU, merek..."
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        />
      </div>

      {/* Brand */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Merek
        </label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {allBrands.map((b) => (
            <label key={b} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.brands.includes(b)}
                onChange={() => toggleArrayFilter("brands", b)}
                className="rounded border-slate-300 dark:border-slate-600 text-[#0EA5A0] focus:ring-[#0EA5A0]/30"
              />
              <span className="text-sm group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                {b}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Kategori
        </label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {allCategories.map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.categories.includes(c)}
                onChange={() => toggleArrayFilter("categories", c)}
                className="rounded border-slate-300 dark:border-slate-600 text-[#0EA5A0] focus:ring-[#0EA5A0]/30"
              />
              <span className="text-sm group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                {c}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Rentang Harga
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={filters.priceMin}
            onChange={(e) => onFilterChange({ priceMin: e.target.value })}
            placeholder="Min"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          />
          <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>-</span>
          <input
            type="number"
            min={0}
            value={filters.priceMax}
            onChange={(e) => onFilterChange({ priceMax: e.target.value })}
            placeholder="Max"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors"
            style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Stock Status */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Status Stok
        </label>
        <div className="space-y-1.5">
          {[
            { value: "all", label: "Semua" },
            { value: "available", label: "Tersedia" },
            { value: "low", label: "Stok Terbatas" },
            { value: "out", label: "Habis" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="stockStatus"
                checked={filters.stockStatus === opt.value}
                onChange={() => onFilterChange({ stockStatus: opt.value })}
                className="border-slate-300 dark:border-slate-600 text-[#0EA5A0] focus:ring-[#0EA5A0]/30"
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
      <aside className="hidden lg:block w-[260px] shrink-0">
        <div
          className="sticky top-24 rounded-2xl border p-5 shadow-sm"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
        >
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onMobileClose} />
          <div
            className="absolute left-0 top-0 bottom-0 w-[300px] overflow-y-auto p-5 shadow-2xl"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Filter</h3>
              <button
                type="button"
                onClick={onMobileClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
