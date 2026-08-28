"use server";

import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkoutOrderSchema } from "@/lib/validations/storeSchema";
import { createXenditInvoice } from "@/lib/xendit";
import { logError } from "@/lib/logger";

export interface CheckoutResult {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  orderCode?: string;
  redirectUrl?: string;
}

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function submitCheckout(input: unknown): Promise<CheckoutResult> {
  const parsed = checkoutOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: toErrors(parsed.error),
    };
  }
  const data = parsed.data;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const items = data.items.map((i) => ({
    product_id: i.productId,
    quantity: i.quantity,
  }));

  const shippingAddress = {
    address: data.address,
    city: data.city,
    province: data.province,
    postal_code: data.postalCode,
  };

  const { data: orderCode, error } = await supabase.rpc("create_checkout_order", {
    p_items: items,
    p_customer_name: data.customerName,
    p_customer_email: data.customerEmail || null,
    p_customer_phone: data.customerPhone || null,
    p_shipping_address: shippingAddress,
    p_notes: data.notes || null,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  if (typeof orderCode !== "string" || !orderCode) {
    return { success: false, message: "Gagal membuat pesanan. Silakan coba lagi." };
  }

  // --- Xendit Invoice Integration ---
  try {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("total")
      .eq("order_code", orderCode)
      .single();

    const totalAmount = Number(orderRow?.total ?? 0);

    if (totalAmount > 0) {
      console.log("[CHECKOUT] Creating Xendit Invoice for:", orderCode, "Amount:", totalAmount);

      const invoice = await createXenditInvoice({
        orderCode,
        amount: totalAmount,
        customerEmail: data.customerEmail || `${orderCode}@autentik.co`,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
      });

      console.log("[CHECKOUT] Invoice created successfully:", invoice.invoice_url);

      // Use admin client to bypass RLS for updating order with Xendit data
      const supabaseAdmin = createAdminClient();
      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          xendit_invoice_id: invoice.id,
          xendit_invoice_url: invoice.invoice_url,
        })
        .eq("order_code", orderCode);

      if (updateErr) {
        console.error("[CHECKOUT] Failed to update order with invoice URL:", updateErr);
      } else {
        console.log("[CHECKOUT] Order updated with Xendit invoice data");
      }

      return {
        success: true,
        message: "Pesanan berhasil dibuat.",
        orderCode,
        redirectUrl: invoice.invoice_url,
      };
    }
  } catch (err) {
    console.error("[CHECKOUT] Xendit Invoice Creation Failed:", err);
    logError("checkout.xendit_invoice", err, { orderCode });
  }

  return { success: true, message: "Pesanan berhasil dibuat.", orderCode };
}

// --- Regenerate Xendit Invoice (fallback if original invoice creation failed) ---
export interface RegenerateResult {
  success: boolean;
  message: string;
  redirectUrl?: string;
}

export async function regenerateXenditInvoice(orderCode: string): Promise<RegenerateResult> {
  if (!orderCode || typeof orderCode !== "string") {
    return { success: false, message: "Kode pesanan tidak valid." };
  }

  const supabaseAdmin = createAdminClient();

  try {
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, total, status, customer_name, customer_email, customer_phone, xendit_invoice_url")
      .eq("order_code", orderCode)
      .single();

    if (fetchErr || !order) {
      return { success: false, message: "Pesanan tidak ditemukan." };
    }

    if (order.status === "cancelled" || order.status === "completed" || order.status === "shipped") {
      return { success: false, message: "Pesanan ini sudah tidak dapat dibayar." };
    }

    // If invoice URL already exists, return it directly
    if (order.xendit_invoice_url) {
      return { success: true, message: "Invoice sudah ada.", redirectUrl: order.xendit_invoice_url };
    }

    const totalAmount = Math.round(Number(order.total ?? 0));
    if (totalAmount <= 0) {
      return { success: false, message: "Total pesanan tidak valid." };
    }

    const customerEmail = (order.customer_email || "").trim() || `order_${orderCode}@autentik.co`;

    console.log("[REGENERATE] Creating Xendit Invoice for:", orderCode, "Amount:", totalAmount, "Email:", customerEmail);

    const invoice = await createXenditInvoice({
      orderCode,
      amount: totalAmount,
      customerEmail,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
    });

    console.log("[REGENERATE] Invoice created successfully:", invoice.invoice_url);

    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({
        xendit_invoice_id: invoice.id,
        xendit_invoice_url: invoice.invoice_url,
      })
      .eq("order_code", orderCode);

    if (updateErr) {
      console.error("[REGENERATE] Failed to update order:", updateErr);
      return { success: false, message: "Gagal menyimpan data invoice. Silakan coba lagi." };
    }

    return {
      success: true,
      message: "Invoice berhasil dibuat.",
      redirectUrl: invoice.invoice_url,
    };
  } catch (err) {
    console.error("[REGENERATE_XENDIT_ERROR]", err, { orderCode });
    logError("checkout.regenerate_invoice", err, { orderCode });
    return { success: false, message: "Gagal membuat invoice. Silakan coba lagi." };
  }
}
