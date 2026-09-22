"use server";

import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkoutOrderSchema } from "@/lib/validations/storeSchema";
import { createMidtransTransaction } from "@/lib/midtrans";
import { logError } from "@/lib/logger";
import { SHIPPING_UNAVAILABLE_MESSAGE } from "@/lib/shipping";

export interface CheckoutResult {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  orderCode?: string;
  redirectUrl?: string;
  subtotal?: number;
  shippingCost?: number;
  shippingTotalWeightG?: number;
  shippingZoneId?: string;
  shippingRateId?: string;
  total?: number;
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
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, message: "Anda harus masuk sebelum membuat pesanan." };
  }

  const parsed = checkoutOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: toErrors(parsed.error),
    };
  }
  const data = parsed.data;

  const items = data.items.map((i) => ({
    product_id: i.productId,
    quantity: i.quantity,
    variant_id: i.variantId ?? null,
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
    logError("checkout.create_order", error, { userId: user.id });
    const errText = error.message || "";
    let customerMessage = "Pesanan belum dapat dibuat. Periksa kembali keranjang dan data pengiriman Anda.";
    if (errText.includes(SHIPPING_UNAVAILABLE_MESSAGE)) {
      customerMessage = SHIPPING_UNAVAILABLE_MESSAGE;
    } else if (errText.includes("memerlukan pemilihan varian")) {
      customerMessage = "Salah satu produk memerlukan pemilihan varian. Silakan pilih varian terlebih dahulu.";
    } else if (
      errText.includes("Stok varian") ||
      errText.includes("Stok produk") ||
      errText.includes("tidak mencukupi") ||
      errText.includes("tidak dapat dibeli") ||
      errText.includes("belum memiliki harga jual")
    ) {
      customerMessage = errText;
    }
    return {
      success: false,
      message: customerMessage,
    };
  }

  if (typeof orderCode !== "string" || !orderCode) {
    return { success: false, message: "Gagal membuat pesanan. Silakan coba lagi." };
  }

  // --- Midtrans Payment Integration ---
  try {
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select("subtotal, shipping_cost, shipping_total_weight_g, shipping_zone_id, shipping_rate_id, total")
      .eq("order_code", orderCode)
      .eq("user_id", user.id)
      .single();

    if (orderError || !orderRow) {
      throw orderError ?? new Error("Pesanan tidak dapat dibaca setelah checkout.");
    }

    const totalAmount = Math.round(Number(orderRow?.total ?? 0));
    const shippingCost = Number(orderRow.shipping_cost ?? 0);
    const shippingTotalWeightG = Number(orderRow.shipping_total_weight_g ?? 0);

    if (
      shippingCost <= 0 ||
      shippingTotalWeightG <= 0 ||
      !orderRow.shipping_zone_id ||
      !orderRow.shipping_rate_id
    ) {
      return { success: false, message: SHIPPING_UNAVAILABLE_MESSAGE, orderCode };
    }

    if (totalAmount > 0) {
      console.log("[CHECKOUT] Creating Midtrans transaction for:", orderCode, "Amount:", totalAmount);

      const transaction = await createMidtransTransaction({
        orderCode,
        amount: totalAmount,
        customerEmail: data.customerEmail || `${orderCode}@autentik.co`,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
      });
      if (!transaction.redirect_url) {
        throw new Error("Midtrans tidak mengembalikan URL pembayaran.");
      }

      console.log("[CHECKOUT] Transaction created successfully:", transaction.redirect_url);

      const supabaseAdmin = createAdminClient();
      const { data: updatedOrder, error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          midtrans_order_id: orderCode,
          midtrans_redirect_url: transaction.redirect_url,
        })
        .eq("order_code", orderCode)
        .eq("user_id", user.id)
        .eq("payment_method", "midtrans")
        .eq("payment_status", "pending")
        .is("deleted_at", null)
        .select("id")
        .maybeSingle();

      if (updateErr || !updatedOrder) {
        console.error("[CHECKOUT] Failed to update order with Midtrans data:", updateErr);
      } else {
        console.log("[CHECKOUT] Order updated with Midtrans transaction data");
      }

      return {
        success: true,
        message: "Pesanan berhasil dibuat.",
        orderCode,
        redirectUrl: transaction.redirect_url,
        subtotal: Number(orderRow.subtotal),
        shippingCost,
        shippingTotalWeightG,
        shippingZoneId: orderRow.shipping_zone_id,
        shippingRateId: orderRow.shipping_rate_id,
        total: totalAmount,
      };
    }
    return {
      success: false,
      message: "Pesanan dibuat, tetapi total pembayaran tidak valid. Hubungi PPIC AKA.",
      orderCode,
    };
  } catch (err) {
    console.error("[CHECKOUT] Midtrans Transaction Failed:", err);
    logError("checkout.midtrans_transaction", err, { orderCode });
    return {
      success: false,
      message: "Pesanan dibuat, tetapi link pembayaran Midtrans gagal dibuat. Silakan buka riwayat pesanan untuk mencoba kembali.",
      orderCode,
    };
  }
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

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, message: "Anda harus masuk untuk melanjutkan pembayaran." };
  }

  try {
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, total, status, payment_status, payment_method, customer_name, customer_email, customer_phone, midtrans_redirect_url")
      .eq("order_code", orderCode)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchErr || !order) {
      return { success: false, message: "Pesanan tidak ditemukan." };
    }

    if (order.payment_method !== "midtrans") {
      return { success: false, message: "Pesanan ini tidak menggunakan pembayaran Midtrans." };
    }

    if (order.payment_status !== "pending") {
      return { success: false, message: "Status pembayaran pesanan ini sudah tidak dapat diproses ulang." };
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

    const supabaseAdmin = createAdminClient();
    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({
        midtrans_order_id: orderCode,
        midtrans_redirect_url: transaction.redirect_url,
      })
      .eq("id", order.id)
      .eq("user_id", user.id)
      .eq("payment_method", "midtrans")
      .eq("payment_status", "pending")
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (updateErr || !updatedOrder) {
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
