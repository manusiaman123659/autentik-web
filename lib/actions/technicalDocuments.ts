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
import { removeBeforeWrite, removeStorageObjectAndVerify, resolveTechnicalDocumentMediaUrl, storageErrorDiagnostic } from "@/lib/technical-document-media";
import type { ActionResult } from "./products";

function logNewFileVerification(
  documentId: string | null,
  bucket: "media" | "technical-documents",
  data: unknown,
  error: unknown,
) {
  console.info("[technical-documents]", {
    event: "technical_document_storage_verify_new",
    document_id: documentId,
    bucket,
    object_exists: data != null,
    attempt: 1,
    ...storageErrorDiagnostic(error),
  });
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
      .select("title, file_type, file_url, storage_path, file_size_kb, requires_lead")
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

  const newPublicUrl = resolveTechnicalDocumentMediaUrl(
    input.fileUrl, input.productId, process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  if (!input.requiresLead && newPublicUrl.kind !== "managed"
    && (!existing || existing.requires_lead || existing.file_url !== input.fileUrl)) {
    return { success: false, message: "Dokumen publik harus diunggah ke media AKA." };
  }

  if (input.requiresLead) {
    try {
      const { data: file, error: fileError } = await adminClient.storage
        .from("technical-documents").info(input.storagePath!);
      logNewFileVerification(input.id ?? null, "technical-documents", file, fileError);
      if (fileError || !file) {
        return { success: false, message: "File privat belum tersedia. Silakan unggah ulang." };
      }
    } catch (error) {
      logNewFileVerification(input.id ?? null, "technical-documents", null, error);
      return { success: false, message: "File privat belum tersedia. Silakan unggah ulang." };
    }
  } else if (newPublicUrl.kind === "managed") {
    try {
      const { data: file, error: fileError } = await adminClient.storage
        .from("media").info(newPublicUrl.path);
      logNewFileVerification(input.id ?? null, "media", file, fileError);
      if (fileError || !file) {
        return { success: false, message: "File publik belum tersedia. Silakan unggah ulang." };
      }
    } catch (error) {
      logNewFileVerification(input.id ?? null, "media", null, error);
      return { success: false, message: "File publik belum tersedia. Silakan unggah ulang." };
    }
  }

  // Never publish a gated row while its former managed public object remains accessible.
  if (existing && !existing.requires_lead && input.requiresLead) {
    const oldUrl = resolveTechnicalDocumentMediaUrl(
      existing.file_url, input.productId, process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    if (oldUrl.kind !== "managed") {
      return { success: false, message: "URL dokumen lama harus dicabut sebelum akses lead diaktifkan." };
    }
    if (!await removeStorageObjectAndVerify(adminClient.storage.from("media"), oldUrl.path, {
      documentId: input.id ?? "new", bucket: "media", classification: "managed",
    })) {
      return { success: false, message: "Gagal mencabut file publik lama. Silakan coba lagi." };
    }
  }

  const oldPublicUrl = existing?.file_url && existing.file_url !== input.fileUrl && !input.requiresLead
    ? resolveTechnicalDocumentMediaUrl(existing.file_url, input.productId, process.env.NEXT_PUBLIC_SUPABASE_URL)
    : null;
  if (oldPublicUrl?.kind === "unrecognized") {
    return { success: false, message: "URL file publik lama tidak dikenali. Perubahan dibatalkan." };
  }
  const oldPublicObjectChanged = oldPublicUrl?.kind === "managed"
    && (newPublicUrl.kind !== "managed" || oldPublicUrl.path !== newPublicUrl.path);

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
  let saved;
  if (input.id) {
    const result = await supabase
      .from("technical_documents")
      .update(record)
      .eq("id", input.id)
      .eq("product_id", input.productId)
      .select("id")
      .maybeSingle();
    error = result.error;
    saved = result.data;
  } else {
    const result = await supabase.from("technical_documents").insert(record).select("id").maybeSingle();
    error = result.error;
    saved = result.data;
  }

  if (error || !saved) {
    console.error("[action] upsert technical document", { code: error?.code ?? "no_row" });
    if (existing && !existing.requires_lead && input.requiresLead) {
      // The old public file was already revoked; keep the verified private upload
      // available for a retry instead of leaving both locations unusable.
      return { success: false, message: "File publik lama sudah dicabut, tetapi perubahan dokumen belum tersimpan. Silakan coba simpan lagi." };
    }
    const previousPublicUrl = existing?.file_url
      ? resolveTechnicalDocumentMediaUrl(existing.file_url, input.productId, process.env.NEXT_PUBLIC_SUPABASE_URL)
      : null;
    const isNewUpload = input.requiresLead
      ? input.storagePath !== existing?.storage_path
      : newPublicUrl.kind === "managed"
        && (previousPublicUrl?.kind !== "managed" || previousPublicUrl.path !== newPublicUrl.path);
    if (isNewUpload) {
      const bucket = input.requiresLead ? "technical-documents" : "media";
      const path = input.requiresLead ? input.storagePath : newPublicUrl.kind === "managed" ? newPublicUrl.path : null;
      if (path && !await removeStorageObjectAndVerify(adminClient.storage.from(bucket), path, {
        documentId: input.id ?? "new", bucket,
        classification: bucket === "media" ? "managed" : "private",
      })) {
        return { success: false, message: "Dokumen gagal disimpan; unggahan baru perlu diperiksa secara manual." };
      }
    }
    return { success: false, message: "Gagal menyimpan dokumen. Silakan unggah ulang file jika diperlukan." };
  }

  if (existing?.storage_path && existing.storage_path !== input.storagePath) {
    const { error: removeError } = await adminClient.storage
      .from("technical-documents").remove([existing.storage_path]);
    if (removeError) {
      return { success: false, message: "Dokumen tersimpan, tetapi file privat lama belum dapat dibersihkan." };
    }
  }
  if (oldPublicObjectChanged && oldPublicUrl?.kind === "managed") {
    if (!await removeStorageObjectAndVerify(adminClient.storage.from("media"), oldPublicUrl.path, {
      documentId: input.id ?? "new", bucket: "media", classification: "managed",
    })) {
      const { data: reverted, error: revertError } = await supabase.from("technical_documents")
        .update({
          title: existing!.title,
          file_type: existing!.file_type,
          file_url: existing!.file_url,
          storage_path: existing!.storage_path,
          file_size_kb: existing!.file_size_kb,
          requires_lead: existing!.requires_lead,
        })
        .eq("id", input.id!)
        .eq("product_id", input.productId)
        .eq("file_url", input.fileUrl!)
        .select("id")
        .maybeSingle();
      if (revertError || !reverted) {
        console.error("[action] document_public_cleanup_requires_recovery", { documentId: input.id });
        return { success: false, message: "File publik lama belum dibersihkan; perubahan dokumen perlu diperiksa secara manual." };
      }
      if (newPublicUrl.kind === "managed"
        && !await removeStorageObjectAndVerify(adminClient.storage.from("media"), newPublicUrl.path, {
          documentId: input.id ?? "new", bucket: "media", classification: "managed",
        })) {
        return { success: false, message: "Perubahan dibatalkan; unggahan baru perlu diperiksa secara manual." };
      }
      return { success: false, message: "File publik lama belum dapat dihapus. Perubahan dokumen dibatalkan." };
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

  const { data: doc, error: lookupError } = await supabase
    .from("technical_documents")
    .select("file_url, storage_path, requires_lead")
    .eq("id", id)
    .eq("product_id", productId)
    .maybeSingle();

  if (lookupError || !doc) return { success: false, message: "Dokumen tidak ditemukan." };
  let target: { bucket: "technical-documents" | "media"; path: string } | null = null;
  if (doc.requires_lead) {
    if (!validPrivatePath(doc.storage_path, productId)) {
      return { success: false, message: "Lokasi file privat tidak valid." };
    }
    target = { bucket: "technical-documents", path: doc.storage_path };
  } else {
    const resolved = resolveTechnicalDocumentMediaUrl(
      doc.file_url, productId, process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    if (resolved.kind === "unrecognized") {
      return { success: false, message: "URL file publik tidak dikenali. Dokumen belum dihapus." };
    }
    if (resolved.kind === "managed") target = { bucket: "media", path: resolved.path };
  }

  const deleteRow = async () => supabase.from("technical_documents")
    .delete().eq("id", id).eq("product_id", productId).select("id").maybeSingle();
  let deletion;
  if (target) {
    const outcome = await removeBeforeWrite(
      createAdminClient().storage.from(target.bucket), target.path, deleteRow,
      { documentId: id, bucket: target.bucket, classification: target.bucket === "media" ? "managed" : "private" },
    );
    if (!outcome.removed) {
      return { success: false, message: "Gagal menghapus file dokumen. Data dokumen belum dihapus." };
    }
    deletion = outcome.result;
  } else {
    deletion = await deleteRow();
  }

  const { data: deleted, error } = deletion;
  if (error || !deleted) {
    console.error("[action] delete technical document", { code: error?.code ?? "no_row" });
    return { success: false, message: "Gagal menghapus data dokumen setelah file dihapus. Silakan periksa dokumen." };
  }

  await recordAudit("technical_document.deleted", "technical_document", id, {});
  revalidatePath("/admin/produk");
  revalidatePath("/admin/produk/" + productId);

  return { success: true, message: "Dokumen berhasil dihapus." };
}
