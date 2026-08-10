import { z } from "zod";

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
  isActive: z.boolean().default(true),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
});

export const productSchema = z.discriminatedUnion("productType", [
  baseProduct.extend({
    productType: z.literal("b2b_system"),
  }),
  baseProduct.extend({
    productType: z.literal("sparepart"),
    sku: z.string().min(1, "SKU wajib diisi"),
    price: z.coerce.number().min(1, "Harga wajib diisi dan lebih dari 0"),
    compareAtPrice: z.coerce.number().min(0).default(0),
    weightGrams: z.coerce.number().int().min(1, "Berat wajib diisi (gram)"),
    stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif").default(0),
    lowStockThreshold: z.coerce.number().int().min(0).default(5),
    variants: z.array(z.object({ name: z.string(), options: z.array(z.string()) })).default([]),
    isStoreVisible: z.boolean().default(true),
  }),
]);

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductType = "b2b_system" | "sparepart";