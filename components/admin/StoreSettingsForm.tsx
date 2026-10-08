"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, X } from "lucide-react";
import { saveStoreSettings } from "@/lib/actions/settings";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { courierNameSchema, storeSettingsSchema } from "@/lib/validations/storeSchema";

export default function StoreSettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const router = useRouter();
  const { toast } = useToast();

  const get = (key: string, fallback: unknown) => {
    const v = initial[key];
    return v === undefined || v === null ? fallback : v;
  };
  const [currency, setCurrency] = useState(String(get("currency", "IDR")));
  const [enableShipping, setEnableShipping] = useState(Boolean(get("enableShipping", false)));
  const [couriers, setCouriers] = useState<string[]>(
    Array.isArray(get("couriers", [])) ? (get("couriers", []) as unknown[]).filter((value): value is string => typeof value === "string") : []
  );
  const [courierInput, setCourierInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const addCourier = () => {
    const parsed = courierNameSchema.safeParse(courierInput);
    if (!parsed.success) {
      setErrors({ courierInput: parsed.error.issues[0].message });
      return;
    }
    const c = parsed.data;
    if (couriers.some((existing) => existing.trim().toLowerCase() === c.toLowerCase())) {
      setErrors({ courierInput: "Kurir ini sudah terdaftar. Gunakan nama kurir yang berbeda." });
      return;
    }
    setErrors({});
    setCouriers([...couriers, c]);
    setCourierInput("");
  };

  const removeCourier = (courier: string) => {
    if (!window.confirm(`Hapus "${courier}" dari daftar kurir aktif? Pesanan yang sudah tersimpan tidak akan diubah.`)) return;
    setCouriers(couriers.filter((value) => value !== courier));
    setErrors({});
  };

  const handleSubmit = async () => {
    setErrors({});
    if (courierInput.trim()) {
      setErrors({ courierInput: "Klik Tambah Kurir terlebih dahulu, lalu simpan pengaturan." });
      return;
    }
    const parsed = storeSettingsSchema.safeParse({ currency, enableShipping, couriers });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])));
      return;
    }
    setBusy(true);
    try {
      const result = await saveStoreSettings(parsed.data);
      if (!result.success) {
        setErrors(result.errors ?? {});
        toast("error", result.message);
        return;
      }
      toast("success", result.message);
      router.refresh();
    } catch {
      toast("error", "Pengaturan belum dapat disimpan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">Pengaturan Toko</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="store-currency" className={labelClass}>Mata Uang</label>
            <input id="store-currency" className={inputClass} disabled={busy} value={currency} onChange={(e) => setCurrency(e.target.value)} />
            <FieldError message={errors.currency} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                disabled={busy}
                checked={enableShipping}
                onChange={(e) => setEnableShipping(e.target.checked)}
                className="w-4 h-4 rounded accent-[#0EA5A0]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Aktifkan ongkos kirim</span>
            </label>
          </div>
        </div>
        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Kurir Pengiriman</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Tambahkan kurir ke daftar, lalu klik Simpan Pengaturan. Menghapus kurir tidak mengubah pesanan yang sudah tersimpan.</p>
          {couriers.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Belum ada kurir yang dikonfigurasi.</p>}
          <label htmlFor="store-courier-name" className={labelClass}>Nama kurir</label>
          <div className="flex gap-2">
            <input
              id="store-courier-name"
              className={`${inputClass} min-w-0`}
              disabled={busy}
              aria-invalid={Boolean(errors.courierInput)}
              aria-describedby="store-courier-error"
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
              disabled={busy}
              onClick={addCourier}
              className="inline-flex shrink-0 items-center gap-1.5 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus size={15} />
              Tambah Kurir
            </button>
          </div>
          <div id="store-courier-error" role="status"><FieldError message={errors.courierInput} /></div>
          <FieldError message={Object.entries(errors).find(([key]) => key === "couriers" || key.startsWith("couriers."))?.[1]} />
          {couriers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {couriers.map((c, index) => (
                <span
                  key={`${c}-${index}`}
                  className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0EA5A0]/10 text-[#0C8C87] dark:text-teal-300 text-xs font-semibold"
                >
                  <span className="min-w-0 break-all">{c}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeCourier(c)}
                    className="shrink-0 hover:text-red-500 transition-colors"
                    aria-label={`Hapus kurir ${c}`}
                  >
                    <span className="inline-flex items-center gap-1"><X size={12} />Hapus</span>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
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
