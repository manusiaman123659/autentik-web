"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminUser } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import { rfqSchema, type RfqFormData } from "@/lib/validations/rfqSchema";
import type { ActionResult } from "./products";

type RfqInsert = {
  rfq_code: string;
  product_id: string | null;
  company_name: string;
  pic_name: string;
  email: string;
  phone_number: string;
  estimated_quantity: number;
  target_date: string | null;
  notes: string | null;
};

async function generateRfqCode(supabase: ReturnType<typeof createClient>): Promise<string> {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  for (let attempt = 0; attempt < 20; attempt++) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `RFQ-${datePart}-${rand}`;
    const { data } = await supabase
      .from("quotation_requests")
      .select("rfq_code")
      .eq("rfq_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Gagal generate kode RFQ unik");
}

export async function submitRfqAction(
  input: RfqFormData,
): Promise<ActionResult & { rfqCode?: string; waUrl?: string }> {
  const parsed = rfqSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { success: false, message: "Periksa kembali isian form.", errors };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const rfqCode = await generateRfqCode(supabase);

  const insertData: RfqInsert = {
    rfq_code: rfqCode,
    product_id: parsed.data.productId && parsed.data.productId !== "" ? parsed.data.productId : null,
    company_name: parsed.data.companyName,
    pic_name: parsed.data.picName,
    email: parsed.data.email,
    phone_number: parsed.data.phoneNumber,
    estimated_quantity: parsed.data.estimatedQuantity,
    target_date: parsed.data.targetDate || null,
    notes: parsed.data.notes || null,
  };

  const { error } = await supabase.from("quotation_requests").insert(insertData);
  if (error) {
    console.error("[action] submit rfq", error);
    return { success: false, message: "Gagal mengirim permintaan penawaran. " + error.message };
  }

  const { data: waSetting } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "whatsapp")
    .maybeSingle();

  const waValue = (waSetting?.value as { number?: string } | null) ?? null;
  const waNumber = typeof waValue?.number === "string" ? waValue.number.trim() : "";

  let waUrl: string | undefined;
  if (waNumber) {
    const msg = [
      `Halo, saya ingin membuat permintaan penawaran (RFQ).`,
      ``,
      `Kode RFQ: ${rfqCode}`,
      parsed.data.productName ? `Produk: ${parsed.data.productName}` : "",
      `Perusahaan: ${parsed.data.companyName}`,
      `PIC: ${parsed.data.picName}`,
      `Email: ${parsed.data.email}`,
      `HP: ${parsed.data.phoneNumber}`,
      `Jumlah Estimasi: ${parsed.data.estimatedQuantity} unit`,
      parsed.data.targetDate ? `Target Tanggal: ${parsed.data.targetDate}` : "",
      parsed.data.notes ? `Catatan: ${parsed.data.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  }

  return {
    success: true,
    message: "Permintaan penawaran berhasil dikirim.",
    rfqCode,
    waUrl,
  };
}

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
