"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import { useTranslations } from "next-intl";

export default function CategoryToolbar({
  products,
  brands,
  activeBrands,
  onBrandToggle,
}: {
  products: Pick<ProductRow, "brand">[];
  brands?: { name: string; count: string }[];
  activeBrands: string[];
  onBrandToggle: (brands: string[]) => void;
}) {
  const t = useTranslations("products.storeUi");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const allBrands = useMemo(() => {
    if (brands) return brands;
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.brand) counts[p.brand] = (counts[p.brand] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [products, brands]);

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [allBrands]);

  function scrollBy(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -160 : 160,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  function toggleBrand(brand: string) {
    if (activeBrands.includes(brand)) {
      onBrandToggle(activeBrands.filter((b) => b !== brand));
    } else {
      onBrandToggle([...activeBrands, brand]);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2" aria-label={t("brand")}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy("left")}
          className="h-11 w-11 shrink-0 flex items-center justify-center rounded border border-base focus-visible:outline-2"
          aria-label={t("scrollLeft")}
        >
          <ChevronLeft size={14} className="text-slate-500" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-thin py-1"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          type="button"
          onClick={() => onBrandToggle([])}
          aria-pressed={activeBrands.length === 0}
          className={`min-h-11 shrink-0 px-4 py-2 rounded text-sm font-medium border focus-visible:outline-2 whitespace-nowrap ${
            activeBrands.length === 0
              ? "bg-teal-700 text-white border-teal-700"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          style={activeBrands.length === 0 ? {} : { borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        >
          {t("all")}
        </button>
        {allBrands.map(({ name, count }) => {
          const active = activeBrands.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggleBrand(name)}
              aria-pressed={active}
              className={`min-h-11 shrink-0 px-4 py-2 rounded text-sm font-medium border focus-visible:outline-2 whitespace-nowrap ${
                active
                  ? "bg-teal-700 text-white border-teal-700"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              style={active ? {} : { borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {name}
              <span className={`ml-2 text-xs ${active ? "text-white" : "text-body"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy("right")}
          className="h-11 w-11 shrink-0 flex items-center justify-center rounded border border-base focus-visible:outline-2"
          aria-label={t("scrollRight")}
        >
          <ChevronRight size={14} className="text-slate-500" />
        </button>
      )}
    </div>
  );
}
