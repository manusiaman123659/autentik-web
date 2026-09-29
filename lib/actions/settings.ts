"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { storeSettingsSchema } from "@/lib/validations/storeSchema";
import { HERO_MAIN_BRAND_IDS, heroSlidesSchema } from "@/lib/validations/heroSchema";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "./products";

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function saveStoreSettings(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian.", errors: toErrors(parsed.error) };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "store", value: parsed.data as never }, { onConflict: "key" });
  if (error) {
    console.error("[action] save store settings", error);
    return { success: false, message: "Gagal menyimpan pengaturan. " + error.message };
  }

  await recordAudit("site_settings.updated", "site_settings", "store", parsed.data);
  revalidatePath("/admin/integrasi");

  return { success: true, message: "Pengaturan toko berhasil disimpan." };
}

export async function markMessageRead(id: string, isRead: boolean): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read: isRead } as never)
    .eq("id", id);
  if (error) {
    console.error("[action] mark message read", error);
    return { success: false, message: "Gagal memperbarui pesan. " + error.message };
  }

  await recordAudit("inquiry.read_toggled", "contact_message", id, { is_read: isRead });
  revalidatePath("/admin/inquiry");
  revalidatePath("/admin/inquiry/" + id);
  revalidatePath("/admin");

  return { success: true, message: isRead ? "Pesan ditandai sudah dibaca." : "Pesan ditandai belum dibaca." };
}

export async function saveBankAccount(input: {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "bank_account", value: input }, { onConflict: "key" });
  if (error) {
    console.error("[action] save bank account", error);
    return { success: false, message: "Gagal menyimpan rekening. " + error.message };
  }

  await recordAudit("site_settings.updated", "site_settings", "bank_account", input);
  revalidatePath("/admin/integrasi");
  revalidatePath("/store/orders");

  return { success: true, message: "Informasi rekening berhasil disimpan." };
}

export async function saveHeroSlides(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = heroSlidesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian.", errors: toErrors(parsed.error) };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const productIds = parsed.data.slides.map((slide) => slide.productId);
  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, brand_id")
      .in("id", productIds)
      .eq("product_type", "b2b_system")
      .eq("is_active", true)
      .eq("status", "published")
      .is("deleted_at", null);
    if (productsError || products?.length !== productIds.length) {
      return {
        success: false,
        message: "Satu atau lebih produk tidak tersedia untuk Hero Homepage.",
      };
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const allowedBrands = new Set<string>(HERO_MAIN_BRAND_IDS);
    const selectedBrands = new Set<string>();
    for (const [index, slide] of parsed.data.slides.entries()) {
      const brandId = productMap.get(slide.productId)?.brand_id;
      if (!brandId || !allowedBrands.has(brandId)) {
        return {
          success: false,
          message: "Produk Hero hanya boleh berasal dari brand utama AKA.",
          errors: {
            [`slides.${index}.productId`]:
              "Pilih produk dari TALPHA, AUTENTIK, CYLAB, ULLUN, atau EPAL.",
          },
        };
      }
      if (selectedBrands.has(brandId)) {
        return {
          success: false,
          message: "Setiap brand utama hanya boleh memiliki satu produk Hero.",
          errors: {
            [`slides.${index}.productId`]: "Brand ini sudah dipilih pada slide lain.",
          },
        };
      }
      selectedBrands.add(brandId);
    }
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "home_hero", value: parsed.data as never }, { onConflict: "key" });
  if (error) {
    console.error("[action] save hero slides", error);
    return { success: false, message: "Gagal menyimpan hero slides. " + error.message };
  }

  await recordAudit("site_settings.updated", "site_settings", "home_hero", parsed.data);
  revalidatePath("/");
  revalidatePath("/admin/integrasi");
  return { success: true, message: "Hero homepage berhasil disimpan." };
}
