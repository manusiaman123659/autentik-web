"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Badge, Card, statusTone, formatRupiah } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/validations/storeSchema";
import { createClient } from "@/utils/supabase/client";

interface Props {
  orderId: string;
  orderCode: string;
  initialPaymentStatus: string;
  initialOrderStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  paidAt: string | null;
  midtransRedirectUrl: string | null;
}

export default function AdminOrderDetailClient({
  orderId,
  initialPaymentStatus,
  initialOrderStatus,
  paymentMethod,
  subtotal,
  shippingCost,
  total,
  paidAt,
  midtransRedirectUrl,
}: Props) {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus);
  const [livePaidAt, setLivePaidAt] = useState(paidAt);

  useEffect(() => {
    if (!orderId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`order_admin_${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const data = payload.new as {
            payment_status?: string;
            status?: string;
            paid_at?: string | null;
          };
          if (data.payment_status) setPaymentStatus(data.payment_status);
          if (data.status) setOrderStatus(data.status);
          if (data.paid_at !== undefined) setLivePaidAt(data.paid_at);
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  return (
    <Card>
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ringkasan Pembayaran</h2>
      </div>
      <div className="p-5 space-y-3 text-sm">
        {paymentStatus === "paid" && orderStatus === "cancelled" && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed">
              Pembayaran diterima untuk pesanan yang telah dibatalkan. Perlu penanganan pembayaran atau refund secara manual.
            </p>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Metode</span>
          <span className="font-medium text-slate-900 dark:text-white uppercase">{paymentMethod ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Status Pembayaran</span>
          <Badge tone={statusTone(paymentStatus)}>{paymentStatus}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Status Pesanan</span>
          <Badge tone={statusTone(orderStatus)}>{ORDER_STATUS_LABELS[orderStatus as OrderStatus] ?? orderStatus}</Badge>
        </div>
        <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
          <span className="font-medium">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 dark:text-slate-400">Ongkir</span>
          <span className="font-medium">{formatRupiah(shippingCost)}</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="font-bold text-slate-900 dark:text-white">Total</span>
          <span className="font-bold text-[#0EA5A0]">{formatRupiah(total)}</span>
        </div>
        {livePaidAt && (
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Dibayar pada</span>
            <span className="font-medium text-slate-900 dark:text-white text-xs">{new Date(livePaidAt).toLocaleString("id-ID")}</span>
          </div>
        )}
        {midtransRedirectUrl && (
          <div className="pt-2">
            <a
              href={midtransRedirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[#0EA5A0] hover:underline"
            >
              Lihat Halaman Pembayaran →
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
