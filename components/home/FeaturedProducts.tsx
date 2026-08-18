import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { products } from "@/lib/data/products";
import SectionHeading from "@/components/ui/SectionHeading";
import AnimatedElement from "./ScrollAnimations";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

// Pilih 4 produk unggulan yang representatif dari tiap brand
const FEATURED_SLUGS = [
  "ullun-laminar-air-flow",
  "ullun-biosafety-cabinet",
  "autentik-adc-80",
  "cylab-wps-ls1012",
];

export default function FeaturedProducts() {
  const featuredProducts = FEATURED_SLUGS.map((slug) =>
    products.find((p) => p.slug === slug)
  ).filter(Boolean) as (typeof products)[0][];

  return (
    <section className="py-20" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedElement type="fade-up">
          <div className="flex items-end justify-between mb-12">
            <SectionHeading
              title="Produk Unggulan"
              subtitle="Peralatan kelas atas dari brand-brand terpercaya Autentik."
              align="left"
            />
            <Link
              href="/products"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#14B8A6] hover:text-[#0D9E98] transition-colors whitespace-nowrap mb-1"
            >
              Lihat Semua
              <ArrowRight size={16} />
            </Link>
          </div>
        </AnimatedElement>

        <AnimatedElement type="stagger" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredProducts.map((product) => (
            <div
              key={product.id}
              className="border rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group hover:border-[#14B8A6]/40"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              {/* Product Image */}
              <div
                className="relative h-44 overflow-hidden"
                style={{ backgroundColor: "var(--bg-secondary)" }}
              >
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-20">
                    🔬
                  </div>
                )}
                {/* Brand badge */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className={DESIGN_TOKENS.badges.categoryNeutral}>
                    {product.brand}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-5">
                <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5 text-slate-400">
                  {product.category}
                </p>
                <h3 className="text-base font-bold mb-1.5 group-hover:text-[#14B8A6] transition-colors line-clamp-2" style={{ color: "var(--text-primary)" }}>
                  {product.name}
                </h3>
                <p className="text-sm mb-4 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {product.description}
                </p>

                <Link
                  href={`/products/${product.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#14B8A6] hover:text-[#0D9E98] transition-colors group/link"
                >
                  Detail Produk
                  <ArrowRight
                    size={13}
                    className="transition-transform group-hover/link:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          ))}
        </AnimatedElement>

        {/* Mobile "View All" */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold text-white"
            style={{ backgroundColor: "#0B1F3A" }}
          >
            Lihat Semua Produk
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

