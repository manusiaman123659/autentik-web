import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronRight,
  Package,
  CheckCircle2,
} from "lucide-react";
import { getProductBySlug } from "@/lib/admin-data";
import { getWhatsAppNumber } from "@/lib/public-data";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductFulfillmentCta from "@/components/requests/ProductFulfillmentCta";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import { formatRupiah } from "@/lib/format";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getProductBySlug(slug);
  if (!row || row.product_type !== "sparepart" || row.is_store_visible !== true) return {};
  return {
    title: `${row.name} — ${row.brand} | PT Autentik Karya Analitika`,
    description: row.seo_description || row.description,
  };
}

export default async function StoreProductPage({ params }: Props) {
  const { slug } = await params;
  const row = await getProductBySlug(slug);

  if (!row || row.product_type !== "sparepart" || row.is_store_visible !== true) notFound();

  const stock = row.stock ?? 0;
  const low = row.low_stock_threshold ?? 5;
  const outOfStock = stock === 0;
  const lowStock = !outOfStock && stock <= low;

  const fulfillmentType = row.fulfillment_type ?? "ready_stock";
  const isReady = fulfillmentType === "ready_stock";
  const isThirdParty = fulfillmentType === "third_party";

  const waNumber = await getWhatsAppNumber();

  const details = [
    { label: "Merek", value: row.brand },
    { label: "Kategori", value: row.category },
    { label: "SKU", value: row.sku || "—" },
    { label: "Berat", value: row.weight_grams != null ? `${row.weight_grams} gram` : "—" },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <Link href="/" className="hover:text-[#0EA5A0] transition-colors">Home</Link>
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            <Link href="/store" className="hover:text-[#0EA5A0] transition-colors">Store</Link>
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            <span className="font-medium truncate max-w-[200px]" style={{ color: "var(--text-primary)" }}>
              {row.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <section className="py-12" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedElement type="fade-up" className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left — image */}
            <div className="space-y-4">
              <div
                className="w-full aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden border"
                style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
              >
                {row.image_url ? (
                  <Image
                    src={row.image_url}
                    alt={row.name}
                    fill
                    className="object-contain p-8"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package size={96} className="text-slate-400" />
                  </div>
                )}
                <div className="absolute top-4 left-4 z-10">
                  <span className={DESIGN_TOKENS.badges.categoryNeutral}>{row.brand}</span>
                </div>
                <div className="absolute top-4 right-4 z-10">
                  {!isReady ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-[#0EA5A0]/15 text-[#0EA5A0]">
                      {fulfillmentType === "custom_request" ? "Pesanan Custom" : "Via Pihak Ketiga"}
                    </span>
                  ) : outOfStock ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-500">Habis</span>
                  ) : lowStock ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">Stok Terbatas</span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Tersedia</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right — details */}
            <div>
              <Link
                href="/store"
                className="inline-flex items-center gap-1.5 text-sm hover:text-[#14B8A6] transition-colors mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                <ArrowLeft size={14} />
                Kembali ke Store
              </Link>

              <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                {row.category}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight" style={{ color: "var(--text-primary)" }}>
                {row.name}
              </h1>

              <p className="text-2xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
                {row.price != null ? formatRupiah(row.price) : "Harga: hubungi kami"}
              </p>
              {row.compare_at_price != null && row.price != null && row.compare_at_price > row.price && (
                <p className="text-sm text-slate-400 line-through mb-4">{formatRupiah(row.compare_at_price)}</p>
              )}

              <p className="leading-relaxed text-base mb-8" style={{ color: "var(--text-secondary)" }}>
                {row.description}
              </p>

              {/* Details table */}
              <div className="rounded-xl border shadow-sm overflow-hidden mb-8" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <table className="w-full text-sm">
                  <tbody>
                    {details.map((d) => (
                      <tr key={d.label} className="border-b last:border-0" style={{ borderColor: "var(--border-subtle)" }}>
                        <td className="px-5 py-3.5 font-semibold w-2/5 border-r" style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}>
                          {d.label}
                        </td>
                        <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>{d.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Variants */}
              {Array.isArray(row.variants) && row.variants.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-primary)" }}>
                    Varian
                  </h2>
                  <div className="space-y-3">
                    {row.variants.map((v) => (
                      <div key={v.name}>
                        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{v.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {(v.options || []).map((opt) => (
                            <span
                              key={opt}
                              className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)", backgroundColor: "var(--bg-secondary)" }}
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Features */}
              {Array.isArray(row.features) && row.features.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-primary)" }}>
                    Keunggulan
                  </h2>
                  <ul className="space-y-2.5">
                    {row.features.map((f) => (
                      <li key={String(f)} className="flex items-start gap-2.5">
                        <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-[#0EA5A0]" />
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{String(f)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                {isReady ? (
                  <AddToCartButton product={row} variant="detail" />
                ) : (
                  <ProductFulfillmentCta
                    fulfillmentType={fulfillmentType}
                    name={row.name}
                    slug={row.slug}
                    waNumber={waNumber}
                    variant="detail"
                  />
                )}
                {!isThirdParty && (
                  <WhatsAppButton
                    number={waNumber}
                    label="Tanya via WhatsApp"
                    message={`Halo, saya ingin menanyakan ketersediaan sparepart ${row.name}`}
                    variant="button"
                    className="px-6 py-3.5 rounded-lg"
                  />
                )}
              </div>
            </div>
          </AnimatedElement>
        </div>
      </section>
    </>
  );
}