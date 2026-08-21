"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import AnimatedElement from "@/components/ui/ScrollAnimations";

interface BrandItem {
  name: string;
  logoSrc: string;
  logoSrcDark?: string;
  /** Value used for ?brand= query param on /products */
  brandFilter: string;
}

export default function Brands({ items }: { items: BrandItem[] }) {
  const { theme } = useTheme();

  if (items.length === 0) return null;

  const marqueeItems = [...items, ...items];

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
                OUR BRANDS
              </h4>
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]"
              style={{ color: "var(--text-primary)" }}
            >
              Autentik Brands
            </h2>
            <p
              className="text-sm leading-relaxed mt-4 max-w-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              Kami bermitra dengan brand-brand terkemuka dunia untuk menghadirkan solusi teknologi terbaik bagi pelanggan kami.
            </p>
          </div>
        </AnimatedElement>
      </div>

      <div className="brand-marquee-mask relative overflow-hidden">
        <div className="brand-marquee-track">
          {marqueeItems.map((brand, i) => (
            <Link
              key={`${brand.name}-${i}`}
              href={`/products?brand=${brand.brandFilter}`}
              aria-label={`Lihat produk ${brand.name}`}
              className="flex items-center justify-center shrink-0 h-24 md:h-28 px-10 opacity-75 hover:opacity-100 transition-opacity duration-300"
            >
              <Image
                src={theme === "dark" ? (brand.logoSrcDark ?? brand.logoSrc) : brand.logoSrc}
                alt={brand.name}
                width={160}
                height={80}
                className="h-10 md:h-12 w-auto max-w-[180px] object-contain"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
