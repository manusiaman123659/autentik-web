"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Minus, Plus, Check } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import type { CartItemInput } from "@/components/cart/CartProvider";

interface AddToCartButtonProps {
  product: CartItemInput;
  variant?: "detail" | "card";
}

const FEEDBACK_MS = 1600;

export default function AddToCartButton({
  product,
  variant = "detail",
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
        className={`w-[46px] flex-shrink-0 flex items-center justify-center rounded-xl border transition-all shadow-sm ${
          canAdd
            ? "text-[#0EA5A0] border-[#0EA5A0]/40 hover:bg-[#0EA5A0] hover:text-white hover:shadow-md"
            : "text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed"
        }`}
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        {added ? <Check size={18} /> : <ShoppingCart size={18} />}
      </button>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="inline-flex items-center rounded-lg border" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
        <button
          type="button"
          onClick={() => clampQty(qty - 1)}
          disabled={qty <= 1 || !canAdd}
          aria-label="Kurangi jumlah"
          className="w-11 h-11 flex items-center justify-center disabled:opacity-40 transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          <Minus size={16} />
        </button>
        <span
          className="w-12 text-center text-sm font-bold tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {qty}
        </span>
        <button
          type="button"
          onClick={() => clampQty(qty + 1)}
          disabled={qty >= stock || !canAdd}
          aria-label="Tambah jumlah"
          className="w-11 h-11 flex items-center justify-center disabled:opacity-40 transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          <Plus size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        title={!canAdd ? (stock === 0 ? "Stok habis" : "Harga: hubungi kami") : undefined}
        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {added ? <Check size={18} /> : <ShoppingCart size={18} />}
        {!canAdd
          ? stock === 0
            ? "Stok Habis"
            : "Harga Hubungi Kami"
          : added
            ? "Ditambahkan"
            : "Tambah ke Keranjang"}
      </button>
    </div>
  );
}
