"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getAdminUser } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import { docDownloadLeadSchema, type DocDownloadLeadFormData } from "@/lib/validations/rfqSchema";
import type { ActionResult } from "./products";

export async function submitDocLeadAndGetUrl(
  input: DocDownloadLeadFormData,
): Promise<ActionResult & { fileUrl?: string }> {
  const parsed = docDownloadLeadSchema.safeParse(input);
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

  const { data: doc, error: docError } = await supabase
    .from("technical_documents")
    .select("file_url")
    .eq("id", parsed.data.documentId)
    .maybeSingle();

  if (docError || !doc) {
    return { success: false, message: "Dokumen tidak ditemukan." };
  }

  const { error: leadError } = await supabase.from("document_download_leads").insert({
    document_id: parsed.data.documentId,
    full_name: parsed.data.fullName,
    work_email: parsed.data.workEmail,
    company_name: parsed.data.companyName,
    phone_number: parsed.data.phoneNumber,
  });

  if (leadError) {
    console.error("[action] insert doc download lead", leadError);
    return { success: false, message: "Gagal menyimpan data. " + leadError.message };
  }

  return {
    success: true,
    message: "Data berhasil disimpan. Download akan dimulai.",
    fileUrl: doc.file_url,
  };
}

export async function listTechnicalDocuments(productId: string) {
  const admin = await getAdminUser();
  if (!admin) return [];

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("technical_documents")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[action] list technical documents", error);
    return [];
  }

  return data ?? [];
}

export async function upsertTechnicalDocument(input: {
  id?: string;
  productId: string;
  title: string;
  fileType: string;
  fileUrl: string;
  fileSizeKb?: number;
  requiresLead: boolean;
}): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const record = {
    product_id: input.productId,
    title: input.title,
    file_type: input.fileType,
    file_url: input.fileUrl,
    file_size_kb: input.fileSizeKb ?? null,
    requires_lead: input.requiresLead,
  };

  let error;
  if (input.id) {
    const result = await supabase
      .from("technical_documents")
      .update(record)
      .eq("id", input.id);
    error = result.error;
  } else {
    const result = await supabase.from("technical_documents").insert(record);
    error = result.error;
  }

  if (error) {
    console.error("[action] upsert technical document", error);
    return { success: false, message: "Gagal menyimpan dokumen. " + error.message };
  }

  await recordAudit(
    input.id ? "technical_document.updated" : "technical_document.created",
    "technical_document",
    input.id ?? input.productId,
    { title: input.title, file_type: input.fileType },
  );
  revalidatePath("/admin/produk");
  revalidatePath("/admin/produk/" + input.productId);

  return { success: true, message: "Dokumen berhasil disimpan." };
}

export async function deleteTechnicalDocument(
  id: string,
  productId: string,
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: doc } = await supabase
    .from("technical_documents")
    .select("file_url")
    .eq("id", id)
    .maybeSingle();

  if (doc?.file_url) {
    const urlParts = doc.file_url.split("/");
    const bucketIndex = urlParts.indexOf("media");
    if (bucketIndex !== -1) {
      const storagePath = urlParts.slice(bucketIndex + 1).join("/");
      await supabase.storage.from("media").remove([storagePath]);
    }
  }

  const { error } = await supabase.from("technical_documents").delete().eq("id", id);
  if (error) {
    console.error("[action] delete technical document", error);
    return { success: false, message: "Gagal menghapus dokumen. " + error.message };
  }

  await recordAudit("technical_document.deleted", "technical_document", id, {});
  revalidatePath("/admin/produk");
  revalidatePath("/admin/produk/" + productId);

  return { success: true, message: "Dokumen berhasil dihapus." };
}
