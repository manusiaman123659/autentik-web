"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Upload,
  Wand2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  FileText,
  Box,
} from "lucide-react";
import { upsertProduct } from "@/lib/actions/products";
import { upsertTechnicalDocument, deleteTechnicalDocument } from "@/lib/actions/technicalDocuments";
import TechnicalDocsManager from "@/components/admin/TechnicalDocsManager";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { createClient } from "@/utils/supabase/client";
import {
  FULFILLMENT_TYPE_LABELS,
  type FulfillmentType,
  type ProductType,
} from "@/lib/validations/productSchema";
import type { BrandRow, ProductRow, TechDocRow } from "@/lib/admin-data";

interface FeatureInput {
  label: string;
  value: string;
}

interface TechDocItem {
  id?: string;
  title: string;
  fileType: string;
  fileUrl: string;
  fileSizeKb: number | null;
  requiresLead: boolean;
}

interface VariantRow {
  id?: string;
  label: string;
  sku: string;
  price_override: string;
  stock: string;
  variant_group: string;
}

export interface ProductFormValues {
  id?: string;
  productType: ProductType;
  slug: string;
  name: string;
  brand: string;
  brandId: string;
  category: string;
  description: string;
  brandColor: string;
  categoryColor: string;
  imageUrl: string;
  brochureUrl: string;
  model3dUrl: string;
  features: string[];
  specs: FeatureInput[];
  fulfillmentType: FulfillmentType;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
  sku?: string;
  price?: string;
  compareAtPrice?: string;
  weightGrams?: string;
  stock?: string;
  lowStockThreshold?: string;
  variants: VariantRow[];
  isStoreVisible: boolean;
}

function toFormValues(product: ProductRow | undefined, productType: ProductType): ProductFormValues {
  return {
    id: product?.id,
    productType,
    slug: product?.slug ?? "",
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    brandId: product?.brand_id ?? "",
    category: product?.category ?? "",
    description: product?.description ?? "",
    brandColor: product?.brand_color ?? "#0EA5A0",
    categoryColor: product?.category_color ?? "#0B1F3A",
    imageUrl: product?.image_url ?? "",
    brochureUrl: product?.brochure_url ?? "",
    model3dUrl: product?.model_3d_url ?? "",
    features: Array.isArray(product?.features)
      ? product.features.map((f) => String(f ?? "")).filter(Boolean)
      : [],
    specs: Array.isArray(product?.specs)
      ? product.specs.map((s) => ({ label: s?.label ?? "", value: s?.value ?? "" }))
      : [],
    fulfillmentType: (product?.fulfillment_type as FulfillmentType | null) ?? "ready_stock",
    isActive: product?.is_active ?? true,
    seoTitle: product?.seo_title ?? "",
    seoDescription: product?.seo_description ?? "",
    sku: product?.sku ? String(product.sku) : "",
    price: product?.price != null ? String(product.price) : "",
    compareAtPrice: product?.compare_at_price != null ? String(product.compare_at_price) : "",
    weightGrams: product?.weight_grams != null ? String(product.weight_grams) : "",
    stock: product?.stock != null ? String(product.stock) : "",
    lowStockThreshold: product?.low_stock_threshold != null ? String(product.low_stock_threshold) : "5",
    variants: [],
    isStoreVisible: product?.is_store_visible ?? true,
  };
}

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const normalizeHex = (value: string, fallback: string) => {
  const v = value.trim().toLowerCase();
  if (/^[0-9a-f]{6}$/.test(v)) return `#${v}`;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  return fallback;
};

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
  const normalized = /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <input
            type="color"
            className="w-12 h-11 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
            value={normalized}
            onChange={(e) => onChange(e.target.value)}
          />
          <span
            className="pointer-events-none absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full border border-slate-200 dark:border-slate-700"
            style={{ background: normalized }}
          />
        </div>
        <input
          className={`${inputClass} font-mono`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(normalizeHex(e.target.value, fallback))}
          placeholder="cth. #0EA5A0"
          maxLength={7}
        />
      </div>
      <FieldError message={errorMessage} />
    </div>
  );
}

interface RowDragProps {
  index: number;
  count: number;
  onItemDrop: (source: number, target: number) => void;
  onMove: (source: number, target: number) => void;
}

function RowDragHandle({ index, count, onItemDrop, onMove }: RowDragProps) {
  const dragSourceRef = useRef<number | null>(null);
  return (
    <div className="mt-2.5 flex items-center gap-0.5 flex-shrink-0">
      <span
        draggable
        onDragStart={(e) => {
          dragSourceRef.current = index;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(index));
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const source = dragSourceRef.current ?? Number(e.dataTransfer.getData("text/plain"));
          dragSourceRef.current = null;
          if (source === index) return;
          onItemDrop(source, index);
        }}
        onDragEnd={() => {
          dragSourceRef.current = null;
        }}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
        title="Tahan & seret untuk mengubah urutan"
      >
        <GripVertical size={16} />
      </span>
      <button
        type="button"
        onClick={() => onMove(index, index - 1)}
        disabled={index === 0}
        className="p-0.5 text-slate-300 hover:text-[#0EA5A0] disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
        aria-label="Pindah ke atas"
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMove(index, index + 1)}
        disabled={index === count - 1}
        className="p-0.5 text-slate-300 hover:text-[#0EA5A0] disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
        aria-label="Pindah ke bawah"
      >
        <ArrowDown size={14} />
      </button>
    </div>
  );
}

export default function ProductForm({
  productType,
  initial,
  brands = [],
  initialDocuments = [],
  initialVariants = [],
}: {
  productType: ProductType;
  initial?: ProductRow;
  brands?: BrandRow[];
  initialDocuments?: TechDocRow[];
  initialVariants?: VariantRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(() => ({
    ...toFormValues(initial, productType),
    variants: initialVariants,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [brochureUploading, setBrochureUploading] = useState(false);
  const [brochureUploadError, setBrochureUploadError] = useState("");
  const [modelUploading, setModelUploading] = useState(false);
  const [modelUploadError, setModelUploadError] = useState("");
  const [documents, setDocuments] = useState<TechDocItem[]>(
    initialDocuments.map((d) => ({
      id: d.id,
      title: d.title,
      fileType: d.file_type,
      fileUrl: d.file_url,
      fileSizeKb: d.file_size_kb,
      requiresLead: d.requires_lead,
    })),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brochureInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const brochureFilename = decodeURIComponent(form.brochureUrl.split("/").pop() ?? "") || "brosur.pdf";
  const modelFilename = decodeURIComponent(form.model3dUrl.split("/").pop() ?? "") || "model.glb";

  const isSparepart = productType === "sparepart";
  const isNonReady = form.fulfillmentType !== "ready_stock";

  const brandSelection =
    (brands.find((b) => b.id === form.brandId) ? form.brandId : "") ||
    (brands.find((b) => b.name === form.brand)?.id ?? "");

  const handleBrandSelect = (value: string) => {
    if (value === "__custom__") {
      set("brandId", "");
      return;
    }
    const brand = brands.find((b) => b.id === value);
    if (brand) {
      set("brandId", brand.id);
      set("brand", brand.name);
    }
  };

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const setSpec = (index: number, key: "label" | "value", value: string) => {
    setForm((prev) => ({
      ...prev,
      specs: prev.specs.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    }));
  };

  const setFeature = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? value : f)),
    }));
  };

  const setVariant = (index: number, key: keyof VariantRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  };

  const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= arr.length || from === to) return arr;
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const reorderAction = <T,>(
    key: "features" | "specs" | "variants",
    source: number,
    target: number
  ) => {
    setForm((prev) => {
      const list = prev[key] as unknown as T[];
      return { ...prev, [key]: moveItem(list, source, target) as never };
    });
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar (PNG, JPG, WEBP, dll).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran gambar maksimal 5MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setUploadError("Sesi Anda telah berakhir. Silakan masuk kembali.");
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
      const path = `products/${productType}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        if (error.message.toLowerCase().includes("row-level security")) {
          setUploadError("Gagal mengunggah: kebijakan akses storage belum diterapkan di Supabase (jalankan migrasi 0004).");
        } else {
          setUploadError("Gagal mengunggah gambar. " + error.message);
        }
        return;
      }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      set("imageUrl", data.publicUrl);
    } catch {
      setUploadError("Terjadi kesalahan saat mengunggah gambar.");
} finally {
      setUploading(false);
    }
  };

  const handleBrochureChange = async (file: File | undefined) => {
    if (!file) return;
    setBrochureUploadError("");
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setBrochureUploadError("File harus berupa PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBrochureUploadError("Ukuran file PDF maksimal 10MB.");
      return;
    }
    setBrochureUploading(true);
    try {
      const publicUrl = await uploadToMedia(file, {
        pathPrefix: `brochures/${productType}`,
        contentType: "application/pdf",
        errorContext: "PDF",
      });
      set("brochureUrl", publicUrl);
    } catch (e) {
      setBrochureUploadError(e instanceof Error ? e.message : "Terjadi kesalahan saat mengunggah PDF.");
    } finally {
      setBrochureUploading(false);
    }
  };

  const handleModelChange = async (file: File | undefined) => {
    if (!file) return;
    setModelUploadError("");
    const isGlb = /\.glb$/i.test(file.name);
    if (!isGlb) {
      setModelUploadError("File harus berupa model 3D (.glb).");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setModelUploadError("Ukuran file model 3D maksimal 25MB.");
      return;
    }
    setModelUploading(true);
    try {
      const publicUrl = await uploadToMedia(file, {
        pathPrefix: `models/${productType}`,
        contentType: "model/gltf-binary",
        errorContext: "model 3D",
      });
      set("model3dUrl", publicUrl);
    } catch (e) {
      setModelUploadError(e instanceof Error ? e.message : "Terjadi kesalahan saat mengunggah model 3D.");
    } finally {
      setModelUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});

    // TODO: kirim variantsPayload ke upsert_product_variants RPC di
    // langkah berikutnya (server action belum di-wire)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- akan dipakai untuk RPC upsert_product_variants di langkah berikutnya
    const variantsPayload = form.variants.filter((v) => v.label.trim());

    // Exclude variants dari payload upsertProduct — Zod schema lama
    // (productSchema) masih expect struktur {name, options: string[]},
    // sedangkan form sekarang pakai VariantRow[]. Variants akan diproses
    // terpisah via upsert_product_variants RPC.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- sengaja di-destructure agar tidak ikut ke payload upsertProduct
    const { variants: _excluded, ...payload } = {
      ...form,
      productType,
      specs: form.specs.filter((s) => s.label.trim() || s.value.trim()),
      features: form.features.filter((f) => f.trim()),
    };

    const result = await upsertProduct(payload);
    setSaving(false);
    if (!result.success) {
      setErrors(result.errors ?? {});
      return;
    }

    const productId = form.id || (result as { productId?: string }).productId;
    if (productId && !isSparepart) {
      const existingIds = initialDocuments.map((d) => d.id).filter(Boolean);
      const currentIds = documents.filter((d) => d.id).map((d) => d.id);

      for (const docId of existingIds) {
        if (!currentIds.includes(docId)) {
          await deleteTechnicalDocument(docId!, productId);
        }
      }

      for (const doc of documents) {
        if (doc.title.trim() && doc.fileUrl) {
          await upsertTechnicalDocument({
            id: doc.id,
            productId,
            title: doc.title,
            fileType: doc.fileType,
            fileUrl: doc.fileUrl,
            fileSizeKb: doc.fileSizeKb ?? undefined,
            requiresLead: doc.requiresLead,
          });
        }
      }
    }

    router.push(isSparepart ? "/admin/sparepart" : "/admin/produk");
    router.refresh();
  };

  return (
    <div className="max-w-4xl space-y-6">
      {Object.keys(errors).length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Terdapat kesalahan pada isian:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k} className="text-xs text-red-600 dark:text-red-400">
                {k}: {v}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">Informasi Dasar</h2>
        <div className="grid sm:grid-cols-2 gap-5">
<div>
            <label className={labelClass}>{isSparepart ? "Nama Sparepart" : "Nama Produk"}</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={isSparepart ? "Sensor Ultra Sonik" : "Nama produk"}
            />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label className={labelClass}>Slug (URL)</label>
            <div className="flex items-stretch gap-2">
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="nama-produk"
              />
              <button
                type="button"
                onClick={() => set("slug", slugify(form.name))}
                disabled={!form.name.trim()}
                title={`Generate slug otomatis dari nama ${isSparepart ? "sparepart" : "produk"}`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:border-[#0EA5A0] hover:text-[#0EA5A0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Wand2 size={15} />
                Auto
              </button>
            </div>
            <FieldError message={errors.slug} />
          </div>
<div>
            <label className={labelClass}>Merek</label>
            <select
              className={inputClass}
              value={brandSelection || "__custom__"}
              onChange={(e) => handleBrandSelect(e.target.value)}
            >
              {brands.length === 0 && (
                <option value="__custom__" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  — Belum ada merek terdaftar —
                </option>
              )}
              <option value="__custom__" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                Merek lain… (tulis manual)
              </option>
              {brands.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {b.name}
                  {b.is_active ? "" : " (nonaktif)"}
                </option>
              ))}
            </select>
            {brandSelection ? (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Merek {form.brand} tertaut ke data merek terdaftar — nama diisi otomatis.
              </p>
            ) : (
              <input
                className={`${inputClass} mt-2`}
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="Talpha"
              />
            )}
            <FieldError message={errors.brand} />
            {isSparepart && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Merek unit yang kompatibel dengan sparepart ini (mis. Talpha, Cylab, Ullun, Epal).
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Kategori</label>
            <input className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="IoT Monitoring" />
            <FieldError message={errors.category} />
          </div>
          <div>
            <label className={labelClass}>Metode Pemenuhan</label>
            <select
              className={inputClass}
              value={form.fulfillmentType}
              onChange={(e) => set("fulfillmentType", e.target.value as FulfillmentType)}
            >
              {(Object.keys(FULFILLMENT_TYPE_LABELS) as FulfillmentType[]).map((ft) => (
                <option key={ft} value={ft} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {FULFILLMENT_TYPE_LABELS[ft]}
                </option>
              ))}
            </select>
            <FieldError message={errors.fulfillmentType} />
          </div>
          <ColorField
            label="Warna Merek"
            value={form.brandColor}
            fallback="#0EA5A0"
            onChange={(hex) => set("brandColor", hex)}
            errorMessage={errors.brandColor}
          />
          <ColorField
            label="Warna Kategori"
            value={form.categoryColor}
            fallback="#0B1F3A"
            onChange={(hex) => set("categoryColor", hex)}
            errorMessage={errors.categoryColor}
          />
          <div className="sm:col-span-2">
            <label className={labelClass}>Gambar Produk</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleFileChange(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-[#0EA5A0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
            >
              {form.imageUrl ? (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl}
                    alt=""
                    className="w-full h-52 object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 text-transparent group-hover:bg-black/40 group-hover:text-white transition-colors font-semibold text-sm">
                    <Upload size={18} />
                    Ubah gambar
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
                  {uploading ? (
                    <Loader2 size={28} className="animate-spin text-[#0EA5A0]" />
                  ) : (
                    <Upload size={28} className="text-slate-400" />
                  )}
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {uploading ? "Mengunggah..." : "Pilih & Unggah Gambar"}
                  </p>
                  <p className="text-xs text-slate-400">
                    PNG, JPG, WEBP — maksimal 5MB
                  </p>
                </div>
              )}
            </button>
            {form.imageUrl && (
              <button
                type="button"
                onClick={() => set("imageUrl", "")}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline"
              >
                <Trash2 size={14} />
                Hapus gambar
              </button>
            )}
            <FieldError message={uploadError || errors.imageUrl} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Deskripsi</label>
            <textarea
              className={`${inputClass} min-h-[110px]`}
              value={form.description}
onChange={(e) => set("description", e.target.value)}
              placeholder={isSparepart ? "Deskripsi sparepart" : "Deskripsi produk"}
            />
            <FieldError message={errors.description} />
          </div>
        </div>
      </section>

      {!isSparepart && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Brosur / Katalog (opsional)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Unggah PDF brosur produk yang bisa diunduh pelanggan dari halaman detail produk. Maksimal 10MB.
          </p>
          <input
            ref={brochureInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              void handleBrochureChange(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {form.brochureUrl ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={20} className="text-[#0EA5A0] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {brochureFilename}
                  </p>
                  <button
                    type="button"
                    onClick={() => brochureInputRef.current?.click()}
                    disabled={brochureUploading}
                    className="text-xs font-semibold text-[#0EA5A0] hover:underline disabled:opacity-60"
                  >
                    {brochureUploading ? "Mengunggah..." : "Ganti file"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => set("brochureUrl", "")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline flex-shrink-0"
              >
                <Trash2 size={14} />
                Hapus
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => brochureInputRef.current?.click()}
              disabled={brochureUploading}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-[#0EA5A0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center justify-center gap-2 py-8 px-4">
                {brochureUploading ? (
                  <Loader2 size={24} className="animate-spin text-[#0EA5A0]" />
                ) : (
                  <FileText size={24} className="text-slate-400" />
                )}
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {brochureUploading ? "Mengunggah..." : "Pilih & Unggah PDF Brosur"}
                </p>
                <p className="text-xs text-slate-400">PDF — maksimal 10MB</p>
              </div>
            </button>
          )}
          <FieldError message={brochureUploadError || errors.brochureUrl} />
        </section>
      )}

      {!isSparepart && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Model 3D (opsional)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Unggah file model 3D jadi (.glb) untuk viewer interaktif di halaman detail produk. Maksimal 25MB.
          </p>
          <input
            ref={modelInputRef}
            type="file"
            accept=".glb,model/gltf-binary"
            className="hidden"
            onChange={(e) => {
              void handleModelChange(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {form.model3dUrl ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Box size={20} className="text-[#0EA5A0] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {modelFilename}
                  </p>
                  <button
                    type="button"
                    onClick={() => modelInputRef.current?.click()}
                    disabled={modelUploading}
                    className="text-xs font-semibold text-[#0EA5A0] hover:underline disabled:opacity-60"
                  >
                    {modelUploading ? "Mengunggah..." : "Ganti file"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => set("model3dUrl", "")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline flex-shrink-0"
              >
                <Trash2 size={14} />
                Hapus
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => modelInputRef.current?.click()}
              disabled={modelUploading}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-[#0EA5A0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center justify-center gap-2 py-8 px-4">
                {modelUploading ? (
                  <Loader2 size={24} className="animate-spin text-[#0EA5A0]" />
                ) : (
                  <Box size={24} className="text-slate-400" />
                )}
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {modelUploading ? "Mengunggah..." : "Pilih & Unggah Model 3D (.glb)"}
                </p>
                <p className="text-xs text-slate-400">GLB — maksimal 25MB</p>
              </div>
            </button>
          )}
          <FieldError message={modelUploadError || errors.model3dUrl} />
        </section>
      )}

      {!isSparepart && form.id && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Dokumen Teknis</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Kelola dokumen teknis (datasheet, manual, CAD, sertifikat, firmware) yang bisa diunduh oleh pelanggan B2B.
          </p>
          <TechnicalDocsManager
            productId={form.id}
            documents={documents}
            onChange={setDocuments}
          />
        </section>
      )}

      {isSparepart && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">Stok & Harga Jual</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>SKU</label>
              <input className={inputClass} value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} placeholder="TAL-PRB-001" />
              <FieldError message={errors.sku} />
            </div>
            <div>
              <label className={labelClass}>{isNonReady ? "Harga Estimasi (opsional)" : "Harga (Rp)"}</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.price ?? ""}
                onChange={(e) => set("price", e.target.value)}
                placeholder={isNonReady ? "0" : "150000"}
              />
              <FieldError message={errors.price} />
            </div>
            <div>
              <label className={labelClass}>Harga Coret (opsional)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.compareAtPrice ?? ""}
                onChange={(e) => set("compareAtPrice", e.target.value)}
                placeholder="200000"
              />
            </div>
            <div>
              <label className={labelClass}>Berat (gram)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.weightGrams ?? ""}
                onChange={(e) => set("weightGrams", e.target.value)}
                placeholder="500"
              />
              <FieldError message={errors.weightGrams} />
            </div>
{!isNonReady && (
              <div>
                <label className={labelClass}>Stok</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.stock ?? ""}
                  onChange={(e) => set("stock", e.target.value)}
                  placeholder="10"
                />
                <FieldError message={errors.stock} />
              </div>
            )}
            <div>
              <label className={labelClass}>Batas Stok Menipis</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.lowStockThreshold ?? "5"}
                onChange={(e) => set("lowStockThreshold", e.target.value)}
                placeholder="5"
              />
            </div>
          </div>

          {isNonReady && (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Produk custom / pihak ketiga tidak dicatat stok dan tidak dapat langsung dibeli di halaman Store —
              pelanggan diarahkan ke formulir kebutuhan custom atau WhatsApp technical support.
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Keunggulan</h2>
          <button
            type="button"
            onClick={() => set("features", [...form.features, ""])}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0EA5A0] hover:underline"
          >
            <Plus size={14} />
            Tambah
          </button>
        </div>
        {form.features.length === 0 && (
          <p className="text-xs text-slate-400 mb-4">Belum ada keunggulan. Klik &quot;Tambah&quot; untuk menulis poin.</p>
        )}
        <div className="space-y-2">
          {form.features.map((f, i) => (
            <div key={i} className="flex gap-2 items-start">
              <RowDragHandle
                index={i}
                count={form.features.length}                onItemDrop={(source, target) => reorderAction("features", source, target)}
                onMove={(source, target) => reorderAction("features", source, target)}
              />
              <div
                className="mt-2.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: hexToRgba(form.brandColor, 1) }}
              />
              <input
                className={inputClass}
                value={f}
                onChange={(e) => setFeature(i, e.target.value)}
                placeholder={isSparepart ? "Poin keunggulan sparepart" : "Poin keunggulan produk"}
              />
              <button
                type="button"
                onClick={() => set("features", form.features.filter((_, x) => x !== i))}
                className="mt-2 text-slate-400 hover:text-red-500 transition-colors"
                aria-label="Hapus poin"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Spesifikasi</h2>
          <button
            type="button"
            onClick={() => set("specs", [...form.specs, { label: "", value: "" }])}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0EA5A0] hover:underline"
          >
            <Plus size={14} />
            Tambah
          </button>
        </div>
        {form.specs.length === 0 && (
          <p className="text-xs text-slate-400 mb-4">Belum ada spesifikasi. Klik &quot;Tambah&quot; untuk menulis label &amp; nilai.</p>
        )}
        <div className="space-y-2">
          {form.specs.map((s, i) => (
            <div key={i} className="flex gap-2 items-start">
              <RowDragHandle
                index={i}
                count={form.specs.length}                onItemDrop={(source, target) => reorderAction("specs", source, target)}
                onMove={(source, target) => reorderAction("specs", source, target)}
              />
              <input
                className={inputClass}
                value={s.label}
                onChange={(e) => setSpec(i, "label", e.target.value)}
                placeholder="Label (mis. Tipe Sensor)"
              />
              <input
                className={inputClass}
                value={s.value}
                onChange={(e) => setSpec(i, "value", e.target.value)}
                placeholder="Nilai (mis. PT100 RTD)"
              />
              <button
                type="button"
                onClick={() => set("specs", form.specs.filter((_, x) => x !== i))}
                className="mt-2 text-slate-400 hover:text-red-500 transition-colors"
                aria-label="Hapus spesifikasi"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {isSparepart && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Varian (opsional)</h2>
            <button
              type="button"
              onClick={() =>
                set("variants", [
                  ...form.variants,
                  { id: undefined, label: "", sku: "", price_override: "", stock: "0", variant_group: "" },
                ])
              }
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0EA5A0] hover:underline"
            >
              <Plus size={14} />
              Tambah
            </button>
          </div>
          {form.variants.length === 0 && (
            <p className="text-xs text-slate-400 mb-4">Belum ada varian. Klik &quot;Tambah&quot; untuk menambah baris varian.</p>
          )}
          {form.variants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 pr-2 text-left font-semibold text-slate-500 dark:text-slate-400 w-8"></th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">Label</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">SKU</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">Harga Override</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">Stok</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">Grup</th>
                    <th className="py-2 pl-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-2">
                        <RowDragHandle
                          index={i}
                          count={form.variants.length}
                          onItemDrop={(source, target) => reorderAction("variants", source, target)}
                          onMove={(source, target) => reorderAction("variants", source, target)}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          className={inputClass}
                          value={v.label}
                          onChange={(e) => setVariant(i, "label", e.target.value)}
                          placeholder="mis. 1m"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          className={inputClass}
                          value={v.sku}
                          onChange={(e) => setVariant(i, "sku", e.target.value)}
                          placeholder="opsional"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          value={v.price_override}
                          onChange={(e) => setVariant(i, "price_override", e.target.value)}
                          placeholder="kosong = harga produk"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => setVariant(i, "stock", e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          className={inputClass}
                          value={v.variant_group}
                          onChange={(e) => setVariant(i, "variant_group", e.target.value)}
                          placeholder="opsional"
                        />
                      </td>
                      <td className="py-1.5 pl-2">
                        <button
                          type="button"
                          onClick={() => set("variants", form.variants.filter((_, x) => x !== i))}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          aria-label="Hapus varian"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-5">SEO & Status</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Judul SEO</label>
            <input className={inputClass} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={70} />
            <p className={`mt-1 text-right text-[11px] ${form.seoTitle.length > 60 ? "text-red-500" : "text-slate-400"}`}>
              {form.seoTitle.length}/60
            </p>
          </div>
          <div>
            <label className={labelClass}>Deskripsi SEO</label>
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={form.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value)}
              rows={2}
              maxLength={170}
            />
            <p className={`mt-1 text-right text-[11px] ${form.seoDescription.length > 160 ? "text-red-500" : "text-slate-400"}`}>
              {form.seoDescription.length}/160
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 rounded accent-[#0EA5A0]"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Aktif & tampil di situs</span>
          </label>
          {isSparepart && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isStoreVisible}
                onChange={(e) => set("isStoreVisible", e.target.checked)}
                className="w-4 h-4 rounded accent-[#0EA5A0]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Tampil di halaman Store</span>
            </label>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-2 pb-10">
        <button
          type="button"
          onClick={() => router.push(isSparepart ? "/admin/sparepart" : "/admin/produk")}
          className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSparepart ? "Simpan Sparepart" : "Simpan Produk"}
        </button>
      </div>
    </div>
  );
}
