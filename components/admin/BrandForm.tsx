"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  Wand2,
} from "lucide-react";
import { upsertBrand } from "@/lib/actions/brands";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import MediaUploadField from "@/components/admin/MediaUploadField";
import { brandSegments } from "@/lib/validations/brandSchema";
import type { BrandRow } from "@/lib/admin-data";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[àáâäãå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôöõ]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ýÿ]/g, "y")
    .replace(/ñ/g, "n")
    .replace(/ç/g, "c")
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

function ColorField({
  label,
  value,
  fallback,
  onChange,
  errorMessage,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
  errorMessage?: string;
}) {
  const normalized = /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return (
    <div>
      <label className={labelClass}>{label} *</label>
      <div className="flex items-stretch gap-2">
        <input
          type="color"
          value={normalized}
          onChange={(e) => onChange(e.target.value)}
          className="h-[42px] w-12 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-1 cursor-pointer"
        />
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
        />
      </div>
      <FieldError message={errorMessage} />
    </div>
  );
}

export default function BrandForm({ initial }: { initial?: BrandRow }) {
  return <BrandFormFields key={initial?.id ?? "new"} initial={initial} />;
}

function BrandFormFields({ initial }: { initial?: BrandRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(initial);
  const initialName = initial?.name ?? "";

  const active = useRef(true);
  const submitLock = useRef(false);
  const logoBusy = useRef({ light: false, dark: false });
  const [uploadVersion, setUploadVersion] = useState(0);
  const [closing, setClosing] = useState(false);

  const [id] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.id ?? "");
  const [segment, setSegment] = useState(initial?.segment ?? "HSE");
  const [segmentColor, setSegmentColor] = useState(
    initial?.segment_color ?? "#0EA5A0"
  );
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [accentColor, setAccentColor] = useState(
    initial?.accent_color ?? "#0EA5A0"
  );
  const [logoLight, setLogoLight] = useState(initial?.logo_light ?? "");
  const [logoDark, setLogoDark] = useState(initial?.logo_dark ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploadingLight, setUploadingLight] = useState(false);
  const [uploadingDark, setUploadingDark] = useState(false);
  const isLogoUploading = uploadingLight || uploadingDark;
  const formErrors = Object.entries(errors).filter(([key]) => key !== "logoLight" && key !== "logoDark");

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const setField = (key: string, value: string) => {
    if (key === "name") setName(value);
    if (key === "slug") setSlug(value);
    if (key === "tagline") setTagline(value);
    if (key === "description") setDescription(value);
    if (key === "logoLight") setLogoLight(value);
    if (key === "logoDark") setLogoDark(value);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const cancel = () => {
    if (!active.current) return;
    active.current = false; setClosing(true);
    setUploadVersion(version => version + 1);
    router.push("/admin/merek");
  };

  const handleSubmit = async () => {
    if (!active.current || busy || isLogoUploading || logoBusy.current.light || logoBusy.current.dark || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setErrors({});
    try {
      const result = await upsertBrand({
        id: id || undefined, name, slug, segment, segmentColor, tagline, description,
        accentColor, logoLight, logoDark, isActive, sortOrder: Number(sortOrder) || 0,
      });
      if (!active.current) return;
      if (!result.success) {
        setErrors(result.errors ?? {}); toast("error", result.message); return;
      }
      toast("success", result.message);
      setUploadVersion(version => version + 1);
      if (isEdit) {
        router.refresh();
      } else {
        active.current = false; setClosing(true); router.push("/admin/merek");
      }
    } catch {
      if (active.current) toast("error", "Gagal menyimpan merek. Silakan coba lagi.");
    } finally {
      submitLock.current = false;
      if (active.current) setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {formErrors.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
            Terdapat kesalahan pada isian:
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            {formErrors.map(([k, v]) => (
              <li key={k} className="text-xs text-red-600 dark:text-red-400">
                {k}: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">
          Informasi Merek
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Nama Merek *</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Talpha"
            />
            {isEdit && name.trim() !== initialName.trim() && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Mengubah nama merek tidak otomatis memperbarui produk yang sudah
                memakai nama lama — produk tersebut bisa berhenti muncul di
                filter brand terkait.
              </p>
            )}
            <FieldError message={errors.name} />
          </div>
          <div>
            <label className={labelClass}>Slug (URL) *</label>
            <div className="flex items-stretch gap-2">
              <input
                className={inputClass}
                value={slug}
                onChange={(e) =>
                  setField(
                    "slug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                  )
                }
                placeholder="talpha"
              />
              <button
                type="button"
                onClick={() => setSlug(slugify(name))}
                disabled={!name.trim()}
                title="Generate slug otomatis dari nama merek"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Wand2 size={15} />
                Auto
              </button>
            </div>
            <FieldError message={errors.slug} />
          </div>
          <div>
            <label className={labelClass}>Segment *</label>
            <select
              className={inputClass}
              value={segment}
              onChange={(e) => setSegment(e.target.value as typeof segment)}
            >
              {brandSegments.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <FieldError message={errors.segment} />
          </div>
          <ColorField
            label="Warna Segment"
            value={segmentColor}
            fallback="#0EA5A0"
            onChange={setSegmentColor}
            errorMessage={errors.segmentColor}
          />
          <ColorField
            label="Warna Aksen"
            value={accentColor}
            fallback="#0EA5A0"
            onChange={setAccentColor}
            errorMessage={errors.accentColor}
          />
          <div>
            <label className={labelClass}>Urutan (sort_order)</label>
            <input
              type="number"
              min={0}
              max={9999}
              className={inputClass}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            />
            <FieldError message={errors.sortOrder} />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded accent-[#0EA5A0]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Aktif & tampil publik (strip brand halaman utama & filter produk)
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">
          Konten & Logo
        </h2>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Tagline</label>
            <input
              className={inputClass}
              value={tagline}
              onChange={(e) => setField("tagline", e.target.value)}
              placeholder="Smart Air Quality Monitoring Devices"
            />
            <FieldError message={errors.tagline} />
          </div>
          <div>
            <label className={labelClass}>Deskripsi</label>
            <textarea
              rows={4}
              className={inputClass}
              value={description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Deskripsi singkat merek."
            />
            <FieldError message={errors.description} />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <MediaUploadField key={`light-${uploadVersion}`} id="brand-logo-light"
              label="Logo Light (mode terang)"
              value={logoLight}
              pathPrefix="brands" errorContext="Logo light merek" previewSurface="contrast"
              disabled={busy || closing} fieldError={errors.logoLight}
              onChange={url => { if (active.current) setField("logoLight", url); }}
              onUploadingChange={uploading => {
                if (!active.current) return;
                logoBusy.current.light = uploading; setUploadingLight(uploading);
              }}
            />
            <MediaUploadField key={`dark-${uploadVersion}`} id="brand-logo-dark"
              label="Logo Dark (mode gelap)"
              value={logoDark}
              pathPrefix="brands" errorContext="Logo dark merek" previewSurface="contrast"
              disabled={busy || closing} fieldError={errors.logoDark}
              onChange={url => { if (active.current) setField("logoDark", url); }}
              onUploadingChange={uploading => {
                if (!active.current) return;
                logoBusy.current.dark = uploading; setUploadingDark(uploading);
              }}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-2 pb-10">
        <button
          type="button"
          onClick={cancel}
          className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy || closing || isLogoUploading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isEdit ? "Simpan Perubahan" : "Tambah Merek"}
        </button>
      </div>
    </div>
  );
}
