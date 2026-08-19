"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { shippingZoneSchema, shippingRateSchema } from "@/lib/validations/shippingSchema";
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

function parseList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
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
    provinces: parseList(data.provincesText),
    cities: parseList(data.citiesText),
    sort_order: data.sortOrder,
    is_active: data.isActive,
  };

  if (data.id) {
    const { error } = await supabase.from("shipping_zones").update(patch as never).eq("id", data.id);
    if (error) {
      console.error("[action] update shipping zone", error);
      return { success: false, message: "Gagal menyimpan zona. " + error.message };
    }
    await recordAudit("shipping.zone_updated", "shipping_zone", data.id, { name: data.name });
    revalidatePath("/admin/integrasi");
    return { success: true, message: "Zona " + data.name + " berhasil diperbarui." };
  }

  const { data: row, error } = await supabase.from("shipping_zones").insert(patch as never).select("id").single();
  if (error || !row) {
    console.error("[action] create shipping zone", error);
    return { success: false, message: "Gagal membuat zona. " + (error?.message ?? "") };
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
    return { success: false, message: "Gagal menghapus zona. " + error.message };
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
    return { success: false, message: "Gagal mengubah status zona. " + error.message };
  }
  await recordAudit("shipping.zone_toggled", "shipping_zone", id, { is_active: isActive });
  revalidatePath("/admin/integrasi");
  return { success: true, message: isActive ? "Zona diaktifkan." : "Zona dinonaktifkan." };
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
  };

  if (data.id) {
    const { error } = await supabase.from("shipping_rates").update(patch as never).eq("id", data.id);
    if (error) {
      console.error("[action] update shipping rate", error);
      return { success: false, message: "Gagal menyimpan tarif. " + error.message };
    }
    await recordAudit("shipping.rate_updated", "shipping_rate", data.id, {
      weight_from_g: data.weightFromG,
      weight_to_g: data.weightToG,
      cost: data.cost,
    });
    revalidatePath("/admin/integrasi");
    return { success: true, message: "Tarif berhasil diperbarui." };
  }

  const { data: row, error } = await supabase.from("shipping_rates").insert(patch as never).select("id").single();
  if (error || !row) {
    console.error("[action] create shipping rate", error);
    return { success: false, message: "Gagal membuat tarif. " + (error?.message ?? "") };
  }
  await recordAudit("shipping.rate_created", "shipping_rate", row.id, {
    weight_from_g: data.weightFromG,
    weight_to_g: data.weightToG,
    cost: data.cost,
  });
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
    return { success: false, message: "Gagal menghapus tarif. " + error.message };
  }
  await recordAudit("shipping.rate_deleted", "shipping_rate", id);
  revalidatePath("/admin/integrasi");
  return { success: true, message: "Tarif berhasil dihapus." };
}
