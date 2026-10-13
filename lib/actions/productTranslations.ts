"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOperationalStaff } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { productTranslationSaveSchema, productTranslationMutationSchema } from "@/lib/validations/productTranslationSchema";
import { logError } from "@/lib/logger";
import type { ActionResult } from "./products";

const mutationResult = z.object({
  product_id: z.string().min(1), slug: z.string().regex(/^[a-z0-9-]+$/),
  product_type: z.enum(["b2b_system", "sparepart"]), locale: z.enum(["en", "zh-CN"]),
  version: z.number().int().positive(),
});

async function mutate(name: string, args: Record<string, unknown>): Promise<ActionResult> {
  let response;
  try {
    const client = createClient(await cookies());
    response = await client.rpc(name, args);
  } catch {
    logError("product.translation.mutation", "Koneksi penyimpanan terjemahan gagal.");
    return { success: false, message: "Penyimpanan belum dapat dikonfirmasi. Muat ulang sebelum mencoba kembali." };
  }
  const { data, error } = response;
  if (error) {
    logError("product.translation.mutation", "Mutasi terjemahan ditolak.", { code: error.code });
    const message = error.code === "42501" ? "Anda tidak memiliki akses."
      : error.code === "P1061" ? "Konten sumber berubah. Muat ulang dan tinjau terjemahan."
      : error.code === "P1062" ? "Terjemahan sudah berubah. Muat ulang sebelum menyimpan kembali."
      : error.code === "P1063" ? "Produk tidak tersedia atau sudah diarsipkan. Muat ulang halaman."
      : error.code === "22023" || error.code === "23514" ? "Periksa isi terjemahan dan kesesuaiannya dengan sumber."
      : "Terjemahan tidak dapat disimpan. Muat ulang lalu coba kembali.";
    return { success: false, message };
  }
  const result = mutationResult.safeParse(data);
  if (!result.success) return { success: false, message: "Hasil penyimpanan belum dapat dikonfirmasi. Muat ulang halaman." };
  const row = result.data;
  const section = row.product_type === "b2b_system" ? "produk" : "sparepart";
  const publicSection = row.product_type === "b2b_system" ? "products" : "store";
  revalidatePath(`/admin/${section}/${row.product_id}`);
  // Next revalidation uses the rewritten route-tree destination (/zh-CN), not /zh-cn.
  const destination = `/${row.locale}`;
  for (const path of ["", `/${publicSection}`, `/${publicSection}/${row.slug}`]) {
    revalidatePath(`${destination}${path}`);
  }
  return { success: true, message: "Perubahan terjemahan disimpan." };
}

export async function saveProductTranslation(input: unknown): Promise<ActionResult> {
  if (!await requireOperationalStaff()) return { success: false, message: "Anda tidak memiliki akses." };
  const parsed = productTranslationSaveSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Periksa isian terjemahan.", errors: Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), "Periksa nilai bidang ini."])) };
  const data = parsed.data;
  // Auditing is inside the RPC transaction, as in update_order_fulfillment_v2.
  return mutate("save_product_translation", {
    p_product_id: data.productId, p_locale: data.locale, p_payload: data.payload, p_status: data.status,
    p_expected_source_revision: data.expectedSourceRevision, p_expected_translation_version: data.expectedTranslationVersion,
    p_expected_translation_id: data.expectedTranslationId,
  });
}

export async function unpublishProductTranslation(input: unknown): Promise<ActionResult> {
  if (!await requireOperationalStaff()) return { success: false, message: "Anda tidak memiliki akses." };
  const parsed = productTranslationMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Identitas atau versi terjemahan tidak valid." };
  return mutate("unpublish_product_translation", { p_product_id: parsed.data.productId, p_locale: parsed.data.locale, p_expected_translation_version: parsed.data.expectedTranslationVersion, p_expected_translation_id: parsed.data.expectedTranslationId });
}

export async function deleteProductTranslation(input: unknown): Promise<ActionResult> {
  if (!await requireOperationalStaff()) return { success: false, message: "Anda tidak memiliki akses." };
  const parsed = productTranslationMutationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Identitas atau versi terjemahan tidak valid." };
  return mutate("delete_product_translation", { p_product_id: parsed.data.productId, p_locale: parsed.data.locale, p_expected_translation_version: parsed.data.expectedTranslationVersion, p_expected_translation_id: parsed.data.expectedTranslationId });
}
