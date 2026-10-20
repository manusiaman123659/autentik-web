"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Minus, Plus, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import type { CartItemInput } from "@/components/cart/CartProvider";
import { useTranslations } from "next-intl";
import { minimumPurchase, purchaseQuantity } from "@/lib/product-attributes";

interface AddToCartButtonProps {
  product: CartItemInput;
  variant?: "detail" | "card";
  onBuyNow?: (qty: number) => void;
  selectedVariant?: {
    id: string;
    label: string;
    price_override: number | null;
    stock: number;
  } | null;
  hasVariants?: boolean;
}

const FEEDBACK_MS = 1600;

export default function AddToCartButton({
  product,
  variant = "detail",
  onBuyNow,
  selectedVariant = null,
  hasVariants = false,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const t = useTranslations("products.attributes");
  const ui = useTranslations("products.storeUi");
  const minimum = minimumPurchase(product.min_purchase_qty);
  const [requestedQty, setQty] = useState(() => minimum);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectivePrice = selectedVariant?.price_override ?? product.price;
  const effectiveStock = selectedVariant?.stock ?? product.stock;
  const stock = Math.max(0, effectiveStock ?? 0);
  const qty = purchaseQuantity(requestedQty, stock, minimum) ?? minimum;
  const isReadyStock = (product.fulfillmentType ?? "ready_stock") === "ready_stock";
  const canAdd = isReadyStock && stock >= minimum && effectivePrice != null && Number.isFinite(effectivePrice)
    && purchaseQuantity(requestedQty, stock, minimum) !== null
    && (!(hasVariants || product.has_active_variants) || selectedVariant != null);
  const unit = product.unit ? ` ${product.unit}` : "";
  const minimumMessage = t("minimumContext", { quantity: minimum, unit });
  const unavailableMessage = stock < minimum ? t("insufficient", { quantity: minimum, unit }) : ui("contactPrice");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAdd = () => {
    if (!canAdd) return;
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
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), FEEDBACK_MS);
  };

  const clampQty = (next: number) =>
    setQty(purchaseQuantity(next, stock, minimum) ?? minimum);

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        aria-label={`${product.name}: ${canAdd ? minimumMessage : unavailableMessage}`}
        title={canAdd ? minimumMessage : unavailableMessage}
        className={`min-h-11 w-full flex-shrink-0 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded focus-visible:outline-2 focus-visible:outline-offset-2 ${
          canAdd
            ? added
              ? "bg-teal-700 text-white"
              : "bg-teal-700 hover:bg-teal-800 text-white"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
        }`}
      >
        {added ? <Check size={14} /> : <ShoppingCart size={14} />}
        {added ? t("added") : `${t("cart")}${minimum > 1 ? ` (${minimum}${unit})` : ""}`}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{minimumMessage}</p>
      {stock < minimum && <p role="status" className="text-xs text-red-600">{unavailableMessage}</p>}
      {/* Quantity row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="inline-flex items-center rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => clampQty(qty - 1)}
            disabled={qty <= minimum || !canAdd}
            aria-label={t("decrease")}
            className="w-11 h-11 flex items-center justify-center disabled:opacity-40 text-slate-700 dark:text-slate-200 focus-visible:outline-2"
          >
            <Minus size={12} />
          </button>
          <span className="w-8 text-center text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => clampQty(qty + 1)}
            disabled={qty >= Math.min(stock, 999) || !canAdd}
            aria-label={t("increase")}
            className="w-11 h-11 flex items-center justify-center disabled:opacity-40 text-slate-700 dark:text-slate-200 focus-visible:outline-2"
          >
            <Plus size={12} />
          </button>
        </div>
        <span className="text-xs text-body font-medium">
          {t("remaining", { stock, unit })}
        </span>
      </div>

      {/* CTA buttons — stacked vertical */}
      <div className="space-y-1.5">
        {onBuyNow && (
          <button
            type="button"
            onClick={() => onBuyNow(qty)}
            disabled={!canAdd}
            className="min-h-12 w-full py-3 rounded font-semibold text-sm bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-center gap-2"
          >
            {t("buy")}
          </button>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          title={!canAdd ? unavailableMessage : minimumMessage}
          className="min-h-12 w-full py-3 rounded font-semibold text-sm border border-teal-700 text-teal-800 dark:text-teal-200 hover:bg-teal-700/10 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-center gap-2"
        >
          {added ? <Check size={13} /> : <ShoppingCart size={13} />}
          {!canAdd
            ? stock === 0
              ? ui("out")
              : ui("consult")
            : added
               ? t("added")
               : `+ ${t("cart")}`}
        </button>
      </div>
    </div>
  );
}
