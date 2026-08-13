"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Loader2, Save, Trash2 } from "lucide-react";
import { saveComproManifest } from "@/lib/actions/compro";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { createClient } from "@/utils/supabase/client";
import type { ComproSettings } from "@/lib/validations/comproSchema";

const MAX_PDF_SIZE = 50 * 1024 * 1024;

export default function ComproForm({ initial }: { initial: ComproSettings }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial.title);
  const [year, setYear] = useState(initial.year ?? "");
  const [pdfUrl, setPdfUrl] = useState(initial.pdfUrl ?? "");
  const [pdfFilename, setPdfFilename] = useState(initial.pdfFilename ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const setField = (key: string, value: string) => {
    if (key === "title") setTitle(value);
    if (key === "year") setYear(value);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploadError("");
    if (file.type !== "application/pdf") {
      setUploadError("File harus berupa PDF.");
      return;
    }
    if (file.size > MAX_PDF_SIZE) {
      setUploadError("Ukuran file maksimal 25MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setUploadError("Sesi Anda telah berakhir. Silakan masuk kembali.");
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
      const path = `compro/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (error) {
        if (error.message.toLowerCase().includes("row-level security")) {
          setUploadError(
            "Gagal mengunggah: kebijakan akses storage belum diterapkan di Supabase (jalankan migrasi 0004)."
          );
        } else {
          setUploadError("Gagal mengunggah file. " + error.message);
        }
        return;
      }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setPdfUrl(data.publicUrl);
      setPdfFilename(file.name);
    } catch {
      setUploadError("Terjadi kesalahan saat mengunggah file.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePdf = () => {
    setPdfUrl("");
    setPdfFilename("");
    setUploadError("");
  };

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});
    const result = await saveComproManifest({
      title,
      year,
      pdfUrl: pdfUrl || null,
      pdfFilename: pdfFilename || null,
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
      {Object.keys(errors).length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
            Terdapat kesalahan pada isian:
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k} className="text-xs text-red-600 dark:text-red-400">
                {k}: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">
          Informasi Company Profile
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Judul</label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Company Profile AKA 2026"
              maxLength={80}
            />
            <FieldError message={errors.title} />
          </div>
          <div>
            <label className={labelClass}>Tahun</label>
            <input
              className={inputClass}
              value={year}
              onChange={(e) => setField("year", e.target.value)}
              placeholder="2026"
              maxLength={4}
            />
            <FieldError message={errors.year} />
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          File PDF ini akan ditampilkan langsung di halaman publik /about sebagai viewer company
          profile. Jika tidak ada file kustom, situs memakai PDF bawaan.
        </p>

        <div className="mt-3">
          <label className={labelClass}>File PDF</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              void handleFileChange(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-[#0EA5A0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
              {uploading ? (
                <Loader2 size={28} className="animate-spin text-[#0EA5A0]" />
              ) : (
                <FileText size={28} className="text-slate-400" />
              )}
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {uploading ? "Mengunggah..." : "Pilih & Unggah PDF"}
              </p>
              <p className="text-xs text-slate-400">PDF — maksimal 50MB</p>
            </div>
          </button>
          <FieldError message={uploadError || errors.pdfUrl} />
        </div>

        {pdfUrl ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={18} className="text-[#0EA5A0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {pdfFilename || "File PDF"}
                </p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#0EA5A0] hover:underline"
                >
                  <ExternalLink size={12} />
                  Buka file
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemovePdf}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline"
            >
              <Trash2 size={14} />
              Hapus
            </button>
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Belum ada file kustom — halaman /about memakai PDF bawaan.
          </p>
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
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}
