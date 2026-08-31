"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, statusTone, formatRupiah } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/validations/storeSchema";

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
  orderCode,
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
    if (!orderCode || paymentStatus === "paid") return;

    const es = new EventSource(`/api/orders/${orderCode}/status`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.payment_status && data.payment_status !== paymentStatus) {
          setPaymentStatus(data.payment_status);
          if (data.status) setOrderStatus(data.status);
          if (data.paid_at) setLivePaidAt(data.paid_at);
          router.refresh();
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
    };
  }, [orderCode, paymentStatus, router]);

  return (
    <Card>
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ringkasan Pembayaran</h2>
      </div>
      <div className="p-5 space-y-3 text-sm">
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
