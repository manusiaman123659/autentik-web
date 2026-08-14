"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { careerSchema } from "@/lib/validations/careerSchema";
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

function revalidateCareerRoutes() {
  revalidatePath("/careers");
  revalidatePath("/admin/karir");
  revalidatePath("/admin");
}

export async function upsertCareer(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = careerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: toErrors(parsed.error),
    };
  }
  const c = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const id = c.id && c.id.trim() ? c.id.trim() : c.slug.replace(/[^a-z0-9-]/g, "");

  const record = {
    id,
    slug: c.slug,
    title: c.title,
    department: c.department,
    location: c.location,
    type: c.type,
    type_badge_color: c.typeBadgeColor,
    summary: c.summary,
    description: c.description,
    responsibilities: c.responsibilities.filter((item) => item.trim()),
    requirements: c.requirements.filter((item) => item.trim()),
    benefits: c.benefits.filter((item) => item.trim()),
    status: c.status,
    sort_order: c.sortOrder,
  };

  const { error } = await supabase
    .from("careers")
    .upsert(record as never, { onConflict: "id" });
  if (error) {
    console.error("[action] upsert career", error);
    return { success: false, message: "Gagal menyimpan lowongan. " + error.message };
  }

  await recordAudit(
    c.id && c.id.trim() ? "career.updated" : "career.created",
    "career",
    id,
    { title: c.title, status: c.status }
  );
  revalidateCareerRoutes();

  return {
    success: true,
    message: c.id && c.id.trim()
      ? "Lowongan berhasil diperbarui."
      : "Lowongan berhasil ditambahkan.",
  };
}

export async function deleteCareer(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("careers").delete().eq("id", id);
  if (error) {
    console.error("[action] delete career", error);
    return { success: false, message: "Gagal menghapus lowongan. " + error.message };
  }

  await recordAudit("career.deleted", "career", id, { id });
  revalidateCareerRoutes();

  return { success: true, message: "Lowongan berhasil dihapus." };
}