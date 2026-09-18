import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
import type { MidtransConfigurationStatus } from "@/lib/midtrans";

export default function PaymentGatewayStatus({
  status,
}: {
  status: MidtransConfigurationStatus;
}) {
  const items = [
    { label: "Server Key tersedia", ready: status.hasServerKey },
    { label: "Client Key tersedia", ready: status.hasClientKey },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-slate-900 dark:text-white">
            <CreditCard size={18} className="text-[#0EA5A0]" />
            <h2 className="text-base font-bold">Payment Gateway</h2>
          </div>
          <p className="text-xs text-slate-400">
            Konfigurasi Midtrans dibaca dari environment server dan tidak dapat diubah melalui CMS.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            status.isComplete
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          {status.isComplete ? "Lengkap" : "Belum Lengkap"}
        </span>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Gateway</dt>
          <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Midtrans</dd>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Environment</dt>
          <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            {status.isProduction ? "Production" : "Sandbox"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
          >
            {item.ready ? (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle size={16} className="text-amber-600 dark:text-amber-400" />
            )}
            <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
