"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getAdminUser } from "@/lib/admin";
import { recordAudit } from "@/lib/audit";
import { docDownloadLeadSchema, type DocDownloadLeadFormData } from "@/lib/validations/rfqSchema";
import { checkRateLimit } from "@/lib/rate-limit";
import { isPublicTechnicalDocumentProduct } from "@/lib/public-technical-document";
import type { ActionResult } from "./products";

function managedMediaPath(value: string | null, productId: string): string | null {
  if (!value || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const url = new URL(value);
    const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
    const prefix = "/storage/v1/object/public/media/";
    if (url.origin !== origin || !url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    return path.startsWith(`documents/${productId}/`) && !path.includes("..") ? path : null;
  } catch {
    return null;
  }
}

function validPrivatePath(value: string | null, productId: string): value is string {
  return typeof value === "string" && value.startsWith(`documents/${productId}/`)
    && value.length <= 500 && !value.includes("..") && !value.includes("?");
}

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

  const maxLengths = {
    fullName: 120,
    workEmail: 254,
    companyName: 160,
    phoneNumber: 30,
  } as const;
  const lengthErrors: Record<string, string> = {};
  for (const field of Object.keys(maxLengths) as Array<keyof typeof maxLengths>) {
    if (parsed.data[field].length > maxLengths[field]) {
      lengthErrors[field] = `Maksimal ${maxLengths[field]} karakter`;
    }
  }
  if (Object.keys(lengthErrors).length > 0) {
    return { success: false, message: "Periksa kembali isian form.", errors: lengthErrors };
  }

  // Global circuit breaker per application instance; Server Actions return ActionResult, not HTTP 429.
  if (!checkRateLimit("document-lead:global", 20, 10 * 60_000).allowed) {
    return { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi beberapa saat." };
  }

  const unavailable = { success: false, message: "Dokumen tidak dapat diakses saat ini. Silakan coba lagi." };

  try {
    const admin = createAdminClient();
    const { data: doc, error: docError } = await admin
      .from("technical_documents")
      .select("id, product_id, requires_lead, file_url, storage_path")
      .eq("id", parsed.data.documentId)
      .maybeSingle();

    if (docError || !doc || !doc.requires_lead || doc.file_url !== null
      || !doc.storage_path?.startsWith(`documents/${doc.product_id}/`)) return unavailable;

    const { data: product, error: productError } = await admin
      .from("products")
      .select("product_type, status, is_active, deleted_at")
      .eq("id", doc.product_id)
      .maybeSingle();
    if (productError || !product || !isPublicTechnicalDocumentProduct(product)) return unavailable;

    // The signed URL is kept server-side until the lead is successfully recorded.
    const { data: file, error: fileError } = await admin.storage
      .from("technical-documents")
      .info(doc.storage_path);
    if (fileError || !file) {
      console.error("[action] document_lead.file_unavailable");
      return unavailable;
    }

    const { data: signed, error: signError } = await admin.storage
      .from("technical-documents")
      .createSignedUrl(doc.storage_path, 600);
    if (signError || !signed?.signedUrl) {
      console.error("[action] document_lead.sign_failed");
      return unavailable;
    }

    const { error: leadError } = await admin.from("document_download_leads").insert({
      document_id: doc.id,
      full_name: parsed.data.fullName,
      work_email: parsed.data.workEmail,
      company_name: parsed.data.companyName,
      phone_number: parsed.data.phoneNumber,
    });

    if (leadError) {
      console.error("[action] document_lead.insert_failed", {
        code: /^[A-Z0-9]{5,8}$/.test(leadError.code ?? "") ? leadError.code : "unknown",
      });
      return unavailable;
    }

    return {
      success: true,
      message: "Data berhasil disimpan. Download akan dimulai.",
      fileUrl: signed.signedUrl,
    };
  } catch {
    console.error("[action] document_lead.unavailable");
    return unavailable;
  }
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
  fileUrl: string | null;
  storagePath: string | null;
  fileSizeKb?: number;
  requiresLead: boolean;
}): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const adminClient = createAdminClient();

  const { data: existing, error: existingError } = input.id
    ? await supabase.from("technical_documents")
      .select("file_url, storage_path, requires_lead")
      .eq("id", input.id)
      .eq("product_id", input.productId)
      .maybeSingle()
    : { data: null, error: null };
  if (existingError || (input.id && !existing)) {
    return { success: false, message: "Dokumen tidak ditemukan." };
  }

  if (input.requiresLead
    ? input.fileUrl !== null || !validPrivatePath(input.storagePath, input.productId)
    : !input.fileUrl || input.storagePath !== null) {
    return { success: false, message: "Unggah ulang dokumen sesuai jenis aksesnya sebelum menyimpan." };
  }

  const newPublicPath = managedMediaPath(input.fileUrl, input.productId);
  if (!input.requiresLead && !newPublicPath
    && (!existing || existing.requires_lead || existing.file_url !== input.fileUrl)) {
    return { success: false, message: "Dokumen publik harus diunggah ke media AKA." };
  }

  if (input.requiresLead) {
    const { data: file, error: fileError } = await adminClient.storage
      .from("technical-documents").info(input.storagePath!);
    if (fileError || !file) {
      return { success: false, message: "File privat belum tersedia. Silakan unggah ulang." };
    }
  } else if (newPublicPath) {
    const { data: file, error: fileError } = await adminClient.storage
      .from("media").info(newPublicPath);
    if (fileError || !file) {
      return { success: false, message: "File publik belum tersedia. Silakan unggah ulang." };
    }
  }

  // Never publish a gated row while its former managed public object remains accessible.
  if (existing && !existing.requires_lead && input.requiresLead) {
    const oldPath = managedMediaPath(existing.file_url, input.productId);
    if (!oldPath) {
      return { success: false, message: "URL dokumen lama harus dicabut sebelum akses lead diaktifkan." };
    }
    const { error: removeError } = await adminClient.storage.from("media").remove([oldPath]);
    if (removeError) {
      return { success: false, message: "Gagal mencabut file publik lama. Silakan coba lagi." };
    }
  }

  const record = {
    product_id: input.productId,
    title: input.title,
    file_type: input.fileType,
    file_url: input.fileUrl,
    storage_path: input.storagePath,
    file_size_kb: input.fileSizeKb ?? null,
    requires_lead: input.requiresLead,
  };

  let error;
  if (input.id) {
    const result = await supabase
      .from("technical_documents")
      .update(record)
      .eq("id", input.id)
      .eq("product_id", input.productId);
    error = result.error;
  } else {
    const result = await supabase.from("technical_documents").insert(record);
    error = result.error;
  }

  if (error) {
    console.error("[action] upsert technical document", error);
    return { success: false, message: "Gagal menyimpan dokumen. " + error.message };
  }

  if (existing?.storage_path && existing.storage_path !== input.storagePath) {
    const { error: removeError } = await adminClient.storage
      .from("technical-documents").remove([existing.storage_path]);
    if (removeError) {
      return { success: false, message: "Dokumen tersimpan, tetapi file privat lama belum dapat dibersihkan." };
    }
  }
  if (existing?.file_url && existing.file_url !== input.fileUrl && !input.requiresLead) {
    const oldPath = managedMediaPath(existing.file_url, input.productId);
    if (oldPath) {
      const { error: removeError } = await adminClient.storage.from("media").remove([oldPath]);
      if (removeError) {
        return { success: false, message: "Dokumen tersimpan, tetapi file publik lama belum dapat dibersihkan." };
      }
    }
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
    .select("file_url, storage_path, requires_lead")
    .eq("id", id)
    .eq("product_id", productId)
    .maybeSingle();

  if (!doc) return { success: false, message: "Dokumen tidak ditemukan." };
  if (doc.requires_lead) {
    if (!validPrivatePath(doc.storage_path, productId)) {
      return { success: false, message: "Lokasi file privat tidak valid." };
    }
    const { error: removeError } = await createAdminClient().storage
      .from("technical-documents").remove([doc.storage_path]);
    if (removeError) return { success: false, message: "Gagal menghapus file privat." };
  } else {
    const path = managedMediaPath(doc.file_url, productId);
    if (path) {
      const { error: removeError } = await createAdminClient().storage.from("media").remove([path]);
      if (removeError) return { success: false, message: "Gagal menghapus file publik." };
    }
  }

  const { error } = await supabase.from("technical_documents").delete().eq("id", id).eq("product_id", productId);
  if (error) {
    console.error("[action] delete technical document", error);
    return { success: false, message: "Gagal menghapus dokumen. " + error.message };
  }

  await recordAudit("technical_document.deleted", "technical_document", id, {});
  revalidatePath("/admin/produk");
  revalidatePath("/admin/produk/" + productId);

  return { success: true, message: "Dokumen berhasil dihapus." };
}
