"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { productSchema } from "@/lib/validations/productSchema";
import { recordAudit } from "@/lib/audit";

export interface ActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
}

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const revalidateProductRoutes = () => {
  revalidatePath("/admin/produk");
  revalidatePath("/admin/sparepart");
  revalidatePath("/admin/stok");
};

export async function upsertProduct(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian form.", errors: toErrors(parsed.error) };
  }
  const p = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const id = p.id && p.id.trim() ? p.id.trim() : p.slug.replace(/[^a-z0-9-]/g, "");

  const isB2B = p.productType === "b2b_system";

  const record = isB2B
    ? {
        id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        brand_color: p.brandColor,
        category: p.category,
        category_color: p.categoryColor,
        description: p.description,
        image_url: p.imageUrl || null,
        features: p.features.filter((f) => f.trim()),
        specs: p.specs.filter((s) => s.label.trim() || s.value.trim()),
        product_type: "b2b_system" as const,
        stock: 0,
        sku: null,
        price: null,
        compare_at_price: null,
        weight_grams: null,
        variants: [],
        is_store_visible: true,
        is_active: p.isActive,
        status: p.isActive ? "published" : "draft",
        seo_title: p.seoTitle || null,
        seo_description: p.seoDescription || null,
      }
    : {
        id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        brand_color: p.brandColor,
        category: p.category,
        category_color: p.categoryColor,
        description: p.description,
        image_url: p.imageUrl || null,
        features: p.features.filter((f) => f.trim()),
        specs: p.specs.filter((s) => s.label.trim() || s.value.trim()),
        product_type: "sparepart" as const,
        sku: p.sku,
        price: p.price,
        compare_at_price: p.compareAtPrice || null,
        weight_grams: p.weightGrams,
        stock: p.stock,
        low_stock_threshold: p.lowStockThreshold,
        variants: p.variants,
        is_store_visible: p.isStoreVisible,
        is_active: p.isActive,
        status: p.isActive ? "published" : "draft",
        seo_title: p.seoTitle || null,
        seo_description: p.seoDescription || null,
      };

  const { error } = await supabase.from("products").upsert(record as never, { onConflict: "id" });
  if (error) {
    console.error("[action] upsert product", error);
    return { success: false, message: "Gagal menyimpan produk. " + error.message };
  }

  await recordAudit(
    p.id ? "product.updated" : "product.created",
    "product",
    id,
    { name: p.name, type: p.productType }
  );
  revalidateProductRoutes();

  return { success: true, message: p.id ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan." };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    console.error("[action] delete product", error);
    return { success: false, message: "Gagal menghapus produk. " + error.message };
  }

  await recordAudit("product.deleted", "product", id, { id });
  revalidateProductRoutes();

  return { success: true, message: "Produk berhasil dihapus." };
}