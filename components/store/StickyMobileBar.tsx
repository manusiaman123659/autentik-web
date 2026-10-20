"use client";
import { getPublicRoute, localizeHref } from "@/i18n/locales";

import { ShoppingCart, MessageCircle, Share2, Check } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { ProductRow } from "@/lib/admin-data";
import type { StoreVariant } from "@/components/store/StoreProductDetail";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import WishlistButton from "@/components/store/WishlistButton";
import { useTranslations } from "next-intl";
import { minimumPurchase, purchaseQuantity } from "@/lib/product-attributes";

interface StickyMobileBarProps {
  product: ProductRow;
  displayName: string;
  clearanceTarget?: RefObject<HTMLDivElement | null>;
  onAddToCart: () => void;
  onBuyNow: () => void;
  waNumber: string | null;
  effectivePrice: number | null;
  effectiveStock: number;
  selectedVariant: StoreVariant | null;
  hasVariants: boolean;
}

export default function StickyMobileBar({
  product,
  displayName,
  clearanceTarget,
  onAddToCart,
  onBuyNow,
  waNumber,
  effectivePrice,
  effectiveStock,
  selectedVariant,
  hasVariants,
}: StickyMobileBarProps) {
  const [added, setAdded] = useState(false);
  const t = useTranslations("products.attributes");
  const ui = useTranslations("products.storeUi");
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = barRef.current;
    if (!element) return;
    const target = clearanceTarget?.current;
    const measure = () => target?.style.setProperty("--store-bar-clearance", `${element.getBoundingClientRect().height + 24}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => { observer.disconnect(); target?.style.removeProperty("--store-bar-clearance"); };
  }, [clearanceTarget]);
  const minimum = minimumPurchase(product.min_purchase_qty);
  const unit = product.unit ? ` ${product.unit}` : "";
  const [shareCopied, setShareCopied] = useState(false);

  const stock = effectiveStock;
  const fulfillmentType = product.fulfillment_type ?? "ready_stock";
  const isReady = fulfillmentType === "ready_stock";
  const canAdd = isReady && purchaseQuantity(minimum, stock, minimum) !== null && effectivePrice != null && (!hasVariants || selectedVariant != null);
  const waMessage = isReady
    ? `Halo PPIC AKA, saya ingin menanyakan ketersediaan komponen ${product.name}`
    : fulfillmentType === "custom_request"
      ? `Halo Admin MIKA, saya ingin berkonsultasi mengenai kebutuhan custom untuk ${product.name}`
      : `Halo Admin MIKA, saya membutuhkan bantuan terkait sparepart atau pengadaan ${product.name}`;

  const handleCart = useCallback(() => {
    if (!canAdd) return;
    onAddToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }, [canAdd, onAddToCart]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${localizeHref(`/store/${product.slug}`, getPublicRoute(window.location.pathname)?.locale ?? "id")}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} — Autentik`, url });
        return;
      } catch {
        // User cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Silent fail
    }
  }, [product.slug, displayName]);

  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`
    : null;

  return (
    <div
      ref={barRef} data-store-purchase-bar
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t pb-[env(safe-area-inset-bottom)]"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-color)",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        {/* Price */}
        <div className="w-full min-w-0">
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{stock < minimum && isReady
            ? t("insufficient", { quantity: minimum, unit }) : t("minimumContext", { quantity: minimum, unit })}</p>
          {effectivePrice != null ? (
            <span className="text-base font-bold text-red-700 dark:text-red-400 break-words">
              {formatRupiah(effectivePrice)}{product.unit ? ` / ${product.unit}` : ""}
            </span>
          ) : (
            <span className="text-sm font-medium text-body">{ui("contactPrice")}</span>
          )}
        </div>

        {/* Cart CTA — dominant */}
        <button
          type="button"
          onClick={isReady ? handleCart : onBuyNow}
          disabled={isReady ? !canAdd : !waHref}
          className="flex-1 min-w-0 h-11 rounded-sm font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
          style={{
            backgroundColor: isReady ? "#0f766e" : "#15803d",
            color: "#fff",
          }}
        >
          {isReady ? (
            added ? (
               <><Check size={14} /> {t("added")}</>
            ) : (
               <><ShoppingCart size={14} /> {t("cart")}</>
            )
          ) : (
             ui("buy")
          )}
        </button>

        {/* WhatsApp icon */}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ui("consult")}
            className="flex-shrink-0 w-11 h-11 rounded border border-teal-700 text-teal-800 dark:text-teal-200 flex items-center justify-center focus-visible:outline-2"
          >
            <MessageCircle size={16} />
          </a>
        )}

        {/* Share icon */}
        <button
          type="button"
          onClick={handleShare}
          title={shareCopied ? ui("copied") : ui("share")}
          aria-label={shareCopied ? ui("copied") : ui("share")}
          className="flex-shrink-0 w-11 h-11 rounded flex items-center justify-center focus-visible:outline-2"
          style={{
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          {shareCopied ? <Check size={16} /> : <Share2 size={16} />}
        </button>

        {/* Wishlist icon */}
        <WishlistButton
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            image_url: product.image_url ?? null,
            price: product.price ?? null,
          }}
          variant="bar"
        />
      </div>
    </div>
  );
}
