"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { checkMidtransPaymentStatus } from "@/lib/actions/paymentInquiry";
import type { MidtransInquiryResult } from "@/lib/payments/types";

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
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MidtransInquiryResult | null>(null);

  const handleCheck = async () => {
    setBusy(true);
    setResult(null);
    try {
      setResult(await checkMidtransPaymentStatus(orderId));
    } catch {
      setResult({
        success: false,
        category: "error",
        message: "Status pembayaran belum dapat diperiksa. Coba lagi nanti.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
      <button
        type="button"
        onClick={handleCheck}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#0EA5A0] px-4 py-2.5 text-sm font-semibold text-[#0C8C87] transition-colors hover:bg-[#0EA5A0]/5 disabled:cursor-not-allowed disabled:opacity-60 dark:text-teal-300"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        {busy ? "Memeriksa..." : "Periksa Status Pembayaran"}
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
        </div>
      )}
    </div>
  );
}
