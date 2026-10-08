"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Truck } from "lucide-react";
import { getSafeTrackingUrl, isSafeCourier, isSafeTrackingNumber } from "@/lib/shipping/tracking";

export default function OrderShippingInfo({ status, paymentStatus, courier, trackingNumber, trackingUrl }: {
  status: string;
  paymentStatus: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}) {
  const [feedback, setFeedback] = useState("");
  const number = trackingNumber?.trim() ?? "";
  const courierName = courier?.trim() ?? "";
  const inactive = status === "cancelled" || ["failed", "refunded"].includes(paymentStatus);
  const available = !inactive && ["shipped", "completed"].includes(status)
    && Boolean(number && courierName) && isSafeTrackingNumber(number) && isSafeCourier(courierName);
  const destination = available ? getSafeTrackingUrl(trackingUrl) : null;
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(number);
      setFeedback("Disalin");
    } catch {
      setFeedback("Belum dapat disalin otomatis. Pilih nomor resi lalu salin secara manual.");
    }
  };
  const emptyMessage = inactive
    ? "Tidak ada pengiriman aktif untuk pesanan ini."
    : status === "pending"
      ? "Informasi pengiriman akan tersedia setelah pesanan diproses."
      : status === "processing"
        ? "Nomor resi belum tersedia. Pesanan sedang diproses."
        : "Nomor resi belum tersedia.";

  return (
    <section className="rounded-2xl border shadow-sm p-6" aria-label="Informasi Pengiriman"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}>
      <h2 className="flex items-center gap-2 text-base font-bold mb-5"><Truck size={18} className="text-[#0EA5A0]" />Informasi Pengiriman</h2>
      {available ? (
        <div className="space-y-4">
          <dl className="space-y-3">
            <div><dt className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Kurir</dt><dd className="text-sm font-semibold break-words">{courierName}</dd></div>
            <div>
              <dt className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Nomor Resi</dt>
              <dd className="flex items-start justify-between gap-3">
                <span className="min-w-0 select-text break-all text-sm font-semibold tabular-nums">{number}</span>
                <button type="button" onClick={copy} aria-label="Salin nomor resi"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold text-[#0EA5A0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
                  style={{ borderColor: "var(--border-subtle)" }}>
                  {feedback === "Disalin" ? <Check size={14} /> : <Copy size={14} />}{feedback === "Disalin" ? "Disalin" : "Salin"}
                </button>
              </dd>
            </div>
          </dl>
          <p role="status" aria-live="polite" className="text-xs" style={{ color: "var(--text-secondary)" }}>{feedback}</p>
          {destination ? (
            <div className="space-y-2">
              <a href={destination} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-sm bg-[#0EA5A0] px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500">
                Lacak Pengiriman<ExternalLink size={14} />
              </a>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Salin nomor resi, lalu masukkan pada halaman pelacakan resmi kurir.</p>
            </div>
          ) : <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Tautan pelacakan belum tersedia untuk kurir ini. Anda tetap dapat menyalin nomor resi.</p>}
        </div>
      ) : <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{emptyMessage}</p>}
    </section>
  );
}
