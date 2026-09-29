"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { saveHeroSlides } from "@/lib/actions/settings";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { useToast } from "@/components/admin/Toast";
import {
  HERO_MAIN_BRAND_IDS,
  HERO_MAX_SLIDES,
  type HeroSlideInput,
} from "@/lib/validations/heroSchema";
import type { ProductRow } from "@/lib/admin-data";

function createEmpty(): HeroSlideInput {
  return { productId: "" };
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
  const [slides, setSlides] = useState<HeroSlideInput[]>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const productMap = new Map(products.map((product) => [product.id, product]));
  const selectedBrandIds = new Set(
    slides.flatMap((slide) => {
      const brandId = productMap.get(slide.productId)?.brand_id;
      return brandId ? [brandId] : [];
    }),
  );
  const hasUnselectedBrand = HERO_MAIN_BRAND_IDS.some(
    (brandId) => !selectedBrandIds.has(brandId),
  );
  const canAddSlide = slides.length < HERO_MAX_SLIDES && hasUnselectedBrand;

  const update = (index: number, productId: string) => {
    setSlides((prev) => prev.map((slide, i) => (i === index ? { productId } : slide)));
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
    if (!canAddSlide) return;
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
          Pilih hingga 5 produk B2B aktif yang sudah dipublikasikan, maksimal 1 produk dari setiap brand utama.
        </p>
      </div>

      {slides.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Belum ada produk Hero. Beranda akan menampilkan profil perusahaan secara umum.
        </p>
      )}

      <div className="space-y-5">
        {slides.map((slide, i) => {
          const selectedProduct = products.find((p) => p.id === slide.productId);
          const selectedBrandsElsewhere = new Set(
            slides.flatMap((item, index) => {
              if (index === i) return [];
              const brandId = productMap.get(item.productId)?.brand_id;
              return brandId ? [brandId] : [];
            }),
          );
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
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30"
                    aria-label={`Hapus slide ${i + 1}`}
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
                  onChange={(e) => update(i, e.target.value)}
                >
                  <option value="">Pilih Produk...</option>
                  {slide.productId && !selectedProduct && (
                    <option value={slide.productId}>Produk tidak lagi tersedia</option>
                  )}
                  {products.map((p) => {
                    const brandAlreadySelected = Boolean(
                      p.id !== slide.productId
                      && p.brand_id
                      && selectedBrandsElsewhere.has(p.brand_id),
                    );
                    return (
                      <option key={p.id} value={p.id} disabled={brandAlreadySelected}>
                        {p.brand} — {p.name}
                        {brandAlreadySelected ? " (Brand sudah dipilih)" : ""}
                      </option>
                    );
                  })}
                </select>
                {slide.productId && !selectedProduct && (
                  <p className="mt-1 text-xs text-red-500">
                    Produk ini tidak lagi memenuhi syarat dan harus diganti atau dihapus.
                  </p>
                )}
                <FieldError message={errors[`slides.${i}.productId`]} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-5">
        <button
          type="button"
          onClick={add}
          disabled={!canAddSlide}
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
