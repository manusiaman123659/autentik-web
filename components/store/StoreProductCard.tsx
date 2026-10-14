"use client";

import Link from "@/i18n/navigation";
import Image from "next/image";
import { Package } from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import { formatRupiah } from "@/lib/format";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductFulfillmentCta from "@/components/requests/ProductFulfillmentCta";
import WishlistButton from "@/components/store/WishlistButton";

interface StoreProductCardProps {
  product: ProductRow;
  mikaSalesNumber: string | null;
}

export default function StoreProductCard({ product, mikaSalesNumber }: StoreProductCardProps) {
  const stock = product.stock ?? 0;
  const low = product.low_stock_threshold ?? 5;
  const fulfillment = product.fulfillment_type ?? "ready_stock";
  const isReady = fulfillment === "ready_stock";
  const hasDiscount = product.compare_at_price != null && product.compare_at_price > (product.price ?? 0);
  const discountPct = hasDiscount ? Math.round(((product.compare_at_price! - (product.price ?? 0)) / product.compare_at_price!) * 100) : 0;

  return (
    <div
      className="rounded-sm border hover:border-[#0EA5A0] transition-colors flex flex-col overflow-hidden group"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      {/* Image */}
      <Link href={`/store/${product.slug}`} className="block relative aspect-square border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, (max-width: 1279px) 35vw, (max-width: 1440px) 25vw, 320px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={28} className="text-slate-400" />
          </div>
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
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-[#0EA5A0] text-white">
              {fulfillment === "custom_request" ? "Custom" : "3rd Party"}
            </span>
          ) : stock === 0 ? (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-red-500 text-white">
              Habis
            </span>
          ) : stock <= low ? (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-amber-500 text-white">
              Sisa {stock}
            </span>
          ) : null}
        </div>

        {/* Wishlist button — bottom right */}
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
      </Link>

      {/* Info */}
      <div className="p-2.5 flex flex-col flex-1 min-h-0">
        {/* Category */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0EA5A0] mb-0.5 truncate">
          {product.category}
        </p>

        {/* Title */}
        <Link href={`/store/${product.slug}`}>
          <h3
            className="text-sm font-medium line-clamp-2 leading-relaxed hover:text-[#0EA5A0] transition-colors min-h-[2.5rem] break-words"
            style={{ color: "var(--text-primary)" }}
          >
            {product.name}
          </h3>
        </Link>

        {/* Brand */}
        <p className="text-sm text-body mt-1 break-words">{product.brand}</p>

        {/* Price */}
        <div className="mt-auto pt-1.5">
          {product.price != null ? (
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {hasDiscount && (
                <span className="text-[11px] text-slate-400 line-through leading-none">
                  {formatRupiah(product.compare_at_price!)}
                </span>
              )}
              <span className="text-red-600 dark:text-red-400 font-bold text-sm md:text-base leading-tight">
                {formatRupiah(product.price)}{product.unit ? ` / ${product.unit}` : ""}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-body">Harga: hubungi kami</span>
          )}
        </div>

        {/* Stock label */}
        {isReady && stock > 0 && (
          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            {stock <= low ? "Stok Terbatas" : "Ready Stock"}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-2.5 pb-2.5">
        {isReady ? (
          product.has_active_variants ? (
            <Link
              href={`/store/${product.slug}`}
              className="w-full flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm font-semibold transition-colors rounded-sm border border-[#0EA5A0] text-teal-600 dark:text-teal-300 hover:bg-[#0EA5A0]/10 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
            >
              Pilih Varian
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
