"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateOrderStatus } from "@/lib/actions/store";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/validations/storeSchema";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

export default function OrderStatusForm({
  orderId,
  initial,
}: {
  orderId: string;
  initial: { status: OrderStatus; trackingCourier: string; trackingNumber: string; cancelReason: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<OrderStatus>(initial.status);
  const [trackingCourier, setTrackingCourier] = useState(initial.trackingCourier);
  const [trackingNumber, setTrackingNumber] = useState(initial.trackingNumber);
  const [cancelReason, setCancelReason] = useState(initial.cancelReason);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});
    const result = await updateOrderStatus(orderId, {
      status,
      trackingCourier,
      trackingNumber,
      cancelReason,
    });
    setBusy(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    router.refresh();
  };

  const toneFor = (s: OrderStatus) => (s === status ? "bg-[#0EA5A0] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${toneFor(s)}`}
          >
            {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {status === "shipped" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Kurir</label>
            <input className={inputClass} value={trackingCourier} onChange={(e) => setTrackingCourier(e.target.value)} placeholder="JNE" />
          </div>
          <div>
            <label className={labelClass}>Nomor Resi</label>
            <input className={inputClass} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="JP0000000000" />
            <FieldError message={errors.trackingNumber} />
          </div>
        </div>
      )}

      {status === "cancelled" && (
        <div>
          <label className={labelClass}>Alasan Pembatalan</label>
          <textarea
            className={`${inputClass} min-h-[80px]`}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Alasan pesanan dibatalkan"
          />
          <FieldError message={errors.cancelReason} />
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Simpan Status
      </button>
    </div>
  );
}