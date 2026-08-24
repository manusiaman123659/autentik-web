"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveBankAccount } from "@/lib/actions/settings";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

export default function BankAccountForm({
  initial,
}: {
  initial: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  } | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [bankName, setBankName] = useState(initial?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [accountHolder, setAccountHolder] = useState(initial?.accountHolder ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});
    const result = await saveBankAccount({ bankName, accountNumber, accountHolder });
    setBusy(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Rekening Bank</h2>
        <p className="text-xs text-slate-400">
          Informasi rekening untuk instruksi pembayaran transfer pada halaman konfirmasi pesanan.
        </p>
      </div>
      <div className="space-y-4 max-w-lg">
        <div>
          <label className={labelClass}>Nama Bank</label>
          <input
            className={inputClass}
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="mis. Bank Central Asia (BCA)"
          />
          <FieldError message={errors.bankName} />
        </div>
        <div>
          <label className={labelClass}>Nomor Rekening</label>
          <input
            className={inputClass}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="mis. 1234-5678-9012"
          />
          <FieldError message={errors.accountNumber} />
        </div>
        <div>
          <label className={labelClass}>Atas Nama</label>
          <input
            className={inputClass}
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            placeholder="mis. PT Autentik Karya Analitika"
          />
          <FieldError message={errors.accountHolder} />
        </div>
      </div>
      <div className="flex justify-end mt-5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan Rekening
        </button>
      </div>
    </section>
  );
}
