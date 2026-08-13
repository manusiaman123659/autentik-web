"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { comproSchema } from "@/lib/validations/comproSchema";
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

export async function saveComproManifest(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = comproSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian.", errors: toErrors(parsed.error) };
  }

  const { title, year, pdfUrl, pdfFilename } = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const value = {
    title,
    year: year || null,
    pdfUrl: pdfUrl || null,
    pdfFilename: pdfFilename || null,
  };

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "compro", value: value as never }, { onConflict: "key" });
  if (error) {
    console.error("[action] save compro manifest", error);
    return { success: false, message: "Gagal menyimpan company profile. " + error.message };
  }

  await recordAudit("compro.updated", "site_settings", "compro", {
    title,
    year,
    pdfFilename: value.pdfFilename,
  });

  revalidatePath("/about");
  revalidatePath("/admin/compro");
  revalidatePath("/admin");

  return { success: true, message: "Company profile berhasil disimpan." };
}
