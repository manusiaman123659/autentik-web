"use client";

import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react";
import { Badge, Card, inputClass, labelClass } from "./ui";
import { isLocaleDirty, localeStatus, sourceFeatures, sourceSpecs, type LocaleDraft, type LocaleContent } from "@/lib/product-translation-editor";

export type TranslationOperation = "draft" | "published" | "unpublish" | "delete";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0EA5A0] disabled:opacity-50 disabled:cursor-not-allowed";

export default function ProductTranslationEditor({ draft, busy, actionsBusy, currentSourceRevision, onChange, onRebuild, onOperation, onReload }: {
  draft: LocaleDraft; busy: boolean; actionsBusy: boolean; currentSourceRevision: number;
  onChange: (update: Partial<LocaleDraft>) => void;
  onRebuild: (block: "features" | "specs") => void;
  onOperation: (operation: TranslationOperation) => void;
  onReload: () => void;
}) {
  const { source, content, row, locale } = draft;
  const features = sourceFeatures(source); const specs = sourceSpecs(source);
  const stale = row != null && row.source_revision !== source.translation_source_revision;
  const sourceChanged = currentSourceRevision !== source.translation_source_revision;
  const featureMismatch = content.features !== null && content.features.length !== features?.length;
  const specMismatch = content.specs !== null && content.specs.length !== specs?.length;
  const unsafe = !features || !specs || featureMismatch || specMismatch || sourceChanged || draft.blocked;
  const set = <K extends keyof LocaleContent>(field: K, value: LocaleContent[K]) => onChange({ content: { ...content, [field]: value } });
  const paired = (label: string, original: string | null, field: "name" | "description" | "seo_title" | "seo_description", multiline = false) => (
    <div className="grid gap-3 md:grid-cols-2">
      <div><p className={labelClass}>{label} — Indonesia</p><p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">{original || "Belum diisi"}</p></div>
      <div><label htmlFor={`${locale}-${field}`} className={labelClass}>{label} — {locale === "en" ? "English" : "简体中文"}</label>
        {multiline ? <textarea id={`${locale}-${field}`} className={`${inputClass} min-h-28 resize-y`} value={content[field]} onChange={event => set(field, event.target.value)} rows={4} />
          : <input id={`${locale}-${field}`} className={inputClass} value={content[field]} onChange={event => set(field, event.target.value)} />}
        <p className="mt-1 text-xs text-slate-500">Kosongkan untuk menggunakan konten Indonesia.</p>
      </div>
    </div>
  );
  return (
    <div className="max-w-5xl space-y-5" data-translation-editor={locale}>
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Terjemahan {locale === "en" ? "English" : "简体中文"}</h2>
          <div className="flex flex-wrap gap-2"><Badge tone={stale || sourceChanged ? "amber" : row?.status === "published" ? "green" : "slate"} label={sourceChanged ? "Perlu ditinjau ulang" : localeStatus(draft)} />{isLocaleDirty(draft) && <Badge label="Belum disimpan" tone="amber" />}</div>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Konten Indonesia tersimpan · Revisi {source.translation_source_revision}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Perubahan yang belum disimpan di Konten Utama tidak termasuk dalam sumber terjemahan.</p>
        {source.status !== "published" || !source.is_active ? <p className="mt-2 text-xs text-slate-500">Produk utama belum aktif/terbit. Status terjemahan tidak mengaktifkan produk utama.</p> : null}
      </Card>
      {(stale || sourceChanged) && <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <p className="flex items-start gap-2 font-semibold"><AlertTriangle size={18} className="shrink-0" />Konten Indonesia telah berubah. Tinjau ulang terjemahan sebelum menerbitkannya kembali.</p>
        {row && <p className="mt-2">Status tersimpan: {row.status === "published" ? "Terbit" : "Draf"} · Revisi sumber {row.source_revision}</p>}
        <p className="mt-2">Cocokkan isi dan urutan setiap fitur/spesifikasi; jumlah baris yang sama tidak menjamin urutannya tetap.</p>
        {sourceChanged && <p className="mt-2">Sumber terbaru adalah revisi {currentSourceRevision}. Muat ulang data untuk meninjaunya.</p>}
      </div>}
      {draft.message && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">{draft.message}</div>}
      <fieldset disabled={busy} className="space-y-5">
        <Card className="space-y-5 p-4 sm:p-6">{paired("Nama Produk", source.name, "name")}{paired("Deskripsi", source.description, "description", true)}</Card>
        <Card className="space-y-4 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white">Fitur</h3>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={content.features !== null} disabled={!features} onChange={event => event.target.checked ? onRebuild("features") : set("features", null)} />Terjemahkan fitur</label>
          {content.features === null && <p className="text-sm text-slate-500">Gunakan fitur Indonesia.</p>}
          {!features && <p role="alert" className="text-sm text-red-600">Struktur fitur Indonesia tidak valid. Perbaiki Konten Utama sebelum menyimpan terjemahan.</p>}
          {featureMismatch && <div className="space-y-2"><p role="alert" className="text-sm text-amber-700 dark:text-amber-300">Jumlah fitur berubah. Nilai lama tetap tersedia; susun ulang terhadap sumber saat ini.</p><pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-xs dark:bg-slate-950">{JSON.stringify(content.features, null, 2)}</pre><button type="button" className={button} onClick={() => onRebuild("features")}>Susun ulang fitur</button></div>}
          {!featureMismatch && content.features?.map((text, index) => <div key={index} className="grid gap-3 md:grid-cols-2"><p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">{index + 1}. {features?.[index]}</p><div><label htmlFor={`${locale}-feature-${index}`} className={labelClass}>Terjemahan fitur {index + 1}</label><textarea id={`${locale}-feature-${index}`} className={inputClass} value={text} onChange={event => set("features", content.features!.map((value, i) => i === index ? event.target.value : value))} rows={2} /></div></div>)}
          {row?.features && JSON.stringify(row.features) !== JSON.stringify(content.features) && stale && <details><summary className="cursor-pointer text-sm font-semibold">Referensi fitur tersimpan dari revisi lama</summary><pre className="whitespace-pre-wrap break-words p-3 text-xs">{JSON.stringify(row.features, null, 2)}</pre></details>}
        </Card>
        <Card className="space-y-4 p-4 sm:p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white">Spesifikasi</h3>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={content.specs !== null} disabled={!specs} onChange={event => event.target.checked ? onRebuild("specs") : set("specs", null)} />Terjemahkan spesifikasi</label>
          {content.specs === null && <p className="text-sm text-slate-500">Gunakan spesifikasi Indonesia.</p>}
          {!specs && <p role="alert" className="text-sm text-red-600">Struktur spesifikasi Indonesia tidak valid. Perbaiki Konten Utama sebelum menyimpan terjemahan.</p>}
          {specMismatch && <div className="space-y-2"><p role="alert" className="text-sm text-amber-700 dark:text-amber-300">Jumlah spesifikasi berubah. Susun ulang atau gunakan spesifikasi Indonesia.</p><pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-3 text-xs dark:bg-slate-950">{JSON.stringify(content.specs, null, 2)}</pre><button type="button" className={button} onClick={() => onRebuild("specs")}>Susun ulang spesifikasi</button></div>}
          {!specMismatch && content.specs?.map((spec, index) => <div key={index} className="grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 md:grid-cols-2"><div className="break-words rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950"><p className="font-semibold">{index + 1}. {specs?.[index].label}</p><p className="mt-1 whitespace-pre-wrap">{specs?.[index].value}</p></div><div className="space-y-3"><div><label htmlFor={`${locale}-spec-${index}-label`} className={labelClass}>Label spesifikasi {index + 1}</label><input id={`${locale}-spec-${index}-label`} className={inputClass} value={spec.label} onChange={event => set("specs", content.specs!.map((value, i) => i === index ? { ...value, label: event.target.value } : value))} /></div>
            {specs?.[index].value_kind === "text" ? <div><label htmlFor={`${locale}-spec-${index}-value`} className={labelClass}>Nilai teks {index + 1}</label><input id={`${locale}-spec-${index}-value`} className={inputClass} value={spec.value_text} onChange={event => set("specs", content.specs!.map((value, i) => i === index ? { ...value, value_text: event.target.value } : value))} /></div>
              : <div className="text-sm"><p className="flex items-center gap-2 font-semibold"><LockKeyhole size={15} />Nilai teknis: {specs?.[index].value}</p><p className="mt-1 text-xs text-slate-500">Nilai teknis mengikuti produk Indonesia dan tidak dapat diterjemahkan.</p>{spec.value_text && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Referensi nilai terjemahan lama: {spec.value_text}. Nilai ini tidak akan dikirim sebagai pengganti nilai teknis.</p>}</div>}
          </div></div>)}
          {row?.specs && JSON.stringify(row.specs) !== JSON.stringify(content.specs) && stale && <details><summary className="cursor-pointer text-sm font-semibold">Referensi spesifikasi tersimpan dari revisi lama</summary><pre className="whitespace-pre-wrap break-words p-3 text-xs">{JSON.stringify(row.specs, null, 2)}</pre></details>}
        </Card>
        <Card className="space-y-5 p-4 sm:p-6">{paired("Judul SEO", source.seo_title, "seo_title")}{paired("Deskripsi SEO", source.seo_description, "seo_description", true)}</Card>
        {stale && <label className="flex items-start gap-3 rounded-lg border border-amber-300 p-4 text-sm"><input type="checkbox" className="mt-1" checked={draft.reviewedRevision === source.translation_source_revision} onChange={event => onChange({ reviewedRevision: event.target.checked ? source.translation_source_revision : null })} />Saya telah meninjau isi dan urutan semua terjemahan terhadap sumber Indonesia revisi {source.translation_source_revision}.</label>}
        <div className="flex flex-wrap gap-2 pb-6">
          <button type="button" className={`${button} border-[#0EA5A0] text-[#0C8C87] dark:text-teal-300`} disabled={actionsBusy || unsafe || (stale && draft.reviewedRevision !== source.translation_source_revision)} onClick={() => onOperation("draft")}>Simpan Draf</button>
          <button type="button" className={`${button} border-[#0EA5A0] bg-[#0EA5A0] text-white`} disabled={actionsBusy || unsafe || (stale && draft.reviewedRevision !== source.translation_source_revision)} onClick={() => onOperation("published")}>{busy && <Loader2 size={16} className="animate-spin" />}Terbitkan</button>
          <button type="button" className={button} disabled={actionsBusy || !row || row.status !== "published" || draft.blocked} onClick={() => onOperation("unpublish")}>Batalkan Terbit</button>
          <button type="button" className={`${button} text-red-600 dark:text-red-400`} disabled={actionsBusy || !row || draft.blocked} onClick={() => onOperation("delete")}>Hapus Terjemahan</button>
        </div>
      </fieldset>
      <button type="button" className={button} disabled={actionsBusy} onClick={onReload}>Muat ulang data</button>
    </div>
  );
}
