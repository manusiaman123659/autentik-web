import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Phone,
  ChevronRight,
  Wrench,
  Download,
  FileText,
} from "lucide-react";
import { getProductBySlug } from "@/lib/admin-data";
import type { ProductRow } from "@/lib/admin-data";
import { getWhatsAppNumber } from "@/lib/public-data";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import ProductFulfillmentCta from "@/components/requests/ProductFulfillmentCta";
import ProductMediaTabs from "@/components/product/ProductMediaTabs";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import TechnicalDocsSection from "@/components/product/TechnicalDocsSection";
import RfqButton from "@/components/product/RfqButton";
import JsonLd from "@/components/seo/JsonLd";
import { productSchema } from "@/lib/seo/jsonLd";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

function toPublicProduct(row: ProductRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    brandColor: row.brand_color ?? "#0EA5A0",
    category: row.category,
    categoryColor: row.category_color ?? "teal",
    description: row.description,
    features: Array.isArray(row.features)
      ? row.features.map((f) => String(f ?? "")).filter(Boolean)
      : [],
    specs: Array.isArray(row.specs)
      ? row.specs.map((s) => ({ label: String(s?.label ?? ""), value: String(s?.value ?? "") }))
      : [],
    imageUrl: row.image_url ?? undefined,
    brochureUrl: row.brochure_url ?? undefined,
    model3dUrl: row.model_3d_url ?? undefined,
    fulfillmentType: row.fulfillment_type ?? "ready_stock",
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getProductBySlug(slug);
  if (!row) return {};
  return {
    title: row.seo_title || `${row.name} — ${row.brand} | PT Autentik Karya Analitika`,
    description: row.seo_description || row.description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const row = await getProductBySlug(slug);
  if (!row) notFound();

  const product = toPublicProduct(row);
  const waNumber = await getWhatsAppNumber();

  let documents: Array<{
    id: string;
    title: string;
    file_type: string;
    file_url: string;
    file_size_kb: number | null;
    requires_lead: boolean;
  }> = [];

  try {
    const { cookies } = await import("next/headers");
    const { createClient } = await import("@/utils/supabase/server");
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: docs } = await supabase
      .from("technical_documents")
      .select("id, title, file_type, file_url, file_size_kb, requires_lead")
      .eq("product_id", row.id)
      .order("created_at", { ascending: true });
    documents = docs ?? [];
  } catch {
    documents = [];
  }

  return (
    <>
      <JsonLd data={productSchema(row)} />
      {/* Breadcrumb */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <Link href="/" className="hover:text-[#0EA5A0] transition-colors">
              Home
            </Link>
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            <Link
              href="/products"
              className="hover:text-[#0EA5A0] transition-colors"
            >
              Katalog Produk
            </Link>
            <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
            <Link
              href={`/products?brand=${product.brand}`}
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
            {/* Left — Media (Photo / 3D tabs) */}
            <ProductMediaTabs
              name={product.name}
              brand={product.brand}
              imageUrl={product.imageUrl}
              model3dUrl={product.model3dUrl}
            />

            {/* Right — Details */}
            <div>
              {/* Back link */}
              <Link
                href={`/products?brand=${product.brand}`}
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
              <div className="space-y-3">
                {/* Row 1: WhatsApp + Contact Sales (2-column grid) */}
                <div className="grid grid-cols-2 gap-3">
                  {product.fulfillmentType !== "third_party" && (
                    <WhatsAppButton
                      number={waNumber}
                      label="Tanya via WhatsApp"
                      message="Halo, saya ingin menanyakan ketersediaan produk"
                      variant="button"
                      className="h-11 rounded-xl text-sm font-medium"
                      id="whatsapp-cta"
                    />
                  )}
                  <Link
                    href="/contact"
                    id="contact-sales-cta"
                    className="inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-colors"
                  >
                    <Phone size={16} />
                    Hubungi Sales
                  </Link>
                </div>

                {/* Row 2: RFQ (full-width, highlight) */}
                <RfqButton
                  productId={row.id}
                  productName={product.name}
                />

                {/* Row 3: Brosur (if available) */}
                {product.brochureUrl && (
                  <a
                    href={`${product.brochureUrl}?download=`}
                    id="brochure-download-cta"
                    className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-colors"
                  >
                    <FileText size={16} />
                    Unduh Brosur/Katalog (PDF)
                    <Download size={14} className="opacity-60" />
                  </a>
                )}

                {/* Row 4: Sparepart (full-width, dark) */}
                <Link
                  href={`/store?compatible=${product.slug}`}
                  id="sparepart-cta"
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"
                >
                  <Wrench size={16} />
                  Tanya Sparepart untuk Produk Ini
                </Link>

                {/* Fallback CTA (if fulfillment is third_party, show ProductFulfillmentCta separately) */}
                {product.fulfillmentType === "third_party" && (
                  <ProductFulfillmentCta
                    fulfillmentType={product.fulfillmentType}
                    name={product.name}
                    slug={product.slug}
                    waNumber={waNumber}
                    variant="detail"
                  />
                )}
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
                    {product.specs.map((spec) => (
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

      {/* Technical Documents */}
      <TechnicalDocsSection documents={documents} />
    </>
  );
}