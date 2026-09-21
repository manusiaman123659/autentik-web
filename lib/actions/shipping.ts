"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import {
  shippingZoneSchema,
  shippingRateSchema,
  shippingRegionSchema,
  testShippingRateSchema,
} from "@/lib/validations/shippingSchema";
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

function formatDbError(error: { code?: string; message: string }): string {
  if (error.code === "23503") {
    return "Data tidak dapat dihapus karena sudah direferensikan oleh pesanan yang ada. Silakan nonaktifkan statusnya.";
  }
  if (error.code === "23505") {
    return "Wilayah ini sudah terdaftar dan berstatus aktif pada zona pengiriman.";
  }
  if (error.code === "23514") {
    return "Rentang berat bertumpang tindih dengan tarif aktif lain pada zona yang sama atau batas berat tidak valid.";
  }
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "Tabel wilayah pengiriman belum tersedia di database. Pastikan pembaruan skema telah diterapkan.";
  }
  if (error.code === "PGRST202") {
    return "Fitur Uji Tarif belum aktif pada database. Pembaruan Shipping Admin 0047 belum diterapkan.";
  }
  if (
    error.code === "42883" &&
    typeof error.message === "string" &&
    error.message.includes("test_shipping_rate")
  ) {
    return "Fitur Uji Tarif belum aktif pada database. Pembaruan Shipping Admin 0047 belum diterapkan.";
  }
  if (error.code === "42883") {
    // 42883 from an internal function (e.g. "function min(uuid) does not exist")
    // is a DB configuration error, NOT a missing RPC — show a generic safe message.
    return "Gagal menjalankan Uji Tarif karena terjadi kesalahan pada konfigurasi pengiriman.";
  }
  return error.message || "Terjadi kesalahan pada database.";
}

export async function saveZone(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = shippingZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian zona.", errors: toErrors(parsed.error) };
  }
  const data = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const patch = {
    name: data.name,
    sort_order: data.sortOrder,
    is_active: data.isActive,
  };

  if (data.id) {
    const { error } = await supabase.from("shipping_zones").update(patch as never).eq("id", data.id);
    if (error) {
      console.error("[action] update shipping zone", error);
      return { success: false, message: formatDbError(error) };
    }
    await recordAudit("shipping.zone_updated", "shipping_zone", data.id, { name: data.name });
    revalidatePath("/admin/integrasi");
    return { success: true, message: "Zona " + data.name + " berhasil diperbarui." };
  }

  const { data: row, error } = await supabase.from("shipping_zones").insert(patch as never).select("id").single();
  if (error || !row) {
    console.error("[action] create shipping zone", error);
    return { success: false, message: formatDbError(error ?? { message: "Gagal membuat zona." }) };
  }
  await recordAudit("shipping.zone_created", "shipping_zone", row.id, { name: data.name });
  revalidatePath("/admin/integrasi");
  return { success: true, message: "Zona " + data.name + " berhasil dibuat." };
}

export async function deleteZone(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
  if (error) {
    console.error("[action] delete shipping zone", error);
    return { success: false, message: formatDbError(error) };
  }
  await recordAudit("shipping.zone_deleted", "shipping_zone", id);
  revalidatePath("/admin/integrasi");
  return { success: true, message: "Zona berhasil dihapus." };
}

export async function toggleZone(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("shipping_zones").update({ is_active: isActive } as never).eq("id", id);
  if (error) {
    console.error("[action] toggle shipping zone", error);
    return { success: false, message: formatDbError(error) };
  }
  await recordAudit("shipping.zone_toggled", "shipping_zone", id, { is_active: isActive });
  revalidatePath("/admin/integrasi");
  return { success: true, message: isActive ? "Zona diaktifkan." : "Zona dinonaktifkan." };
}

export async function saveRegion(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = shippingRegionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian wilayah.", errors: toErrors(parsed.error) };
  }
  const data = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const patch = {
    zone_id: data.zoneId,
    province: data.province,
    city: data.isProvinceWide ? null : (data.city || null),
    is_active: data.isActive,
  };

  if (data.id) {
    const { error } = await supabase.from("shipping_zone_regions").update(patch as never).eq("id", data.id);
    if (error) {
      console.error("[action] update shipping region", error);
      return { success: false, message: formatDbError(error) };
    }
    await recordAudit("shipping.region_updated", "shipping_zone_region", data.id, patch);
    revalidatePath("/admin/integrasi");
    return { success: true, message: "Wilayah berhasil diperbarui." };
  }

  const { data: row, error } = await supabase.from("shipping_zone_regions").insert(patch as never).select("id").single();
  if (error || !row) {
    console.error("[action] create shipping region", error);
    return { success: false, message: formatDbError(error ?? { message: "Gagal membuat wilayah." }) };
  }
  await recordAudit("shipping.region_created", "shipping_zone_region", row.id, patch);
  revalidatePath("/admin/integrasi");
  return { success: true, message: "Wilayah berhasil ditambahkan ke zona." };
}

export async function deleteRegion(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("shipping_zone_regions").delete().eq("id", id);
  if (error) {
    console.error("[action] delete shipping region", error);
    return { success: false, message: formatDbError(error) };
  }
  await recordAudit("shipping.region_deleted", "shipping_zone_region", id);
  revalidatePath("/admin/integrasi");
  return { success: true, message: "Wilayah berhasil dihapus." };
}

export async function toggleRegion(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("shipping_zone_regions").update({ is_active: isActive } as never).eq("id", id);
  if (error) {
    console.error("[action] toggle shipping region", error);
    return { success: false, message: formatDbError(error) };
  }
  await recordAudit("shipping.region_toggled", "shipping_zone_region", id, { is_active: isActive });
  revalidatePath("/admin/integrasi");
  return { success: true, message: isActive ? "Wilayah diaktifkan." : "Wilayah dinonaktifkan." };
}

export async function saveRate(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = shippingRateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian tarif.", errors: toErrors(parsed.error) };
  }
  const data = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const patch = {
    zone_id: data.zoneId,
    weight_from_g: data.weightFromG,
    weight_to_g: data.weightToG,
    cost: data.cost,
    is_active: data.isActive,
  };

  if (data.id) {
    const { error } = await supabase.from("shipping_rates").update(patch as never).eq("id", data.id);
    if (error) {
      console.error("[action] update shipping rate", error);
      return { success: false, message: formatDbError(error) };
    }
    await recordAudit("shipping.rate_updated", "shipping_rate", data.id, patch);
    revalidatePath("/admin/integrasi");
    return { success: true, message: "Tarif berhasil diperbarui." };
  }

  const { data: row, error } = await supabase.from("shipping_rates").insert(patch as never).select("id").single();
  if (error || !row) {
    console.error("[action] create shipping rate", error);
    return { success: false, message: formatDbError(error ?? { message: "Gagal membuat tarif." }) };
  }
  await recordAudit("shipping.rate_created", "shipping_rate", row.id, patch);
  revalidatePath("/admin/integrasi");
  return { success: true, message: "Tarif berhasil ditambahkan." };
}

export async function deleteRate(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("shipping_rates").delete().eq("id", id);
  if (error) {
    console.error("[action] delete shipping rate", error);
    return { success: false, message: formatDbError(error) };
  }
  await recordAudit("shipping.rate_deleted", "shipping_rate", id);
  revalidatePath("/admin/integrasi");
  return { success: true, message: "Tarif berhasil dihapus." };
}

export async function toggleRate(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("shipping_rates").update({ is_active: isActive } as never).eq("id", id);
  if (error) {
    console.error("[action] toggle shipping rate", error);
    return { success: false, message: formatDbError(error) };
  }
  await recordAudit("shipping.rate_toggled", "shipping_rate", id, { is_active: isActive });
  revalidatePath("/admin/integrasi");
  return { success: true, message: isActive ? "Tarif diaktifkan." : "Tarif dinonaktifkan." };
}

export interface TestShippingRateResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  quote?: {
    status: string;
    reasonCode: string;
    cost?: number;
    totalWeightG?: number;
    zoneId?: string;
    zoneName?: string;
    rateId?: string;
    weightFromG?: number;
    weightToG?: number;
    storeShippingEnabled?: boolean;
  };
}

export async function runTestShippingRate(input: unknown): Promise<TestShippingRateResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = testShippingRateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali parameter uji tarif.", errors: toErrors(parsed.error) };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc("test_shipping_rate", {
    p_province: parsed.data.province,
    p_city: parsed.data.city || "",
    p_total_weight_g: parsed.data.weightGrams,
  });

  if (error) {
    console.error("[action] test_shipping_rate", error);
    if (
      error.code === "PGRST202" ||
      (error.code === "42883" && typeof error.message === "string" && error.message.includes("test_shipping_rate"))
    ) {
      return {
        success: false,
        message: "Fitur Uji Tarif belum aktif pada database. Pembaruan Shipping Admin 0047 belum diterapkan.",
      };
    }
    return { success: false, message: formatDbError(error) };
  }

  return {
    success: true,
    quote: data as TestShippingRateResult["quote"],
  };
}
