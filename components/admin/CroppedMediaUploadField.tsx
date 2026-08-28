"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/admin/Toast";
import dynamic from "next/dynamic";

const ImageCropperModal = dynamic(() => import("./ImageCropperModal"), {
  ssr: false,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

async function uploadToMedia(
  file: File,
  options: { pathPrefix: string; contentType: string; errorContext: string }
): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sesi Anda telah berakhir. Silakan masuk kembali.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const path = `${options.pathPrefix}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: options.contentType,
    upsert: false,
  });
  if (error) {
    if (error.message.toLowerCase().includes("row-level security")) {
      throw new Error(
        "Gagal mengunggah: kebijakan akses storage belum diterapkan di Supabase (jalankan migrasi 0004)."
      );
    }
    throw new Error(`Gagal mengunggah ${options.errorContext}. ${error.message}`);
  }
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

export default function CroppedMediaUploadField({
  label,
  value,
  pathPrefix,
  errorContext,
  onChange,
}: {
  label: string;
  value: string;
  pathPrefix: string;
  errorContext: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    };
  }, [cropImageSrc]);

  const handleFileSelect = useCallback(
    (file?: File) => {
      if (!file) return;
      setError("");
      if (!file.type.startsWith("image/")) {
        setError("File harus berupa gambar (PNG/JPG/WebP).");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("Ukuran file maksimal 5MB.");
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setCropImageSrc(objectUrl);
    },
    []
  );

  const handleCropApply = useCallback(
    async (croppedBlob: Blob) => {
      if (cropImageSrc) {
        URL.revokeObjectURL(cropImageSrc);
        setCropImageSrc(null);
      }

      const ext = croppedBlob.type.split("/")[1] ?? "webp";
      const file = new File([croppedBlob], `cropped.${ext}`, {
        type: croppedBlob.type,
      });

      setUploading(true);
      try {
        const publicUrl = await uploadToMedia(file, {
          pathPrefix,
          contentType: croppedBlob.type,
          errorContext,
        });
        onChange(publicUrl);
        toast("success", `${errorContext} berhasil diunggah.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal mengunggah file.";
        setError(message);
        toast("error", message);
      } finally {
        setUploading(false);
      }
    },
    [cropImageSrc, pathPrefix, errorContext, onChange, toast]
  );

  const handleCropClose = useCallback(() => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  }, [cropImageSrc]);

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white object-contain p-1"
          />
        ) : (
          <div className="h-10 w-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
            <ImageIcon size={16} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {value ? "Ganti" : "Unggah"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-500 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <Trash2 size={14} />
              Hapus
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files?.[0]);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          onApply={handleCropApply}
          onClose={handleCropClose}
        />
      )}
    </div>
  );
}
