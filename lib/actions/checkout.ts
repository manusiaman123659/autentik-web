"use server";

import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkoutOrderSchema } from "@/lib/validations/storeSchema";
import { createMidtransTransaction } from "@/lib/midtrans";
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

  // --- Midtrans Payment Integration ---
  try {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("total")
      .eq("order_code", orderCode)
      .single();

    const totalAmount = Math.round(Number(orderRow?.total ?? 0));

    if (totalAmount > 0) {
      console.log("[CHECKOUT] Creating Midtrans transaction for:", orderCode, "Amount:", totalAmount);

      const transaction = await createMidtransTransaction({
        orderCode,
        amount: totalAmount,
        customerEmail: data.customerEmail || `${orderCode}@autentik.co`,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
      });

      console.log("[CHECKOUT] Transaction created successfully:", transaction.redirect_url);

      const supabaseAdmin = createAdminClient();
      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          midtrans_order_id: orderCode,
          midtrans_redirect_url: transaction.redirect_url,
        })
        .eq("order_code", orderCode);

      if (updateErr) {
        console.error("[CHECKOUT] Failed to update order with Midtrans data:", updateErr);
      } else {
        console.log("[CHECKOUT] Order updated with Midtrans transaction data");
      }

      return {
        success: true,
        message: "Pesanan berhasil dibuat.",
        orderCode,
        redirectUrl: transaction.redirect_url,
      };
    }
  } catch (err) {
    console.error("[CHECKOUT] Midtrans Transaction Failed:", err);
    logError("checkout.midtrans_transaction", err, { orderCode });
  }

  return { success: true, message: "Pesanan berhasil dibuat.", orderCode };
}

// --- Regenerate Midtrans Payment (fallback if original transaction creation failed) ---
export interface RegenerateResult {
  success: boolean;
  message: string;
  redirectUrl?: string;
}

export async function regenerateMidtransPayment(orderCode: string): Promise<RegenerateResult> {
  if (!orderCode || typeof orderCode !== "string") {
    return { success: false, message: "Kode pesanan tidak valid." };
  }

  const supabaseAdmin = createAdminClient();

  try {
    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, total, status, customer_name, customer_email, customer_phone, midtrans_redirect_url")
      .eq("order_code", orderCode)
      .single();

    if (fetchErr || !order) {
      return { success: false, message: "Pesanan tidak ditemukan." };
    }

    if (order.status === "cancelled" || order.status === "completed" || order.status === "shipped") {
      return { success: false, message: "Pesanan ini sudah tidak dapat dibayar." };
    }

    if (order.midtrans_redirect_url) {
      return { success: true, message: "Link pembayaran sudah ada.", redirectUrl: order.midtrans_redirect_url };
    }

    const totalAmount = Math.round(Number(order.total ?? 0));
    if (totalAmount <= 0) {
      return { success: false, message: "Total pesanan tidak valid." };
    }

    const customerEmail = (order.customer_email || "").trim() || `order_${orderCode}@autentik.co`;

    console.log("[REGENERATE] Creating Midtrans transaction for:", orderCode, "Amount:", totalAmount);

    const transaction = await createMidtransTransaction({
      orderCode,
      amount: totalAmount,
      customerEmail,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
    });

    console.log("[REGENERATE] Transaction created successfully:", transaction.redirect_url);

    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({
        midtrans_order_id: orderCode,
        midtrans_redirect_url: transaction.redirect_url,
      })
      .eq("order_code", orderCode);

    if (updateErr) {
      console.error("[REGENERATE] Failed to update order:", updateErr);
      return { success: false, message: "Gagal menyimpan data pembayaran. Silakan coba lagi." };
    }

    return {
      success: true,
      message: "Link pembayaran berhasil dibuat.",
      redirectUrl: transaction.redirect_url,
    };
  } catch (err) {
    console.error("[REGENERATE_MIDTRANS_ERROR]", err, { orderCode });
    logError("checkout.regenerate_midtrans", err, { orderCode });
    return { success: false, message: "Gagal membuat link pembayaran. Silakan coba lagi." };
  }
}
