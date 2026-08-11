"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { storeSettingsSchema } from "@/lib/validations/storeSchema";
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

  await recordAudit("site_settings.updated", "site_settings", "store", {
    ...parsed.data,
    midtrans: { ...parsed.data.midtrans, clientKey: parsed.data.midtrans.clientKey ? "***" : "" },
  });
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