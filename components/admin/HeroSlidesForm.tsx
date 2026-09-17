"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { saveHeroSlides } from "@/lib/actions/settings";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import type { HeroSlideInput } from "@/lib/validations/heroSchema";
import type { ProductRow } from "@/lib/admin-data";

function createEmpty(): HeroSlideInput {
  return {
    productId: "",
    badge: "Produk Unggulan",
    titlePart1Override: null,
    titleHighlightOverride: null,
    titlePart2Override: null,
    subtitleOverride: null,
    ctaLabel: "Lihat Produk",
  };
}

export default function HeroSlidesForm({
  initial,
  products,
}: {
  initial: HeroSlideInput[];
  products: ProductRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [slides, setSlides] = useState<HeroSlideInput[]>(
    initial.length > 0 ? initial : [createEmpty()]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const update = (index: number, field: keyof HeroSlideInput, value: string | null) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const move = (index: number, dir: -1 | 1) => {
    setSlides((prev) => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const remove = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const add = () => {
    if (slides.length >= 3) return;
    setSlides((prev) => [...prev, createEmpty()]);
  };

  const handleSubmit = async () => {
    setBusy(true);
    setErrors({});
    const result = await saveHeroSlides({ slides });
    setBusy(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      toast("error", result.message);
      return;
    }
    toast("success", result.message);
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Hero Homepage</h2>
        <p className="text-xs text-slate-400">
          Kelola slide produk unggulan yang ditampilkan di beranda. Maksimal 3 slide.
        </p>
      </div>

      <div className="space-y-5">
        {slides.map((slide, i) => {
          const selectedProduct = products.find((p) => p.id === slide.productId);
          return (
            <div
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Slide {i + 1}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === slides.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={slides.length <= 1}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Produk picker */}
              <div>
                <label className={labelClass}>Produk B2B</label>
                <select
                  className={inputClass}
                  value={slide.productId}
                  onChange={(e) => update(i, "productId", e.target.value)}
                >
                  <option value="">Pilih Produk...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.is_active}>
                      {p.brand} — {p.name}
                      {!p.is_active ? " (Nonaktif)" : ""}
                    </option>
                  ))}
                </select>
                {selectedProduct && !selectedProduct.is_active && (
                  <p className="mt-1 text-xs text-red-500">
                    Produk ini tidak aktif. Hero akan mengabaikannya di publik.
                  </p>
                )}
                <FieldError message={errors[`slides.${i}.productId`]} />
              </div>

              {/* Badge */}
              <div>
                <label className={labelClass}>Badge</label>
                <input
                  className={inputClass}
                  value={slide.badge}
                  onChange={(e) => update(i, "badge", e.target.value)}
                  placeholder="Produk Unggulan"
                />
              </div>

              {/* Title overrides — 3 fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Judul Baris 1</label>
                  <input
                    className={inputClass}
                    value={slide.titlePart1Override ?? ""}
                    onChange={(e) =>
                      update(i, "titlePart1Override", e.target.value || null)
                    }
                    placeholder="Kosongkan = pakai nama produk"
                  />
                </div>
                <div>
                  <label className={labelClass}>Judul Highlight (warna)</label>
                  <input
                    className={inputClass}
                    value={slide.titleHighlightOverride ?? ""}
                    onChange={(e) =>
                      update(i, "titleHighlightOverride", e.target.value || null)
                    }
                    placeholder="Kosongkan = tanpa highlight"
                  />
                </div>
                <div>
                  <label className={labelClass}>Judul Baris 3</label>
                  <input
                    className={inputClass}
                    value={slide.titlePart2Override ?? ""}
                    onChange={(e) =>
                      update(i, "titlePart2Override", e.target.value || null)
                    }
                    placeholder="Kosongkan = tanpa baris ketiga"
                  />
                </div>
              </div>

              {/* Subtitle override */}
              <div>
                <label className={labelClass}>Subtitle</label>
                <input
                  className={inputClass}
                  value={slide.subtitleOverride ?? ""}
                  onChange={(e) => update(i, "subtitleOverride", e.target.value || null)}
                  placeholder="Kosongkan = pakai deskripsi produk"
                />
              </div>

              {/* CTA Label */}
              <div>
                <label className={labelClass}>Label Tombol CTA</label>
                <input
                  className={inputClass}
                  value={slide.ctaLabel}
                  onChange={(e) => update(i, "ctaLabel", e.target.value)}
                  placeholder="Lihat Produk"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-5">
        <button
          type="button"
          onClick={add}
          disabled={slides.length >= 3}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          Tambah Slide
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Simpan Hero
        </button>
      </div>
    </section>
  );
}
