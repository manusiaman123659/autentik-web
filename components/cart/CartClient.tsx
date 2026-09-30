"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ChevronRight,
  ArrowLeft,
  Package,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { formatRupiah } from "@/lib/format";
import EmptyState from "@/components/ui/EmptyState";

function QtyStepper({
  itemKey,
  quantity,
  stock,
}: {
  itemKey: string;
  quantity: number;
  stock: number;
}) {
  const { updateQty } = useCart();
  return (
    <div className="inline-flex items-center rounded-lg border" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
      <button
        type="button"
        onClick={() => updateQty(itemKey, quantity - 1)}
        disabled={quantity <= 1}
        aria-label="Kurangi jumlah"
        className="w-9 h-9 flex items-center justify-center disabled:opacity-40 transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        <Minus size={14} />
      </button>
      <span className="w-10 text-center text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => updateQty(itemKey, quantity + 1)}
        disabled={quantity >= stock}
        aria-label="Tambah jumlah"
        className="w-9 h-9 flex items-center justify-center disabled:opacity-40 transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function CartClient() {
  const { items, hydrated, totalItems, subtotal, removeItem, clearCart } = useCart();

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#0EA5A0] border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Memuat keranjang...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: "#0B1F3A" }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                Keranjang Belanja
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {totalItems > 0
                  ? `${totalItems} item dalam keranjang Anda`
                  : "Belanja komponen original untuk unit Anda"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Keranjang Anda kosong"
            description="Temukan komponen original bergaransi resmi untuk unit Talpha, Cylab, Ullun, dan Epal."
            action={
            <Link
              href="/store"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
            >
              Jelajahi Marketplace Komponen
              <ChevronRight size={16} />
            </Link>
            }
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Daftar item */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Link
                  href="/store"
                  className="inline-flex items-center gap-1.5 text-sm hover:text-[#14B8A6] transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <ArrowLeft size={14} />
                  Lanjut Belanja
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                >
                  Bersihkan Keranjang
                </button>
              </div>

              {items.map((item) => (
                <div
                  key={item.key}
                  className="rounded-2xl border shadow-sm p-4 sm:p-5 flex gap-4"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center overflow-hidden border flex-shrink-0" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        width={96}
                        height={96}
                        className="object-contain w-full h-full p-2"
                      />
                    ) : (
                      <Package size={32} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/store/${item.slug}`}
                          className="text-sm sm:text-base font-bold hover:text-[#0EA5A0] transition-colors line-clamp-2"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.name}
                        </Link>
                        <p className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>
                          {item.brand}
                        </p>
                        {item.variant_label ? (
                          <p className="text-xs font-semibold text-[#0EA5A0] mt-0.5">
                            Varian: {item.variant_label}
                          </p>
                        ) : null}
                        <p className="text-sm font-semibold mt-1.5" style={{ color: "var(--text-primary)" }}>
                          {formatRupiah(item.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        aria-label={`Hapus ${item.name} dari keranjang`}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <QtyStepper itemKey={item.key} quantity={item.quantity} stock={item.stock} />
                      <p className="text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>
                        {formatRupiah(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ringkasan */}
            <div className="lg:sticky lg:top-20 rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>
                Ringkasan Pesanan
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                  <span>Subtotal ({totalItems} item)</span>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                  <span>Ongkos kirim</span>
                  <span className="text-xs font-light">Dihitung saat checkout</span>
                </div>
              </div>
              <div className="border-t mt-5 pt-5 flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Total</span>
                <span className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>
                  {formatRupiah(subtotal)}
                </span>
              </div>

              <Link
                href="/store/checkout"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
              >
                Checkout
                <ChevronRight size={16} />
              </Link>
              <p className="text-[11px] text-slate-400 text-center mt-2 font-light">
                Pembayaran aman via Midtrans.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
