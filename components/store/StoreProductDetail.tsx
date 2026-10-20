"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link, { useRouter } from "@/i18n/navigation";
import { ChevronRight, CheckCircle2, Check } from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import type { ResolvedProductContent } from "@/lib/product-translation-types";
import type { PublicLocale } from "@/i18n/locales";
import type { ResolvedStoreProduct } from "@/lib/public-store-presentation";
import { formatRupiah } from "@/lib/format";
import { createClient } from "@/utils/supabase/client";
import { useCart } from "@/components/cart/CartProvider";
import { setDirectBuyItem, type DirectBuyItem } from "@/lib/direct-buy";
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
import ProductAttributes from "@/components/product/ProductAttributes";
import { minimumPurchase, purchaseQuantity, toProductAttributes } from "@/lib/product-attributes";

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
  display: ResolvedProductContent;
  locale: PublicLocale;
  ppicAkaNumber: string | null;
  mikaSalesNumber: string | null;
  relatedProducts?: ResolvedStoreProduct[];
  variants?: StoreVariant[];
}

export default function StoreProductDetail({ product, display, locale, ppicAkaNumber,
  mikaSalesNumber, relatedProducts = [], variants = [] }: StoreProductDetailProps) {
  const t = useTranslations("products.storeUi");
  const router = useRouter();
  const supabase = createClient();
  const { addItem } = useCart();
  const { add: recordView } = useRecentlyViewed();
  const productVariants = variants;
  const hasVariants = productVariants.length > 0;
  const minimum = minimumPurchase(product.min_purchase_qty);
  const [selectedVariant, setSelectedVariant] = useState<StoreVariant | null>(() => {
    if (productVariants.length === 0) return null;
    const available = productVariants.filter((v) => v.stock >= minimum);
    return available[0] ?? productVariants[0];
  });
  const effectivePrice = selectedVariant?.price_override ?? product.price ?? null;
  const effectiveStock = selectedVariant?.stock ?? product.stock ?? 0;
  useEffect(() => {
    recordView({ id: product.id, slug: product.slug, name: product.name, brand: product.brand,
      image_url: product.image_url ?? null, price: product.price ?? null });
  }, [product.id, product.slug, product.name, product.brand, product.image_url, product.price, recordView]);
  const low = product.low_stock_threshold ?? 5;
  const fulfillmentType = product.fulfillment_type ?? "ready_stock";
  const isReady = fulfillmentType === "ready_stock";
  const hasDiscount = selectedVariant == null && product.compare_at_price != null && product.compare_at_price > (product.price ?? 0);
  const discountPct = hasDiscount ? Math.round(((product.compare_at_price! - (product.price ?? 0)) / product.compare_at_price!) * 100) : 0;
  const specs = display.specs;
  const features = display.features;
  const pageRef = useRef<HTMLDivElement>(null);

  async function handleBuyNow(qty: number) {
    if (!isReady || effectivePrice == null || (hasVariants && !selectedVariant)
      || purchaseQuantity(qty, effectiveStock, minimum) !== qty) return;
    const directItem: DirectBuyItem = {
      key: `${product.id}::${selectedVariant?.id ?? "default"}`, id: product.id,
      variant_id: selectedVariant?.id ?? null, variant_label: selectedVariant?.label ?? null,
      slug: product.slug, name: product.name, brand: product.brand,
      image_url: product.image_url ?? null, price: effectivePrice ?? 0, stock: effectiveStock ?? 0,
      quantity: qty, min_purchase_qty: minimum, unit: product.unit ?? null,
    };
    setDirectBuyItem(directItem);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?redirect=${encodeURIComponent("/store/checkout?mode=direct")}`); return; }
    router.push("/store/checkout?mode=direct");
  }

  return <div ref={pageRef} data-store-detail className="min-h-screen pb-[var(--store-bar-clearance,160px)] lg:pb-0 bg-page">
    <div className="container-custom py-4">
      <nav aria-label={t("breadcrumbs")} className="flex min-w-0 items-center flex-wrap gap-2 text-xs text-body">
        <Link href="/" className="min-h-11 inline-flex items-center focus-visible:outline-2">{t("home")}</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <Link href="/store" className="min-h-11 inline-flex items-center focus-visible:outline-2">{t("heading")}</Link>
      </nav>
      <header className="mb-6 border-b border-base pb-5">
        <p className="text-sm text-body mb-2 break-words">{product.brand} <span aria-hidden="true" className="mx-2">/</span> {product.category}</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 max-w-4xl break-words text-2xl sm:text-3xl font-bold leading-snug tracking-tight text-heading">{display.name}</h1>
          <WishlistButton product={{ id: product.id, slug: product.slug, name: product.name, brand: product.brand,
            image_url: product.image_url ?? null, price: product.price ?? null }} variant="detail" />
        </div>
        <p className="mt-3 text-xs font-mono text-body break-all">SKU: {product.sku || "—"}</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 lg:gap-8 items-start">
        <div className="min-w-0">
          <ProductImageGallery imageUrl={product.image_url ?? null} gallery={Array.isArray(product.gallery) ? product.gallery : []}
            brand={product.brand} name={display.name} badges={hasDiscount ? <span className="absolute top-3 right-3 rounded-sm bg-red-700 text-white px-2 py-1 text-xs font-semibold">-{discountPct}%</span> : undefined} />
          <div className="mt-5 hidden md:flex flex-wrap items-center gap-3 text-body [&_button]:min-h-11 [&_button]:focus-visible:outline-2">
            <CopyLinkButton slug={product.slug} /><ShareProductButton slug={product.slug} name={display.name} />
          </div>
        </div>
        <section data-purchase-panel aria-label={t("price")} className="min-w-0 rounded border border-base bg-card-base p-4 sm:p-6 space-y-5 lg:sticky lg:top-20">
          <div>
            {hasDiscount && <p className="text-sm line-through text-body mb-1">{formatRupiah(product.compare_at_price!)}</p>}
            {effectivePrice != null ? <p className="flex flex-wrap items-baseline gap-x-2 text-red-700 dark:text-red-400">
              <span data-effective-price className="text-2xl sm:text-3xl font-bold tabular-nums break-words">{formatRupiah(effectivePrice)}</span>
              {product.unit && <span className="text-base text-body">/ {product.unit}</span>}
            </p> : <p className="text-lg font-semibold text-heading">{t("contactPrice")}</p>}
            {isReady && <p data-effective-stock className={`mt-3 text-sm font-medium ${effectiveStock === 0 ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"}`}>
              {effectiveStock === 0 ? t("out") : effectiveStock <= low ? t("remaining", { stock: effectiveStock }) : t("ready")}
            </p>}
          </div>
          {hasVariants && <fieldset className="border-t border-base pt-4">
            <legend className="text-sm font-semibold text-heading pr-3">{t("chooseVariant")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {productVariants.map(v => {
                const isSelected = selectedVariant?.id === v.id;
                return <button key={v.id} type="button" onClick={() => setSelectedVariant(v)} aria-pressed={isSelected} disabled={v.stock === 0}
                  className={`min-h-11 max-w-full inline-flex flex-wrap items-center gap-2 rounded border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 ${isSelected ? "border-teal-700 bg-teal-700/10 text-teal-800 dark:text-teal-200 font-semibold" : "border-base text-heading"}`}>
                  {isSelected && <Check size={16} aria-hidden="true" />}<span className="break-words">{v.label}</span>
                  {v.price_override != null && v.price_override !== product.price && <span className="text-xs">({formatRupiah(v.price_override)})</span>}
                  {v.stock === 0 && <span className="text-xs">({t("out")})</span>}
                </button>;
              })}
            </div>
          </fieldset>}
          <div className="border-t border-base pt-4">
            {isReady ? <AddToCartButton product={product} variant="detail" onBuyNow={isReady ? handleBuyNow : undefined}
              selectedVariant={selectedVariant} hasVariants={hasVariants} /> : <ProductFulfillmentCta fulfillmentType={fulfillmentType}
              name={product.name} slug={product.slug} waNumber={mikaSalesNumber} variant="detail" />}
          </div>
          {isReady && <WhatsAppButton number={ppicAkaNumber} label={t("consult")}
            message={`Halo PPIC AKA, saya ingin menanyakan ketersediaan komponen ${product.name}`} variant="link"
            className="min-h-11 w-full flex items-center justify-center rounded border border-base px-3 py-2 text-sm text-body focus-visible:outline-2" />}
          <p className="text-xs text-body border-t border-base pt-4">{t("original")} · {t("warranty")}</p>
        </section>
      </div>
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="min-w-0 border-t border-base pt-6">
          <h2 className="text-lg font-semibold text-heading mb-4">{t("description")}</h2>
          <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line break-words text-body">{display.description}</p>
          {features.length > 0 && <div className="mt-6"><h3 className="text-sm font-semibold text-heading mb-3">{t("features")}</h3>
            <ul className="space-y-3">{features.map((feature, i) => <li key={i} className="flex items-start gap-2 text-sm text-body">
              <CheckCircle2 size={16} aria-hidden="true" className="shrink-0 mt-0.5 text-teal-700 dark:text-teal-300" /><span className="min-w-0 break-words">{feature}</span>
            </li>)}</ul></div>}
        </section>
        <section className="min-w-0 border-t border-base pt-6">
          <h2 className="text-lg font-semibold text-heading mb-4">{t("specs")}</h2>
          {specs.length > 0 && <dl className="rounded border border-base overflow-hidden text-sm">
            {specs.map((spec, i) => <div key={i} className="grid grid-cols-1 min-[390px]:grid-cols-[minmax(100px,2fr)_minmax(0,3fr)] gap-1 min-[390px]:gap-4 px-4 py-3 border-b last:border-b-0 border-base odd:bg-page-alt">
              <dt className="font-medium text-heading break-words">{spec.label}</dt><dd className="text-body break-words whitespace-pre-wrap">{spec.value}</dd>
            </div>)}
          </dl>}
          <div className="mt-5 [--text-muted:var(--text-secondary)]"><ProductAttributes attributes={toProductAttributes(product)} /></div>
        </section>
      </div>
      {relatedProducts.length > 0 && <RelatedProducts products={relatedProducts} mikaSalesNumber={mikaSalesNumber} />}
      <RecentlyViewed locale={locale} />
    </div>
    <StickyMobileBar product={product} displayName={display.name} clearanceTarget={pageRef}
      onAddToCart={() => addItem({ ...product, price: effectivePrice, stock: effectiveStock,
        variant_id: selectedVariant?.id ?? null, variant_label: selectedVariant?.label ?? null }, minimum)}
      onBuyNow={() => { if (isReady) void handleBuyNow(minimum);
        else if (mikaSalesNumber) window.open(`https://wa.me/${mikaSalesNumber}?text=${encodeURIComponent(`Halo Admin MIKA, saya ingin berkonsultasi mengenai ${product.name}`)}`, "_blank", "noopener,noreferrer"); }}
      waNumber={isReady ? ppicAkaNumber : mikaSalesNumber} effectivePrice={effectivePrice} effectiveStock={effectiveStock}
      selectedVariant={selectedVariant} hasVariants={hasVariants} />
  </div>;
}
