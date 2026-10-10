"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/admin/Toast";
import ImageUploadField, { type ImagePreviewSurface, type ImageUploadPhase, type ImageUploadPreview } from "@/components/admin/ImageUploadField";
import { logError } from "@/lib/logger";

export default function MediaUploadField({
  label, value, pathPrefix, errorContext, onChange, id, disabled = false, fieldError, onUploadingChange, previewSurface,
}: {
  label: string;
  value: string;
  pathPrefix: string;
  errorContext: string;
  onChange: (url: string) => void;
  id?: string;
  disabled?: boolean;
  fieldError?: string;
  onUploadingChange?: (uploading: boolean) => void;
  previewSurface?: ImagePreviewSurface;
}) {
  const generatedId = useId();
  const { toast } = useToast();
  const [phase, setPhase] = useState<ImageUploadPhase>("idle");
  const [preview, setPreview] = useState<ImageUploadPreview | null>(null);
  const [error, setError] = useState("");
  const activeRequest = useRef<object | null>(null);
  const mounted = useRef(true);
  const uploadLock = useRef(false);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; activeRequest.current = null; uploadLock.current = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    };
  }, []);

  function releasePreview() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null; setPreview(null);
  }

  async function upload(file: File) {
    if (disabled || uploadLock.current) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar."); setPhase("error"); return;
    }
    uploadLock.current = true;
    const request = {};
    activeRequest.current = request;
    const current = () => mounted.current && activeRequest.current === request;
    onUploadingChange?.(true); setPhase("validating");
    let stage = "preview";
    try {
      releasePreview();
      const url = URL.createObjectURL(file); objectUrl.current = url;
      setPreview({ url, name: file.name, size: file.size });
      stage = "session";
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!current()) return;
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("session_missing");
      stage = "upload"; setPhase("uploading");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
      const path = `${pathPrefix}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (!current()) return;
      if (uploadError) throw uploadError;
      stage = "url";
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      if (!data.publicUrl) throw new Error("public_url_missing");
      onChange(data.publicUrl); setPhase("uploaded");
      toast("success", `${errorContext} berhasil diunggah.`);
    } catch (err) {
      if (!current()) return;
      const detail = err && typeof err === "object" ? err as { status?: unknown; statusCode?: unknown; code?: unknown } : {};
      const status = Number(detail.status ?? detail.statusCode);
      const message = (err instanceof Error && err.message === "session_missing") || status === 401
        ? "Sesi Anda berakhir. Silakan masuk kembali."
        : status === 403 || detail.code === "AccessDenied" || detail.code === "42501"
          ? "Akun Anda belum memiliki akses untuk mengunggah gambar."
          : stage === "upload" || stage === "session"
            ? "Gambar gagal diunggah. Periksa koneksi lalu coba lagi."
            : "Gambar gagal diproses. Silakan coba lagi.";
      setError(message); releasePreview(); setPhase("error");
      logError("admin.media_upload", "Image upload failed", {
        stage, status: Number.isFinite(status) ? status : undefined,
        code: typeof detail.code === "string" && /^[A-Za-z0-9_]{1,80}$/.test(detail.code) ? detail.code : undefined,
      });
      toast("error", message);
    } finally {
      if (current()) { uploadLock.current = false; onUploadingChange?.(false); }
    }
  }

  return <ImageUploadField id={id ?? `media-${generatedId}`} label={label} value={value} preview={preview}
    previewSurface={previewSurface}
    phase={phase} accept="image/*" helperText="Pilih satu file gambar. SVG dan format image/* tetap didukung."
    error={error || fieldError} disabled={disabled} onFileSelected={file => { void upload(file); }}
    onRemove={() => {
      if (disabled || uploadLock.current) return;
      activeRequest.current = null; releasePreview(); setError(""); setPhase("removed"); onChange("");
    }} />;
}
