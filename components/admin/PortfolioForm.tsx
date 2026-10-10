"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, FieldError, inputClass, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import ImageUploadField, { type ImageUploadPhase, type ImageUploadPreview } from "@/components/admin/ImageUploadField";
import { createClient } from "@/utils/supabase/client";
import { savePortfolio } from "@/lib/actions/portfolio";
import { portfolioSchema } from "@/lib/validations/portfolioSchema";
import { PORTFOLIO_KINDS, PORTFOLIO_KIND_LABELS, type PortfolioRow, type PortfolioKind, type PortfolioStatus } from "@/lib/portfolio-types";
import { PORTFOLIO_IMAGE_TYPES, safePortfolioImageUrl, validatePortfolioImageFile } from "@/lib/portfolio-media";
import { logError } from "@/lib/logger";

const textFields = [
  ["title", "Judul", 160], ["summary", "Ringkasan", 500], ["description", "Deskripsi lengkap", 10000],
  ["categoryLabel", "Label kategori", 80], ["organizationName", "Organisasi / pemegang merek", 200],
  ["sourceReference", "Referensi sumber (internal CMS)", 300],
] as const;

function fieldId(key: string) {
  return ({ entryKind: "portfolio-kind", sortOrder: "portfolio-sort", imageUrl: "portfolio-image-browse" } as Record<string, string>)[key] ?? `portfolio-${key}`;
}

export default function PortfolioForm({ initial }: { initial?: PortfolioRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<ImageUploadPhase>("idle");
  const [localPreview, setLocalPreview] = useState<ImageUploadPreview | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [formError, setFormError] = useState("");
  const uploadLock = useRef(false);
  const saveLock = useRef(false);
  const mounted = useRef(true);
  const previewUrl = useRef<string | null>(null);
  const focusError = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: initial?.title ?? "", summary: initial?.summary ?? "", description: initial?.description ?? "",
    entryKind: initial?.entry_kind ?? "portfolio" as PortfolioKind,
    categoryLabel: initial?.category_label ?? "", organizationName: initial?.organization_name ?? "",
    imageUrl: initial?.image_url ?? "", imageAlt: initial?.image_alt ?? "", imageCaption: initial?.image_caption ?? "",
    sourceReference: initial?.source_reference ?? "", status: initial?.status ?? "draft" as PortfolioStatus,
    sortOrder: initial?.sort_order ?? 0,
  });
  const busy = pending || phase === "validating" || phase === "uploading";
  const altRequired = form.status === "published" && Boolean(form.imageUrl);
  const altError = errors.imageAlt || (altRequired && !form.imageAlt.trim() ? "Teks alternatif gambar wajib diisi untuk publikasi" : undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    };
  }, []);

  useEffect(() => {
    // Server-action errors must focus controls only after pending has cleared.
    if (busy || !focusError.current) return;
    focusError.current = false;
    const target = document.getElementById(fieldId(Object.keys(errors)[0] ?? "")) ?? document.getElementById("portfolio-error-summary");
    target?.focus(); target?.scrollIntoView({ block: "center" });
  }, [busy, errors, formError]);

  function releasePreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setLocalPreview(null);
  }

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
    setErrors(previous => {
      const next = { ...previous }; delete next[key];
      if (key === "status" || key === "imageUrl") delete next.imageAlt;
      return next;
    });
    setFormError("");
  }

  function showErrors(fieldErrors: Record<string, string>, message = "") {
    focusError.current = true;
    setErrors(fieldErrors); setFormError(message);
  }

  async function upload(file: File) {
    if (uploadLock.current || saveLock.current) return;
    setUploadError("");
    const invalid = validatePortfolioImageFile(file);
    if (invalid) {
      setUploadError(!(PORTFOLIO_IMAGE_TYPES as readonly string[]).includes(file.type)
        ? "Format gambar harus JPEG, PNG, atau WebP." : file.size <= 0 ? "File gambar kosong." : "Ukuran gambar maksimal 5 MB.");
      setPhase("error"); return;
    }
    uploadLock.current = true;
    setPhase("validating");
    let stage = "preview";
    try {
      releasePreview();
      const url = URL.createObjectURL(file); previewUrl.current = url;
      setLocalPreview({ url, name: file.name, size: file.size });
      // Decode locally so a renamed non-image is rejected before Storage upload.
      stage = "decode";
      const decoded = await createImageBitmap(file);
      const dimensions = { width: decoded.width, height: decoded.height };
      decoded.close();
      if (!mounted.current) return;
      setLocalPreview({ url, name: file.name, size: file.size, ...dimensions });
      stage = "path";
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `portfolio/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      stage = "session";
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!mounted.current) return;
      if (!sessionData.session) throw new Error("session_missing");
      stage = "upload"; setPhase("uploading");
      const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      if (!mounted.current) return;
      stage = "url";
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      if (!safePortfolioImageUrl(data.publicUrl)) throw new Error("URL media tidak valid");
      setField("imageUrl", data.publicUrl);
      setPhase("uploaded");
      toast("success", "Gambar diunggah. Simpan entri untuk menggunakan gambar ini.");
    } catch (error) {
      if (!mounted.current) return;
      const detail = error && typeof error === "object" ? error as { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown } : {};
      const status = Number(detail.status ?? detail.statusCode);
      const denied = status === 403 || detail.code === "AccessDenied" || detail.code === "42501";
      const sessionMissing = error instanceof Error && error.message === "session_missing";
      setUploadError(stage === "decode" ? "File tidak dapat dibaca sebagai gambar."
        : sessionMissing || status === 401 ? "Sesi Anda berakhir. Silakan masuk kembali."
        : denied ? "Akun Anda belum memiliki akses untuk mengunggah gambar."
        : stage === "upload" || stage === "session" ? "Gambar gagal diunggah. Periksa koneksi lalu coba lagi."
        : "Gambar gagal diproses. Silakan coba lagi.");
      // Log only stage/code, never the raw response, session or credentials.
      logError("portfolio.image_upload", "Image processing failed", {
        stage, status: Number.isFinite(status) ? status : undefined,
        code: typeof detail.code === "string" && /^[A-Za-z0-9_]{1,80}$/.test(detail.code) ? detail.code : undefined,
      });
      releasePreview(); setPhase("error");
    } finally { uploadLock.current = false; }
  }

  function removeImage() {
    if (uploadLock.current || saveLock.current) return;
    releasePreview(); setUploadError(""); setField("imageUrl", ""); setPhase("removed");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (uploadLock.current || saveLock.current) return;
    const input = { ...form, ...(initial ? { id: initial.id } : {}) };
    const parsed = portfolioSchema.safeParse(input);
    if (!parsed.success) {
      showErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message])));
      toast("error", "Periksa kembali isian form.");
      return;
    }
    setErrors({}); setFormError(""); saveLock.current = true;
    startTransition(async () => {
      try {
        const result = await savePortfolio(input);
        if (!mounted.current) return;
        toast(result.success ? "success" : "error", result.message);
        if (!result.success) showErrors(result.errors ?? {}, result.message);
        if (result.success) { setPhase("idle"); router.push("/admin/portfolio"); router.refresh(); }
      } catch {
        if (mounted.current) showErrors({}, "Gagal menyimpan entri. Coba kembali.");
      } finally { saveLock.current = false; }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-4xl space-y-5">
      {(formError || Object.keys(errors).length > 0) && <div id="portfolio-error-summary" role="alert" tabIndex={-1}
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
        <p className="font-semibold">{formError || "Ada isian yang perlu diperbaiki sebelum menyimpan."}</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {Object.entries(errors).map(([key, message]) => <li key={key}><a className="underline" href={`#${fieldId(key)}`}
            onClick={() => document.getElementById(fieldId(key))?.focus()}>{message}</a></li>)}
        </ul>
      </div>}
      <Card className="p-5 sm:p-6">
        <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2 disabled:opacity-70">
          {textFields.map(([key, label, max]) => (
            <div key={key} className={key === "summary" || key === "description" ? "sm:col-span-2" : ""}>
              <label htmlFor={`portfolio-${key}`} className={labelClass}>{label}{key === "title" ? " *" : ""}</label>
              {key === "summary" || key === "description" ? (
                <textarea id={`portfolio-${key}`} rows={key === "description" ? 6 : 3} maxLength={max} className={inputClass}
                  aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `portfolio-${key}-error` : undefined}
                  value={form[key]} onChange={event => setField(key, event.target.value)} />
              ) : (
                <input id={`portfolio-${key}`} maxLength={max} required={key === "title"} className={inputClass}
                  aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `portfolio-${key}-error` : undefined}
                  value={form[key]} onChange={event => setField(key, event.target.value)} />
              )}
              <div id={`portfolio-${key}-error`}><FieldError message={errors[key]} /></div>
              {key === "sourceReference" && <p className="mt-1 text-xs text-slate-500">Untuk pencatatan editorial; tidak ditampilkan di halaman publik.</p>}
            </div>
          ))}
          <div>
            <label htmlFor="portfolio-kind" className={labelClass}>Jenis tampilan</label>
            <select id="portfolio-kind" className={inputClass} value={form.entryKind}
              aria-invalid={Boolean(errors.entryKind)} aria-describedby={errors.entryKind ? "portfolio-kind-error" : undefined}
              onChange={event => setField("entryKind", event.target.value as PortfolioKind)}>
              {PORTFOLIO_KINDS.map(kind => <option key={kind} value={kind}>{PORTFOLIO_KIND_LABELS[kind]}</option>)}
            </select>
            <div id="portfolio-kind-error"><FieldError message={errors.entryKind} /></div>
          </div>
          <div>
            <label htmlFor="portfolio-sort" className={labelClass}>Urutan</label>
            <input id="portfolio-sort" type="number" min={0} max={9999} step={1} required className={inputClass}
              aria-invalid={Boolean(errors.sortOrder)} aria-describedby={errors.sortOrder ? "portfolio-sort-error" : undefined}
              value={form.sortOrder} onChange={event => setField("sortOrder", event.target.valueAsNumber)} />
            <div id="portfolio-sort-error"><FieldError message={errors.sortOrder} /></div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="portfolio-status" className={labelClass}>Status publikasi</label>
            <select id="portfolio-status" className={inputClass} value={form.status}
              aria-invalid={Boolean(errors.status)} aria-describedby={errors.status ? "portfolio-status-error" : undefined}
              onChange={event => setField("status", event.target.value as PortfolioStatus)}>
              <option value="draft">Draft — hanya CMS</option><option value="published">Published — tampil publik</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">Published memerlukan ringkasan dan teks alternatif jika memakai gambar. Perubahan entri Published langsung tampil setelah disimpan.</p>
            <div id="portfolio-status-error"><FieldError message={errors.status} /></div>
          </div>
        </fieldset>
      </Card>
      <Card className="p-5 sm:p-6">
        <section aria-label="Gambar portfolio" className="space-y-4">
        <ImageUploadField id="portfolio-image" label="Gambar opsional" value={safePortfolioImageUrl(form.imageUrl) ?? ""}
          preview={localPreview} phase={phase} accept={PORTFOLIO_IMAGE_TYPES.join(",")}
          helperText="JPEG, PNG, WebP • Maks. 5 MB" error={uploadError || errors.imageUrl} disabled={busy}
          onFileSelected={file => { void upload(file); }} onRemove={removeImage} />
        <div>
          <label htmlFor="portfolio-imageAlt" className={labelClass}>Teks alternatif (alt){altRequired ? " *" : ""}</label>
          <input id="portfolio-imageAlt" maxLength={200} disabled={busy} className={inputClass} value={form.imageAlt}
            aria-required={altRequired} aria-invalid={Boolean(altError)} aria-describedby="portfolio-imageAlt-help portfolio-imageAlt-error"
            onChange={event => setField("imageAlt", event.target.value)} />
          <p id="portfolio-imageAlt-help" className="mt-1 text-xs text-slate-500">Jelaskan isi gambar. Wajib untuk gambar pada konten Published; opsional untuk Draft.</p>
          <div id="portfolio-imageAlt-error"><FieldError message={altError} /></div>
        </div>
        <div>
          <label htmlFor="portfolio-imageCaption" className={labelClass}>Keterangan gambar</label>
          <input id="portfolio-imageCaption" maxLength={300} disabled={busy} className={inputClass} value={form.imageCaption}
            aria-invalid={Boolean(errors.imageCaption)} aria-describedby={errors.imageCaption ? "portfolio-imageCaption-error" : undefined}
            onChange={event => setField("imageCaption", event.target.value)} />
          <div id="portfolio-imageCaption-error"><FieldError message={errors.imageCaption} /></div>
        </div>
        <p className="text-xs text-slate-500">Media memakai bucket publik. URL gambar dapat diakses langsung meskipun entri Draft. Melepas gambar atau menghapus entri tidak menghapus file yang mungkin dipakai bersama.</p>
        </section>
      </Card>
      <button type="submit" disabled={busy} className="rounded-lg bg-[#0EA5A0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0C8C87] disabled:opacity-50">
        {phase === "validating" ? "Memeriksa gambar…" : phase === "uploading" ? "Mengunggah…" : pending ? "Menyimpan…" : "Simpan Entri"}
      </button>
    </form>
  );
}
