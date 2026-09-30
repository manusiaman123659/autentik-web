import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Boxes } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import AnimatedElement from "./ScrollAnimations";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import type { ProductRow } from "@/lib/public-data";

export default function FeaturedProducts({ products }: { products: ProductRow[] }) {
  if (products.length === 0) return null;

  return (
    <section className="py-20" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedElement type="fade-up">
          <div className="flex items-end justify-between gap-6 mb-12">
            <SectionHeading
              title="Produk Manufaktur Unggulan"
              subtitle="Pilihan produk AKA untuk kebutuhan monitoring, laboratorium, dan pengolahan air."
              align="left"
            />
            <Link
              href="/products"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#14B8A6] hover:text-[#0D9E98] transition-colors whitespace-nowrap mb-1"
            >
              Lihat Semua
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </AnimatedElement>

        <AnimatedElement type="stagger" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {products.map((product) => (
            <div
              key={product.id}
              className="border rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group hover:border-[#14B8A6]/40"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              {/* Product Image */}
              <div
                className="relative h-44 overflow-hidden"
                style={{ backgroundColor: "var(--bg-secondary)" }}
              >
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#0EA5A0]/30">
                    <Boxes size={46} />
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
                <p className="text-xs font-medium uppercase tracking-wide mb-1.5 text-body break-words">
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
                  Lihat Detail
                  <ArrowUpRight
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
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

