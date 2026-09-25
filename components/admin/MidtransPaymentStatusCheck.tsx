"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Search } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import {
  checkMidtransPaymentStatus,
  reconcileMidtransPaymentStatus,
} from "@/lib/actions/paymentInquiry";
import type {
  MidtransInquiryResult,
  MidtransReconciliationResult,
} from "@/lib/payments/types";

const RESULT_STYLES: Record<MidtransInquiryResult["category"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  terminal_failure: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
  not_found: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  requires_review: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  identity_mismatch: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
  amount_mismatch: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
  ineligible: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
};

export default function MidtransPaymentStatusCheck({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<MidtransInquiryResult | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<MidtransReconciliationResult | null>(null);

  const handleCheck = async () => {
    setChecking(true);
    setResult(null);
    setReconciliationResult(null);
    try {
      setResult(await checkMidtransPaymentStatus(orderId));
    } catch {
      setResult({
        success: false,
        category: "error",
        message: "Status pembayaran belum dapat diperiksa. Coba lagi nanti.",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleReconcile = async () => {
    if (!result?.fingerprint || !result.reconciliationIntent) return;
    setReconciling(true);
    try {
      const nextResult = await reconcileMidtransPaymentStatus({
        orderId,
        expectedFingerprint: result.fingerprint,
      });
      setReconciliationResult(nextResult);
      if (nextResult.inquiry) setResult(nextResult.inquiry);
      toast(nextResult.success ? "success" : "error", nextResult.message);
      if (nextResult.success || nextResult.finalState) router.refresh();
    } catch {
      const message = "Status pesanan belum dapat disinkronkan. Coba lagi nanti.";
      setReconciliationResult({ success: false, category: "error", message });
      toast("error", message);
    } finally {
      setReconciling(false);
      setConfirmOpen(false);
    }
  };

  const confirmationDescription = result?.reconciliationIntent === "success"
    ? "Midtrans menyatakan pembayaran berhasil. Server akan memeriksa status kembali sebelum menandai pesanan dibayar dan masuk ke proses pemenuhan."
    : "Midtrans menyatakan transaksi gagal atau telah berakhir. Server akan memeriksa status kembali sebelum membatalkan pesanan dan mengembalikan stok.";

  return (
    <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
      <button
        type="button"
        onClick={handleCheck}
        disabled={checking || reconciling}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#0EA5A0] px-4 py-2.5 text-sm font-semibold text-[#0C8C87] transition-colors hover:bg-[#0EA5A0]/5 disabled:cursor-not-allowed disabled:opacity-60 dark:text-teal-300"
      >
        {checking ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        {checking ? "Memeriksa..." : "Periksa Status Pembayaran"}
      </button>

      {result && (
        <div className={`mt-3 rounded-lg border px-3 py-2.5 ${RESULT_STYLES[result.category]}`}>
          <p className="text-xs font-semibold leading-relaxed">{result.message}</p>
          {result.details && (
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] opacity-80">
              {result.details.transactionStatus && (
                <><dt>Status provider</dt><dd className="text-right font-medium">{result.details.transactionStatus}</dd></>
              )}
              {result.details.paymentType && (
                <><dt>Metode provider</dt><dd className="text-right font-medium">{result.details.paymentType}</dd></>
              )}
              {result.details.grossAmount && (
                <><dt>Nominal provider</dt><dd className="text-right font-medium">Rp {result.details.grossAmount}</dd></>
              )}
              {result.details.fraudStatus && (
                <><dt>Fraud status</dt><dd className="text-right font-medium">{result.details.fraudStatus}</dd></>
              )}
              {result.details.settlementTime && (
                <><dt>Waktu settlement</dt><dd className="text-right font-medium">{result.details.settlementTime}</dd></>
              )}
            </dl>
          )}
          {result.checkedAt && (
            <p className="mt-2 text-[10px] opacity-60">
              Diperiksa {new Date(result.checkedAt).toLocaleString("id-ID")}
            </p>
          )}
          {result.reconciliationIntent && result.fingerprint && !reconciliationResult?.finalState && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={checking || reconciling}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0EA5A0] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0C8C87] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reconciling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {reconciling ? "Menyinkronkan..." : "Sinkronkan Status dari Midtrans"}
            </button>
          )}
        </div>
      )}

      {reconciliationResult && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2.5 text-xs font-semibold leading-relaxed ${
            reconciliationResult.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          }`}
        >
          {reconciliationResult.message}
          {reconciliationResult.finalState && (
            <p className="mt-1 text-[11px] font-normal opacity-80">
              Status aktual: {reconciliationResult.finalState.paymentStatus} / {reconciliationResult.finalState.orderStatus}
            </p>
          )}
        </div>
      )}

      {confirmOpen && result?.reconciliationIntent && (
        <ConfirmDialog
          title="Sinkronkan status pembayaran?"
          description={confirmationDescription}
          confirmLabel="Periksa dan Sinkronkan"
          tone="primary"
          busy={reconciling}
          onConfirm={handleReconcile}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
