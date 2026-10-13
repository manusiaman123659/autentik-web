"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "@/i18n/navigation";
import { ArrowUpRight, Box, ChevronLeft, ChevronRight } from "lucide-react";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import type { B2BHomeView } from "@/lib/public-product-presentation";

export default function Product3DTeaser({ products }: { products: B2BHomeView[] }) {
  const t = useTranslations("home.product3d");
  const [activeIndex, setActiveIndex] = useState(0);
  const product = products[activeIndex] ?? products[0];

  if (!product) return null;

  const hasMultipleProducts = products.length > 1;
  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + products.length) % products.length);
  };
  const showNext = () => {
    setActiveIndex((current) => (current + 1) % products.length);
  };

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8" style={{ backgroundColor: "var(--bg-primary)" }}>
      <AnimatedElement type="fade-up" className="mx-auto max-w-7xl">
        <div
          className="relative grid overflow-hidden rounded-3xl border lg:grid-cols-[1.1fr_0.9fr]"
          style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}
        >
          <div className="relative min-h-72 bg-page-alt dark:bg-[#07182e] lg:min-h-[420px]">
            {product.imageUrl ? (
              <Image
                key={product.id}
                src={product.imageUrl}
                alt={product.display.name}
                fill
                sizes="(max-width: 1023px) calc(100vw - 48px), (max-width: 1280px) 55vw, 700px"
                className="object-contain p-8 sm:p-12"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[#0EA5A0]">
                <Box size={72} strokeWidth={1.2} />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,160,0.14),transparent_65%)]" />

            {hasMultipleProducts && (
              <div className="absolute inset-x-5 bottom-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label={t("previous")}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#0B1F3A]/80 text-white backdrop-blur transition-colors hover:bg-[#0EA5A0]"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label={t("next")}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#0B1F3A]/80 text-white backdrop-blur transition-colors hover:bg-[#0EA5A0]"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#0EA5A0]/30 bg-[#0EA5A0]/10 text-[#0EA5A0]">
              <Box size={24} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0EA5A0]">
              {t("eyebrow")}
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>
              {product.brand}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl break-words" style={{ color: "var(--text-primary)" }}>
              {t("title", { name: product.display.name })}
            </h2>
            <p className="mt-5 line-clamp-3 max-w-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {product.display.description || t("descriptionFallback")}
            </p>
            <Link
              href={`/products/${product.slug}`}
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-lg bg-[#0B1F3A] px-6 py-3 font-bold text-white transition-colors hover:bg-[#12345f]"
            >
              {t("view")}
              <ArrowUpRight size={18} />
            </Link>

            {hasMultipleProducts && (
              <div className="mt-8 flex flex-wrap items-center gap-2" aria-label={t("choices")}>
                {products.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={t("show", { name: item.display.name })}
                    aria-current={index === activeIndex ? "true" : undefined}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex ? "w-8 bg-[#0EA5A0]" : "w-2 bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {activeIndex + 1} / {products.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </AnimatedElement>
    </section>
  );
}
