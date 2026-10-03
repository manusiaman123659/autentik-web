"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { requireContentManager as getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { recruitmentSchema } from "@/lib/validations/recruitmentSchema";
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

export async function saveRecruitmentUrl(
  input: unknown
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = recruitmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian.",
      errors: toErrors(parsed.error),
    };
  }

  const url = parsed.data.url || null;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "recruitment", value: { url } as never }, { onConflict: "key" });
  if (error) {
    console.error("[action] save recruitment url", error);
    return {
      success: false,
      message: "Gagal menyimpan pengaturan lamaran. " + error.message,
    };
  }

  await recordAudit("site_settings.updated", "site_settings", "recruitment", {
    url,
  });

  revalidatePath("/careers");
  revalidatePath("/careers/[slug]");
  revalidatePath("/admin/karir");
  revalidatePath("/admin");

  return {
    success: true,
    message: url
      ? "Link pendaftaran lowongan berhasil disimpan."
      : "Link pendaftaran lowongan dinonaktifkan.",
  };
}
