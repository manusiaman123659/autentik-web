import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Wrench,
  Download,
  FileText,
} from "lucide-react";
import { getPublicProductBySlug, getWhatsAppContact } from "@/lib/public-data";
import type { ProductRow } from "@/lib/public-data";
import AnimatedElement from "@/components/ui/ScrollAnimations";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import ProductMediaTabs from "@/components/product/ProductMediaTabs";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import TechnicalDocsSection from "@/components/product/TechnicalDocsSection";
import RfqButton from "@/components/product/RfqButton";
import JsonLd from "@/components/seo/JsonLd";
import { productSchema } from "@/lib/seo/jsonLd";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  isPublicTechnicalDocumentProduct,
  toPublicTechnicalDocument,
  type PublicTechnicalDocument,
} from "@/lib/public-technical-document";

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
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]).filter(Boolean) : [],
    brochureUrl: row.brochure_url ?? undefined,
    model3dUrl: row.model_3d_url ?? undefined,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublicProductBySlug(slug);
  if (!row) notFound();
  return {
    title: row.seo_title || `${row.name} — ${row.brand} | PT Autentik Karya Analitika`,
    description: row.seo_description || row.description,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const row = await getPublicProductBySlug(slug);
  if (!row) notFound();

  const product = toPublicProduct(row);
  const mikaContact = await getWhatsAppContact("mika_product_sales");

  let documents: PublicTechnicalDocument[] = [];

  let hotspots: Array<{
    id: string;
    position_x: number;
    position_y: number;
    position_z: number;
    title: string;
    description: string | null;
  }> = [];

  let photoHotspots: Array<{
    id: string;
    target_image_url: string;
    position_x: number;
    position_y: number;
    title: string;
    description: string | null;
    callout_image_url: string;
  }> = [];

  try {
    const { cookies } = await import("next/headers");
    const { createClient } = await import("@/utils/supabase/server");
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    if (isPublicTechnicalDocumentProduct(row)) {
      const { data: docs, error: docsError } = await createAdminClient()
        .from("technical_documents")
        .select("id, title, file_type, file_url, storage_path, file_size_kb, requires_lead")
        .eq("product_id", row.id)
        .order("created_at", { ascending: true });
      if (!docsError) {
        documents = (docs ?? [])
          .map(toPublicTechnicalDocument)
          .filter((doc): doc is PublicTechnicalDocument => doc !== null);
      }
    }

    const { data: hotspotRows } = await supabase
      .from("product_hotspots")
      .select("id, position_x, position_y, position_z, title, description")
      .eq("product_id", row.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order");
    hotspots = hotspotRows ?? [];

    const { data: photoHotspotRows } = await supabase
      .from("product_photo_hotspots")
      .select("id, target_image_url, position_x, position_y, title, description, callout_image_url")
      .eq("product_id", row.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order");
    photoHotspots = photoHotspotRows ?? [];
  } catch {
    documents = [];
    hotspots = [];
    photoHotspots = [];
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
              gallery={product.gallery}
              model3dUrl={product.model3dUrl}
              hotspots={hotspots}
              photoHotspots={photoHotspots}
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
                {/* Row 1: Sales dan distribusi melalui MIKA */}
                <WhatsAppButton
                  number={mikaContact?.number ?? null}
                  label="Hubungi Sales / Distributor"
                  message={`Halo Admin MIKA, saya ingin berkonsultasi mengenai pembelian atau distribusi produk ${product.name}.`}
                  variant="button"
                  className="w-full h-11 rounded-xl text-sm font-medium"
                  id="whatsapp-cta"
                />

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

                {/* Row 4: Komponen marketplace (full-width, dark) */}
                <Link
                  href={`/store?compatible=${product.slug}`}
                  id="sparepart-cta"
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"
                >
                  <Wrench size={16} />
                  Cari Komponen untuk Produk Ini
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
