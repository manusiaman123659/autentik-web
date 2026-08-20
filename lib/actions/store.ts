"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { manualOrderSchema, orderStatusSchema, stockUpdateSchema } from "@/lib/validations/storeSchema";
import { recordAudit } from "@/lib/audit";
import type { ProductRow } from "@/lib/admin-data";
import type { ActionResult } from "./products";

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function formatOrderCode(): string {
  const d = new Date();
  const yymmdd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `AU-${yymmdd}-${random}`;
}

export async function createManualOrder(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = manualOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Periksa kembali isian form.", errors: toErrors(parsed.error) };
  }
  const data = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const productsData = await supabase
    .from("products")
    .select("id, name, sku, price, weight_grams, stock")
    .in(
      "id",
      data.items.map((i) => i.productId)
    );

  if (productsData.error || !productsData.data) {
    return { success: false, message: "Gagal memuat produk pesanan." };
  }

  const productMap = new Map((productsData.data as ProductRow[]).map((p) => [p.id, p]));
  const items: {
    product_id: string;
    product_name: string;
    sku?: string | null;
    unit_price: number;
    quantity: number;
    weight_grams: number;
  }[] = [];

  let subtotal = 0;
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, message: "Produk " + item.productId + " tidak ditemukan." };
    if ((product.stock ?? 0) < item.quantity) {
      return { success: false, message: "Stok " + product.name + " tidak mencukupi." };
    }
    const unitPrice = Number(product.price ?? 0);
    items.push({
      product_id: product.id,
      product_name: product.name,
      sku: product.sku ?? null,
      unit_price: unitPrice,
      quantity: item.quantity,
      weight_grams: Number(product.weight_grams ?? 0),
    });
    subtotal += unitPrice * item.quantity;
  }

  const orderCode = formatOrderCode();
  const shippingAddress = {
    address: data.address,
    city: data.city,
    province: data.province,
    postal_code: data.postalCode,
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_code: orderCode,
      customer_name: data.customerName,
      customer_email: data.customerEmail || null,
      customer_phone: data.customerPhone || null,
      shipping_address: shippingAddress,
      subtotal,
      shipping_cost: 0,
      total: subtotal,
      payment_method: data.paymentMethod,
      payment_status: "pending",
      status: "pending",
      notes: data.notes || null,
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[action] create order", orderError);
    return { success: false, message: "Gagal membuat pesanan. " + (orderError?.message ?? "") };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(items.map((it) => ({ ...it, order_id: order.id })));
  if (itemsError) {
    console.error("[action] create order items", itemsError);
    return { success: false, message: "Gagal menyimpan item pesanan. " + itemsError.message };
  }

  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (product && product.stock != null) {
      const next = Math.max(0, product.stock - item.quantity);
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: next })
        .eq("id", item.product_id);
      if (stockError) console.error("[action] decrement stock", stockError);
    }
  }

  await recordAudit("order.created", "order", order.id, { order_code: orderCode, total: subtotal });
  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return { success: true, message: "Pesanan " + orderCode + " berhasil dibuat." };
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
  if (data.status === "paid") patch.payment_status = "paid";

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
      console.error("[action] cancel_order", rpcError);
      return { success: false, message: "Gagal membatalkan pesanan dan mengembalikan stok. " + rpcError.message };
    }
    stockRestored = restored === true;
  }

  const { error } = await supabase.from("orders").update(patch as never).eq("id", id);
  if (error) {
    console.error("[action] update order", error);
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

  // RPC delete_order (0019): hanya pesanan status 'cancelled' yang boleh
  // dihapus (stok sudah dikembalikan saat cancel) — atomik + row lock di DB.
  const { data: deleted, error: rpcError } = await supabase.rpc("delete_order", {
    p_order_id: orderId,
  });
  if (rpcError) {
    console.error("[action] delete_order", rpcError);
    return { success: false, message: "Gagal menghapus pesanan. " + rpcError.message };
  }
  if (deleted !== true) {
    return { success: false, message: "Pesanan tidak ditemukan." };
  }

  await recordAudit("order.deleted", "order", orderId, { order_id: orderId, deleted: true });
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/" + orderId);
  revalidatePath("/admin/stok");
  revalidatePath("/admin");

  return { success: true, message: "Pesanan dihapus permanen." };
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
    console.error("[action] update stock", error);
    return { success: false, message: "Gagal memperbarui stok. " + error.message };
  }

  await recordAudit("product.stock_updated", "product", productId, { stock: parsed.data.stock });
  revalidatePath("/admin/stok");
  revalidatePath("/admin");

  return { success: true, message: "Stok diperbarui." };
}