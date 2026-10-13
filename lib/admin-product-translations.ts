import { cookies } from "next/headers";
import { requireOperationalStaff } from "./admin";
import { createClient } from "@/utils/supabase/server";
import { productIdSchema } from "./validations/productSchema";
import { productTranslationRowSchema } from "./validations/productTranslationSchema";

// Separate management boundary: authorized staff can inspect Draft/stale content.
export async function readManagedProductTranslations(productId: string) {
  if (!await requireOperationalStaff()) throw new Error("Anda tidak memiliki akses.");
  const id = productIdSchema.parse(productId);
  const client = createClient(await cookies());
  const { data, error } = await client.from("product_translations").select("*").eq("product_id", id).order("locale");
  if (error) throw new Error("Data terjemahan produk belum dapat dimuat.");
  return (data ?? []).map(row => productTranslationRowSchema.parse(row));
}
