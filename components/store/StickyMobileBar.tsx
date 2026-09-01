"use client";

import { ShoppingCart, MessageCircle, Share2, Check } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { ProductRow } from "@/lib/admin-data";
import { useCallback, useState } from "react";
import WishlistButton from "@/components/store/WishlistButton";

interface StickyMobileBarProps {
  product: ProductRow;
  onAddToCart: () => void;
  onBuyNow: () => void;
  waNumber: string | null;
}

export default function StickyMobileBar({
  product,
  onAddToCart,
  onBuyNow,
  waNumber,
}: StickyMobileBarProps) {
  const [added, setAdded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const stock = product.stock ?? 0;
  const fulfillmentType = product.fulfillment_type ?? "ready_stock";
  const isReady = fulfillmentType === "ready_stock";
  const canAdd = isReady && stock > 0 && product.price != null;

  const handleCart = useCallback(() => {
    if (!canAdd) return;
    onAddToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }, [canAdd, onAddToCart]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/store/${product.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${product.name} — Autentik`, url });
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
  }, [product.slug, product.name]);

  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo, saya ingin menanyakan ketersediaan sparepart ${product.name}`)}`
    : null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-subtle)",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Price */}
        <div className="flex-shrink-0 min-w-0">
          {product.price != null ? (
            <span className="text-sm font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
              {formatRupiah(product.price)}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">Harga: hubungi</span>
          )}
        </div>

        {/* Cart CTA — dominant */}
        <button
          type="button"
          onClick={isReady ? handleCart : onBuyNow}
          disabled={!isReady && !waHref}
          className="flex-1 h-10 rounded-sm font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isReady ? "#0EA5A0" : "#25D366",
            color: "#fff",
          }}
        >
          {isReady ? (
            added ? (
              <><Check size={14} /> Ditambahkan</>
            ) : (
              <><ShoppingCart size={14} /> Keranjang</>
            )
          ) : (
            "Beli Sekarang"
          )}
        </button>

        {/* WhatsApp icon */}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-10 h-10 rounded-sm flex items-center justify-center transition-colors"
            style={{
              border: "1px solid #25D36640",
              color: "#25D366",
              backgroundColor: "transparent",
            }}
          >
            <MessageCircle size={16} />
          </a>
        )}

        {/* Share icon */}
        <button
          type="button"
          onClick={handleShare}
          title={shareCopied ? "Tersalin!" : "Bagikan"}
          className="flex-shrink-0 w-10 h-10 rounded-sm flex items-center justify-center transition-colors"
          style={{
            border: "1px solid var(--border-subtle)",
            color: shareCopied ? "#0EA5A0" : "var(--text-muted)",
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
