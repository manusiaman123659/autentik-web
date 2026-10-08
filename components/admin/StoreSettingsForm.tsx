"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, X } from "lucide-react";
import { saveStoreSettings } from "@/lib/actions/settings";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { courierNameSchema, courierTrackingUrlSchema, storeSettingsSchema } from "@/lib/validations/storeSchema";
import { getTrackingDestination, normalizeCourierKey } from "@/lib/shipping/tracking";

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
  const [courierUrlInput, setCourierUrlInput] = useState("");
  const [trackingUrls, setTrackingUrls] = useState<Record<string, string | null>>(() => {
    const mapping = get("courierTrackingUrls", undefined);
    const names = mapping && typeof mapping === "object" && !Array.isArray(mapping) ? Object.keys(mapping) : [];
    return Object.fromEntries([...names, ...couriers].map((name) => [normalizeCourierKey(name), getTrackingDestination(name, mapping)]));
  });
  const [editingCourier, setEditingCourier] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState("");
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
    const url = courierTrackingUrlSchema.nullable().safeParse(courierUrlInput.trim() ? courierUrlInput : null);
    if (!url.success) {
      setErrors({ courierUrlInput: url.error.issues[0].message });
      return;
    }
    setErrors({});
    setCouriers([...couriers, c]);
    setTrackingUrls({ ...trackingUrls, [normalizeCourierKey(c)]: url.data });
    setCourierInput("");
    setCourierUrlInput("");
  };

  const saveCourierUrl = () => {
    if (!editingCourier) return;
    const parsed = courierTrackingUrlSchema.nullable().safeParse(editingUrl.trim() ? editingUrl : null);
    if (!parsed.success) { setErrors({ editingUrl: parsed.error.issues[0].message }); return; }
    setTrackingUrls({ ...trackingUrls, [normalizeCourierKey(editingCourier)]: parsed.data });
    setEditingCourier(null);
    setErrors({});
  };

  const removeCourier = (courier: string) => {
    if (!window.confirm(`Hapus "${courier}" dari daftar kurir aktif? Pesanan yang sudah tersimpan tidak akan diubah.`)) return;
    setCouriers(couriers.filter((value) => value !== courier));
    if (editingCourier === courier) setEditingCourier(null);
    setErrors({});
  };

  const handleSubmit = async () => {
    setErrors({});
    if (courierInput.trim() || courierUrlInput.trim()) {
      setErrors({ courierInput: "Klik Tambah Kurir terlebih dahulu, lalu simpan pengaturan." });
      return;
    }
    if (editingCourier) { setErrors({ editingUrl: "Selesaikan atau batalkan edit URL sebelum menyimpan pengaturan." }); return; }
    const parsed = storeSettingsSchema.safeParse({ currency, enableShipping, couriers, courierTrackingUrls: trackingUrls });
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
          </div>
          <div id="store-courier-error" role="status"><FieldError message={errors.courierInput} /></div>
          <div className="mt-3">
            <label htmlFor="store-courier-url" className={labelClass}>URL Pelacakan Resmi (opsional)</label>
            <input id="store-courier-url" className={inputClass} disabled={busy} value={courierUrlInput}
              onChange={(e) => setCourierUrlInput(e.target.value)} placeholder="https://jne.co.id/tracking-package"
              aria-invalid={Boolean(errors.courierUrlInput)} aria-describedby="store-courier-url-error" />
            <div id="store-courier-url-error" role="status"><FieldError message={errors.courierUrlInput} /></div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Opsional. Saat ini hanya domain jne.co.id yang terverifikasi. Kurir baru tetap dapat ditambahkan tanpa URL.</p>
            <button type="button" disabled={busy} onClick={addCourier}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              <Plus size={15} />Tambah Kurir
            </button>
          </div>
          <FieldError message={Object.entries(errors).find(([key]) => key === "couriers" || key.startsWith("couriers.") || key.startsWith("courierTrackingUrls"))?.[1]} />
          {couriers.length > 0 && (
            <div className="space-y-2 mt-3">
              {couriers.map((c, index) => (
                <div
                  key={`${c}-${index}`}
                  className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-slate-900 dark:text-white">{c}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Pelacakan: {getTrackingDestination(c, trackingUrls) ? new URL(getTrackingDestination(c, trackingUrls)!).hostname : "Belum diatur"}</p>
                    </div>
                    <div className="inline-flex shrink-0 items-center gap-3 text-xs font-semibold">
                      <button type="button" disabled={busy} aria-label={`Edit URL ${c}`} className="text-[#0EA5A0]"
                        onClick={() => { setEditingCourier(c); setEditingUrl(trackingUrls[normalizeCourierKey(c)] ?? ""); setErrors({}); }}>Edit URL</button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeCourier(c)}
                    className="shrink-0 hover:text-red-500 transition-colors"
                    aria-label={`Hapus kurir ${c}`}
                  >
                    <span className="inline-flex items-center gap-1"><X size={12} />Hapus</span>
                  </button>
                    </div>
                  </div>
                  {editingCourier === c && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Nama kurir: {c} (tidak dapat diubah)</p>
                      <label htmlFor="store-edit-tracking-url" className={labelClass}>URL Pelacakan Resmi (opsional)</label>
                      <input id="store-edit-tracking-url" className={inputClass} disabled={busy} value={editingUrl}
                        onChange={(e) => setEditingUrl(e.target.value)} aria-invalid={Boolean(errors.editingUrl)} aria-describedby="store-edit-url-error" />
                      <div id="store-edit-url-error" role="status"><FieldError message={errors.editingUrl} /></div>
                      <div className="flex gap-3 text-xs font-semibold">
                        <button type="button" disabled={busy} onClick={saveCourierUrl} className="text-[#0EA5A0]">Simpan URL</button>
                        <button type="button" disabled={busy} onClick={() => { setEditingCourier(null); setErrors({}); }} className="text-slate-500">Batal</button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Kosongkan URL untuk menonaktifkan tautan. Klik Simpan Pengaturan untuk menyimpan perubahan.</p>
                    </div>
                  )}
                </div>
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
