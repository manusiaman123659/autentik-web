"use client";
import { useTranslations } from "next-intl";

import Image from "next/image";
import Link from "@/i18n/navigation";
import { useTheme } from "@/components/ThemeProvider";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import type { PublicBrandItem } from "@/lib/public-data";

const brandGridColumns: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

export default function Brands({ items }: { items: PublicBrandItem[] }) {
  const t = useTranslations("home.brands");
  const { theme } = useTheme();

  if (items.length === 0) return null;

  return (
    <section className="py-24" id="brands" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto px-8 lg:px-16">
        <AnimatedElement type="fade-up">
          <div className="mb-14">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-[2px] w-6 bg-[#0EA5A0]" />
              <h4
                className="text-[11px] font-bold tracking-widest uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("eyebrow")}
              </h4>
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]"
              style={{ color: "var(--text-primary)" }}
            >
               {t("title")}
            </h2>
            <p
              className="text-sm leading-relaxed mt-4 max-w-lg"
              style={{ color: "var(--text-secondary)" }}
            >
               {t("description")}
            </p>
          </div>
        </AnimatedElement>
      </div>

      <div className="max-w-7xl mx-auto px-8 lg:px-16">
        <AnimatedElement
          type="stagger"
          className={`grid border-l border-t ${brandGridColumns[items.length] ?? brandGridColumns[5]}`}
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {items.map((brand) => (
            <Link
              key={brand.id}
              href={`/products?brand=${encodeURIComponent(brand.brandFilter)}`}
              aria-label={t("view", { name: brand.name })}
              className="flex min-w-0 h-28 items-center justify-center border-b border-r px-5 opacity-75 transition-all duration-300 hover:bg-[#0EA5A0]/5 hover:opacity-100 md:h-32"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {brand.logoSrc ? (
                <Image
                  src={theme === "dark" ? (brand.logoSrcDark ?? brand.logoSrc) : brand.logoSrc}
                  alt={brand.name}
                  width={160}
                  height={80}
                  className="h-10 md:h-12 w-auto max-w-full object-contain"
                />
              ) : (
                <span className="min-w-0 text-center text-base sm:text-xl font-black tracking-[0.14em] [overflow-wrap:anywhere]" style={{ color: "var(--text-primary)" }}>
                  {brand.name.toUpperCase()}
                </span>
              )}
            </Link>
          ))}
        </AnimatedElement>
      </div>
    </section>
  );
}
