"use client";

import { useState } from "react";
import { X, Loader2, Download } from "lucide-react";
import { type DocDownloadLeadFormData } from "@/lib/validations/rfqSchema";
import { submitDocLeadAndGetUrl } from "@/lib/actions/technicalDocuments";

interface GatedDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

export default function GatedDownloadModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}: GatedDownloadModalProps) {
  const [form, setForm] = useState<Omit<DocDownloadLeadFormData, "documentId">>({
    fullName: "",
    workEmail: "",
    companyName: "",
    phoneNumber: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");

    try {
      const result = await submitDocLeadAndGetUrl({ ...form, documentId });
      if (!result.success || !result.fileUrl) {
        setErrors(result.errors ?? {});
        setFormError(result.message || "Dokumen tidak dapat diakses saat ini. Silakan coba lagi.");
        return;
      }

      setSubmitted(true);
      window.location.assign(result.fileUrl);
    } catch {
      setFormError("Dokumen tidak dapat diakses saat ini. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm({ fullName: "", workEmail: "", companyName: "", phoneNumber: "" });
    setErrors({});
    setFormError("");
    setSubmitted(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl p-6"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              <Download size={24} style={{ color: "var(--accent-primary)" }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Terima kasih!
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              Dokumen <strong>{documentTitle}</strong> sedang dibuka untuk diunduh.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--accent-primary)" }}
            >
              Tutup
            </button>
          </div>
        ) : (
          <>
            <h3
              className="text-lg font-bold mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              Download Dokumen
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
              Isi data berikut untuk mengunduh <strong>{documentTitle}</strong>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <p role="alert" className="text-xs text-red-500">{formError}</p>}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: errors.fullName ? "#ef4444" : "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="John Doe"
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Email Kantor *
                </label>
                <input
                  type="email"
                  required
                  value={form.workEmail}
                  onChange={(e) => set("workEmail", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: errors.workEmail ? "#ef4444" : "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="john@perusahaan.com"
                />
                {errors.workEmail && <p className="text-xs text-red-500 mt-1">{errors.workEmail}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Nama Perusahaan *
                </label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: errors.companyName ? "#ef4444" : "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="PT Contoh Industry"
                />
                {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Nomor Telepon *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: errors.phoneNumber ? "#ef4444" : "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="08123456789"
                />
                {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download Sekarang
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
