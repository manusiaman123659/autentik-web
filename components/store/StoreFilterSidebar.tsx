"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("products.storeUi");
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onMobileClose);
  useEffect(() => { closeRef.current = onMobileClose; }, [onMobileClose]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled]),[tabindex='0']") ?? []);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) closeRef.current(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => { desktop.removeEventListener("change", closeOnDesktop); document.removeEventListener("keydown", keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [mobileOpen]);
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
    <div className="space-y-6 [&_label]:text-sm [&_label]:text-body [&_label]:leading-relaxed [&_input]:min-w-0 [&_input]:focus-visible:outline-2 [&_input]:focus-visible:outline-teal-600">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={14} className="text-[#0EA5A0]" />
          <h3 className="text-base font-semibold text-heading">{t("filter")}</h3>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 px-2 text-sm font-medium text-red-700 dark:text-red-400 focus-visible:outline-2"
          >
            {t("reset")}
          </button>
        )}
      </div>

      {/* Category */}
      <fieldset>
        <legend className="text-sm font-semibold text-heading mb-2">{t("category")}</legend>
        <div className="max-h-60 overflow-y-auto scrollbar-thin pr-1">
          {allCategories.map(({ name, count }) => (
            <label key={name} className="min-h-11 flex items-start gap-3 cursor-pointer group py-2.5">
              <input
                type="checkbox"
                checked={filters.categories.includes(name)}
                onChange={() => toggleArrayFilter("categories", name)}
                className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
              />
              <span className="text-sm flex-1 min-w-0 break-words group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                {name}
              </span>
              <span className="text-xs tabular-nums text-body pt-0.5">{count}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Brand */}
      <fieldset>
        <legend className="text-sm font-semibold text-heading mb-2">{t("brand")}</legend>
        <div className="max-h-60 overflow-y-auto scrollbar-thin pr-1">
          {allBrands.map(({ name, count }) => (
            <label key={name} className="min-h-11 flex items-start gap-3 cursor-pointer group py-2.5">
              <input
                type="checkbox"
                checked={filters.brands.includes(name)}
                onChange={() => toggleArrayFilter("brands", name)}
                className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
              />
              <span className="text-sm flex-1 min-w-0 break-words group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                {name}
              </span>
              <span className="text-xs tabular-nums text-body pt-0.5">{count}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Price Range */}
      <div>
        <p className="text-sm font-semibold text-heading mb-2">{t("price")}</p>
        <div className="grid grid-cols-1 gap-2">
          <label className="block">{t("minimumPrice")}
          <input
            type="number"
            min={0}
            value={filters.priceMin}
            onChange={(e) => onFilterChange({ priceMin: e.target.value })}
            placeholder="0"
            className="mt-1 min-h-11 w-full rounded border border-slate-500 dark:border-slate-400 px-3 py-2 text-base focus:outline-2"
            style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
          </label><label className="block">{t("maximumPrice")}
          <input
            type="number"
            min={0}
            value={filters.priceMax}
            onChange={(e) => onFilterChange({ priceMax: e.target.value })}
            placeholder="—"
            className="mt-1 min-h-11 w-full rounded border border-slate-500 dark:border-slate-400 px-3 py-2 text-base focus:outline-2"
            style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
          </label>
        </div>
      </div>

      {/* Stock Status */}
      <fieldset>
        <legend className="text-sm font-semibold text-heading mb-2">{t("stock")}</legend>
        <div className="space-y-0.5">
          {[
            { value: "all", label: t("all") },
            { value: "available", label: t("available") },
            { value: "low", label: t("low") },
            { value: "out", label: t("out") },
          ].map((opt) => (
            <label key={opt.value} className="min-h-11 flex items-center gap-3 cursor-pointer group py-2">
              <input
                type="radio"
                name="stockStatus"
                checked={filters.stockStatus === opt.value}
                onChange={() => onFilterChange({ stockStatus: opt.value })}
                className="h-4 w-4 shrink-0 accent-teal-700"
              />
              <span className="text-sm group-hover:text-[#0EA5A0] transition-colors" style={{ color: "var(--text-primary)" }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 xl:w-60 shrink-0">
        <div
          className="sticky top-20 max-h-[calc(100dvh-96px)] overflow-y-auto scrollbar-thin rounded border p-4"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onMobileClose} aria-hidden="true" />
          <div
            ref={dialog} id="store-filter-drawer" role="dialog" aria-modal="true" aria-label={t("filter")}
            className="absolute left-0 top-0 bottom-0 w-88 max-w-[calc(100vw-24px)] flex flex-col"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <div className="flex shrink-0 items-center justify-between p-4 border-b border-base">
              <h2 className="text-base font-semibold text-heading">{t("filter")}</h2>
              <button
                type="button"
                onClick={onMobileClose}
                aria-label={t("closeFilter")}
                className="h-11 w-11 flex items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-teal-600"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{sidebarContent}</div>
            <div className="shrink-0 border-t border-base p-4 pb-[max(16px,env(safe-area-inset-bottom))]"><button type="button" onClick={onMobileClose} className="min-h-11 w-full rounded bg-teal-700 text-white font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">{t("showResults")}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
