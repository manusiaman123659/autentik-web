"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { productSchema, type VariantRow } from "@/lib/validations/productSchema";
import { recordAudit } from "@/lib/audit";

export interface ActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  variantWarning?: string;
  hotspotWarning?: string;
}

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// Public URLs have the form
// <SUPABASE_URL>/storage/v1/object/public/media/<path>.
const STORAGE_PUBLIC_MARKER = "/storage/v1/object/public/media/";

function stripQuery(url: string): string {
  return url.split(/[?#]/)[0];
}

function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = stripQuery(url);
  const idx = clean.indexOf(STORAGE_PUBLIC_MARKER);
  if (idx === -1) return null;
  const path = decodeURIComponent(clean.slice(idx + STORAGE_PUBLIC_MARKER.length));
  // Only delete objects living under the paths this app manages.
  if (!(path.startsWith("products/") || path.startsWith("brochures/") || path.startsWith("models/"))) return null;
  return path || null;
}

async function removeStorageObjectIfAny(
  supabase: Awaited<ReturnType<typeof createClient>>,
  url: string | null | undefined,
  context: string
): Promise<void> {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  const { error } = await supabase.storage.from("media").remove([path]);
  if (error) console.error(`[action] remove ${context}`, path, error);
}

const revalidateProductRoutes = () => {
  revalidatePath("/admin/produk");
  revalidatePath("/admin/sparepart");
  revalidatePath("/admin/stok");
};

export async function upsertProduct(
  input: unknown,
  variantsPayload?: VariantRow[],
  hotspotsPayload?: { id?: string; position_x: number; position_y: number; position_z: number; title: string; description?: string | null }[]
): Promise<ActionResult> {
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

  const isSparepart = p.productType === "sparepart";

  const isNonReady = p.fulfillmentType !== "ready_stock";

  let brandId = p.brandId?.trim() || null;
  if (!brandId) {
    const { data: match } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", p.brand)
      .maybeSingle();
    if (match) brandId = match.id;
  }

  // For updates of B2B products, remember the previous media so we can
  // delete replaced/removed files from Storage after a successful save.
  let oldBrochureUrl: string | null = null;
  let oldModel3dUrl: string | null = null;
  if (isB2B && p.id?.trim()) {
    const { data: existing } = await supabase
      .from("products")
      .select("brochure_url, model_3d_url")
      .eq("id", p.id.trim())
      .maybeSingle();
    oldBrochureUrl = existing?.brochure_url ?? null;
    oldModel3dUrl = existing?.model_3d_url ?? null;
  }

  const record = isB2B
    ? {
        id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        brand_id: brandId,
        brand_color: p.brandColor,
        category: p.category,
        category_color: p.categoryColor,
        description: p.description,
        image_url: p.imageUrl || null,
        brochure_url: p.brochureUrl?.trim() ? stripQuery(p.brochureUrl.trim()) : null,
        model_3d_url: p.model3dUrl?.trim() ? stripQuery(p.model3dUrl.trim()) : null,
        features: p.features.filter((f) => f.trim()),
        specs: p.specs.filter((s) => s.label.trim() || s.value.trim()),
        product_type: "b2b_system" as const,
        fulfillment_type: p.fulfillmentType,
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
        brand_id: brandId,
        brand_color: p.brandColor,
        category: p.category,
        category_color: p.categoryColor,
        description: p.description,
        image_url: p.imageUrl || null,
        features: p.features.filter((f) => f.trim()),
        specs: p.specs.filter((s) => s.label.trim() || s.value.trim()),
        product_type: "sparepart" as const,
        fulfillment_type: p.fulfillmentType,
        sku: p.sku,
        price: p.price ?? null,
        compare_at_price: p.compareAtPrice || null,
        weight_grams: p.weightGrams,
        stock: isNonReady ? 0 : (p.stock ?? 0),
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

  // Remove the previous brochure/model PDF/GLB when it was replaced or removed.
  const newBrochureUrl = isB2B
    ? (record as { brochure_url: string | null }).brochure_url
    : null;
  const newModel3dUrl = isB2B
    ? (record as { model_3d_url: string | null }).model_3d_url
    : null;
  if (oldBrochureUrl && oldBrochureUrl !== newBrochureUrl) {
    await removeStorageObjectIfAny(supabase, oldBrochureUrl, "old brochure");
  }
  if (oldModel3dUrl && oldModel3dUrl !== newModel3dUrl) {
    await removeStorageObjectIfAny(supabase, oldModel3dUrl, "old 3d model");
  }

  await recordAudit(
    p.id ? "product.updated" : "product.created",
    "product",
    id,
    { name: p.name, type: p.productType }
  );
  revalidateProductRoutes();

  // Wire variants untuk sparepart via RPC
  if (variantsPayload && isSparepart) {
    const { error: variantError } = await supabase.rpc("upsert_product_variants", {
      p_product_id: id,
      p_variants: variantsPayload.map((v, i) => ({
        id: v.id || null,
        label: v.label,
        sku: v.sku || null,
        price_override: v.price_override ? Number(v.price_override) : null,
        stock: Number(v.stock),
        variant_group: v.variant_group || null,
        sort_order: i,
      })),
    });
    if (variantError) {
      console.error("[action] upsert product variants", variantError);
      return {
        success: true,
        message: p.id ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.",
        variantWarning: "Gagal menyimpan varian: " + variantError.message,
      };
    }
  }

  // Wire hotspots untuk b2b_system via RPC
  if (hotspotsPayload && !isSparepart) {
    const { error: hotspotError } = await supabase.rpc("upsert_product_hotspots", {
      p_product_id: id,
      p_hotspots: hotspotsPayload.map((h, i) => ({
        id: h.id || null,
        position_x: h.position_x,
        position_y: h.position_y,
        position_z: h.position_z,
        title: h.title,
        description: h.description || null,
        sort_order: i,
      })),
    });
    if (hotspotError) {
      console.error("[action] upsert product hotspots", hotspotError);
      return {
        success: true,
        message: p.id ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.",
        hotspotWarning: "Gagal menyimpan hotspot: " + hotspotError.message,
      };
    }
  }

  return { success: true, message: p.id ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan." };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing } = await supabase
    .from("products")
    .select("brochure_url, model_3d_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    console.error("[action] delete product", error);
    return { success: false, message: "Gagal menghapus produk. " + error.message };
  }

  // Remove the brochure/model files so they do not orphan in the bucket.
  await removeStorageObjectIfAny(supabase, existing?.brochure_url, "brochure on product delete");
  await removeStorageObjectIfAny(supabase, existing?.model_3d_url, "3d model on product delete");

  await recordAudit("product.deleted", "product", id, { id });
  revalidateProductRoutes();

  return { success: true, message: "Produk berhasil dihapus." };
}