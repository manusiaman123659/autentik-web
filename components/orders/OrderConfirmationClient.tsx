"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Package,
  ChevronRight,
  Search,
  Printer,
  CreditCard,
  XCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { orderSnapshotKey, type OrderSnapshot } from "@/lib/order-snapshot";
import { formatRupiah } from "@/lib/format";
import { regenerateMidtransPayment } from "@/lib/actions/checkout";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import OptimizedImage from "@/components/ui/OptimizedImage";
import PrintCustomerInvoice from "./PrintCustomerInvoice";

type DbOrderItem = {
  product_name: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  product_id: string | null;
};

type DbOrder = {
  order_code: string;
  customer_name: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  paid_at: string | null;
  midtrans_redirect_url: string | null;
  midtrans_order_id: string | null;
  created_at: string;
  order_items: DbOrderItem[];
};

function readSnapshot(code: string): OrderSnapshot | null {
  try {
    const raw = sessionStorage.getItem(orderSnapshotKey(code));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const s = parsed as OrderSnapshot;
    if (typeof s.code !== "string" || !Array.isArray(s.items)) return null;
    return s;
  } catch {
    return null;
  }
}

function buildSnapshotFromDb(db: DbOrder): OrderSnapshot {
  return {
    code: db.order_code,
    createdAt: db.created_at,
    status: db.status,
    paymentStatus: db.payment_status ?? "pending",
    items: db.order_items.map((it, idx) => ({
      id: it.product_id ?? `item-${idx}`,
      slug: "",
      name: it.product_name,
      brand: "",
      image_url: null,
      price: Number(it.unit_price),
      quantity: it.quantity,
    })),
    subtotal: Number(db.subtotal),
    shippingCost: Number(db.shipping_cost),
    total: Number(db.total),
  };
}

function isPaidStatus(status: string | null | undefined): boolean {
  return status === "paid" || status === "completed" || status === "shipped" || status === "success";
}

export default function OrderConfirmationClient({
  code,
  waNumber,
  bankAccount,
  dbOrder,
  statusParam,
}: {
  code: string;
  waNumber: string | null;
  bankAccount: { bankName: string; accountNumber: string; accountHolder: string } | null;
  dbOrder: DbOrder | null;
  statusParam: string | null;
}) {
  const [snapshot, setSnapshot] = useState<OrderSnapshot | null>(null);
  const [mounted, setMounted] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [localInvoiceUrl, setLocalInvoiceUrl] = useState<string | null>(null);
  const [livePaymentStatus, setLivePaymentStatus] = useState<string | null>(null);
  const [livePaidAt, setLivePaidAt] = useState<string | null>(null);

  const effectiveInvoiceUrl = localInvoiceUrl ?? dbOrder?.midtrans_redirect_url ?? null;

  useEffect(() => {
    const fromStorage = readSnapshot(code);
    // Prefer sessionStorage if present; otherwise use DB data
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(fromStorage ?? (dbOrder ? buildSnapshotFromDb(dbOrder) : null));
    setMounted(true);
  }, [code, dbOrder]);

  // Real-time SSE listener — polls order status every 2s
  useEffect(() => {
    if (!code) return;
    const es = new EventSource(`/api/orders/${code}/status`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as {
          payment_status?: string;
          status?: string;
          paid_at?: string | null;
        };
        if (data.payment_status) {
          setLivePaymentStatus(data.payment_status);
          setSnapshot((prev) =>
            prev ? { ...prev, paymentStatus: data.payment_status! } : prev,
          );
        }
        if (data.paid_at) setLivePaidAt(data.paid_at);
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = () => {
      // Biarkan EventSource auto-reconnect — jangan close di sini
    };
    return () => es.close();
  }, [code]);

  const handleRegenerateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      const result = await regenerateMidtransPayment(code);
      if (result.success && result.redirectUrl) {
        setLocalInvoiceUrl(result.redirectUrl);
        window.location.href = result.redirectUrl;
      } else {
        alert(result.message || "Gagal membuat invoice. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("[REGENERATE_INVOICE_CLIENT]", err);
      alert("Terjadi kesalahan saat membuat link pembayaran. Silakan coba lagi atau hubungi admin.");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const effectivePaymentStatus = livePaymentStatus ?? dbOrder?.payment_status;
  const isPaid = isPaidStatus(statusParam) || isPaidStatus(effectivePaymentStatus);
  const isFailed = statusParam === "failed" || effectivePaymentStatus === "failed";

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#0EA5A0] border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="text-center py-16 px-6 rounded-2xl border shadow-sm max-w-md w-full" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <Search size={40} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Detail pesanan tidak ditemukan
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">
            Pesanan dengan kode <span className="font-mono font-semibold">{code}</span> belum dapat ditemukan.
            Jika ini pesanan Anda, silakan hubungi tim kami.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/store"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
            >
              Kembali ke Store
              <ChevronRight size={16} />
            </Link>
            <WhatsAppButton
              number={waNumber}
              label="Hubungi Kami"
              variant="button"
              className="px-6 py-3 rounded-xl text-sm"
            />
          </div>
        </div>
      </div>
    );
  }

  const paymentBadge = isPaid
    ? { label: "Pembayaran Berhasil", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" }
    : isFailed
      ? { label: "Pembayaran Gagal", className: "bg-red-500/15 text-red-600 dark:text-red-400" }
      : { label: "Menunggu Pembayaran", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };

  return (
    <>
    <PrintCustomerInvoice snapshot={snapshot} bankAccount={bankAccount} />
    <div className="min-h-screen print:hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${isPaid ? "bg-emerald-500/15" : isFailed ? "bg-red-500/15" : "bg-emerald-500/15"}`}>
            {isFailed ? (
              <XCircle size={32} className="text-red-500" />
            ) : (
              <CheckCircle2 size={32} className={isPaid ? "text-emerald-500" : "text-emerald-500"} />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {isPaid ? "Pembayaran Berhasil" : isFailed ? "Pembayaran Gagal" : "Pesanan Berhasil Dibuat"}
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            {isPaid
              ? "Pembayaran Anda telah terkonfirmasi. Pesanan akan segera diproses."
              : isFailed
                ? "Pembayaran tidak berhasil. Anda dapat mencoba membayar kembali."
                : "Terima kasih, pesanan Anda telah kami terima dan akan segera diproses."}
          </p>
          <div className="inline-flex items-center gap-3 mt-5 px-5 py-2.5 rounded-xl border shadow-sm" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Kode Pesanan
            </span>
            <span className="font-mono font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              {snapshot.code}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${paymentBadge.className}`}>
              {paymentBadge.label}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-colors"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              <Printer size={14} />
              Cetak Bukti Pesanan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Daftar item */}
        <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <h2 className="text-base font-bold mb-5" style={{ color: "var(--text-primary)" }}>Detail Pesanan</h2>
          <div className="space-y-4">
            {snapshot.items.map((item, idx) => (
              <div key={item.id ?? idx} className="flex gap-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border flex-shrink-0" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
                  {item.image_url ? (
                    <OptimizedImage src={item.image_url} alt={item.name} width={64} height={64} className="object-contain w-full h-full p-1.5" />
                  ) : (
                    <Package size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold line-clamp-2" style={{ color: "var(--text-primary)" }}>
                    {item.name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {item.quantity} × {formatRupiah(item.price)}
                  </p>
                </div>
                <p className="text-sm font-semibold flex-shrink-0 tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {formatRupiah(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t mt-5 pt-5 space-y-2.5 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Subtotal</span>
              <span className="tabular-nums">{formatRupiah(snapshot.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Ongkos kirim</span>
              {snapshot.shippingCost !== undefined ? (
                <span className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {snapshot.shippingCost > 0 ? formatRupiah(snapshot.shippingCost) : "Gratis"}
                </span>
              ) : (
                <span className="text-xs font-light">Dihitung saat konfirmasi</span>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>Total</span>
              <span className="text-lg font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {formatRupiah(snapshot.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment section — conditional based on status */}
        {isPaid ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm p-6 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <h2 className="text-base font-bold text-emerald-700 dark:text-emerald-400">Pembayaran Terkonfirmasi</h2>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Pesanan Anda telah dibayar dan akan segera diproses oleh tim kami.
            </p>
            {(livePaidAt ?? dbOrder?.paid_at) && (
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Dibayar pada: {new Date((livePaidAt ?? dbOrder!.paid_at)!).toLocaleString("id-ID")}
              </p>
            )}
          </div>
        ) : isFailed ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 shadow-sm p-6 bg-red-50/50 dark:bg-red-950/20">
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={18} className="text-red-500" />
              <h2 className="text-base font-bold text-red-700 dark:text-red-400">Pembayaran Gagal</h2>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Pembayaran tidak berhasil. Anda dapat mencoba membayar kembali atau menghubungi tim kami.
            </p>
            {effectiveInvoiceUrl && (
              <a
                href={effectiveInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
              >
                <CreditCard size={16} />
                Bayar Sekarang
              </a>
            )}
          </div>
        ) : (
          /* Pending payment — show Midtrans link or transfer instructions */
          <div className="rounded-2xl border shadow-sm p-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
            <h2 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>Instruksi Pembayaran</h2>
            <p className="text-xs mt-1 mb-5" style={{ color: "var(--text-secondary)" }}>
              Selesaikan pembayaran menggunakan salah satu metode di bawah.
            </p>

            {effectiveInvoiceUrl ? (
              <a
                href={effectiveInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 bg-[#0EA5A0] hover:bg-[#0D9E98] active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition-all text-sm sm:text-base leading-snug"
              >
                <CreditCard className="h-5 w-5 shrink-0" />
                <span className="text-center">Bayar via Payment Gateway (QRIS, VA, CC)</span>
                <ExternalLink className="h-4 w-4 shrink-0 opacity-80" />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleRegenerateInvoice}
                disabled={generatingInvoice}
                className="w-full flex items-center justify-center gap-2.5 bg-[#0EA5A0] hover:bg-[#0D9E98] active:scale-[0.99] text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition-all text-sm sm:text-base leading-snug disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generatingInvoice ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                    <span>Membuat Link Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 shrink-0" />
                    <span className="text-center">Bayar via Payment Gateway (QRIS, VA, CC)</span>
                    <ExternalLink className="h-4 w-4 shrink-0 opacity-80" />
                  </>
                )}
              </button>
            )}

            {bankAccount && (
              <details className="mt-4">
                <summary
                  className="text-xs font-semibold cursor-pointer select-none"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Atau transfer manual ke rekening bank
                </summary>
                <div className="mt-3 rounded-xl border p-4 space-y-1.5 text-sm" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Bank</span>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{bankAccount.bankName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Atas Nama</span>
                    <span className="font-semibold text-right" style={{ color: "var(--text-primary)" }}>{bankAccount.accountHolder}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>No. Rekening</span>
                    <span className="font-mono font-bold" style={{ color: "var(--text-primary)" }}>{bankAccount.accountNumber}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-light">
                  Sertakan kode pesanan <span className="font-mono font-semibold">{snapshot.code}</span> sebagai referensi.
                </p>
              </details>
            )}

            <div className="border-t mt-4 pt-4" style={{ borderColor: "var(--border-subtle)" }}>
              <WhatsAppButton
                number={waNumber}
                label="Hubungi Admin via WhatsApp"
                message={`Halo Admin PT Autentik Karya Analitika, saya ingin konfirmasi pesanan dengan nomor order ${snapshot.code} atas nama ${dbOrder?.customer_name ?? "-"}.`}
                variant="button"
                className="w-full px-6 py-3 rounded-xl text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex justify-center pb-8">
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-all shadow-md"
          >
            Lanjut Belanja
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
