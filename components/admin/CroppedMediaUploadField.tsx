"use client";

import { useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/components/admin/Toast";
import ImageUploadField, { type ImageUploadPhase, type ImageUploadPreview } from "@/components/admin/ImageUploadField";
import { logError } from "@/lib/logger";

const ImageCropperModal = dynamic(() => import("./ImageCropperModal"), { ssr: false });
const MAX_FILE_SIZE = 5 * 1024 * 1024;
type SourceCandidate = { file: File; url: string; token: object; opener: HTMLElement | null; previousPhase: ImageUploadPhase };

export default function CroppedMediaUploadField({ label, value, pathPrefix, errorContext, onChange, id, disabled = false, fieldError, onBusyChange }: {
  label: string;
  value: string;
  pathPrefix: string;
  errorContext: string;
  onChange: (url: string) => void;
  id?: string;
  disabled?: boolean;
  fieldError?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const generatedId = useId();
  const fieldId = id ?? `cropped-media-${generatedId}`;
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<SourceCandidate | null>(null);
  const [preview, setPreview] = useState<ImageUploadPreview | null>(null);
  const [phase, setPhase] = useState<ImageUploadPhase>("idle");
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [error, setError] = useState("");
  const sourceUrl = useRef<string | null>(null);
  const croppedUrl = useRef<string | null>(null);
  const activeRequest = useRef<object | null>(null);
  const mounted = useRef(true);
  const workflowLock = useRef(false);
  const applyLock = useRef(false);
  const busyListener = useRef(onBusyChange);

  useEffect(() => { busyListener.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; activeRequest.current = null; workflowLock.current = false; applyLock.current = false;
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
      if (croppedUrl.current) URL.revokeObjectURL(croppedUrl.current);
      sourceUrl.current = null; croppedUrl.current = null;
      busyListener.current?.(false);
    };
  }, []);

  const current = (token: object) => mounted.current && activeRequest.current === token;
  function releaseSource() {
    if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    sourceUrl.current = null;
  }
  function releaseCropped() {
    if (croppedUrl.current) URL.revokeObjectURL(croppedUrl.current);
    croppedUrl.current = null; setPreview(null);
  }
  function finish(token: object) {
    if (!current(token)) return;
    activeRequest.current = null; workflowLock.current = false; applyLock.current = false;
    releaseSource(); setCandidate(null); setWorkflowBusy(false); busyListener.current?.(false);
  }
  function fail(token: object, message: string, stage: string) {
    if (!current(token)) return;
    releaseCropped(); setError(message); setPhase("error");
    logError("admin.photo_crop", "Photo workflow failed", { stage });
    finish(token);
  }

  function select(file: File) {
    if (disabled || workflowLock.current) return;
    setError("");
    if (!file.type.startsWith("image/")) { setError("File harus berupa gambar."); setPhase("error"); return; }
    if (file.size > MAX_FILE_SIZE) { setError("Ukuran gambar maksimal 5 MB."); setPhase("error"); return; }
    const token = {}; activeRequest.current = token; workflowLock.current = true;
    setWorkflowBusy(true); busyListener.current?.(true);
    try {
      releaseSource(); releaseCropped();
      const url = URL.createObjectURL(file); sourceUrl.current = url;
      setCandidate({ file, url, token, opener: document.getElementById(`${fieldId}-browse`), previousPhase: phase === "uploaded" ? "uploaded" : "idle" });
    } catch { fail(token, "Gambar gagal diproses. Silakan coba lagi.", "source_preview"); }
  }

  async function apply(blob: Blob, source: SourceCandidate) {
    if (!current(source.token) || applyLock.current) return;
    applyLock.current = true;
    let stage = "result";
    try {
      const ext = blob.type.split("/")[1] ?? "webp";
      const file = new File([blob], `cropped.${ext}`, { type: blob.type });
      releaseCropped();
      const url = URL.createObjectURL(blob); croppedUrl.current = url;
      setPreview({ url, name: file.name, size: file.size });
      setPhase("uploading"); stage = "session";
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!current(source.token)) return;
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("session_missing");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
      const path = `${pathPrefix}/${Date.now()}-${safeName}`;
      stage = "upload";
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { contentType: blob.type, upsert: false });
      if (!current(source.token)) return;
      if (uploadError) throw uploadError;
      stage = "url";
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      if (!data.publicUrl) throw new Error("public_url_missing");
      onChange(data.publicUrl); setPhase("uploaded"); finish(source.token);
      toast("success", `${errorContext} berhasil diunggah. Simpan entri untuk menggunakan foto ini.`);
    } catch (err) {
      if (!current(source.token)) return;
      const detail = err && typeof err === "object" ? err as { status?: unknown; statusCode?: unknown; code?: unknown } : {};
      const status = Number(detail.status ?? detail.statusCode);
      const message = (err instanceof Error && err.message === "session_missing") || status === 401 ? "Sesi Anda berakhir. Silakan masuk kembali."
        : status === 403 || detail.code === "AccessDenied" || detail.code === "42501" ? "Akun Anda belum memiliki akses untuk mengunggah gambar."
        : stage === "session" || stage === "upload" ? "Gambar gagal diunggah. Periksa koneksi lalu coba lagi." : "Gambar gagal diproses. Silakan coba lagi.";
      fail(source.token, message, stage);
    }
  }

  return <>
    <ImageUploadField id={fieldId} label={label} value={value} preview={preview} phase={phase} accept="image/*"
      helperText="Gambar • Maks. 5 MB. Foto dipotong 1:1 sebelum diunggah; memilih file saja belum mengubah foto."
      error={error || fieldError} disabled={disabled || workflowBusy} onFileSelected={select}
      onRemove={() => {
        if (disabled || workflowLock.current) return;
        releaseSource(); releaseCropped(); setError(""); setPhase("removed"); onChange("");
      }} />
    {candidate && <ImageCropperModal key={candidate.url} imageSrc={candidate.url} sourceName={candidate.file.name} opener={candidate.opener}
      progressText={phase === "uploading" ? "Mengunggah foto…" : "Memproses hasil crop…"}
      onApply={blob => apply(blob, candidate)}
      onError={stage => fail(candidate.token, stage === "source" ? "File tidak dapat dibaca sebagai gambar." : "Gambar gagal diproses saat pemotongan.", stage)}
      onClose={() => {
        if (!current(candidate.token)) return;
        releaseCropped(); setError(""); setPhase(candidate.previousPhase); finish(candidate.token);
      }} />}
  </>;
}
