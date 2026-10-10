"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { labelClass } from "@/components/admin/ui";

export type ImageUploadPhase = "idle" | "validating" | "uploading" | "uploaded" | "error" | "removed";
export type ImagePreviewSurface = "plain" | "contrast";
export interface ImageUploadPreview {
  url: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
}

export default function ImageUploadField({
  id, label, value, preview, phase, accept, helperText, error, disabled = false, previewSurface = "plain", onFileSelected, onRemove,
}: {
  id: string;
  label: string;
  value: string;
  preview: ImageUploadPreview | null;
  phase: ImageUploadPhase;
  accept: string;
  helperText: string;
  error?: string;
  disabled?: boolean;
  previewSurface?: ImagePreviewSurface;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = preview?.url || value;
  const busy = phase === "validating" || phase === "uploading";
  const blocked = disabled || busy;
  const message = fileError || error;
  const describedBy = `${id}-help ${id}-status${message ? ` ${id}-error` : ""}`;
  const status = {
    idle: value ? "Gambar saat ini" : "Belum ada gambar.",
    validating: "Memeriksa gambar…",
    uploading: "Mengunggah gambar…",
    uploaded: "Terunggah — belum disimpan ke entri",
    error: value ? "Gambar sebelumnya tetap digunakan." : "Belum ada gambar yang berhasil diunggah.",
    removed: "Gambar dilepas — perubahan diterapkan setelah Simpan",
  }[phase];

  function select(files: File[]) {
    if (blocked || files.length === 0) return;
    if (files.length !== 1) { setFileError("Pilih satu gambar saja."); return; }
    setFileError("");
    onFileSelected(files[0]);
  }

  const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#0EA5A0] hover:text-[#0EA5A0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5A0] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200";

  return <div>
    <p className={labelClass}>{label}</p>
    <div id={`${id}-dropzone`} aria-busy={busy}
      className={`min-w-0 rounded-xl border-2 border-dashed p-4 transition-colors ${dragging && !blocked ? "border-[#0EA5A0] bg-[#0EA5A0]/10" : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40"}`}
      onDragEnter={event => {
        if (blocked || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault(); dragDepth.current++; setDragging(true);
      }}
      onDragOver={event => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault(); event.dataTransfer.dropEffect = blocked ? "none" : "copy";
      }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragging(false); }}
      onDrop={event => {
        event.preventDefault(); event.stopPropagation(); dragDepth.current = 0; setDragging(false);
        select(Array.from(event.dataTransfer.files));
      }}>
      {src && <div className="mb-4 min-w-0">
        {failedSrc === src ? <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Pratinjau gambar tidak tersedia. Referensi gambar tetap dipertahankan.
        </p> : (
          // eslint-disable-next-line @next/next/no-img-element -- Native preview supports local blob URLs without image optimization.
          <img key={src} src={src} alt={preview ? `Pratinjau ${preview.name}` : "Pratinjau gambar saat ini"}
            className={`block h-56 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700 ${previewSurface === "plain" ? "bg-white" : "bg-slate-200"}`}
            style={previewSurface === "contrast" ? {
              backgroundImage: "conic-gradient(#e2e8f0 25%, #64748b 0 50%, #e2e8f0 0 75%, #64748b 0)",
              backgroundSize: "16px 16px",
            } : undefined}
            onError={() => setFailedSrc(src)} />
        )}
        {preview && <div className="mt-3 min-w-0 text-sm">
          <p className="font-medium text-slate-800 [overflow-wrap:anywhere] dark:text-slate-100">{preview.name}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {preview.width && preview.height ? `${preview.width} × ${preview.height} • ` : ""}{Math.ceil(preview.size / 1024)} KB
          </p>
          {busy && value && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pilihan baru diproses; gambar sebelumnya belum diganti.</p>}
        </div>}
      </div>}
      <div className={`flex flex-wrap gap-3 ${src ? "" : "flex-col"}`}>
        <button id={`${id}-browse`} type="button" disabled={blocked} aria-controls={id}
          aria-describedby={describedBy}
          className={src ? buttonClass : `${buttonClass} min-h-36 w-full flex-col border-0 py-6`}
          onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 size={src ? 18 : 28} aria-hidden="true" className="animate-spin text-[#0EA5A0]" />
            : src ? <Upload size={18} aria-hidden="true" /> : <ImageIcon size={28} aria-hidden="true" className="text-[#0EA5A0]" />}
          <span>{src ? "Ganti gambar" : dragging ? "Lepaskan gambar di sini" : "Tarik gambar ke area ini"}</span>
          {!src && <span className="text-xs font-normal">atau klik untuk memilih file</span>}
        </button>
        {value && <button type="button" disabled={blocked} className={`${buttonClass} text-red-600 dark:text-red-400`}
          onClick={() => { setFileError(""); onRemove(); }}>Lepas gambar</button>}
      </div>
      <p id={`${id}-help`} className="mt-3 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      <p id={`${id}-status`} role="status" aria-live="polite" className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">{status}</p>
    </div>
    {message && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{message}</p>}
    <input id={id} ref={inputRef} type="file" accept={accept} disabled={blocked} className="hidden" aria-label={label}
      onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; select(files); }} />
  </div>;
}
