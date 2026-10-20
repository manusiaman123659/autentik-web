"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";

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
  }, []);

  function scrollBy(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -160 : 160,
      behavior: "smooth",
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
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-7 flex items-center justify-center"
          style={{
            background: "linear-gradient(to right, var(--bg-primary) 60%, transparent)",
          }}
          aria-label="Geser ke kiri"
        >
          <ChevronLeft size={14} className="text-slate-500" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto thin-scrollbar py-1 px-0.5"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          type="button"
          onClick={() => onBrandToggle([])}
          className={`shrink-0 px-3 py-1.5 rounded-sm text-[11px] font-semibold border transition-colors whitespace-nowrap ${
            activeBrands.length === 0
              ? "bg-[#0EA5A0] text-white border-[#0EA5A0]"
              : "hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          style={activeBrands.length === 0 ? {} : { borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        >
          Semua
        </button>
        {allBrands.map(({ name, count }) => {
          const active = activeBrands.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggleBrand(name)}
              className={`shrink-0 px-3 py-1.5 rounded-sm text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                active
                  ? "bg-[#0EA5A0] text-white border-[#0EA5A0]"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              style={active ? {} : { borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {name}
              <span className={`ml-1 text-[9px] ${active ? "text-white/70" : "text-slate-400"}`}>
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
          className="absolute right-0 top-0 bottom-0 z-10 w-7 flex items-center justify-center"
          style={{
            background: "linear-gradient(to left, var(--bg-primary) 60%, transparent)",
          }}
          aria-label="Geser ke kanan"
        >
          <ChevronRight size={14} className="text-slate-500" />
        </button>
      )}
    </div>
  );
}
