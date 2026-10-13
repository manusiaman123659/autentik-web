import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireCapability } from "@/lib/admin";
import { getOrder, getAdminBankAccount, type OrderItemRow } from "@/lib/admin-data";
import { createClient } from "@/utils/supabase/server";
import { getSafeCustomerRedirect } from "@/lib/auth-redirect";
import { getPublicRoute, localizeHref } from "@/i18n/locales";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/validations/storeSchema";
import type { CustomerProofData, DeliveryNoteData, DocumentItem, InvoiceData, PricedDocumentItem } from "./document-types";

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Menunggu Pembayaran", unpaid: "Belum Dibayar", paid: "Lunas",
  failed: "Pembayaran Gagal", refunded: "Dikembalikan",
};
const METHOD_LABELS: Record<string, string> = { midtrans: "Midtrans", transfer: "Transfer Bank (Legacy)", cod: "Bayar di Tempat (Legacy)" };

function date(iso: string, includeTime = false): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso)) + (includeTime ? " WIB" : "");
}

function address(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const fields = value as Record<string, unknown>;
  return ["address", "city", "province", "postal_code"].map((key) => fields[key])
    .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
    .map((part) => part.trim()).join(", ");
}

function item(row: OrderItemRow): DocumentItem {
  return { id: row.id, name: row.product_name, sku: row.sku ?? null,
    variantLabel: row.variant_label ?? null, quantity: Number(row.quantity) };
}

function pricedItem(row: OrderItemRow): PricedDocumentItem {
  return { ...item(row), unitPrice: Number(row.unit_price), lineTotal: Number(row.unit_price) * Number(row.quantity) };
}

export async function getInvoiceDocument(id: string): Promise<InvoiceData> {
  await requireCapability("operations");
  const data = await getOrder(id);
  if (!data || data.items.length === 0) notFound();
  const { order, items } = data;
  const bankAccount = order.payment_method === "transfer" ? await getAdminBankAccount() : null;
  return {
    code: order.order_code, orderDate: date(order.created_at),
    customer: { name: order.customer_name, email: order.customer_email ?? null, phone: order.customer_phone ?? null, address: address(order.shipping_address) },
    paymentStatus: PAYMENT_LABELS[order.payment_status ?? ""] ?? "Status Tidak Diketahui",
    paymentMethod: order.payment_method ? METHOD_LABELS[order.payment_method] ?? null : null,
    items: items.map(pricedItem), subtotal: Number(order.subtotal), shippingCost: Number(order.shipping_cost), total: Number(order.total),
    notes: order.notes ?? null, bankAccount,
  };
}

export async function getDeliveryNoteDocument(id: string): Promise<DeliveryNoteData> {
  await requireCapability("operations");
  const data = await getOrder(id);
  if (!data || !["processing", "shipped"].includes(data.order.status) || data.items.length === 0) notFound();
  const { order, items } = data;
  return {
    code: order.order_code, orderDate: date(order.created_at),
    recipient: { name: order.customer_name, phone: order.customer_phone ?? null, address: address(order.shipping_address) },
    courier: order.tracking_courier?.trim() || null, trackingNumber: order.tracking_number?.trim() || null,
    items: items.map(item), notes: order.notes ?? null,
  };
}

type OwnedOrder = {
  order_code: string; created_at: string; customer_name: string; shipping_address: unknown;
  status: string; payment_status: string; subtotal: number; shipping_cost: number; total: number;
  order_items: OrderItemRow[];
};

export async function getCustomerProofDocument(code: string, returnPath?: string): Promise<CustomerProofData> {
  const supabase = createClient(await cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    const next = getSafeCustomerRedirect(returnPath ?? `/store/orders/${encodeURIComponent(code)}/print`);
    redirect(localizeHref(`/auth/login?next=${encodeURIComponent(next)}`, getPublicRoute(next.split("?")[0])?.locale ?? "id"));
  }
  const { data, error } = await supabase.from("orders")
    .select("order_code,created_at,customer_name,shipping_address,status,payment_status,subtotal,shipping_cost,total,order_items(id,product_name,sku,variant_label,quantity,unit_price)")
    .eq("order_code", code).eq("user_id", user.id).is("deleted_at", null).maybeSingle();
  if (error || !data) notFound();
  const order = data as OwnedOrder;
  if (!order.order_items?.length) notFound();
  return {
    code: order.order_code, orderDate: date(order.created_at), printedAt: date(new Date().toISOString(), true),
    customer: { name: order.customer_name, address: address(order.shipping_address) },
    orderStatus: ORDER_STATUS_LABELS[order.status as OrderStatus] ?? "Status Tidak Diketahui",
    paymentStatus: PAYMENT_LABELS[order.payment_status] ?? "Status Tidak Diketahui",
    items: order.order_items.map(pricedItem), subtotal: Number(order.subtotal), shippingCost: Number(order.shipping_cost), total: Number(order.total),
  };
}
