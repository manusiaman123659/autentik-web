"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/utils/supabase/client";
import { useCart } from "@/components/cart/CartProvider";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductFulfillmentCta from "@/components/requests/ProductFulfillmentCta";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import ProductImageGallery from "@/components/store/ProductImageGallery";
import RelatedProducts from "@/components/store/RelatedProducts";
import RecentlyViewed from "@/components/store/RecentlyViewed";
import ShareProductButton from "@/components/store/ShareProductButton";
import CopyLinkButton from "@/components/store/CopyLinkButton";
import StickyMobileBar from "@/components/store/StickyMobileBar";
import WishlistButton from "@/components/store/WishlistButton";
import { useRecentlyViewed } from "@/components/store/useRecentlyViewed";

type Tab = "description" | "specs";

export interface StoreVariant {
  id: string;
  label: string;
  sku: string | null;
  price_override: number | null;
  stock: number;
  variant_group: string | null;
}

interface StoreProductDetailProps {
  product: ProductRow;
  ppicAkaNumber: string | null;
  mikaSalesNumber: string | null;
  relatedProducts?: ProductRow[];
  variants?: StoreVariant[];
}

export default function StoreProductDetail({
  product,
  ppicAkaNumber,
  mikaSalesNumber,
  relatedProducts = [],
  variants = [],
}: StoreProductDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const router = useRouter();
  const supabase = createClient();
  const { addItem } = useCart();
  const { add: recordView } = useRecentlyViewed();

  const productVariants = variants;
  const hasVariants = productVariants.length > 0;

  const [selectedVariant, setSelectedVariant] = useState<StoreVariant | null>(() => {
    if (productVariants.length === 0) return null;
    const available = productVariants.filter((v) => v.stock > 0);
    return available[0] ?? productVariants[0];
  });

  const effectivePrice = selectedVariant?.price_override ?? product.price ?? null;
  const effectiveStock = selectedVariant?.stock ?? product.stock ?? 0;

  useEffect(() => {
    recordView({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image_url: product.image_url ?? null,
      price: product.price ?? null,
    });
  }, [product.id, product.slug, product.name, product.brand, product.image_url, product.price, recordView]);

  const stock = product.stock ?? 0;
  const low = product.low_stock_threshold ?? 5;
  const outOfStock = stock === 0;
  const lowStock = !outOfStock && stock <= low;

  const fulfillmentType = product.fulfillment_type ?? "ready_stock";
  const isReady = fulfillmentType === "ready_stock";

  const hasDiscount = selectedVariant == null &&
    product.compare_at_price != null &&
    product.compare_at_price > (product.price ?? 0);
  const discountPct = hasDiscount
    ? Math.round(((product.compare_at_price! - (product.price ?? 0)) / product.compare_at_price!) * 100)
    : 0;

  const specs: { label: string; value: string }[] = product.specs ?? [];
  const features: string[] = (product.features ?? []).map(String);

  async function handleBuyNow(qty: number) {
    addItem(
      {
        ...product,
        price: effectivePrice,
        stock: effectiveStock,
        variant_id: selectedVariant?.id ?? null,
        variant_label: selectedVariant?.label ?? null,
      },
      qty
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent("/store/checkout")}`);
      return;
    }
    router.push("/store/checkout");
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Breadcrumb */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
          <nav className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <Link href="/" className="hover:text-[#0EA5A0] transition-colors">Home</Link>
            <ChevronRight size={10} />
            <Link href="/store" className="hover:text-[#0EA5A0] transition-colors">Marketplace Komponen</Link>
            <ChevronRight size={10} />
            <span className="font-medium truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}>
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start">

          {/* Left: Image + Info + Tabs */}
          <div className="space-y-4 min-w-0">
            {/* Image Gallery */}
            <ProductImageGallery
              imageUrl={product.image_url ?? null}
              gallery={Array.isArray(product.gallery) ? product.gallery : []}
              brand={product.brand}
              name={product.name}
              badges={
                <>
                  {/* Stock badge */}
                  <div className="absolute top-2 right-2 z-10">
                    {!isReady ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-[#0EA5A0] text-white">
                        {fulfillmentType === "custom_request" ? "Custom" : "3rd Party"}
                      </span>
                    ) : outOfStock ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-red-500 text-white">Habis</span>
                    ) : lowStock ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-amber-500 text-white">
                        Sisa {stock}
                      </span>
                    ) : null}
                  </div>
                  {/* Discount badge */}
                  {hasDiscount && (
                    <span className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-red-600 text-white">
                      -{discountPct}%
                    </span>
                  )}
                </>
              }
            />

            {/* Info */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0EA5A0] mb-1">
                {product.category}
              </p>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h1 className="text-lg md:text-xl font-bold leading-snug flex-1" style={{ color: "var(--text-primary)" }}>
                  {product.name}
                </h1>
                <WishlistButton
                  product={{
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    brand: product.brand,
                    image_url: product.image_url ?? null,
                    price: product.price ?? null,
                  }}
                  variant="detail"
                />
              </div>
              <p className="text-[11px] font-mono text-slate-400 mb-2">SKU: {product.sku || "—"}</p>

              {/* Price */}
              <div className="flex items-baseline gap-2 flex-wrap mb-3">
                {effectivePrice != null ? (
                  <>
                    {hasDiscount && (
                      <span className="text-xs text-slate-400 line-through">{formatRupiah(product.compare_at_price!)}</span>
                    )}
                    <span className="text-red-600 dark:text-red-400 font-bold text-xl">{formatRupiah(effectivePrice)}</span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-slate-400">Harga: hubungi kami</span>
                )}
              </div>

              {/* Stock label */}
              {isReady && (
                <p className={`text-xs font-semibold mb-3 ${effectiveStock === 0 ? "text-red-500" : effectiveStock <= low ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {effectiveStock === 0 ? "Stok Habis" : effectiveStock <= low ? `Stok Terbatas (${effectiveStock} tersisa)` : "Ready Stock"}
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex gap-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("description")}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                    activeTab === "description"
                      ? "border-[#0EA5A0] text-[#0EA5A0]"
                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                  style={{ color: activeTab === "description" ? undefined : "var(--text-secondary)" }}
                >
                  Deskripsi
                </button>
                {specs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("specs")}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                      activeTab === "specs"
                        ? "border-[#0EA5A0] text-[#0EA5A0]"
                        : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                    style={{ color: activeTab === "specs" ? undefined : "var(--text-secondary)" }}
                  >
                    Spesifikasi
                  </button>
                )}
              </div>

              {/* Tab content */}
              <div className="py-3">
                {activeTab === "description" ? (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {product.description}
                    </p>

                    {/* Features */}
                    {features.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                          Keunggulan
                        </h3>
                        <ul className="space-y-1.5">
                          {features.map((f) => (
                            <li key={f} className="flex items-start gap-1.5">
                              <CheckCircle2 size={12} className="flex-shrink-0 mt-0.5 text-[#0EA5A0]" />
                              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-sm border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
                    <table className="w-full text-xs">
                      <tbody>
                        {specs.map((s, i) => (
                          <tr key={s.label} className={i % 2 === 0 ? "bg-slate-50 dark:bg-slate-900" : ""}>
                            <td className="py-2 px-3 font-semibold w-2/5 border-r" style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}>
                              {s.label}
                            </td>
                            <td className="py-2 px-3" style={{ color: "var(--text-secondary)" }}>{s.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Variant selector — mobile */}
            {hasVariants && (
              <div className="lg:hidden">
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Pilih Varian
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {productVariants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`px-2.5 py-1.5 rounded-sm border text-[10px] font-medium transition-colors ${
                        selectedVariant?.id === v.id
                          ? "border-[#0EA5A0] bg-[#0EA5A0]/10 text-[#0EA5A0]"
                          : v.stock === 0
                            ? "border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50"
                            : "border-[var(--border-subtle)] hover:border-[#0EA5A0]/50"
                      }`}
                      disabled={v.stock === 0}
                      style={selectedVariant?.id !== v.id ? { color: "var(--text-primary)", backgroundColor: "var(--bg-secondary)" } : undefined}
                    >
                      {v.label}
                      {v.stock === 0 && " (Habis)"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Sticky Purchase Box */}
          <div className="lg:sticky lg:top-20 space-y-3">
            {/* Purchase box */}
            <div
              className="rounded-sm border p-4 space-y-3"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
            >
              {/* Mini info */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Merek</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{product.brand}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Kategori</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{product.category}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Berat</span>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {product.weight_grams != null ? `${product.weight_grams}g` : "—"}
                  </span>
                </div>
              </div>

              <div className="border-t" style={{ borderColor: "var(--border-subtle)" }} />

              {/* Price in box */}
              {effectivePrice != null ? (
                <div className="flex items-baseline gap-1.5">
                  {hasDiscount && (
                    <span className="text-[11px] text-slate-400 line-through">{formatRupiah(product.compare_at_price!)}</span>
                  )}
                  <span className="text-red-600 dark:text-red-400 font-bold text-base">{formatRupiah(effectivePrice)}</span>
                </div>
              ) : (
                <p className="text-[11px] font-medium text-slate-400">Harga: hubungi kami</p>
              )}

              {/* Quantity + Add to cart */}
              {isReady ? (
                <AddToCartButton
                  product={product}
                  variant="detail"
                  onBuyNow={isReady ? handleBuyNow : undefined}
                  selectedVariant={selectedVariant}
                  hasVariants={hasVariants}
                />
              ) : (
                <ProductFulfillmentCta
                  fulfillmentType={fulfillmentType}
                  name={product.name}
                  slug={product.slug}
                  waNumber={mikaSalesNumber}
                  variant="detail"
                />
              )}

              {/* WhatsApp */}
              {isReady && (
                <WhatsAppButton
                  number={ppicAkaNumber}
                  label="Tanya via WhatsApp"
                  message={`Halo PPIC AKA, saya ingin menanyakan ketersediaan komponen ${product.name}`}
                  variant="button"
                  className="w-full py-2 text-white font-semibold text-xs rounded-sm flex items-center justify-center gap-1.5 shadow-none transition-opacity hover:opacity-90"
                />
              )}

              {/* Share row — desktop */}
              <div className="hidden lg:flex items-center gap-2 border-t pt-3 mt-3" style={{ borderColor: "var(--border-subtle)" }}>
                <CopyLinkButton slug={product.slug} />
                <ShareProductButton slug={product.slug} name={product.name} />
              </div>

              {/* Trust info — merged into purchase box */}
              <div className="border-t pt-3 mt-3" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Garansi</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Resmi</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Kondisi</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Baru</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Variant selector — desktop */}
            {hasVariants && (
              <div className="hidden lg:block rounded-sm border p-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Pilih Varian
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {productVariants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`px-2.5 py-1.5 rounded-sm border text-[10px] font-medium transition-colors ${
                        selectedVariant?.id === v.id
                          ? "border-[#0EA5A0] bg-[#0EA5A0]/10 text-[#0EA5A0]"
                          : v.stock === 0
                            ? "border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50"
                            : "border-[var(--border-subtle)] hover:border-[#0EA5A0]/50"
                      }`}
                      disabled={v.stock === 0}
                      style={selectedVariant?.id !== v.id ? { color: "var(--text-primary)", backgroundColor: "var(--bg-secondary)" } : undefined}
                    >
                      {v.label}
                      {v.stock === 0 && " (Habis)"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <RelatedProducts products={relatedProducts} mikaSalesNumber={mikaSalesNumber} />
        )}

        {/* Recently Viewed */}
        <RecentlyViewed />

      </div>

      {/* Sticky Mobile Bottom Bar */}
      <StickyMobileBar
        product={product}
        onAddToCart={() => addItem({
          ...product,
          price: effectivePrice,
          stock: effectiveStock,
          variant_id: selectedVariant?.id ?? null,
          variant_label: selectedVariant?.label ?? null,
        })}
        onBuyNow={() => handleBuyNow(1)}
        waNumber={isReady ? ppicAkaNumber : mikaSalesNumber}
        effectivePrice={effectivePrice}
        effectiveStock={effectiveStock}
        selectedVariant={selectedVariant}
        hasVariants={hasVariants}
      />
    </div>
  );
}
