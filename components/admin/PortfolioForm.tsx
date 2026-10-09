"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, FieldError, inputClass, labelClass } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import { createClient } from "@/utils/supabase/client";
import { savePortfolio } from "@/lib/actions/portfolio";
import { portfolioSchema } from "@/lib/validations/portfolioSchema";
import { PORTFOLIO_KINDS, PORTFOLIO_KIND_LABELS, type PortfolioRow, type PortfolioKind, type PortfolioStatus } from "@/lib/portfolio-types";
import { safePortfolioImageUrl, validatePortfolioImageFile } from "@/lib/portfolio-media";

const textFields = [
  ["title", "Judul", 160], ["summary", "Ringkasan", 500], ["description", "Deskripsi lengkap", 10000],
  ["categoryLabel", "Label kategori", 80], ["organizationName", "Organisasi / pemegang merek", 200],
  ["imageAlt", "Teks alternatif gambar", 200], ["imageCaption", "Keterangan gambar", 300],
  ["sourceReference", "Referensi sumber (internal CMS)", 300],
] as const;

export default function PortfolioForm({ initial }: { initial?: PortfolioRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: initial?.title ?? "", summary: initial?.summary ?? "", description: initial?.description ?? "",
    entryKind: initial?.entry_kind ?? "portfolio" as PortfolioKind,
    categoryLabel: initial?.category_label ?? "", organizationName: initial?.organization_name ?? "",
    imageUrl: initial?.image_url ?? "", imageAlt: initial?.image_alt ?? "", imageCaption: initial?.image_caption ?? "",
    sourceReference: initial?.source_reference ?? "", status: initial?.status ?? "draft" as PortfolioStatus,
    sortOrder: initial?.sort_order ?? 0,
  });
  const busy = pending || uploading;
  const preview = safePortfolioImageUrl(form.imageUrl);

  async function upload(file: File) {
    const invalid = validatePortfolioImageFile(file);
    if (invalid) { toast("error", invalid); return; }
    setUploading(true);
    try {
      // Decode locally so a renamed non-image is rejected before Storage upload.
      const decoded = await createImageBitmap(file);
      decoded.close();
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `portfolio/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      if (!safePortfolioImageUrl(data.publicUrl)) throw new Error("URL media tidak valid");
      setForm(previous => ({ ...previous, imageUrl: data.publicUrl }));
      toast("success", "Gambar diunggah. Simpan entri untuk menggunakan gambar ini.");
    } catch { toast("error", "Gagal mengunggah gambar. Periksa file dan akses media Anda."); }
    finally { setUploading(false); }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = { ...form, ...(initial ? { id: initial.id } : {}) };
    const parsed = portfolioSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message])));
      toast("error", "Periksa kembali isian form.");
      return;
    }
    setErrors({});
    startTransition(async () => {
      try {
        const result = await savePortfolio(input);
        toast(result.success ? "success" : "error", result.message);
        if (result.errors) setErrors(result.errors);
        if (result.success) { router.push("/admin/portfolio"); router.refresh(); }
      } catch { toast("error", "Gagal menyimpan entri. Coba kembali."); }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-5">
      <Card className="p-5 sm:p-6">
        <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2 disabled:opacity-70">
          {textFields.map(([key, label, max]) => (
            <div key={key} className={key === "summary" || key === "description" ? "sm:col-span-2" : ""}>
              <label htmlFor={`portfolio-${key}`} className={labelClass}>{label}{key === "title" ? " *" : ""}</label>
              {key === "summary" || key === "description" ? (
                <textarea id={`portfolio-${key}`} rows={key === "description" ? 6 : 3} maxLength={max} className={inputClass}
                  value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} />
              ) : (
                <input id={`portfolio-${key}`} maxLength={max} required={key === "title"} className={inputClass}
                  value={form[key]} onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} />
              )}
              <FieldError message={errors[key]} />
              {key === "sourceReference" && <p className="mt-1 text-xs text-slate-500">Untuk pencatatan editorial; tidak ditampilkan di halaman publik.</p>}
            </div>
          ))}
          <div>
            <label htmlFor="portfolio-kind" className={labelClass}>Jenis tampilan</label>
            <select id="portfolio-kind" className={inputClass} value={form.entryKind}
              onChange={event => setForm(previous => ({ ...previous, entryKind: event.target.value as PortfolioKind }))}>
              {PORTFOLIO_KINDS.map(kind => <option key={kind} value={kind}>{PORTFOLIO_KIND_LABELS[kind]}</option>)}
            </select>
            <FieldError message={errors.entryKind} />
          </div>
          <div>
            <label htmlFor="portfolio-sort" className={labelClass}>Urutan</label>
            <input id="portfolio-sort" type="number" min={0} max={9999} step={1} required className={inputClass}
              value={form.sortOrder} onChange={event => setForm(previous => ({ ...previous, sortOrder: event.target.valueAsNumber }))} />
            <FieldError message={errors.sortOrder} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="portfolio-status" className={labelClass}>Status publikasi</label>
            <select id="portfolio-status" className={inputClass} value={form.status}
              onChange={event => setForm(previous => ({ ...previous, status: event.target.value as PortfolioStatus }))}>
              <option value="draft">Draft — hanya CMS</option><option value="published">Published — tampil publik</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">Published memerlukan ringkasan dan teks alternatif jika memakai gambar. Perubahan entri Published langsung tampil setelah disimpan.</p>
            <FieldError message={errors.status} />
          </div>
        </fieldset>
      </Card>
      <Card className="space-y-4 p-5 sm:p-6">
        <label htmlFor="portfolio-image" className={labelClass}>Gambar opsional — JPEG, PNG, WebP, maksimal 5 MB</label>
        {preview && <Image src={preview} alt={form.imageAlt || "Pratinjau gambar portofolio"} width={640} height={360} className="max-h-64 w-auto rounded-lg object-contain" />}
        <input id="portfolio-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className={inputClass}
          onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
        {form.imageUrl && <button type="button" disabled={busy} className="text-sm font-semibold text-red-500" onClick={() => setForm(previous => ({ ...previous, imageUrl: "" }))}>Lepas gambar dari entri</button>}
        <FieldError message={errors.imageUrl} />
        <p className="text-xs text-slate-500">Media memakai bucket publik. URL gambar dapat diakses langsung meskipun entri Draft. Melepas gambar atau menghapus entri tidak menghapus file yang mungkin dipakai bersama.</p>
      </Card>
      <button type="submit" disabled={busy} className="rounded-lg bg-[#0EA5A0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0C8C87] disabled:opacity-50">
        {uploading ? "Mengunggah…" : pending ? "Menyimpan…" : "Simpan Entri"}
      </button>
    </form>
  );
}
