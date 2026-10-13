"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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
  MapPin,
  Image as ImageIcon,
  X,
  AlertTriangle,
} from "lucide-react";
import { upsertProduct } from "@/lib/actions/products";
import { upsertTechnicalDocument, deleteTechnicalDocument } from "@/lib/actions/technicalDocuments";
import TechnicalDocsManager from "@/components/admin/TechnicalDocsManager";
import type { TechDocItem } from "@/components/admin/TechnicalDocsManager";
import { inputClass, labelClass, FieldError } from "@/components/admin/ui";
import { createClient } from "@/utils/supabase/client";
import { clickToImagePercent, computeContainedImageRect } from "@/lib/photo-hotspot-utils";
import {
  FULFILLMENT_TYPE_LABELS,
  type FulfillmentType,
  type ProductType,
  type VariantRow,
} from "@/lib/validations/productSchema";
import type { BrandRow, ProductRow, TechDocRow } from "@/lib/admin-data";
import { useToast } from "@/components/admin/Toast";

interface FeatureInput {
  label: string;
  value: string;
  value_kind?: "technical" | "text";
}

export interface HotspotItem {
  _tempKey: string;
  id?: string;
  position_x: number;
  position_y: number;
  position_z: number;
  title: string;
  description: string | null;
}

export interface PhotoHotspotItem {
  _tempKey: string;
  id?: string;
  target_image_url: string;
  position_x: number;
  position_y: number;
  title: string;
  description: string | null;
  callout_image_url: string;
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
  gallery: string[];
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
    gallery: Array.isArray(product?.gallery) ? (product.gallery as string[]).filter(Boolean) : [],
    brochureUrl: product?.brochure_url ?? "",
    model3dUrl: product?.model_3d_url ?? "",
    features: Array.isArray(product?.features)
      ? product.features.map((f) => String(f ?? "")).filter(Boolean)
      : [],
    specs: Array.isArray(product?.specs)
      ? product.specs.map((s) => ({ label: s?.label ?? "", value: s?.value ?? "", ...(s?.value_kind ? { value_kind: s.value_kind } : {}) }))
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
  initialHotspots = [],
  initialPhotoHotspots = [],
  onBeforeNavigate,
  onSavingChange,
}: {
  productType: ProductType;
  initial?: ProductRow;
  brands?: BrandRow[];
  initialDocuments?: TechDocRow[];
  initialVariants?: VariantRow[];
  initialHotspots?: HotspotItem[];
  initialPhotoHotspots?: PhotoHotspotItem[];
  onBeforeNavigate?: () => Promise<boolean>;
  onSavingChange?: (saving: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<ProductFormValues>(() => ({
    ...toFormValues(initial, productType),
    variants: initialVariants,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { onSavingChange?.(saving); }, [saving, onSavingChange]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [galleryUploading, setGalleryUploading] = useState(false);
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
      storagePath: d.storage_path,
      fileSizeKb: d.file_size_kb,
      requiresLead: d.requires_lead,
    })),
  );
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [hotspots, setHotspots] = useState<HotspotItem[]>(initialHotspots);
  const [editingHotspot, setEditingHotspot] = useState<HotspotItem | null>(null);
  const [isPlacingHotspot, setIsPlacingHotspot] = useState(false);

  const [photoHotspots, setPhotoHotspots] = useState<PhotoHotspotItem[]>(initialPhotoHotspots);
  const [editingPhotoHotspot, setEditingPhotoHotspot] = useState<PhotoHotspotItem | null>(null);
  const [isPlacingPhotoHotspot, setIsPlacingPhotoHotspot] = useState(false);
  const [selectedPhotoForHotspot, setSelectedPhotoForHotspot] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const brochureInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const allProductImages = useMemo(
    () => [
      ...(form.imageUrl ? [form.imageUrl] : []),
      ...form.gallery.filter((g) => g && g !== form.imageUrl),
    ],
    [form.imageUrl, form.gallery]
  );
  const activePhotoForHotspot =
    selectedPhotoForHotspot && allProductImages.includes(selectedPhotoForHotspot)
      ? selectedPhotoForHotspot
      : allProductImages[0] || "";

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

  const handleHotspotPlace = (local: { x: number; y: number; z: number }) => {
    if (editingHotspot !== null) return;
    setEditingHotspot({
      _tempKey: crypto.randomUUID(),
      position_x: local.x,
      position_y: local.y,
      position_z: local.z,
      title: "",
      description: null,
    });
  };

  const handleGalleryUpload = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("error", "Ukuran foto galeri maksimal 5MB.");
      return;
    }
    setGalleryUploading(true);
    try {
      const publicUrl = await uploadToMedia(file, {
        pathPrefix: "products/gallery",
        contentType: file.type || "image/jpeg",
        errorContext: "foto galeri",
      });
      setForm((prev) => ({
        ...prev,
        gallery: [...prev.gallery, publicUrl],
      }));
      toast("success", "Foto galeri berhasil ditambahkan.");
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Gagal mengunggah foto galeri.");
    } finally {
      setGalleryUploading(false);
    }
  };

  // Patch 2: Orphan marker handling — gallery image removal no longer deletes hotspots.
  // Hotspots whose target_image_url no longer exists become "orphans" and are shown
  // with a warning badge in admin. Public side filters them out automatically.
  const handleRemoveGalleryImage = (urlToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((u) => u !== urlToRemove),
    }));
    // DO NOT delete photoHotspots — they become orphans
  };

  // Patch 1: Coordinate system — use actual image rect for accurate placement
  const photoCanvasImgRef = useRef<HTMLImageElement>(null);

  const handlePhotoHotspotCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingPhotoHotspot || !activePhotoForHotspot) return;
    const img = photoCanvasImgRef.current;
    if (!img) return;
    const containerRect = e.currentTarget.getBoundingClientRect();
    const result = clickToImagePercent(e.clientX, e.clientY, img, containerRect);
    if (!result) return; // Click on letterbox/padding — ignore

    setEditingPhotoHotspot({
      _tempKey: `ph_${Date.now()}`,
      target_image_url: activePhotoForHotspot,
      position_x: result.x,
      position_y: result.y,
      title: "",
      description: "",
      callout_image_url: "",
    });
  };

  // Patch 2: Orphan detection helper
  const isOrphanHotspot = useCallback((ph: PhotoHotspotItem) => {
    return !allProductImages.includes(ph.target_image_url);
  }, [allProductImages]);

  // Patch 1: Recalculate marker pixel positions when container resizes
  const [markerPositions, setMarkerPositions] = useState<Map<string, { left: number; top: number }>>(new Map());

  const recalcMarkerPositions = useCallback(() => {
    const img = photoCanvasImgRef.current;
    if (!img) return;
    const imgRect = computeContainedImageRect(img);
    if (!imgRect) return;
    const newPositions = new Map<string, { left: number; top: number }>();
    photoHotspots
      .filter((ph) => ph.target_image_url === activePhotoForHotspot)
      .forEach((ph) => {
        newPositions.set(ph._tempKey, {
          left: imgRect.left + (ph.position_x / 100) * imgRect.width,
          top: imgRect.top + (ph.position_y / 100) * imgRect.height,
        });
      });
    setMarkerPositions(newPositions);
  }, [photoHotspots, activePhotoForHotspot]);

  useEffect(() => {
    recalcMarkerPositions();
    window.addEventListener("resize", recalcMarkerPositions);
    return () => window.removeEventListener("resize", recalcMarkerPositions);
  }, [recalcMarkerPositions]);

  const handleSubmit = async () => {
    if (saving || (onBeforeNavigate && !await onBeforeNavigate())) return;
    if (documentsUploading) {
      toast("error", "Tunggu hingga unggahan dokumen selesai.");
      return;
    }
    if (documents.some((doc) => (doc.id || doc.title.trim() || doc.fileUrl || doc.storagePath)
      && (!doc.title.trim()
        || !(doc.requiresLead ? doc.storagePath && !doc.fileUrl : doc.fileUrl && !doc.storagePath)))) {
      toast("error", "Unggah ulang dokumen sesuai jenis aksesnya sebelum menyimpan.");
      return;
    }
    setSaving(true);
    setErrors({});

    const variantsPayload = form.variants.filter((v) => v.label.trim());

    const hotspotsPayload = !isSparepart
      ? hotspots
          .filter((h) => h.title.trim())
          .map((h) => ({
            id: h.id,
            position_x: h.position_x,
            position_y: h.position_y,
            position_z: h.position_z,
            title: h.title,
            description: h.description,
          }))
      : undefined;

    const photoHotspotsPayload = photoHotspots
      .filter((ph) => ph.title.trim() && ph.callout_image_url.trim())
      .map((ph) => ({
        id: ph.id,
        target_image_url: ph.target_image_url,
        position_x: ph.position_x,
        position_y: ph.position_y,
        title: ph.title,
        description: ph.description,
        callout_image_url: ph.callout_image_url,
      }));

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

    const result = await upsertProduct(payload, variantsPayload, hotspotsPayload, photoHotspotsPayload);
    if (!result.success) {
      setSaving(false);
      setErrors(result.errors ?? {});
      return;
    }

    if (result.variantWarning) {
      toast("error", result.variantWarning);
    }
    if (result.hotspotWarning) {
      toast("error", result.hotspotWarning);
    }
    if (result.photoHotspotWarning) {
      toast("error", result.photoHotspotWarning);
    }

    const productId = result.productId ?? form.id;
    if (!initial) {
      setSaving(false);
      if (!productId) {
        toast("error", "Produk tersimpan, tetapi ID produk tidak tersedia. Muat ulang daftar produk sebelum melanjutkan.");
        return;
      }
      router.push(`/admin/${isSparepart ? "sparepart" : "produk"}/${encodeURIComponent(productId)}?created=1`);
      return;
    }

    if (productId && !isSparepart) {
      try {
        const existingIds = initialDocuments.map((d) => d.id).filter(Boolean);
        const currentIds = documents.filter((d) => d.id).map((d) => d.id);

        for (const docId of existingIds) {
          if (!currentIds.includes(docId)) {
            const deletion = await deleteTechnicalDocument(docId!, productId);
            if (!deletion.success) {
              setSaving(false);
              toast("error", deletion.message);
              return;
            }
          }
        }

        for (const doc of documents) {
          if (doc.title.trim() && (doc.fileUrl || doc.storagePath)) {
            const saved = await upsertTechnicalDocument({
              id: doc.id,
              productId,
              title: doc.title,
              fileType: doc.fileType,
              fileUrl: doc.fileUrl,
              storagePath: doc.storagePath,
              fileSizeKb: doc.fileSizeKb ?? undefined,
              requiresLead: doc.requiresLead,
            });
            if (!saved.success) {
              setSaving(false);
              toast("error", saved.message);
              return;
            }
          }
        }
      } catch {
        setSaving(false);
        toast("error", "Dokumen belum dapat disimpan. Silakan coba lagi.");
        return;
      }
    }

    setSaving(false);
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
            <label className={labelClass}>{isSparepart ? "Nama Komponen" : "Nama Produk"}</label>
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
                title={`Generate slug otomatis dari nama ${isSparepart ? "komponen" : "produk"}`}
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
                Merek unit yang kompatibel dengan komponen ini (mis. Talpha, Cylab, Ullun, Epal).
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
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className={labelClass}>Galeri Foto Tambahan (opsional)</label>
                <p className="text-xs text-slate-400">Unggah sudut pandang lain atau foto close-up yang bisa disematkan marker interaktif.</p>
              </div>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={galleryUploading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#0EA5A0] text-[#0EA5A0] hover:bg-[#0EA5A0]/10 transition-colors disabled:opacity-60"
              >
                {galleryUploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {galleryUploading ? "Mengunggah..." : "Tambah Foto Galeri"}
              </button>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleGalleryUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {form.gallery.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {form.gallery.map((gUrl, idx) => (
                  <div
                    key={gUrl + idx}
                    className="relative group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden aspect-square bg-slate-50 dark:bg-slate-900"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gUrl} alt={`Galeri ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(gUrl)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-md"
                      title="Hapus foto ini dari galeri"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Belum ada foto galeri tambahan.</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Deskripsi</label>
            <textarea
              className={`${inputClass} min-h-[110px]`}
              value={form.description}
onChange={(e) => set("description", e.target.value)}
              placeholder={isSparepart ? "Deskripsi komponen" : "Deskripsi produk"}
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

      {/* Hotspot Foto Produk */}
      {!isSparepart && form.id && allProductImages.length === 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Hotspot Foto Produk</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unggah gambar produk utama atau foto galeri terlebih dahulu untuk menambahkan marker fitur interaktif.
          </p>
        </section>
      )}

      {!isSparepart && form.id && allProductImages.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Hotspot Foto Produk</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0EA5A0]/10 text-[#0EA5A0]">
                  Interaktif 2D
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pilih foto produk dan klik pada foto untuk menempatkan titik marker fitur dengan foto detail callout wajib, judul, dan deskripsi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isPlacingPhotoHotspot) {
                  setIsPlacingPhotoHotspot(false);
                  setEditingPhotoHotspot(null);
                } else {
                  setIsPlacingPhotoHotspot(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border transition-colors flex-shrink-0 ${
                isPlacingPhotoHotspot
                  ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60"
                  : "border-[#0EA5A0] text-[#0EA5A0] bg-[#0EA5A0]/5 hover:bg-[#0EA5A0]/10"
              }`}
            >
              <MapPin size={14} />
              {isPlacingPhotoHotspot ? "Selesai Menempatkan" : "Tempatkan Marker"}
            </button>
          </div>

          {/* Photo Selector if multiple images */}
          {allProductImages.length > 1 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Pilih Foto yang Ditandai:
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allProductImages.map((imgUrl, i) => (
                  <button
                    key={imgUrl + i}
                    type="button"
                    onClick={() => setSelectedPhotoForHotspot(imgUrl)}
                    className={`relative w-16 h-16 rounded-lg border overflow-hidden flex-shrink-0 transition-all ${
                      imgUrl === activePhotoForHotspot
                        ? "border-[#0EA5A0] ring-2 ring-[#0EA5A0]/40 scale-105"
                        : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white font-bold py-0.5 text-center">
                        Utama
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Canvas Photo Interactive */}
          <div className="relative mb-5">
            {isPlacingPhotoHotspot && (
              <div className="absolute top-3 inset-x-3 z-20 pointer-events-none flex justify-center">
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900/90 text-white shadow-lg backdrop-blur-sm border border-white/20 animate-bounce">
                  Klik titik pada foto di bawah untuk memasang marker
                </span>
              </div>
            )}

            <div
              onClick={handlePhotoHotspotCanvasClick}
              className={`relative w-full max-h-[460px] aspect-video rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden select-none ${
                isPlacingPhotoHotspot ? "cursor-crosshair ring-2 ring-[#0EA5A0]" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={photoCanvasImgRef}
                src={activePhotoForHotspot}
                alt="Product Preview"
                className="w-full h-full object-contain pointer-events-none"
                onLoad={recalcMarkerPositions}
              />

              {/* Render Markers for Active Photo — positioned using computed image rect */}
              {photoHotspots
                .filter((ph) => ph.target_image_url === activePhotoForHotspot)
                .map((ph, idx) => {
                  const pos = markerPositions.get(ph._tempKey);
                  if (!pos) return null;
                  return (
                    <button
                      key={ph._tempKey}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPhotoHotspot(ph);
                      }}
                      style={{
                        left: `${pos.left}px`,
                        top: `${pos.top}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className="absolute z-10 group cursor-pointer focus:outline-none w-11 h-11 flex items-center justify-center"
                      aria-label={`Lihat detail ${ph.title || `Marker ${idx + 1}`}`}
                    >
                      <div className="relative flex items-center justify-center pointer-events-none">
                        <span className="absolute w-7 h-7 rounded-full bg-red-500/30 animate-ping group-hover:bg-[#0EA5A0]/40" />
                        <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-125">
                          <span className="w-2 h-2 rounded-full bg-white group-hover:bg-red-400" />
                        </div>
                      </div>
                      {/* Tooltip on hover */}
                      <div className="absolute left-1/2 -top-8 -translate-x-1/2 hidden group-hover:flex items-center px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap shadow pointer-events-none z-30">
                        {ph.title || `Marker ${idx + 1}`}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Table / List of Photo Hotspots */}
          {photoHotspots.length === 0 ? (
            <p className="text-xs text-slate-400 mb-4">
              Belum ada marker foto. Klik &quot;Tempatkan Marker&quot; lalu klik titik pada foto.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400 w-16">Callout</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">Judul Fitur</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">Deskripsi</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400 w-32">Foto Target</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400 w-24">Posisi</th>
                    <th className="py-2 pl-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {photoHotspots.map((ph) => {
                    const isCurrentPhoto = ph.target_image_url === activePhotoForHotspot;
                    const orphan = isOrphanHotspot(ph);
                    return (
                      <tr
                        key={ph._tempKey}
                        className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                          orphan
                            ? "bg-amber-50/80 dark:bg-amber-950/20"
                            : isCurrentPhoto
                              ? "bg-[#0EA5A0]/5"
                              : ""
                        }`}
                      >
                        <td className="py-2 px-2">
                          <div className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                            {ph.callout_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ph.callout_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-red-500">
                                <ImageIcon size={14} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 font-semibold text-slate-800 dark:text-slate-100">
                          {ph.title || <span className="text-red-500 italic">Wajib diisi</span>}
                        </td>
                        <td className="py-2 px-2 text-slate-500 dark:text-slate-400 max-w-[220px] truncate">
                          {ph.description || "—"}
                        </td>
                        <td className="py-2 px-2">
                          {orphan ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-md">
                                <AlertTriangle size={10} />
                                Foto sumber tidak tersedia
                              </span>
                              {allProductImages.length > 0 && (
                                <select
                                  className="block w-full text-[10px] rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-1 py-0.5"
                                  value=""
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    setPhotoHotspots((prev) =>
                                      prev.map((x) =>
                                        x._tempKey === ph._tempKey
                                          ? { ...x, target_image_url: e.target.value }
                                          : x
                                      )
                                    );
                                  }}
                                >
                                  <option value="">Pindahkan ke…</option>
                                  {allProductImages.map((imgUrl, i) => (
                                    <option key={imgUrl} value={imgUrl}>
                                      {imgUrl === form.imageUrl ? "Foto Utama" : `Galeri ${i}`}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedPhotoForHotspot(ph.target_image_url)}
                              className="inline-flex items-center gap-1 text-[11px] text-[#0EA5A0] hover:underline"
                            >
                              <span className="w-2 h-2 rounded-full bg-[#0EA5A0]" />
                              {ph.target_image_url === form.imageUrl ? "Foto Utama" : "Galeri"}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-2 text-slate-400 font-mono text-[10px]">
                          {ph.position_x.toFixed(1)}%, {ph.position_y.toFixed(1)}%
                        </td>
                        <td className="py-2 pl-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!orphan) setSelectedPhotoForHotspot(ph.target_image_url);
                                setEditingPhotoHotspot(ph);
                              }}
                              className="text-slate-400 hover:text-[#0EA5A0] transition-colors p-1"
                              aria-label="Edit marker"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhotoHotspots((prev) => prev.filter((x) => x._tempKey !== ph._tempKey))}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              aria-label="Hapus marker"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {editingPhotoHotspot && (
            <PhotoHotspotModal
              hotspot={editingPhotoHotspot}
              onSave={({ title, description, callout_image_url }) => {
                setPhotoHotspots((prev) => {
                  const exists = prev.some((x) => x._tempKey === editingPhotoHotspot._tempKey);
                  if (exists) {
                    return prev.map((x) =>
                      x._tempKey === editingPhotoHotspot._tempKey
                        ? { ...x, title, description, callout_image_url }
                        : x
                    );
                  }
                  return [
                    ...prev,
                    {
                      ...editingPhotoHotspot,
                      title,
                      description,
                      callout_image_url,
                    },
                  ];
                });
                setEditingPhotoHotspot(null);
              }}
              onClose={() => setEditingPhotoHotspot(null)}
            />
          )}
        </section>
      )}

      {!isSparepart && form.id && !form.model3dUrl && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Hotspot Produk</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload model 3D terlebih dahulu untuk menambahkan hotspot interaktif.
          </p>
        </section>
      )}

      {!isSparepart && form.id && form.model3dUrl && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Hotspot Produk</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Klik titik pada model 3D untuk menambahkan hotspot penjelasan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isPlacingHotspot) {
                  setIsPlacingHotspot(false);
                  setEditingHotspot(null);
                } else {
                  setIsPlacingHotspot(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                isPlacingHotspot
                  ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60"
                  : "border-[#0EA5A0] text-[#0EA5A0] bg-[#0EA5A0]/5 hover:bg-[#0EA5A0]/10"
              }`}
            >
              <MapPin size={14} />
              {isPlacingHotspot ? "Selesai Menempatkan" : "Tempatkan Hotspot"}
            </button>
          </div>

          <div className="w-full aspect-square rounded-xl relative overflow-hidden border border-slate-200 dark:border-slate-800 mb-5">
            <Model3DViewer
              url={form.model3dUrl}
              hotspots={hotspots}
              editable={isPlacingHotspot}
              onHotspotPlace={handleHotspotPlace}
            />
          </div>

          {hotspots.length === 0 && (
            <p className="text-xs text-slate-400 mb-4">Belum ada hotspot. Klik &quot;Tempatkan Hotspot&quot; lalu klik titik pada model.</p>
          )}

          {hotspots.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">Judul</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400">Deskripsi</th>
                    <th className="py-2 px-2 text-left font-semibold text-slate-500 dark:text-slate-400 w-20">Koordinat</th>
                    <th className="py-2 pl-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {hotspots.map((h) => (
                    <tr key={h._tempKey} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 px-2 font-medium text-slate-700 dark:text-slate-200">{h.title || <span className="text-slate-400 italic">Tanpa judul</span>}</td>
                      <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{h.description || "—"}</td>
                      <td className="py-1.5 px-2 text-slate-400 font-mono text-[10px]">
                        {h.position_x.toFixed(2)}, {h.position_y.toFixed(2)}, {h.position_z.toFixed(2)}
                      </td>
                      <td className="py-1.5 pl-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingHotspot(h)}
                            className="text-slate-400 hover:text-[#0EA5A0] transition-colors"
                            aria-label="Edit hotspot"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHotspots((prev) => prev.filter((x) => x._tempKey !== h._tempKey))}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            aria-label="Hapus hotspot"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editingHotspot && (
            <HotspotModal
              hotspot={editingHotspot}
              onSave={(title, description) => {
                setHotspots((prev) => {
                  const exists = prev.some((x) => x._tempKey === editingHotspot._tempKey);
                  if (exists) {
                    return prev.map((x) =>
                      x._tempKey === editingHotspot._tempKey ? { ...x, title, description } : x
                    );
                  }
                  return [...prev, { ...editingHotspot, title, description }];
                });
                setEditingHotspot(null);
              }}
              onClose={() => setEditingHotspot(null)}
            />
          )}
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
            onUploadingChange={setDocumentsUploading}
            saving={saving}
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
              Produk custom / pihak ketiga tidak dicatat stok dan tidak dapat langsung dibeli di Marketplace Komponen —
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
                placeholder={isSparepart ? "Poin keunggulan komponen" : "Poin keunggulan produk"}
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
              <span className="text-sm text-slate-700 dark:text-slate-300">Tampil di Marketplace Komponen</span>
            </label>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 pt-2 pb-10">
        <button
          type="button"
          onClick={async () => { if (!onBeforeNavigate || await onBeforeNavigate()) router.push(isSparepart ? "/admin/sparepart" : "/admin/produk"); }}
          className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || documentsUploading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
        >
{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSparepart ? "Simpan Komponen" : "Simpan Produk"}
        </button>
      </div>
    </div>
  );
}

const Model3DViewer = dynamic(() => import("@/components/product/Product3DViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0a1628]">
      <Loader2 size={24} className="animate-spin text-[#0EA5A0]" />
    </div>
  ),
});

function HotspotModal({
  hotspot,
  onSave,
  onClose,
}: {
  hotspot: HotspotItem;
  onSave: (title: string, description: string | null) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(hotspot.title);
  const [description, setDescription] = useState(hotspot.description ?? "");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }
    onSave(title.trim(), description.trim() || null);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={18} className="text-[#0EA5A0]" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {hotspot.id ? "Edit Hotspot" : "Hotspot Baru"}
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Judul <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0]"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="mis. Panel Utama"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Deskripsi (opsional)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Penjelasan singkat tentang titik ini..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
          >
            <Save size={15} />
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoHotspotModal({
  hotspot,
  onSave,
  onClose,
}: {
  hotspot: PhotoHotspotItem;
  onSave: (data: { title: string; description: string | null; callout_image_url: string }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(hotspot.title);
  const [description, setDescription] = useState(hotspot.description ?? "");
  const [calloutImageUrl, setCalloutImageUrl] = useState(hotspot.callout_image_url);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const calloutInputRef = useRef<HTMLInputElement>(null);

  const handleCalloutUpload = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto callout maksimal 5MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await uploadToMedia(file, {
        pathPrefix: "products/photo-hotspots",
        contentType: file.type || "image/jpeg",
        errorContext: "foto callout",
      });
      setCalloutImageUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah foto callout.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!calloutImageUrl.trim()) {
      setError("Foto callout fitur wajib diunggah.");
      return;
    }
    if (!title.trim()) {
      setError("Judul fitur wajib diisi.");
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      callout_image_url: calloutImageUrl.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center shadow">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {hotspot.id ? "Edit Marker Foto" : "Marker Foto Baru"}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Posisi: X: {hotspot.position_x.toFixed(1)}%, Y: {hotspot.position_y.toFixed(1)}%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Upload Foto Callout (Wajib) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Foto Callout Detail Fitur <span className="text-red-500">* (Wajib)</span>
            </label>
            <input
              ref={calloutInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleCalloutUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {calloutImageUrl ? (
              <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={calloutImageUrl}
                  alt="Callout Preview"
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => calloutInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-semibold hover:bg-white transition-colors"
                  >
                    Ganti Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalloutImageUrl("")}
                    className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => calloutInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-[#0EA5A0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors py-6 flex flex-col items-center justify-center gap-2"
              >
                {uploading ? (
                  <Loader2 size={24} className="animate-spin text-[#0EA5A0]" />
                ) : (
                  <Upload size={24} className="text-slate-400" />
                )}
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {uploading ? "Mengunggah foto..." : "Pilih & Unggah Foto Detail Callout"}
                </p>
                <p className="text-[10px] text-slate-400">PNG, JPG, WEBP — maksimal 5MB</p>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Judul Fitur <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0]"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="mis. Tuas Pengunci Rem / Sensor Presisi"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Deskripsi Fitur (opsional)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Jelaskan keunggulan fitur atau fungsi komponen yang ditandai ini..."
            />
          </div>

          {/* Mini Live Preview */}
          {calloutImageUrl && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Preview Kartu Callout Pengunjung:
              </p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={calloutImageUrl}
                  alt={title || "Preview"}
                  className="w-full h-32 object-cover"
                />
                <div className="p-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {title || "Judul Fitur"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {description || "Deskripsi penjelasan fitur akan muncul di sini."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={uploading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors disabled:opacity-60"
          >
            <Save size={15} />
            Simpan Marker
          </button>
        </div>
      </div>
    </div>
  );
}
