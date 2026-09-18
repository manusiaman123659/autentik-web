"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { orderStatusSchema, stockUpdateSchema } from "@/lib/validations/storeSchema";
import { recordAudit } from "@/lib/audit";
import { logError } from "@/lib/logger";
import type { ActionResult } from "./products";

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function updateOrderStatus(id: string, input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = orderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian.", errors: toErrors(parsed.error) };
  }
  const data = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const patch: Record<string, unknown> = {
    status: data.status,
    tracking_courier: data.trackingCourier || null,
    tracking_number: data.trackingNumber || null,
    cancel_reason: data.cancelReason || null,
  };

  const audit: Record<string, unknown> = { status: data.status };
  if (data.shippingCost !== undefined) {
    const { data: ord } = await supabase
      .from("orders")
      .select("subtotal")
      .eq("id", id)
      .single();
    const subtotal = Number(ord?.subtotal ?? 0);
    patch.shipping_cost = data.shippingCost;
    patch.total = subtotal + data.shippingCost;
    audit.shipping_cost = data.shippingCost;
    audit.total = patch.total;
  }

  // Cancel => restore stok atomik via RPC (guard anti double-restore di DB).
  // status/cancel_reason sudah di-set RPC dalam satu transaksi; patch biasa
  // tetap jalan untuk field tracking/opsional (idempotent).
  let stockRestored = false;
  if (data.status === "cancelled") {
    const { data: restored, error: rpcError } = await supabase.rpc("cancel_order", {
      p_order_id: id,
      p_cancel_reason: data.cancelReason || null,
    });
    if (rpcError) {
      logError("action.cancel_order", rpcError);
      return { success: false, message: "Gagal membatalkan pesanan dan mengembalikan stok. " + rpcError.message };
    }
    stockRestored = restored === true;
  }

  const { error } = await supabase.from("orders").update(patch as never).eq("id", id);
  if (error) {
    logError("action.update_order", error);
    return { success: false, message: "Gagal memperbarui pesanan. " + error.message };
  }

  await recordAudit("order.status_changed", "order", id, audit);
  if (data.status === "cancelled" && stockRestored) {
    await recordAudit("order.stock_restored", "order", id, { order_id: id, restored: true });
  }
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/" + id);
  revalidatePath("/admin/stok");
  revalidatePath("/admin");

  return { success: true, message: "Status pesanan diperbarui." };
}

export async function deleteOrder(orderId: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  if (!orderId) return { success: false, message: "ID pesanan wajib diisi." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // RPC soft_delete_order (0022): set deleted_at instead of hard delete.
  const { data: deleted, error: rpcError } = await supabase.rpc("soft_delete_order", {
    p_order_id: orderId,
    p_admin_id: admin.id,
    p_reason: null,
  });
  if (rpcError) {
    logError("action.soft_delete_order", rpcError);
    return { success: false, message: "Gagal mengarsipkan pesanan. " + rpcError.message };
  }
  if (deleted !== true) {
    return { success: false, message: "Pesanan tidak ditemukan." };
  }

  await recordAudit("order.soft_deleted", "order", orderId, { order_id: orderId });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/" + orderId);
  revalidatePath("/admin/stok");
  revalidatePath("/admin");

  return { success: true, message: "Pesanan berhasil diarsipkan." };
}

export async function restoreOrder(orderId: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  if (!orderId) return { success: false, message: "ID pesanan wajib diisi." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: restored, error: rpcError } = await supabase.rpc("restore_order", {
    p_order_id: orderId,
    p_admin_id: admin.id,
  });
  if (rpcError) {
    logError("action.restore_order", rpcError);
    return { success: false, message: "Gagal mengembalikan pesanan. " + rpcError.message };
  }
  if (restored !== true) {
    return { success: false, message: "Pesanan tidak ditemukan atau tidak sedang diarsipkan." };
  }

  await recordAudit("order.restored", "order", orderId, { order_id: orderId });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/" + orderId);
  revalidatePath("/admin");

  return { success: true, message: "Pesanan berhasil dikembalikan." };
}

export async function updateStock(productId: string, input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = stockUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Nilai stok tidak valid.", errors: toErrors(parsed.error) };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.from("products").update({ stock: parsed.data.stock }).eq("id", productId);
  if (error) {
    logError("action.update_stock", error);
    return { success: false, message: "Gagal memperbarui stok. " + error.message };
  }

  await recordAudit("product.stock_updated", "product", productId, { stock: parsed.data.stock });
  revalidatePath("/admin/stok");
  revalidatePath("/admin");

  return { success: true, message: "Stok diperbarui." };
}
