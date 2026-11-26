"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { revalidateB2BProduct } from "@/lib/product-public-revalidation";
import {
  productLifecycleInputSchema,
  productLifecycleReceiptSchema,
  productLifecycleRowSchema,
  type ProductLifecycleAction,
} from "@/lib/validations/productLifecycleSchema";
import type { ActionResult } from "./products";

const targetStates = {
  archive: "ARCHIVED",
  trash: "TRASHED",
  restore_to_archive: "ARCHIVED",
  restore_to_draft: "ACTIVE",
} as const;

function successMessage(action: ProductLifecycleAction, productType: "b2b_system" | "sparepart") {
  const noun = productType === "sparepart" ? "Komponen" : "Produk B2B";
  switch (action) {
    case "archive":
      return `${noun} berhasil diarsipkan.`;
    case "trash":
      return `${noun} berhasil dipindahkan ke Sampah.`;
    case "restore_to_archive":
      return `${noun} dipulihkan dari Sampah ke Arsip.`;
    case "restore_to_draft":
      return `${noun} dipulihkan sebagai draf nonaktif. Publikasikan secara terpisah bila siap tayang.`;
  }
}

function failure(code?: string, action?: ProductLifecycleAction): ActionResult {
  if (code === "40001" || code === "23505") {
    return {
      success: false,
      message: "Versi atau ID permintaan sudah berubah. Muat ulang daftar dan tinjau kembali aksi Anda.",
      errors: { lifecycle: "conflict" },
    };
  }
  if (code === "42501") {
    return {
      success: false,
      message:
        action === "restore_to_archive"
          ? "Hanya Super Admin yang dapat memulihkan produk dari Sampah."
          : "Anda tidak memiliki akses untuk aksi lifecycle produk.",
      errors: { lifecycle: "forbidden" },
    };
  }
  if (code === "P0002") {
    return {
      success: false,
      message: "Produk tidak ditemukan atau tidak lagi dapat diakses.",
      errors: { lifecycle: "not_found" },
    };
  }
  if (code === "22023") {
    return {
      success: false,
      message: "Transisi lifecycle tidak valid untuk keadaan produk saat ini.",
      errors: { lifecycle: "invalid" },
    };
  }
  if (code === "0A000") {
    return {
      success: false,
      message: "Operasi ini tidak didukung. Penghapusan permanen produk tidak tersedia.",
      errors: { lifecycle: "invalid" },
    };
  }
  if (code === "42703" || code === "42883" || code === "PGRST202") {
    return {
      success: false,
      message: "Skema lifecycle produk belum siap. Jalankan migrasi database terbaru terlebih dahulu.",
      errors: { lifecycle: "unavailable" },
    };
  }
  return {
    success: false,
    message: "Hasil perubahan lifecycle belum dapat dipastikan. Ulangi dengan ID permintaan yang sama untuk memeriksa hasilnya.",
    errors: { lifecycle: "unknown" },
  };
}

async function transition(
  input: unknown,
  action: ProductLifecycleAction,
  requiredType?: "b2b_system" | "sparepart"
): Promise<ActionResult> {
  const actor =
    action === "restore_to_archive"
      ? await requireSuperAdmin()
      : await requireAdmin();

  if (!actor) return failure("42501", action);
  if (action === "restore_to_archive" && actor.role !== "super_admin") {
    return failure("42501", action);
  }
  if (action !== "restore_to_archive" && actor.role !== "admin" && actor.role !== "super_admin") {
    return failure("42501", action);
  }

  const parsed = productLifecycleInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ID produk, versi lifecycle, dan ID permintaan yang valid wajib disertakan.",
      errors: { lifecycle: "invalid" },
    };
  }

  const { productId, expectedVersion, requestId } = parsed.data;
  try {
    const client = createClient(await cookies());
    const { data, error } = await client
      .from("products")
      .select("id,slug,product_type,deleted_at,trashed_at,lifecycle_version")
      .eq("id", productId)
      .maybeSingle();

    if (error) return failure(error.code, action);
    if (!data) return failure("P0002", action);

    const row = productLifecycleRowSchema.safeParse(data);
    if (!row.success) {
      return {
        success: false,
        message: "Keadaan lifecycle produk tidak valid atau skema belum siap. Tidak ada perubahan dilakukan.",
        errors: { lifecycle: "unavailable" },
      };
    }

    if (requiredType && row.data.product_type !== requiredType) {
      return {
        success: false,
        message:
          requiredType === "b2b_system"
            ? "Aksi ini hanya berlaku untuk produk B2B."
            : "Aksi ini hanya berlaku untuk produk Komponen.",
        errors: { lifecycle: "invalid" },
      };
    }

    // RPC memegang row lock FOR UPDATE, validasi role, optimistic lock versi, dan idempotency replay.
    const { data: changed, error: rpcError } = await client.rpc("transition_product_lifecycle", {
      p_product_id: productId,
      p_action: action,
      p_expected_version: expectedVersion,
      p_request_id: requestId,
    });

    if (rpcError) return failure(rpcError.code, action);

    const receipt = productLifecycleReceiptSchema.safeParse(changed);
    if (
      !receipt.success ||
      receipt.data.product_id !== productId ||
      receipt.data.request_id !== requestId ||
      receipt.data.action !== action
    ) {
      return failure(undefined, action);
    }

    if (
      receipt.data.applied &&
      (receipt.data.state !== targetStates[action] ||
        receipt.data.lifecycle_version !== expectedVersion + 1)
    ) {
      return failure(undefined, action);
    }

    if (
      receipt.data.applied &&
      action === "restore_to_draft" &&
      (receipt.data.status !== "draft" || receipt.data.is_active)
    ) {
      return failure(undefined, action);
    }

    // Audit sudah dicatat secara atomik oleh RPC; jangan duplikasi lewat recordAudit().
    if (receipt.data.product_type === "b2b_system") {
      revalidatePath("/admin/produk");
      revalidatePath(`/admin/produk/${encodeURIComponent(productId)}`);
      revalidatePath("/products");
      revalidatePath("/");
      revalidatePath("/sitemap.xml");
      revalidatePath("/api/products/search");
      revalidateB2BProduct([row.data.slug, receipt.data.slug]);
    } else {
      revalidatePath("/admin/sparepart");
      revalidatePath(`/admin/sparepart/${encodeURIComponent(productId)}`);
      revalidatePath("/admin/stok");
      revalidatePath("/store");
      revalidatePath(`/store/${row.data.slug}`);
      if (receipt.data.slug !== row.data.slug) {
        revalidatePath(`/store/${receipt.data.slug}`);
      }
      revalidatePath("/sitemap.xml");
    }

    return {
      success: true,
      productId,
      message: receipt.data.applied
        ? successMessage(action, receipt.data.product_type)
        : "Permintaan ini sudah diproses sebelumnya. Tampilan telah dimuat ulang.",
    };
  } catch {
    return failure(undefined, action);
  }
}

export async function archiveProduct(input: unknown, requiredType?: "b2b_system" | "sparepart"): Promise<ActionResult> {
  return transition(input, "archive", requiredType);
}

export async function trashProduct(input: unknown, requiredType?: "b2b_system" | "sparepart"): Promise<ActionResult> {
  return transition(input, "trash", requiredType);
}

export async function restoreArchivedProduct(input: unknown, requiredType?: "b2b_system" | "sparepart"): Promise<ActionResult> {
  return transition(input, "restore_to_draft", requiredType);
}

export async function restoreTrashedProduct(input: unknown, requiredType?: "b2b_system" | "sparepart"): Promise<ActionResult> {
  return transition(input, "restore_to_archive", requiredType);
}
