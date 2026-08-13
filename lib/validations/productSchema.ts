import { z } from "zod";

export const FULFILLMENT_TYPES = ["ready_stock", "custom_request", "third_party"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  ready_stock: "Stok Siap (beli langsung)",
  custom_request: "Pesanan Kustom (konsultasi)",
  third_party: "Pihak Ketiga (technical support)",
};

const baseProduct = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2, "Slug minimal 2 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda hubung"),
  name: z.string().min(2, "Nama produk minimal 2 karakter"),
  brand: z.string().min(1, "Merek wajib diisi"),
  category: z.string().min(1, "Kategori wajib diisi"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  brandColor: z.string().min(1, "Warna merek wajib diisi"),
  categoryColor: z.string().min(1, "Warna kategori wajib diisi"),
  imageUrl: z.string().default(""),
  features: z.array(z.string()).default([]),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  fulfillmentType: z.enum(FULFILLMENT_TYPES).default("ready_stock"),
  isActive: z.boolean().default(true),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
});

export const productSchema = z.discriminatedUnion("productType", [
  baseProduct.extend({
    productType: z.literal("b2b_system"),
    brochureUrl: z.string().optional(),
  }),
  baseProduct
    .extend({
      productType: z.literal("sparepart"),
      sku: z.string().min(1, "SKU wajib diisi"),
      price: z.coerce.number().min(1, "Harga wajib diisi dan lebih dari 0").optional(),
      compareAtPrice: z.coerce.number().min(0).default(0),
      weightGrams: z.coerce.number().int().min(1, "Berat wajib diisi (gram)"),
      stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif").optional(),
      lowStockThreshold: z.coerce.number().int().min(0).default(5),
      variants: z.array(z.object({ name: z.string(), options: z.array(z.string()) })).default([]),
      isStoreVisible: z.boolean().default(true),
    })
    .superRefine((val, ctx) => {
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
]);

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductType = "b2b_system" | "sparepart";