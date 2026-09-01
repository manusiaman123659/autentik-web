"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Minus, Plus, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import type { CartItemInput } from "@/components/cart/CartProvider";

interface AddToCartButtonProps {
  product: CartItemInput;
  variant?: "detail" | "card";
  onBuyNow?: (qty: number) => void;
}

const FEEDBACK_MS = 1600;

export default function AddToCartButton({
  product,
  variant = "detail",
  onBuyNow,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stock = Math.max(0, product.stock ?? 0);
  const isReadyStock = (product.fulfillmentType ?? "ready_stock") === "ready_stock";
  const canAdd = isReadyStock && stock > 0 && product.price != null;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAdd = () => {
    if (!canAdd) return;
    addItem(product, qty);
    setAdded(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAdded(false), FEEDBACK_MS);
  };

  const clampQty = (next: number) =>
    setQty(Math.max(1, Math.min(stock, next)));

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        aria-label={canAdd ? `Tambah ${product.name} ke keranjang` : "Stok habis"}
        title={!canAdd ? (stock === 0 ? "Stok habis" : "Harga hubungi kami") : undefined}
        className={`w-full flex-shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium transition-colors rounded-sm ${
          canAdd
            ? added
              ? "bg-[#0EA5A0] text-white"
              : "bg-[#0EA5A0] hover:bg-[#0EA5A0]/90 text-white"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
        }`}
      >
        {added ? <Check size={14} /> : <ShoppingCart size={14} />}
        {added ? "Ditambahkan" : "Keranjang"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Quantity row */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => clampQty(qty - 1)}
            disabled={qty <= 1 || !canAdd}
            aria-label="Kurangi jumlah"
            className="w-7 h-7 flex items-center justify-center disabled:opacity-40 transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Minus size={12} />
          </button>
          <span className="w-8 text-center text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => clampQty(qty + 1)}
            disabled={qty >= stock || !canAdd}
            aria-label="Tambah jumlah"
            className="w-7 h-7 flex items-center justify-center disabled:opacity-40 transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Plus size={12} />
          </button>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Sisa {stock} pcs
        </span>
      </div>

      {/* CTA buttons — stacked vertical */}
      <div className="space-y-1.5">
        {onBuyNow && (
          <button
            type="button"
            onClick={() => onBuyNow(qty)}
            disabled={!canAdd}
            className="w-full py-2 rounded-sm font-semibold text-xs bg-[#0EA5A0] hover:bg-[#0EA5A0]/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
          >
            Beli Langsung
          </button>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          title={!canAdd ? (stock === 0 ? "Stok habis" : "Harga: hubungi kami") : undefined}
          className="w-full py-2 rounded-sm font-semibold text-xs border border-[#0EA5A0] text-[#0EA5A0] hover:bg-[#0EA5A0]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
        >
          {added ? <Check size={13} /> : <ShoppingCart size={13} />}
          {!canAdd
            ? stock === 0
              ? "Stok Habis"
              : "Hubungi Kami"
            : added
              ? "Ditambahkan"
              : "+ Keranjang"}
        </button>
      </div>
    </div>
  );
}
