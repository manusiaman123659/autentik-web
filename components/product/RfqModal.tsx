"use client";

import { useState } from "react";
import { X, Loader2, Send, CheckCircle, Phone } from "lucide-react";
import { type RfqFormData } from "@/lib/validations/rfqSchema";

interface RfqModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors";

const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5";

export default function RfqModal({
  isOpen,
  onClose,
  productId,
  productName,
}: RfqModalProps) {
  const [form, setForm] = useState<RfqFormData>({
    productId: productId || "",
    productName: productName || "",
    companyName: "",
    picName: "",
    email: "",
    phoneNumber: "",
    estimatedQuantity: 1,
    targetDate: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [result, setResult] = useState<{ rfqCode: string; waUrl?: string } | null>(null);

  if (!isOpen) return null;

  function set<K extends keyof RfqFormData>(key: K, value: RfqFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setGeneralError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setGeneralError(null);

    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setErrors(data.errors ?? {});
        setGeneralError(data.message || "Gagal mengirim permintaan penawaran.");
        setSubmitting(false);
        return;
      }

      setResult({
        rfqCode: data.rfqCode,
        waUrl: data.waUrl,
      });
    } catch {
      setGeneralError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm({
      productId: productId || "",
      productName: productName || "",
      companyName: "",
      picName: "",
      email: "",
      phoneNumber: "",
      estimatedQuantity: 1,
      targetDate: "",
      notes: "",
    });
    setErrors({});
    setGeneralError(null);
    setResult(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Minta Penawaran Resmi (RFQ)
            </h3>
            {productName && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Produk: <strong>{productName}</strong>
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {result ? (
          /* Success State */
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Permintaan Penawaran Terkirim!
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
              Kode RFQ Anda:
            </p>
            <p className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mb-4">
              {result.rfqCode}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Tim PT Autentik Karya Analitika akan segera memproses penawaran Anda. Anda juga bisa langsung menghubungi kami via WhatsApp.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {result.waUrl && (
                <a
                  href={result.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <Phone size={16} />
                  Lanjut Konfirmasi via WhatsApp
                </a>
              )}
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* Form — wraps body + footer so submit button is inside <form> */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className={labelClass}>Nama Perusahaan *</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  className={inputClass}
                  placeholder="PT Contoh Industry"
                />
                {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
              </div>

              <div>
                <label className={labelClass}>Nama PIC (Person In Charge) *</label>
                <input
                  type="text"
                  required
                  value={form.picName}
                  onChange={(e) => set("picName", e.target.value)}
                  className={inputClass}
                  placeholder="Budi Santoso"
                />
                {errors.picName && <p className="text-xs text-red-500 mt-1">{errors.picName}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputClass}
                    placeholder="budi@perusahaan.com"
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className={labelClass}>Nomor Telepon *</label>
                  <input
                    type="tel"
                    required
                    value={form.phoneNumber}
                    onChange={(e) => set("phoneNumber", e.target.value)}
                    className={inputClass}
                    placeholder="08123456789"
                  />
                  {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Jumlah Estimasi (unit) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.estimatedQuantity}
                    onChange={(e) => set("estimatedQuantity", Number(e.target.value))}
                    className={inputClass}
                  />
                  {errors.estimatedQuantity && <p className="text-xs text-red-500 mt-1">{errors.estimatedQuantity}</p>}
                </div>

                <div>
                  <label className={labelClass}>Target Tanggal (opsional)</label>
                  <input
                    type="date"
                    value={form.targetDate ?? ""}
                    onChange={(e) => set("targetDate", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Catatan (opsional)</label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Spesifikasi khusus, jumlah partai, dll."
                />
              </div>
            </div>

            {/* Fixed footer — now inside <form> so native submit works */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0 space-y-3">
              {generalError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                  <X
                    size={14}
                    className="flex-shrink-0 mt-0.5 text-red-500 cursor-pointer"
                    onClick={() => setGeneralError(null)}
                  />
                  <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{generalError}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Kirim Permintaan Penawaran
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
