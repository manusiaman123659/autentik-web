"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { isCmsRole, type CmsRole } from "@/lib/admin-permissions";
import { manageStaffSchema, provisionStaffSchema, staffLookupSchema, type StaffCandidate } from "@/lib/validations/staffSchema";
import type { ActionResult } from "./products";

type StaffResult = ActionResult & {
  candidate?: StaffCandidate;
  updated?: { id: string; role: CmsRole; is_active: boolean; updated_at: string };
};
const denied: ActionResult = { success: false, message: "Anda tidak memiliki akses." };
const rpcMessages: Record<string, string> = {
  "42501": "Anda tidak memiliki akses.",
  P0061: "Akun tidak ditemukan. Muat ulang daftar.",
  P0062: "Status atau peran target sudah berubah atau tidak sesuai workflow. Muat ulang daftar.",
  P0063: "Data akses sudah berubah. Muat ulang daftar sebelum mencoba lagi.",
  P0064: "Minimal satu Super Admin aktif harus tersedia.",
  P0065: "Akun telah dihapus atau sedang diblokir. Pilih akun customer aktif lain.",
  "22023": "Periksa kembali data akses staf.",
};

export async function lookupStaffCandidate(input: unknown): Promise<StaffResult> {
  if (!await requireSuperAdmin()) return denied;
  const parsed = staffLookupSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Masukkan email akun yang tepat." };
  try {
    const client = createClient(await cookies());
    const { data, error } = await client.rpc("lookup_staff_candidate", { p_email: parsed.data.email });
    if (error) return { success: false, message: rpcMessages[error.code] ?? "Pencarian akun belum dapat dilakukan." };
    if (!Array.isArray(data) || data.length !== 1) return { success: false, message: "Tidak ditemukan satu akun customer aktif dengan email tersebut. Akun mungkin sudah menjadi staf." };
    return { success: true, message: "Akun ditemukan.", candidate: data[0] as StaffCandidate };
  } catch {
    return { success: false, message: "Pencarian akun belum dapat dilakukan." };
  }
}

async function mutate(input: unknown, provision: boolean): Promise<StaffResult> {
  const actor = await requireSuperAdmin();
  if (!actor) return denied;
  const parsed = provision ? provisionStaffSchema.safeParse(input) : manageStaffSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Periksa kembali data akses staf.", errors: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])) };
  const value = parsed.data;
  const client = createClient(await cookies());
  let data: unknown;
  try {
    const response = provision
      ? await client.rpc("provision_staff_access", { p_target_user_id: value.targetId, p_role: value.role, p_reason: value.reason || null })
      : await client.rpc("manage_staff_access", { p_target_user_id: value.targetId, p_role: value.role,
        p_is_active: "isActive" in value ? value.isActive : false,
        p_expected_updated_at: "expectedUpdatedAt" in value ? value.expectedUpdatedAt : null,
        p_reason: value.reason || null });
    if (response.error) {
      console.error("[staff-access] RPC ditolak", { code: response.error.code });
      return { success: false, message: rpcMessages[response.error.code] ?? "Akses staf belum dapat diperbarui. Muat ulang daftar." };
    }
    data = response.data;
  } catch {
    return { success: false, message: "Hasil perubahan belum dapat dipastikan. Muat ulang daftar sebelum mencoba lagi." };
  }
  const result = data as Record<string, unknown> | null;
  if (!result || typeof result.changed !== "boolean" || result.id !== value.targetId || !isCmsRole(result.role) || typeof result.is_active !== "boolean" || typeof result.updated_at !== "string") {
    return { success: false, message: "Hasil perubahan belum dapat dipastikan. Muat ulang daftar." };
  }
  const updated = { id: value.targetId, role: result.role, is_active: result.is_active, updated_at: result.updated_at };
  // RPC owns the atomic audit. Never append a second application audit here.
  if (updated.id === actor.id && (!updated.is_active || updated.role !== "super_admin")) {
    let logoutFailed = false;
    if (!updated.is_active) {
      try {
        const { error } = await client.auth.signOut({ scope: "local" });
        logoutFailed = Boolean(error);
      } catch { logoutFailed = true; }
      if (logoutFailed) console.error("[staff-access] Profil inactive tersimpan; logout lokal belum berhasil.");
    }
    // Redirect is framework control flow. Keep it outside mutation/logout
    // catches, before any current-route revalidation (including cookie render).
    // A failed logout does not undo the committed inactive profile.
    redirect(updated.is_active ? "/admin" : "/admin/login");
  }
  try {
    revalidatePath("/admin/akses-staff");
    revalidatePath("/admin/riwayat");
  } catch {
    // A post-commit cache error cannot roll back the database transaction.
    return { success: true, updated, message: "Akses staf tersimpan. Muat ulang halaman untuk melihat data terbaru." };
  }
  return { success: true, updated, message: result.changed === false ? "Pengaturan akses sudah sesuai." : "Akses staf berhasil diperbarui." };
}

export async function manageStaffAccess(input: unknown): Promise<StaffResult> {
  return mutate(input, false);
}
export async function provisionStaffAccess(input: unknown): Promise<StaffResult> {
  return mutate(input, true);
}
