"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { requireOperationalStaff as getAdminUser, requireAdmin } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { productIdSchema, productSchema, type VariantRow } from "@/lib/validations/productSchema";
import { recordAudit } from "@/lib/audit";
import { resolveAkaProductMediaUrl } from "@/lib/supabase-public-media";
import { revalidateB2BProduct } from "@/lib/product-public-revalidation";

export interface ActionResult {
  success: boolean;
  message: string;
  productId?: string;
  errors?: Record<string, string>;
  variantWarning?: string;
  hotspotWarning?: string;
  photoHotspotWarning?: string;
}

export interface PhotoHotspotInput {
  id?: string;
  target_image_url: string;
  position_x: number;
  position_y: number;
  title: string;
  description?: string | null;
  callout_image_url: string;
}

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function stripQuery(url: string): string {
  return url.split(/[?#]/)[0];
}

async function removeStorageObjectIfAny(
  supabase: Awaited<ReturnType<typeof createClient>>,
  url: string | null | undefined,
  context: string,
  requiredPathPrefix?: string,
): Promise<void> {
  const resolved = resolveAkaProductMediaUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (resolved.kind !== "managed"
    || (requiredPathPrefix && !resolved.path.startsWith(requiredPathPrefix))) return;
  const { error } = await supabase.storage.from("media").remove([resolved.path]);
  if (error) console.error(`[action] remove ${context}`, { code: error.name });
}

const revalidateProductRoutes = () => {
  revalidatePath("/admin/produk");
  revalidatePath("/admin/sparepart");
  revalidatePath("/admin/stok");
};

export async function upsertProduct(
  input: unknown,
  variantsPayload?: VariantRow[],
  hotspotsPayload?: { id?: string; position_x: number; position_y: number; position_z: number; title: string; description?: string | null }[],
  photoHotspotsPayload?: PhotoHotspotInput[]
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

  const existingId = p.id?.trim();
  const isUpdate = Boolean(existingId);
  const id = existingId || p.slug.replace(/[^a-z0-9-]/g, "");

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
  let oldSlug: string | null = null;
  if (isB2B && isUpdate) {
    const { data: existing } = await supabase
      .from("products")
      .select("brochure_url, model_3d_url, slug")
      .eq("id", id)
      .maybeSingle();
    oldBrochureUrl = existing?.brochure_url ?? null;
    oldModel3dUrl = existing?.model_3d_url ?? null;
    oldSlug = existing?.slug ?? null;
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
        gallery: p.gallery || [],
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
        gallery: p.gallery || [],
        features: p.features.filter((f) => f.trim()),
        specs: p.specs.filter((s) => s.label.trim() || s.value.trim()),
        product_type: "sparepart" as const,
        fulfillment_type: p.fulfillmentType,
        sku: p.sku,
        price: p.price ?? null,
        compare_at_price: p.compareAtPrice || null,
        weight_grams: p.weightGrams,
        min_purchase_qty: p.minPurchaseQty,
        unit: p.unit,
        length: p.length,
        width: p.width,
        height: p.height,
        dimension_unit: p.dimensionUnit,
        dimensions_note: p.dimensionsNote,
        stock: isNonReady ? 0 : (p.stock ?? 0),
        low_stock_threshold: p.lowStockThreshold,
        variants: p.variants,
        is_store_visible: p.isStoreVisible,
        is_active: p.isActive,
        status: p.isActive ? "published" : "draft",
        seo_title: p.seoTitle || null,
        seo_description: p.seoDescription || null,
      };

  const query = isUpdate
    ? supabase.from("products").update(record as never).eq("id", id)
    : supabase.from("products").insert(record as never);
  const { data: saved, error } = await query.select("id").maybeSingle();
  if (error || !saved) {
    console.error("[action] save product", { code: error?.code ?? "no_row" });
    const message = error?.code === "23505"
      ? "ID atau slug produk sudah digunakan. Buka produk yang ada untuk mengeditnya."
      : "Produk gagal disimpan atau tidak ditemukan. Muat ulang halaman dan coba lagi.";
    return { success: false, message, errors: { [error?.code === "23505" ? "slug" : "id"]: message } };
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
    isUpdate ? "product.updated" : "product.created",
    "product",
    id,
    { name: p.name, type: p.productType }
  );
  revalidateProductRoutes();
  // Invalidate after the primary write, including partial child-save success paths.
  if (isB2B) revalidateB2BProduct([oldSlug, p.slug]);

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
        message: isUpdate ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.",
        productId: id,
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
        message: isUpdate ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.",
        productId: id,
        hotspotWarning: "Gagal menyimpan hotspot: " + hotspotError.message,
      };
    }
  }

  // Wire photo hotspots via RPC — Patch 4: B2B enforcement + Patch 7: Safe storage cleanup
  if (photoHotspotsPayload && isB2B) {
    // Patch 7: Capture old callout URLs before upsert for safe cleanup
    let oldCalloutUrls: string[] = [];
    if (isUpdate) {
      const { data: existingHotspots } = await supabase
        .from("product_photo_hotspots")
        .select("callout_image_url")
        .eq("product_id", id)
        .is("deleted_at", null);
      oldCalloutUrls = (existingHotspots ?? []).map(
        (h: { callout_image_url: string }) => h.callout_image_url
      );
    }

    const { error: photoHotspotError } = await supabase.rpc("upsert_product_photo_hotspots", {
      p_product_id: id,
      p_hotspots: photoHotspotsPayload.map((h, i) => ({
        id: h.id || null,
        target_image_url: h.target_image_url,
        position_x: h.position_x,
        position_y: h.position_y,
        title: h.title,
        description: h.description || null,
        callout_image_url: h.callout_image_url,
        sort_order: i,
      })),
    });
    if (photoHotspotError) {
      console.error("[action] upsert product photo hotspots", photoHotspotError);
      return {
        success: true,
        message: isUpdate ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.",
        productId: id,
        photoHotspotWarning: "Gagal menyimpan photo hotspot: " + photoHotspotError.message,
      };
    }

    // Patch 7: Safe storage cleanup — only after successful DB save
    // Delete old callout images that are no longer referenced
    const newCalloutUrls = new Set(photoHotspotsPayload.map((h) => h.callout_image_url));
    for (const oldUrl of oldCalloutUrls) {
      if (!newCalloutUrls.has(oldUrl)) {
        // Only delete managed photo-hotspot files, never external URLs
        await removeStorageObjectIfAny(
          supabase, oldUrl, "old callout image", "products/photo-hotspots/",
        );
      }
    }
  } else if (photoHotspotsPayload && !isB2B) {
    // Patch 4: Silently reject photo hotspot mutations for non-B2B products
    console.warn("[action] photo hotspot payload rejected: product type is not b2b_system");
  }

  revalidateProductRoutes();
  revalidatePath("/products");
  revalidatePath(`/products/${p.slug}`);

  return {
    success: true,
    message: isUpdate ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.",
    productId: id,
  };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: archived, error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id, slug, product_type")
    .maybeSingle();
  if (error) {
    console.error("[action] archive product", { code: error.code, message: error.message });
    return { success: false, message: "Gagal mengarsipkan produk. Silakan coba lagi." };
  }

  if (!archived) {
    return { success: false, message: "Produk tidak ditemukan atau sudah diarsipkan." };
  }

  await recordAudit("product.archived", "product", id, { id });
  revalidateProductRoutes();
  if (archived.product_type === "b2b_system") revalidateB2BProduct([archived.slug]);

  return { success: true, message: "Produk berhasil diarsipkan." };
}

export async function restoreProduct(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false, message: "ID produk tidak valid." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: restored, error } = await supabase
    .from("products")
    .update({ deleted_at: null })
    .eq("id", parsedId.data)
    .not("deleted_at", "is", null)
    .select("id, slug, product_type")
    .maybeSingle();

  if (error) {
    console.error("[action] restore product", { code: error.code, message: error.message });
    return { success: false, message: "Gagal memulihkan produk. Silakan coba lagi." };
  }

  if (!restored) {
    return { success: false, message: "Produk tidak ditemukan atau sudah aktif." };
  }

  await recordAudit("product.restored", "product", restored.id, {
    id: restored.id,
    type: restored.product_type,
  });
  revalidateProductRoutes();
  revalidatePath("/products");
  revalidatePath("/store");
  if (restored.product_type === "b2b_system") revalidateB2BProduct([restored.slug]);
  revalidatePath(
    restored.product_type === "sparepart"
      ? `/store/${restored.slug}`
      : `/products/${restored.slug}`
  );

  return { success: true, message: "Produk berhasil dipulihkan." };
}
