"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShoppingBag, ChevronRight, Loader2, ArrowLeft, Package } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatRupiah } from "@/lib/format";
import EmptyState from "@/components/ui/EmptyState";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/validations/storeSchema";

type OrderRow = {
  id: string;
  order_code: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  order_items: { product_name: string; quantity: number }[];
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Belum Bayar",
  paid: "Lunas",
  failed: "Gagal",
  refunded: "Refund",
};

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    shipped: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    refunded: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
}

export default function OrderHistoryList() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_code, status, payment_status, total, created_at, order_items(product_name, quantity)")
        .order("created_at", { ascending: false });

      if (active && !error) {
        setOrders(data ?? []);
      }
      if (active) setLoading(false);
    };
    fetchOrders();
    return () => { active = false; };
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="mx-auto animate-spin text-[#0EA5A0]" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Memuat riwayat pesanan...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <Link
            href="/store"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0EA5A0] hover:underline mb-3"
          >
            <ArrowLeft size={13} />
            Kembali ke Marketplace Komponen
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: "#0B1F3A" }}>
              <ShoppingBag size={16} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                Riwayat Pesanan
              </h1>
               <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {orders.length > 0
                  ? `${orders.length} pesanan ditemukan`
                  : "Daftar pesanan yang telah Anda buat"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada pesanan"
            description="Mulai berbelanja komponen original bergaransi resmi untuk unit Anda."
            action={
            <Link
              href="/store"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-sm text-sm font-bold text-white bg-[#0EA5A0] hover:bg-[#0D9E98] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500"
            >
              Jelajahi Marketplace Komponen
              <ChevronRight size={14} />
            </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const itemCount = order.order_items?.reduce((sum, i) => sum + (i.quantity ?? 0), 0) ?? 0;
              const firstItem = order.order_items?.[0]?.product_name ?? "";
              const statusLabel = ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status;
              const paymentLabel = PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status;
              const needsPaymentFollowUp = order.status === "cancelled" && order.payment_status === "paid";

              return (
                <Link
                  key={order.id}
                  href={`/store/orders/${order.order_code}`}
                  className="block rounded-sm border p-3 transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold tabular-nums break-all" style={{ color: "var(--text-primary)" }}>
                          {order.order_code}
                        </span>
                        <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${statusBadge(order.status)}`}>
                          {statusLabel}
                        </span>
                        <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${statusBadge(order.payment_status)}`}>
                          {paymentLabel}
                        </span>
                      </div>
                      <p className="text-sm mt-2 break-words" style={{ color: "var(--text-secondary)" }}>
                        {firstItem}{itemCount > 1 ? ` +${itemCount - 1} lainnya` : ""}
                      </p>
                      {needsPaymentFollowUp && (
                        <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
                          <AlertTriangle size={11} />
                          Perlu tindak lanjut pembayaran
                        </p>
                      )}
                      <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        {new Date(order.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
                        {formatRupiah(order.total)}
                      </p>
                      <ChevronRight size={14} className="ml-auto mt-1 opacity-30" style={{ color: "var(--text-secondary)" }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
