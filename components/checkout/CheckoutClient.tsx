"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShoppingBag, Package, AlertCircle, ChevronRight, ArrowLeft, Lock } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { checkoutFormSchema, type CheckoutFormData } from "@/lib/validations/storeSchema";
import { submitCheckout } from "@/lib/actions/checkout";
import { formatRupiah } from "@/lib/format";
import { orderSnapshotKey, type OrderSnapshot } from "@/lib/order-snapshot";
import { getDirectBuyItem, clearDirectBuyItem, type DirectBuyItem } from "@/lib/direct-buy";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import {
  parseShippingQuote,
  SHIPPING_UNAVAILABLE_MESSAGE,
  type ShippingQuote,
} from "@/lib/shipping";

const supabase = createSupabaseClient();

const inputClass =
  "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors";
const labelClass = "block text-xs font-semibold mb-1.5 uppercase tracking-wide";

export default function CheckoutClient({ waNumber }: { waNumber?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDirectMode = searchParams.get("mode") === "direct";

  const { items: cartItems, hydrated: cartHydrated, subtotal: cartSubtotal, totalItems: cartTotalItems, clearCart } = useCart();
  const [directItem, setDirectItem] = useState<DirectBuyItem | null>(null);
  const [directChecked, setDirectChecked] = useState(false);

  useEffect(() => {
    if (isDirectMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDirectItem(getDirectBuyItem());
      setDirectChecked(true);
    }
  }, [isDirectMode]);

  const hydrated = isDirectMode ? directChecked : cartHydrated;

  const activeItems = useMemo(() => {
    if (isDirectMode) {
      return directItem ? [directItem] : [];
    }
    return cartItems;
  }, [isDirectMode, directItem, cartItems]);

  const subtotal = useMemo(() => {
    if (isDirectMode) {
      return directItem ? directItem.price * directItem.quantity : 0;
    }
    return cartSubtotal;
  }, [isDirectMode, directItem, cartSubtotal]);

  const totalItems = useMemo(() => {
    if (isDirectMode) {
      return directItem ? directItem.quantity : 0;
    }
    return cartTotalItems;
  }, [isDirectMode, directItem, cartTotalItems]);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [quotedRequestKey, setQuotedRequestKey] = useState("");
  const [estimating, setEstimating] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
  });

  const city = useWatch({ control, name: "city" });
  const province = useWatch({ control, name: "province" });
  const quoteRequestKey = useMemo(() => JSON.stringify({
    items: activeItems.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
      variant_id: item.variant_id ?? null,
    })),
    city: city?.trim().toLocaleLowerCase("id-ID") ?? "",
    province: province?.trim().toLocaleLowerCase("id-ID") ?? "",
  }), [activeItems, city, province]);

  useEffect(() => {
    let cancelled = false;
    if (!city?.trim() || !province?.trim() || activeItems.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShippingQuote(null);
      setQuotedRequestKey("");
      setEstimating(false);
      return;
    }
    const requestKey = quoteRequestKey;
    const timer = setTimeout(async () => {
      setEstimating(true);
      const { data, error } = await supabase.rpc("get_shipping_quote", {
        p_items: activeItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          variant_id: item.variant_id ?? null,
        })),
        p_shipping_address: { city, province },
      });
      if (!cancelled) {
        const parsed = error ? null : parseShippingQuote(data);
        setShippingQuote(
          parsed ?? {
            status: "SHIPPING_UNAVAILABLE",
            cost: null,
            totalWeightG: null,
            zoneId: null,
            rateId: null,
            message: SHIPPING_UNAVAILABLE_MESSAGE,
          },
        );
        setQuotedRequestKey(requestKey);
        setEstimating(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, province, activeItems, quoteRequestKey]);

  // Auto-fill dari profil user yang sudah login
  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const meta = user.user_metadata ?? {};
      reset({
        customerName: meta.full_name ?? "",
        customerEmail: user.email ?? "",
        customerPhone: meta.phone ?? "",
      }, { keepDefaultValues: false });
    };
    loadProfile();
    return () => { active = false; };
  }, [reset]);

  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#0EA5A0] border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Memuat checkout...</p>
        </div>
      </div>
    );
  }

  if (activeItems.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center py-16 px-6 rounded-2xl border shadow-sm max-w-md w-full" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <Package size={40} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {isDirectMode ? "Item Beli Langsung Kosong" : "Keranjang Anda kosong"}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-light">
            {isDirectMode
              ? "Sesi beli langsung telah berakhir atau belum ada item yang dipilih."
              : "Tambahkan komponen terlebih dahulu sebelum melanjutkan ke checkout."}
          </p>
          <Link
            href="/store"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
          >
            Jelajahi Marketplace Komponen
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutFormData) => {
    const quoteIsCurrent = quotedRequestKey === quoteRequestKey;
    if (!quoteIsCurrent || shippingQuote?.status !== "QUOTED" || !shippingQuote.cost || shippingQuote.cost <= 0) {
      setServerError(SHIPPING_UNAVAILABLE_MESSAGE);
      return;
    }

    setSubmitting(true);
    setServerError("");
    try {
      const result = await submitCheckout({
        ...data,
        items: activeItems.map((i) => ({ productId: i.id, quantity: i.quantity, variantId: i.variant_id ?? null })),
      });

      if (!result.success && result.recoveryRequired && result.orderCode) {
        if (isDirectMode) {
          clearDirectBuyItem();
        } else {
          clearCart();
        }
        router.replace(`/store/orders/${result.orderCode}`);
        return;
      }

      if (!result.success || !result.orderCode) {
        setServerError(result.message || "Terjadi kesalahan. Silakan coba lagi.");
        return;
      }
      if (
        result.subtotal == null ||
        result.shippingCost == null ||
        result.shippingTotalWeightG == null ||
        !result.shippingZoneId ||
        !result.shippingRateId ||
        result.total == null
      ) {
        setServerError("Data pesanan belum lengkap. Silakan buka riwayat pesanan atau hubungi PPIC AKA.");
        return;
      }

      const snapshot: OrderSnapshot = {
        code: result.orderCode,
        createdAt: new Date().toISOString(),
        status: "pending",
        paymentStatus: "pending",
        items: activeItems.map((i) => ({
          id: i.id,
          slug: i.slug,
          name: i.name,
          brand: i.brand,
          image_url: i.image_url,
          price: i.price,
          quantity: i.quantity,
          variant_label: i.variant_label ?? null,
        })),
        subtotal: result.subtotal,
        shippingCost: result.shippingCost,
        shippingTotalWeightG: result.shippingTotalWeightG,
        shippingZoneId: result.shippingZoneId,
        shippingRateId: result.shippingRateId,
        total: result.total,
      };

      try {
        sessionStorage.setItem(orderSnapshotKey(result.orderCode), JSON.stringify(snapshot));
      } catch {
        // Abaikan jika sessionStorage penuh/blokir; halaman konfirmasi tetap tampil via URL.
      }

      if (isDirectMode) {
        clearDirectBuyItem();
      } else {
        clearCart();
      }

      // If Midtrans returned a redirect URL, redirect to payment page
      if (result.redirectUrl) {
        window.location.replace(result.redirectUrl);
        return;
      }

      router.replace(`/store/orders/${result.orderCode}`);
    } catch {
      setServerError("Terjadi kesalahan saat memproses pesanan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const quoteIsCurrent = quotedRequestKey === quoteRequestKey;
  const validQuote =
    quoteIsCurrent && shippingQuote?.status === "QUOTED" && shippingQuote.cost != null && shippingQuote.cost > 0;
  const quoteUnavailable =
    quoteIsCurrent && shippingQuote != null && shippingQuote.status !== "QUOTED";

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
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Checkout</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Lengkapi data pengiriman untuk menyelesaikan pesanan
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {serverError && (
          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm" style={{ color: "var(--text-primary)" }}>
              <p className="font-semibold">Pesanan belum berhasil dibuat.</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>{serverError}</p>
              <Link
                href={isDirectMode && activeItems[0] ? `/store/${activeItems[0].slug}` : "/store/cart"}
                className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#0EA5A0] hover:underline"
              >
                Kembali ke {isDirectMode ? "Produk" : "Keranjang"} untuk menyesuaikan
                <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Form data pembeli */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>Data Pembeli</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Nama Lengkap</label>
                    <input
                      className={inputClass}
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      placeholder="Nama Anda"
                      {...register("customerName")}
                    />
                    {errors.customerName && <p className="mt-1 text-xs text-red-500">{errors.customerName.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Email</label>
                    <input
                      type="email"
                      className={inputClass}
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      placeholder="nama@email.com (opsional)"
                      {...register("customerEmail")}
                    />
                    {errors.customerEmail && <p className="mt-1 text-xs text-red-500">{errors.customerEmail.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: "var(--text-secondary)" }}>No. HP / WhatsApp</label>
                    <input
                      type="tel"
                      className={inputClass}
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      placeholder="08xxxxxxxxxx (opsional)"
                      {...register("customerPhone")}
                    />
                    {errors.customerPhone && <p className="mt-1 text-xs text-red-500">{errors.customerPhone.message}</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>Alamat Pengiriman</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Alamat Jalan</label>
                    <input
                      className={inputClass}
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan"
                      {...register("address")}
                    />
                    {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Kota/Kabupaten</label>
                    <input
                      className={inputClass}
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      placeholder="Semarang"
                      {...register("city")}
                    />
                    {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Provinsi</label>
                    <input
                      className={inputClass}
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      placeholder="Jawa Tengah"
                      {...register("province")}
                    />
                    {errors.province && <p className="mt-1 text-xs text-red-500">{errors.province.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: "var(--text-secondary)" }}>Kode Pos</label>
                    <input
                      className={inputClass}
                      style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                      placeholder="50272 (opsional)"
                      {...register("postalCode")}
                    />
                    {errors.postalCode && <p className="mt-1 text-xs text-red-500">{errors.postalCode.message}</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>Catatan (opsional)</h2>
                <textarea
                  rows={3}
                  className={`${inputClass} resize-y`}
                  style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
                  placeholder="Catatan tambahan untuk pesanan Anda"
                  {...register("notes")}
                />
                {errors.notes && <p className="mt-1 text-xs text-red-500">{errors.notes.message}</p>}
              </div>
            </div>

            {/* Ringkasan */}
            <div className="lg:sticky lg:top-20 rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
              <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>Ringkasan Pesanan</h2>
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {activeItems.map((item) => (
                  <div key={item.key ?? `${item.id}::${item.variant_id ?? "default"}`} className="flex gap-3">
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden border flex-shrink-0" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} width={56} height={56} className="object-contain w-full h-full p-1" />
                      ) : (
                        <Package size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                      {item.variant_label && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#0EA5A0]/10 text-[#0EA5A0]">
                          Varian: {item.variant_label}
                        </span>
                      )}
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {item.quantity} × {formatRupiah(item.price)}
                      </p>
                    </div>
                    <p className="text-xs font-semibold flex-shrink-0 tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t mt-5 pt-5 space-y-3 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                  <span>Subtotal ({totalItems} item)</span>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
                  <span>Ongkos kirim</span>
                  {estimating ? (
                    <span className="text-xs font-light flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin text-[#0EA5A0]" />
                      Menghitung...
                    </span>
                  ) : validQuote ? (
                    <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {formatRupiah(shippingQuote.cost!)}
                    </span>
                  ) : quoteUnavailable ? (
                    <span className="text-xs font-semibold text-amber-600">Perlu konfirmasi</span>
                  ) : (
                    <span className="text-xs font-light">Isi kota & provinsi untuk estimasi</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: "var(--text-primary)" }}>Total</span>
                  <span className="text-lg font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
                    {validQuote ? formatRupiah(subtotal + shippingQuote.cost!) : "Belum tersedia"}
                  </span>
                </div>
              </div>

              {quoteUnavailable && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                  <p className="text-xs font-semibold text-amber-900">{SHIPPING_UNAVAILABLE_MESSAGE}</p>
                  <div className="mt-2">
                    <WhatsAppButton
                      number={waNumber ?? null}
                      label="Hubungi PPIC AKA"
                      message={`Halo PPIC AKA, saya perlu konfirmasi ongkir Marketplace Komponen untuk ${city ?? ""}, ${province ?? ""}.`}
                      variant="link"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || estimating || !validQuote}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] shadow-lg shadow-[#0EA5A0]/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {submitting ? "Memproses Pesanan & Invoice..." : "Bayar Sekarang"}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2 font-light">
                Pembayaran aman via Midtrans.
              </p>
              <div className="mt-4">
                <WhatsAppButton
                  number={waNumber ?? null}
                  label="Butuh bantuan? Hubungi PPIC AKA"
                  message="Halo PPIC AKA, saya membutuhkan bantuan terkait checkout Marketplace Komponen."
                  variant="button"
                  className="w-full py-3 rounded-xl text-sm border"
                />
              </div>
              <Link
                href={isDirectMode && activeItems[0] ? `/store/${activeItems[0].slug}` : "/store/cart"}
                className="inline-flex items-center gap-1.5 text-xs mt-3 hover:text-[#14B8A6] transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <ArrowLeft size={13} />
                {isDirectMode ? "Kembali ke Produk" : "Kembali ke Keranjang"}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
