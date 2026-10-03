"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { requireOperationalStaff as getAdminUser } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "./products";

export async function updateRfqStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("quotation_requests")
    .update({ status } as never)
    .eq("id", id);
  if (error) {
    console.error("[action] update rfq status", error);
    return { success: false, message: "Gagal memperbarui status. " + error.message };
  }

  await recordAudit("rfq.status_updated", "quotation_request", id, { status });
  revalidatePath("/admin/rfq");
  revalidatePath("/admin/rfq/" + id);

  return { success: true, message: "Status RFQ berhasil diperbarui." };
}

export async function deleteRfqAction(rfqId: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  if (!rfqId) return { success: false, message: "ID RFQ wajib diisi." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("quotation_requests")
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", rfqId);

  if (error) {
    console.error("[action] delete rfq", error);
    return { success: false, message: "Gagal menghapus RFQ. " + error.message };
  }

  await recordAudit("rfq.soft_deleted", "quotation_requests", rfqId);
  revalidatePath("/admin/rfq");

  return { success: true, message: "RFQ berhasil diarsipkan." };
}
