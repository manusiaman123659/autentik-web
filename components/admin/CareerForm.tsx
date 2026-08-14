"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Wand2 } from "lucide-react";
import { upsertCareer } from "@/lib/actions/careers";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import type { CareerRow } from "@/lib/admin-data";
import {
  careerLocations,
  careerTypes,
  careerBadgeColors,
} from "@/lib/validations/careerSchema";

const listToText = (arr: string[] | undefined): string =>
  (arr ?? []).join("\n");

const textToList = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

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

export default function CareerForm({ initial }: { initial?: CareerRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(initial);

  const [id] = useState(initial?.id ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [location, setLocation] = useState(initial?.location ?? "Office");
  const [type, setType] = useState(initial?.type ?? "Full-time");
  const [typeBadgeColor, setTypeBadgeColor] = useState(
    initial?.type_badge_color ?? "green"
  );
  const [status, setStatus] = useState(initial?.status ?? "open");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [responsibilitiesText, setResponsibilitiesText] = useState(
    listToText(initial?.responsibilities)
  );
  const [requirementsText, setRequirementsText] = useState(
    listToText(initial?.requirements)
  );
  const [benefitsText, setBenefitsText] = useState(
    listToText(initial?.benefits)
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const setField = (key: string, value: string) => {
    if (key === "slug") setSlug(value);
    if (key === "title") setTitle(value);
    if (key === "department") setDepartment(value);
    if (key === "summary") setSummary(value);
    if (key === "description") setDescription(value);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});
    const result = await upsertCareer({
      id: id || undefined,
      slug,
      title,
      department,
      location,
      type,
      typeBadgeColor,
      status,
      sortOrder: Number(sortOrder) || 0,
      summary,
      description,
      responsibilities: textToList(responsibilitiesText),
      requirements: textToList(requirementsText),
      benefits: textToList(benefitsText),
    });
    setBusy(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    if (isEdit) {
      router.refresh();
    } else {
      router.push("/admin/karir");
    }
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

      {/* Inti */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">
          Informasi Posisi
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Judul Posisi *</label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Hardware Engineer"
            />
            <FieldError message={errors.title} />
          </div>
          <div>
            <label className={labelClass}>Departemen *</label>
            <input
              className={inputClass}
              value={department}
              onChange={(e) => setField("department", e.target.value)}
              placeholder="Engineering"
            />
            <FieldError message={errors.department} />
          </div>
          <div>
            <label className={labelClass}>Lokasi *</label>
            <select
              className={inputClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {careerLocations.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <FieldError message={errors.location} />
          </div>
          <div>
            <label className={labelClass}>Tipe Pekerjaan *</label>
            <select
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {careerTypes.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <FieldError message={errors.type} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="open">Terbuka (tampil publik)</option>
              <option value="closed">Ditutup (tidak tampil)</option>
            </select>
            <FieldError message={errors.status} />
          </div>
        </div>
      </section>

      {/* Konten */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">
          Deskripsi Posisi
        </h2>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Ringkasan *</label>
            <textarea
              rows={2}
              className={inputClass}
              value={summary}
              onChange={(e) => setField("summary", e.target.value)}
              placeholder="Ringkasan singkat posisi untuk tampilan list."
            />
            <FieldError message={errors.summary} />
          </div>
          <div>
            <label className={labelClass}>Deskripsi *</label>
            <textarea
              rows={5}
              className={inputClass}
              value={description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Deskripsi lengkap pekerjaan."
            />
            <FieldError message={errors.description} />
          </div>
        </div>
      </section>

      {/* Rincian */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">
          Rincian Lowongan
        </h2>
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Tanggung Jawab Utama</label>
            <textarea
              rows={4}
              className={inputClass}
              value={responsibilitiesText}
              onChange={(e) => setResponsibilitiesText(e.target.value)}
              placeholder="Satu tanggung jawab per baris."
            />
            <p className="mt-1 text-xs text-slate-400">
              Tulis satu item per baris.
            </p>
          </div>
          <div>
            <label className={labelClass}>Kualifikasi & Persyaratan</label>
            <textarea
              rows={4}
              className={inputClass}
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
              placeholder="Satu persyaratan per baris."
            />
            <p className="mt-1 text-xs text-slate-400">
              Tulis satu item per baris.
            </p>
          </div>
          <div>
            <label className={labelClass}>Fasilitas & Benefit</label>
            <textarea
              rows={4}
              className={inputClass}
              value={benefitsText}
              onChange={(e) => setBenefitsText(e.target.value)}
              placeholder="Satu benefit per baris."
            />
            <p className="mt-1 text-xs text-slate-400">
              Tulis satu item per baris.
            </p>
          </div>
        </div>
      </section>

      {/* Pengaturan tambahan */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">
          Pengaturan Tambahan
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
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
                placeholder="hardware-engineer"
              />
              <button
                type="button"
                onClick={() => setSlug(slugify(title))}
                disabled={!title.trim()}
                title="Generate slug otomatis dari judul posisi"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Wand2 size={15} />
                Auto
              </button>
            </div>
            <FieldError message={errors.slug} />
          </div>
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
          <div>
            <label className={labelClass}>Warna Badge</label>
            <select
              className={inputClass}
              value={typeBadgeColor}
              onChange={(e) => setTypeBadgeColor(e.target.value)}
            >
              {careerBadgeColors.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "green"
                    ? "Hijau (Full-time)"
                    : opt === "purple"
                      ? "Ungu (Magang)"
                      : "Biru"}
                </option>
              ))}
            </select>
            <FieldError message={errors.typeBadgeColor} />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-2 pb-10">
        <button
          type="button"
          onClick={() => router.push("/admin/karir")}
          className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isEdit ? "Simpan Perubahan" : "Tambah Lowongan"}
        </button>
      </div>
    </div>
  );
}