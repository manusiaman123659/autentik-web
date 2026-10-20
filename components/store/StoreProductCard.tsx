"use client";

import Link from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import StoreMediaPlaceholder from "./StoreMediaPlaceholder";
import type { StoreSearchItem } from "@/lib/store-search-types";
import { formatRupiah } from "@/lib/format";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductFulfillmentCta from "@/components/requests/ProductFulfillmentCta";
import WishlistButton from "@/components/store/WishlistButton";

interface StoreProductCardProps {
  product: StoreSearchItem;
  mikaSalesNumber: string | null;
}

export default function StoreProductCard({ product: { canonical: product, display }, mikaSalesNumber }: StoreProductCardProps) {
  const t = useTranslations("products.storeUi");
  const stock = product.stock ?? 0;
  const low = product.low_stock_threshold ?? 5;
  const fulfillment = product.fulfillment_type ?? "ready_stock";
  const isReady = fulfillment === "ready_stock";
  const hasDiscount = product.compare_at_price != null && product.compare_at_price > (product.price ?? 0);
  const discountPct = hasDiscount ? Math.round(((product.compare_at_price! - (product.price ?? 0)) / product.compare_at_price!) * 100) : 0;

  return (
    <div
      data-store-card
      className="min-w-0 rounded border hover:border-teal-600 transition-colors flex flex-col overflow-hidden group"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] border-b border-base">
      <Link href={`/store/${product.slug}`} aria-label={display.name} className="absolute inset-0 block focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal-600" style={{ backgroundColor: "var(--bg-secondary)" }}>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={display.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, (max-width: 1279px) 35vw, (max-width: 1440px) 25vw, 320px"
          />
        ) : (
          <StoreMediaPlaceholder brand={product.brand} />
        )}

        {/* Discount badge — top left */}
        {hasDiscount && (
          <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-sm">
            -{discountPct}%
          </span>
        )}

        {/* Stock badge — top right */}
        <div className="absolute top-1.5 right-1.5 z-10">
          {!isReady ? (
            <span className="px-2 py-1 text-xs font-semibold rounded-sm bg-teal-700 text-white">
              {fulfillment === "custom_request" ? "Custom" : "3rd Party"}
            </span>
          ) : stock === 0 ? (
            <span className="px-2 py-1 text-xs font-semibold rounded-sm bg-red-700 text-white">
              {t("out")}
            </span>
          ) : stock <= low ? (
            <span className="px-2 py-1 text-xs font-semibold rounded-sm bg-amber-800 text-white">
              {t("remaining", { stock })}
            </span>
          ) : null}
        </div>

      </Link>
        {/* Kept outside the media link for valid keyboard semantics. */}
        <WishlistButton
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            image_url: product.image_url ?? null,
            price: product.price ?? null,
          }}
          variant="card"
        />
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 min-h-0">
        {/* Category */}
        <p className="text-xs font-medium text-body mb-2 break-words">
          {product.category}
        </p>

        {/* Title */}
        <Link href={`/store/${product.slug}`}>
          <h3
            className="text-base font-semibold line-clamp-3 leading-snug hover:text-teal-700 transition-colors min-h-[4rem] break-words"
            style={{ color: "var(--text-primary)" }}
          >
            {display.name}
          </h3>
        </Link>

        {/* Brand */}
        <p className="text-xs text-body mt-2 break-words">{product.brand}</p>

        {/* Price */}
        <div className="mt-auto pt-4">
          {product.price != null ? (
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {hasDiscount && (
                <span className="text-xs text-body line-through leading-none">
                  {formatRupiah(product.compare_at_price!)}
                </span>
              )}
              <span className="text-red-700 dark:text-red-400 font-bold text-lg tabular-nums leading-snug break-words">
                {formatRupiah(product.price)}{product.unit ? ` / ${product.unit}` : ""}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-body">{t("contactPrice")}</span>
          )}
        </div>

        {/* Stock label */}
        {isReady && stock > 0 && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-2">
            {t(stock <= low ? "low" : "ready")}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        {isReady ? (
          product.has_active_variants ? (
            <Link
              href={`/store/${product.slug}`}
              className="min-h-11 w-full flex-shrink-0 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded border border-teal-700 text-teal-800 dark:text-teal-200 hover:bg-teal-700/10 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            >
              {t("chooseVariant")}
            </Link>
          ) : (
            <AddToCartButton product={product} variant="card" />
          )
        ) : (
          <ProductFulfillmentCta
            fulfillmentType={fulfillment}
            name={product.name}
            slug={product.slug}
            waNumber={mikaSalesNumber}
            variant="card"
          />
        )}
      </div>
    </div>
  );
}
