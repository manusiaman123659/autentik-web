import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Phone,
  ChevronRight,
  Package,
  Wrench,
} from "lucide-react";
import { products } from "@/lib/data/products";
import AnimatedElement from "@/components/ui/ScrollAnimations";


import { DESIGN_TOKENS } from "@/lib/design-tokens";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) return {};
  return {
    title: `${product.name} — ${product.brand} | PT Autentik Karya Analitika`,
    description: product.description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  if (!product) notFound();

  // Related products from same brand
  const related = products
    .filter((p) => p.brand === product.brand && p.id !== product.id)
    .slice(0, 4);

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <Link href="/" className="hover:text-[#0EA5A0] transition-colors">
              Home
            </Link>
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            <Link
              href="/katalog-produk"
              className="hover:text-[#0EA5A0] transition-colors"
            >
              Katalog Produk
            </Link>
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            <Link
              href={`/katalog-produk?brand=${product.brand}`}
              className="hover:text-[#0EA5A0] transition-colors"
            >
              {product.brand}
            </Link>
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            <span className="font-medium truncate max-w-[200px]" style={{ color: "var(--text-primary)" }}>
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-12" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up" className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left — Image */}
            <div className="space-y-4">
              {/* Main image */}
              <div
                className="w-full aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden border"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-contain p-8"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[120px] opacity-15 select-none">🔬</div>
                )}
                <div className="absolute top-4 left-4 z-10">
                  <span className={DESIGN_TOKENS.badges.categoryNeutral}>
                    {product.brand}
                  </span>
                </div>
              </div>
            </div>

            {/* Right — Details */}
            <div>
              {/* Back link */}
              <Link
                href={`/katalog-produk?brand=${product.brand}`}
                className="inline-flex items-center gap-1.5 text-sm hover:text-[#14B8A6] transition-colors mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                <ArrowLeft size={14} />
                Kembali ke {product.brand}
              </Link>

              {/* Category */}
              <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                {product.category}
              </p>

              {/* Name */}
              <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight" style={{ color: "var(--text-primary)" }}>
                {product.name}
              </h1>

              {/* Brand + accent bar */}
              <div className="flex items-center gap-3 mb-6">
                <span className={DESIGN_TOKENS.badges.categoryNeutral}>
                  {product.brand}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "rgba(20, 184, 166, 0.25)" }}
                />
              </div>

              {/* Description */}
              <p className="leading-relaxed text-base mb-8" style={{ color: "var(--text-secondary)" }}>
                {product.description}
              </p>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-wider mb-4 text-[#14B8A6]">
                    Fitur Utama
                  </h2>
                  <ul className="space-y-2.5">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <CheckCircle2
                          size={16}
                          className="flex-shrink-0 mt-0.5 text-[#14B8A6]"
                        />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <a
                  href="https://wa.me/6281234567890?text=Halo, saya ingin menanyakan ketersediaan produk"
                  target="_blank"
                  rel="noopener noreferrer"
                  id="whatsapp-cta"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle size={18} />
                  Tanya via WhatsApp
                </a>
                <Link
                  href="/contact"
                  id="contact-sales-cta"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold border hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-all"
                  style={{ color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                >
                  <Phone size={18} />
                  Hubungi Sales
                </Link>
                <Link
                  href={`/store?compatible=${product.slug}`}
                  id="sparepart-cta"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ backgroundColor: "#0B1F3A" }}
                >
                  <Wrench size={18} />
                  Cari Sparepart Produk Ini
                </Link>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>

      {/* Specifications Table */}
      {product.specs && product.specs.length > 0 && (
        <section className="py-12" style={{ backgroundColor: "var(--bg-secondary)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedElement type="fade-up">
              <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
                Spesifikasi Teknis
              </h2>
              <div className="rounded-xl border shadow-sm overflow-hidden max-w-2xl" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <table className="w-full text-sm">
                  <tbody>
                    {product.specs.map((spec, idx) => (
                      <tr
                        key={spec.label}
                        className="border-b last:border-0"
                        style={{ borderColor: "var(--border-subtle)" }}
                      >
                        <td className="px-5 py-3.5 font-semibold w-2/5 border-r" style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
                          {spec.label}
                        </td>
                        <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimatedElement>
          </div>
        </section>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <section className="py-16" style={{ backgroundColor: "var(--bg-primary)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedElement type="fade-up">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  Produk Lain dari{" "}
                  <span className="text-[#14B8A6]">{product.brand}</span>
                </h2>
                <Link
                  href={`/katalog-produk?brand=${product.brand}`}
                  className="text-sm font-semibold text-[#14B8A6] hover:underline inline-flex items-center gap-1"
                >
                  Lihat Semua <ChevronRight size={14} />
                </Link>
              </div>
            </AnimatedElement>

            <AnimatedElement type="stagger" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/katalog-produk/${rel.slug}`}
                  className="group border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 hover:border-[#14B8A6]/40"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                >
                  <div
                    className="relative h-32 overflow-hidden"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                    }}
                  >
                    {rel.imageUrl ? (
                      <Image
                        src={rel.imageUrl}
                        alt={rel.name}
                        fill
                        className="object-contain p-3"
                        sizes="25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package size={40} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className={DESIGN_TOKENS.badges.categoryNeutral}>
                      {rel.brand}
                    </span>
                    <p className="text-sm font-bold group-hover:text-[#14B8A6] transition-colors line-clamp-2 mt-2" style={{ color: "var(--text-primary)" }}>
                      {rel.name}
                    </p>
                    <p className="text-xs mt-1 text-slate-400">{rel.category}</p>
                  </div>
                </Link>
              ))}
            </AnimatedElement>
          </div>
        </section>
      )}
    </>
  );
}


