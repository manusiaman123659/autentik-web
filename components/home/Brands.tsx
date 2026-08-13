"use client";

import Image from "next/image";
import Link from "next/link";
import AnimatedElement from "@/components/ui/ScrollAnimations";

interface BrandItem {
  name: string;
  logoSrc: string;
  /** Value used for ?brand= query param on /katalog-produk */
  brandFilter: string;
}

const brands: BrandItem[] = [
  { name: "AUTENTIK", logoSrc: "/images/brand/autentikk black.png", brandFilter: "Autentik" },
  { name: "CYLAB", logoSrc: "/images/brand/CYLAB logoo.png", brandFilter: "Cylab" },
  { name: "EPAL", logoSrc: "/images/brand/logo tekna web.png", brandFilter: "Epal" },
  { name: "TALPHA", logoSrc: "/images/brand/TALPHA_R.png", brandFilter: "Talpha" },
  { name: "ULLUN", logoSrc: "/images/brand/ULLUN_R black.png", brandFilter: "Ullun" },
];

export default function Brands() {
  return (
    <section className="py-24 px-8 lg:px-16" id="brands" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div className="max-w-7xl mx-auto">
        <AnimatedElement type="fade-up">
          <div className="mb-12">
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

        <AnimatedElement type="stagger" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.name}
              href={`/katalog-produk?brand=${brand.brandFilter}`}
              className="h-32 lg:h-40 rounded-2xl flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 p-5 relative group overflow-hidden border cursor-pointer"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center p-2 rounded-xl bg-white">
                <Image
                  src={brand.logoSrc}
                  alt={brand.name}
                  width={160}
                  height={80}
                  className="max-h-16 max-w-[85%] object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </Link>
          ))}
        </AnimatedElement>
      </div>
    </section>
  );
}
