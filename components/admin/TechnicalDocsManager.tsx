"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Loader2, Plus, Trash2, FileText, FileDown, Shield, HardDrive } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { removeStorageObjectAndVerify } from "@/lib/technical-document-media";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import {
  FILE_TYPES,
  FILE_TYPE_LABELS,
  type FileType,
} from "@/lib/validations/rfqSchema";

export interface TechDocItem {
  id?: string;
  title: string;
  fileType: string;
  fileUrl: string | null;
  storagePath: string | null;
  fileSizeKb: number | null;
  requiresLead: boolean;
}

interface TechnicalDocsManagerProps {
  productId: string;
  documents: TechDocItem[];
  onChange: Dispatch<SetStateAction<TechDocItem[]>>;
  onUploadingChange: (uploading: boolean) => void;
  saving: boolean;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  datasheet: FileText,
  manual: FileDown,
  cad_3d: HardDrive,
  certificate: Shield,
  software_firmware: HardDrive,
};

export default function TechnicalDocsManager({
  productId,
  documents,
  onChange,
  onUploadingChange,
  saving,
}: TechnicalDocsManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<number | null>(null);
  const pendingUploadsRef = useRef(new Map<string, { bucket: string; path: string }>());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function addDocument() {
    onChange((prev) => [
      ...prev,
      { title: "", fileType: "datasheet", fileUrl: null, storagePath: null, fileSizeKb: null, requiresLead: true },
    ]);
  }

  function updateDocument(index: number, field: keyof TechDocItem, value: string | boolean | number | null) {
    onChange((prev) => prev.map((doc, i) => i === index ? { ...doc, [field]: value } : doc));
  }

  async function discardPendingUpload(doc: TechDocItem): Promise<boolean> {
    const key = doc.fileUrl ?? doc.storagePath;
    const pending = key ? pendingUploadsRef.current.get(key) : null;
    if (!pending) return true;

    setUploading(true);
    onUploadingChange(true);
    try {
      if (!await removeStorageObjectAndVerify(createClient().storage.from(pending.bucket), pending.path)) {
        setUploadError("Gagal membersihkan unggahan sementara. Dokumen belum diubah.");
        return false;
      }
      pendingUploadsRef.current.delete(key!);
      return true;
    } catch {
      setUploadError("Gagal membersihkan unggahan sementara. Dokumen belum diubah.");
      return false;
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  async function removeDocument(index: number) {
    if (!await discardPendingUpload(documents[index])) return;
    setUploadError("");
    onChange((prev) => prev.filter((_, i) => i !== index));
  }

  async function replaceDocument(index: number) {
    if (!await discardPendingUpload(documents[index])) return;
    setUploadError("");
    onChange((prev) => prev.map((item, i) => i === index ? {
      ...item, fileUrl: null, storagePath: null, fileSizeKb: null,
    } : item));
  }

  function toggleLead(index: number, checked: boolean) {
    const doc = documents[index];
    if (doc.fileUrl || doc.storagePath) {
      setUploadError(checked
        ? "Dokumen harus diunggah ulang sebagai dokumen privat sebelum akses lead diaktifkan."
        : "Dokumen harus diunggah ulang sebagai dokumen publik sebelum akses lead dinonaktifkan.");
      return;
    }
    setUploadError("");
    updateDocument(index, "requiresLead", checked);
  }

  async function handleFileUpload(index: number, file: File | undefined) {
    if (!file) return;
    setUploadError("");

    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 50MB.");
      return;
    }

    setUploading(true);
    onUploadingChange(true);
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setUploadError("Sesi admin berakhir. Silakan login ulang.");
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `documents/${productId}/${crypto.randomUUID()}-${safeName}`;
      const bucket = documents[index].requiresLead ? "technical-documents" : "media";

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });

      if (uploadErr) {
        setUploadError("Gagal mengunggah: " + uploadErr.message);
        return;
      }

      const publicUrl = bucket === "media"
        ? supabase.storage.from("media").getPublicUrl(path).data.publicUrl
        : null;
      pendingUploadsRef.current.set(publicUrl ?? path, { bucket, path });
      onChange((prev) => prev.map((doc, i) => i === index ? {
        ...doc,
        fileUrl: publicUrl,
        storagePath: bucket === "technical-documents" ? path : null,
        fileSizeKb: Math.round(file.size / 1024),
      } : doc));
    } catch {
      setUploadError("Terjadi kesalahan saat mengunggah file.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset disabled={uploading || saving} className="space-y-4">
      {documents.map((doc, index) => {
        const Icon = FILE_ICONS[doc.fileType] ?? FileText;
        return (
          <div
            key={index}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={16} className="text-[#0EA5A0]" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Dokumen {index + 1}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void removeDocument(index)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"
              >
                <Trash2 size={13} />
                Hapus
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Judul Dokumen</label>
                <input
                  className={inputClass}
                  value={doc.title}
                  onChange={(e) => updateDocument(index, "title", e.target.value)}
                  placeholder="Datasheet Spesifikasi Sensor IoT"
                />
              </div>
              <div>
                <label className={labelClass}>Tipe File</label>
                <select
                  className={inputClass}
                  value={doc.fileType}
                  onChange={(e) => updateDocument(index, "fileType", e.target.value)}
                >
                  {FILE_TYPES.map((ft) => (
                    <option key={ft} value={ft} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {FILE_TYPE_LABELS[ft as FileType]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>File</label>
              {doc.fileUrl || doc.storagePath ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={18} className="text-[#0EA5A0] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {doc.title || "Dokumen"}
                      </p>
                      {doc.fileSizeKb && (
                        <p className="text-xs text-slate-400">{doc.fileSizeKb} KB</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.fileUrl ? <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#0EA5A0] hover:underline"
                    >
                      Lihat
                    </a> : <span className="text-xs font-semibold text-[#0EA5A0]">File privat siap</span>}
                    <button
                      type="button"
                      onClick={() => void replaceDocument(index)}
                      className="text-xs font-semibold text-red-500 hover:underline"
                    >
                      Ganti
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    uploadTargetRef.current = index;
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#0EA5A0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
                    {uploading ? (
                      <Loader2 size={20} className="animate-spin text-[#0EA5A0]" />
                    ) : (
                      <FileText size={20} className="text-slate-400" />
                    )}
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {uploading ? "Mengunggah..." : "Pilih File"}
                    </p>
                    <p className="text-xs text-slate-400">PDF, DOC, STEP, ZIP — maks 50MB</p>
                  </div>
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={doc.requiresLead}
                onChange={(e) => toggleLead(index, e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-[#0EA5A0] focus:ring-[#0EA5A0]"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Butuh data lead untuk download (form kontak)
              </span>
            </label>
          </div>
        );
      })}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.step,.stl,.stp,.zip,.rar"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const index = uploadTargetRef.current;
          uploadTargetRef.current = null;
          if (index !== null && documents[index] && !documents[index].fileUrl && !documents[index].storagePath) {
            void handleFileUpload(index, file);
          }
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={addDocument}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <Plus size={14} />
        Tambah Dokumen
      </button>

      <FieldError message={uploadError} />
      </fieldset>
    </div>
  );
}
