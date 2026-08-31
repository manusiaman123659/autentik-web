"use client";

import Link from "next/link";
import Image from "next/image";
import { Package, ChevronRight } from "lucide-react";
import type { ProductRow } from "@/lib/admin-data";
import { formatRupiah } from "@/lib/format";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductFulfillmentCta from "@/components/requests/ProductFulfillmentCta";

interface StoreProductCardProps {
  product: ProductRow;
  waNumber: string | null;
}

export default function StoreProductCard({ product, waNumber }: StoreProductCardProps) {
  const stock = product.stock ?? 0;
  const low = product.low_stock_threshold ?? 5;
  const fulfillment = product.fulfillment_type ?? "ready_stock";
  const isReady = fulfillment === "ready_stock";
  const hasDiscount = product.compare_at_price != null && product.compare_at_price > (product.price ?? 0);

  function stockBadge() {
    if (!isReady) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0EA5A0]/15 text-[#0EA5A0]">
          {fulfillment === "custom_request" ? "Custom" : "3rd Party"}
        </span>
      );
    }
    if (stock === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500">
          Habis
        </span>
      );
    }
    if (stock <= low) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
          Stok Terbatas
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        Ready Stock
      </span>
    );
  }

  return (
    <div
      className="rounded-xl border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-250 flex flex-col overflow-hidden group"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
    >
      {/* Image */}
      <Link href={`/store/${product.slug}`} className="block relative aspect-square border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package size={40} className="text-slate-400" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md text-white shadow-sm" style={{ backgroundColor: "#0B1F3A" }}>
            {product.brand}
          </span>
          {hasDiscount && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-500 text-white shadow-sm">
              DISKON
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 z-10">{stockBadge()}</div>
      </Link>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0EA5A0] mb-1">{product.category}</p>
        <Link href={`/store/${product.slug}`}>
          <h3
            className="text-sm font-bold group-hover:text-[#0EA5A0] transition-colors line-clamp-2 leading-snug mb-1.5 min-h-[2.5rem]"
            style={{ color: "var(--text-primary)" }}
          >
            {product.name}
          </h3>
        </Link>
        {product.sku && (
          <p className="text-[10px] font-mono text-slate-400 mb-2">SKU: {product.sku}</p>
        )}

        {/* Price */}
        <div className="mt-auto">
          {product.price != null ? (
            <div className="flex items-baseline gap-2 flex-wrap">
              {hasDiscount && (
                <span className="text-xs line-through text-slate-400">{formatRupiah(product.compare_at_price!)}</span>
              )}
              <span className="text-base font-extrabold text-[#0EA5A0]">{formatRupiah(product.price)}</span>
            </div>
          ) : (
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Harga: hubungi kami</span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4 flex gap-2">
        <Link
          href={`/store/${product.slug}`}
          className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold text-center text-white bg-[#0B1F3A] hover:bg-[#132d52] transition-all flex items-center justify-center gap-1"
        >
          Detail
          <ChevronRight size={13} />
        </Link>
        {isReady ? (
          <AddToCartButton product={product} variant="card" />
        ) : (
          <ProductFulfillmentCta
            fulfillmentType={fulfillment}
            name={product.name}
            slug={product.slug}
            waNumber={waNumber}
            variant="card"
          />
        )}
      </div>
    </div>
  );
}
