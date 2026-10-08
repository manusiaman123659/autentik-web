"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { updateOrderStatus } from "@/lib/actions/store";
import { ORDER_STATUS_LABELS, orderStatusSchema, type OrderStatus } from "@/lib/validations/storeSchema";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

const ORDER_STATUS_OPTIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["pending", "processing", "cancelled"],
  processing: ["processing", "shipped", "cancelled"],
  shipped: ["shipped", "completed"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export default function OrderStatusForm({
  orderId,
  initial,
  couriers,
  courierReadFailed = false,
}: {
  orderId: string;
  couriers: string[];
  courierReadFailed?: boolean;
  initial: {
    status: OrderStatus;
    trackingCourier: string;
    trackingNumber: string;
    cancelReason: string;
    updatedAt: string;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<OrderStatus>(initial.status);
  const [trackingCourier, setTrackingCourier] = useState(initial.trackingCourier);
  const [trackingNumber, setTrackingNumber] = useState(initial.trackingNumber);
  const [cancelReason, setCancelReason] = useState(initial.cancelReason);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const statusOptions = ORDER_STATUS_OPTIONS[initial.status];
  const isTerminal = initial.status === "completed" || initial.status === "cancelled";
  const courierUnavailable = courierReadFailed || couriers.length === 0;
  const shippingEditable = !isTerminal && ["processing", "shipped"].includes(status);
  const savedCourierInactive = !courierReadFailed && Boolean(initial.trackingCourier)
    && !couriers.includes(initial.trackingCourier);
  const requiresShippingData = status === "shipped" || (status === "processing"
    && Boolean(trackingCourier.trim() || trackingNumber.trim()));
  const shippingSaveBlocked = shippingEditable && ((courierUnavailable && requiresShippingData)
    || (savedCourierInactive && !couriers.includes(trackingCourier)));

  const handleSubmit = async () => {
    setErrors({});
    if (shippingSaveBlocked) {
      setErrors({ trackingCourier: "Pilih kurir aktif dari Pengaturan Toko sebelum menyimpan informasi pengiriman." });
      return;
    }
    const input = {
      status,
      trackingCourier,
      trackingNumber,
      cancelReason,
      expectedUpdatedAt: initial.updatedAt,
    };
    const parsed = orderStatusSchema.safeParse(input);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] = issue.message;
      setErrors(nextErrors);
      return;
    }
    if (["processing", "shipped"].includes(status) && trackingCourier && !couriers.includes(trackingCourier.trim())) {
      setErrors({ trackingCourier: "Pilih kurir yang terdaftar dalam pengaturan toko" });
      return;
    }
    setBusy(true);
    try {
      const result = await updateOrderStatus(orderId, input);
      if (!result.success) {
        setErrors(result.errors ?? {});
        toast("error", result.message);
        return;
      }
      toast("success", result.message);
      router.refresh();
    } catch {
      toast("error", "Perubahan belum dapat disimpan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const toneFor = (s: OrderStatus) => (s === status ? "bg-[#0EA5A0] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {statusOptions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            disabled={isTerminal || busy}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${toneFor(s)}`}
          >
            {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isTerminal && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          Status ini bersifat terminal dan tidak dapat diubah melalui alur rutin.
        </p>
      )}

      {(["processing", "shipped", "completed", "cancelled"].includes(status)) && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Informasi Pengiriman</h3>
          {courierReadFailed && <p role="alert" className="text-sm text-red-500">Daftar kurir belum dapat dimuat. Muat ulang halaman.</p>}
          {!courierReadFailed && couriers.length === 0 && !isTerminal && (
            <p className="text-xs text-slate-500">Belum ada kurir yang dikonfigurasi. Tambahkan kurir melalui Pengaturan Toko terlebih dahulu.</p>
          )}
          {savedCourierInactive && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <p>Kurir tersimpan: <span className="font-semibold break-words">{initial.trackingCourier}</span></p>
              <p className="mt-1">Kurir ini sudah tidak aktif di Pengaturan Toko.</p>
              {shippingEditable && <p className="mt-1">Kurir yang tersimpan sudah tidak aktif. Pilih kurir lain sebelum menyimpan.</p>}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={`courier-${orderId}`} className={labelClass}>Kurir</label>
            {shippingEditable ? <select id={`courier-${orderId}`} className={inputClass}
              value={couriers.includes(trackingCourier) ? trackingCourier : ""}
              disabled={courierUnavailable || busy}
              aria-invalid={Boolean(errors.trackingCourier)} aria-describedby={`courier-error-${orderId}`}
              onChange={(e) => setTrackingCourier(e.target.value)}>
              <option value="">Pilih kurir</option>
              {couriers.map((courier) => <option key={courier} value={courier}>{courier}</option>)}
            </select> : <p id={`courier-${orderId}`} className="text-sm font-medium break-words text-slate-900 dark:text-white">{initial.trackingCourier || "—"}</p>}
            <div id={`courier-error-${orderId}`}><FieldError message={errors.trackingCourier} /></div>
          </div>
          <div>
            <label htmlFor={`tracking-${orderId}`} className={labelClass}>Nomor Resi</label>
            <input id={`tracking-${orderId}`} className={inputClass} value={trackingNumber} maxLength={100}
              readOnly={isTerminal || status === "completed" || status === "cancelled"} disabled={busy || courierUnavailable}
              aria-invalid={Boolean(errors.trackingNumber)} aria-describedby={`tracking-error-${orderId}`}
              onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Masukkan nomor resi" />
            <div id={`tracking-error-${orderId}`}><FieldError message={errors.trackingNumber} /></div>
          </div>
          </div>
        </div>
      )}

      {status === "cancelled" && (
        <div>
            <label htmlFor={`cancel-reason-${orderId}`} className={labelClass}>Alasan Pembatalan</label>
          <textarea
            id={`cancel-reason-${orderId}`}
            readOnly={isTerminal}
            disabled={busy}
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
        disabled={busy || isTerminal || shippingSaveBlocked}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Simpan Perubahan
      </button>
    </div>
  );
}
