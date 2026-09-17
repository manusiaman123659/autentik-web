"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import AnimatedElement from "@/components/ui/ScrollAnimations";

interface BrandItem {
  name: string;
  logoSrc?: string;
  logoSrcDark?: string;
  /** Value used for ?brand= query param on /products */
  brandFilter: string;
}

export default function Brands({ items }: { items: BrandItem[] }) {
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
                BRAND AKA
              </h4>
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]"
              style={{ color: "var(--text-primary)" }}
            >
              Brand Manufaktur Kami
            </h2>
            <p
              className="text-sm leading-relaxed mt-4 max-w-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              Lima brand utama dalam portofolio produk yang dikembangkan untuk kebutuhan
              industri, laboratorium, dan lingkungan.
            </p>
          </div>
        </AnimatedElement>
      </div>

      <div className="max-w-7xl mx-auto px-8 lg:px-16">
        <AnimatedElement
          type="stagger"
          className="grid grid-cols-2 border-l border-t sm:grid-cols-3 lg:grid-cols-5"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {items.map((brand) => (
            <Link
              key={brand.name}
              href={`/products?brand=${brand.brandFilter}`}
              aria-label={`Lihat produk ${brand.name}`}
              className="flex h-28 items-center justify-center border-b border-r px-5 opacity-75 transition-all duration-300 hover:bg-[#0EA5A0]/5 hover:opacity-100 md:h-32"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {brand.logoSrc ? (
                <Image
                  src={theme === "dark" ? (brand.logoSrcDark ?? brand.logoSrc) : brand.logoSrc}
                  alt={brand.name}
                  width={160}
                  height={80}
                  className="h-10 md:h-12 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <span className="text-xl font-black tracking-[0.14em]" style={{ color: "var(--text-primary)" }}>
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
