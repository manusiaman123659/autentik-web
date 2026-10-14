import { z } from "zod";

export const FULFILLMENT_TYPES = ["ready_stock", "custom_request", "third_party"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  ready_stock: "Stok Siap (beli langsung)",
  custom_request: "Pesanan Kustom (konsultasi)",
  third_party: "Pihak Ketiga (technical support)",
};

export interface VariantRow {
  id?: string;
  label: string;
  sku: string;
  price_override: string;
  stock: string;
  variant_group: string;
}

export const productIdSchema = z.string().trim().min(1).max(200);

const integerInput = (value: unknown) => typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
const weightInput = z.preprocess(value => value == null || (typeof value === "string" && !value.trim())
  ? null : integerInput(value), z.number().int().min(0).max(2147483647).nullable()).default(null);
const dimensionInput = z.preprocess(value => value == null || (typeof value === "string" && !value.trim())
  ? null : typeof value === "number" ? String(value) : typeof value === "string" ? value.trim().replace(",", ".") : value,
z.string().regex(/^\d+(?:\.\d{1,3})?$/, "Dimensi harus angka positif, maksimal 3 desimal")
  .transform(Number).pipe(z.number().positive("Dimensi harus lebih dari 0").max(999999999.999)).nullable()).default(null);
const unitInput = z.string().refine(v => !/[\u0000-\u001f\u007f-\u009f]/.test(v), "Satuan tidak boleh berisi karakter kontrol")
  .trim().max(50, "Satuan maksimal 50 karakter").transform(v => v || null).nullable().default(null);
const noteInput = z.string().refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(v), "Catatan mengandung karakter kontrol")
  .trim().max(2000, "Catatan maksimal 2000 karakter").transform(v => v || null).nullable().default(null);

const baseProduct = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2, "Slug minimal 2 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda hubung"),
  name: z.string().min(2, "Nama produk minimal 2 karakter"),
  brand: z.string().min(1, "Merek wajib diisi"),
  brandId: z.string().trim().optional(),
  category: z.string().min(1, "Kategori wajib diisi"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  brandColor: z.string().min(1, "Warna merek wajib diisi"),
  categoryColor: z.string().min(1, "Warna kategori wajib diisi"),
  imageUrl: z.string().default(""),
  gallery: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  specs: z.array(z.object({ label: z.string(), value: z.string(), value_kind: z.enum(["technical", "text"]).optional() })).default([]),
  fulfillmentType: z.enum(FULFILLMENT_TYPES).default("ready_stock"),
  isActive: z.boolean().default(true),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
});

function validateDimensions(value: { length: number | null; width: number | null; height: number | null; dimensionUnit: string | null }, ctx: z.RefinementCtx) {
  if ([value.length, value.width, value.height].some(v => v !== null) && value.dimensionUnit === null) {
    ctx.addIssue({ code: "custom", path: ["dimensionUnit"], message: "Satuan dimensi wajib jika ada ukuran" });
  }
}

export const productSchema = z.discriminatedUnion("productType", [
  baseProduct.extend({
    productType: z.literal("b2b_system"),
    brochureUrl: z.string().optional(),
    model3dUrl: z.string().optional(),
  }),
  baseProduct
    .extend({
      productType: z.literal("sparepart"),
      minPurchaseQty: z.preprocess(integerInput, z.number().int().min(1, "Minimum paling sedikit 1").max(999, "Minimum maksimal 999")).default(1),
      unit: unitInput,
      length: dimensionInput,
      width: dimensionInput,
      height: dimensionInput,
      dimensionUnit: z.preprocess(v => v === "" || v == null ? null : v, z.enum(["mm", "cm", "m"]).nullable()).default(null),
      dimensionsNote: noteInput,
      sku: z.string().min(1, "SKU wajib diisi"),
      price: z.coerce.number().min(1, "Harga wajib diisi dan lebih dari 0").optional(),
      compareAtPrice: z.coerce.number().min(0).default(0),
      weightGrams: weightInput.pipe(z.number().int().min(1, "Berat wajib diisi (gram)")),
      stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif").optional(),
      lowStockThreshold: z.coerce.number().int().min(0).default(5),
      variants: z.array(z.object({ name: z.string(), options: z.array(z.string()) })).default([]),
      isStoreVisible: z.boolean().default(true),
    })
    .superRefine((val, ctx) => {
      validateDimensions(val, ctx);
      if (val.fulfillmentType === "ready_stock" && (val.price == null || val.price < 1)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: "Harga wajib diisi dan lebih dari 0 untuk produk stok siap",
        });
      }
      if (val.fulfillmentType === "ready_stock" && val.stock == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stock"],
          message: "Stok wajib diisi untuk produk stok siap",
        });
      }
    }),
]).transform(value => value.productType === "sparepart"
  ? { ...value, dimensionUnit: [value.length, value.width, value.height].every(v => v === null) ? null : value.dimensionUnit }
  : value);

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductType = "b2b_system" | "sparepart";
