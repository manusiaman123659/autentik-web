"use server";

import { requireOperationalStaff } from "@/lib/admin";
import { getProduct } from "@/lib/admin-data";
import { readManagedProductTranslations } from "@/lib/admin-product-translations";
import { productIdSchema } from "@/lib/validations/productSchema";
import { parseEditorSnapshot, type ProductTranslationEditorSnapshot } from "@/lib/product-translation-editor";
import type { ActionResult } from "./products";

export async function reloadProductTranslationEditor(input: unknown): Promise<ActionResult & { snapshot?: ProductTranslationEditorSnapshot }> {
  try {
    if (!await requireOperationalStaff()) return { success: false, message: "Anda tidak memiliki akses." };
    const parsed = productIdSchema.safeParse(input);
    if (!parsed.success) return { success: false, message: "ID produk tidak valid." };
    const product = await getProduct(parsed.data);
    if (!product) return { success: false, message: "Produk tidak tersedia atau sudah diarsipkan. Muat ulang halaman." };
    const rows = await readManagedProductTranslations(parsed.data);
    const snapshot = parseEditorSnapshot(product as unknown as Record<string, unknown>, rows);
    return { success: true, message: "Data terjemahan dimuat.", snapshot };
  } catch {
    return { success: false, message: "Data terjemahan produk belum dapat dimuat. Muat ulang data sebelum menyimpan." };
  }
}
