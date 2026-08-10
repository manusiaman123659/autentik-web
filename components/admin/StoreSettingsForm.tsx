"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, X } from "lucide-react";
import { saveStoreSettings } from "@/lib/actions/settings";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";

export default function StoreSettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const router = useRouter();
  const { toast } = useToast();

  const get = (key: string, fallback: unknown) => {
    const v = initial[key];
    return v === undefined || v === null ? fallback : v;
  };
  const mid = (get("midtrans", {}) as Record<string, unknown>) ?? {};

  const [currency, setCurrency] = useState(String(get("currency", "IDR")));
  const [enableShipping, setEnableShipping] = useState(Boolean(get("enableShipping", false)));
  const [couriers, setCouriers] = useState<string[]>(
    Array.isArray(get("couriers", [])) ? (get("couriers", []) as string[]) : []
  );
  const [courierInput, setCourierInput] = useState("");
  const [midtransEnabled, setMidtransEnabled] = useState(Boolean(mid.enabled));
  const [midtransSandbox, setMidtransSandbox] = useState(Boolean(mid.sandbox));
  const [midtransClientKey, setMidtransClientKey] = useState(String(mid.clientKey ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const addCourier = () => {
    const c = courierInput.trim().toUpperCase();
    if (!c) return;
    if (!couriers.includes(c)) setCouriers([...couriers, c]);
    setCourierInput("");
  };

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});
    const result = await saveStoreSettings({
      currency,
      enableShipping,
      couriers,
      midtrans: { enabled: midtransEnabled, sandbox: midtransSandbox, clientKey: midtransClientKey },
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

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">Umum</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Mata Uang</label>
            <input className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            <FieldError message={errors.currency} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enableShipping}
                onChange={(e) => setEnableShipping(e.target.checked)}
                className="w-4 h-4 rounded accent-[#0EA5A0]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Aktifkan ongkos kirim</span>
            </label>
          </div>
        </div>
        <div className="mt-5">
          <label className={labelClass}>Kurir</label>
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={courierInput}
              onChange={(e) => setCourierInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCourier();
                }
              }}
              placeholder="mis. JNE, J&T, SiCepat"
            />
            <button
              type="button"
              onClick={addCourier}
              className="inline-flex items-center gap-1.5 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus size={15} />
              Tambah
            </button>
          </div>
          {couriers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {couriers.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0EA5A0]/10 text-[#0C8C87] dark:text-teal-300 text-xs font-semibold"
                >
                  {c}
                  <button
                    onClick={() => setCouriers(couriers.filter((x) => x !== c))}
                    className="hover:text-red-500 transition-colors"
                    aria-label={`Hapus ${c}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Midtrans</h2>
            <p className="text-xs text-slate-400">Integrasi pembayaran online (konfigurasi lanjutan).</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={midtransEnabled}
              onChange={(e) => setMidtransEnabled(e.target.checked)}
              className="w-4 h-4 rounded accent-[#0EA5A0]"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Aktif</span>
          </label>
        </div>
        {midtransEnabled && (
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={midtransSandbox}
                onChange={(e) => setMidtransSandbox(e.target.checked)}
                className="w-4 h-4 rounded accent-[#0EA5A0]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Mode sandbox (pengujian)</span>
            </label>
            <div>
              <label className={labelClass}>Client Key</label>
              <input className={inputClass} value={midtransClientKey} onChange={(e) => setMidtransClientKey(e.target.value)} placeholder="SB-Mid-client-xxxx" />
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end pb-10">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}