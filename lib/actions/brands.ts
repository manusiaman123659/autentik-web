"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { brandSchema } from "@/lib/validations/brandSchema";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "./products";

const STORAGE_PUBLIC_MARKER = "/storage/v1/object/public/media/";

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

function storagePathFromPublicUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  const clean = stripQuery(url);
  const idx = clean.indexOf(STORAGE_PUBLIC_MARKER);
  if (idx === -1) return null;
  const path = decodeURIComponent(
    clean.slice(idx + STORAGE_PUBLIC_MARKER.length)
  );
  // Only delete objects living under the paths this app manages.
  if (!path.startsWith("brands/")) return null;
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

function revalidateBrandRoutes() {
  revalidatePath("/");
  revalidatePath("/katalog-produk");
  revalidatePath("/store");
  revalidatePath("/admin/merek");
  revalidatePath("/admin");
}

export async function upsertBrand(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: toErrors(parsed.error),
    };
  }
  const b = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const id = b.id && b.id.trim() ? b.id.trim() : b.slug.replace(/[^a-z0-9-]/g, "");

  const record = {
    id,
    name: b.name,
    segment: b.segment,
    segment_color: b.segmentColor,
    tagline: b.tagline,
    description: b.description,
    accent_color: b.accentColor,
    logo_light: b.logoLight || null,
    logo_dark: b.logoDark || null,
    is_active: b.isActive,
    sort_order: b.sortOrder,
  };

  const { error } = await supabase
    .from("brands")
    .upsert(record as never, { onConflict: "id" });
  if (error) {
    console.error("[action] upsert brand", error);
    return { success: false, message: "Gagal menyimpan merek. " + error.message };
  }

  await recordAudit(
    b.id && b.id.trim() ? "brand.updated" : "brand.created",
    "brand",
    id,
    { name: b.name, segment: b.segment, is_active: b.isActive }
  );
  revalidateBrandRoutes();

  return {
    success: true,
    message: b.id && b.id.trim()
      ? "Merek berhasil diperbarui."
      : "Merek berhasil ditambahkan.",
  };
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: existing } = await supabase
    .from("brands")
    .select("logo_light, logo_dark")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) {
    console.error("[action] delete brand", error);
    return { success: false, message: "Gagal menghapus merek. " + error.message };
  }

  if (existing) {
    const logos = existing as { logo_light: string | null; logo_dark: string | null };
    await removeStorageObjectIfAny(supabase, logos.logo_light, "brand logo light");
    await removeStorageObjectIfAny(supabase, logos.logo_dark, "brand logo dark");
  }

  await recordAudit("brand.deleted", "brand", id, { id });
  revalidateBrandRoutes();

  return { success: true, message: "Merek berhasil dihapus." };
}

export async function toggleBrandActive(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("brands")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) {
    console.error("[action] toggle brand", error);
    return {
      success: false,
      message: "Gagal memperbarui status merek. " + error.message,
    };
  }

  await recordAudit("brand.updated", "brand", id, { is_active: isActive });
  revalidateBrandRoutes();

  return {
    success: true,
    message: isActive ? "Merek diaktifkan." : "Merek dinonaktifkan.",
  };
}

export async function updateBrandSort(
  id: string,
  sortOrder: number
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("brands")
    .update({ sort_order: sortOrder })
    .eq("id", id);
  if (error) {
    console.error("[action] update brand sort", error);
    return {
      success: false,
      message: "Gagal memperbarui urutan merek. " + error.message,
    };
  }

  await recordAudit("brand.updated", "brand", id, { sort_order: sortOrder });
  revalidateBrandRoutes();

  return { success: true, message: "Urutan merek diperbarui." };
}