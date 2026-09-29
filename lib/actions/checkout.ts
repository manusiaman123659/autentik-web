"use server";

import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkoutOrderSchema } from "@/lib/validations/storeSchema";
import { createMidtransTransaction } from "@/lib/midtrans";
import {
  classifyMidtransCreateFailure,
  getClaimId,
  getRpcOutcome,
  getSafeMidtransRedirectUrl,
  parseWholeRupiahAmount,
  type MidtransCompensationReason,
  type MidtransInitializationState,
  type MidtransUnknownReason,
} from "@/lib/payments/midtransInitialization";
import { logError } from "@/lib/logger";
import { SHIPPING_UNAVAILABLE_MESSAGE } from "@/lib/shipping";
import { checkRateLimit } from "@/lib/rate-limit";

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
  recoveryRequired?: boolean;
}

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function getErrorCategory(error: unknown): string {
  if (error instanceof Error) return error.name || "Error";
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code) return code;
  }
  return "unknown";
}

interface InitializableOrder {
  id: string;
  order_code: string;
  total: unknown;
  status: string;
  payment_status: string;
  payment_method: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  midtrans_order_id: string | null;
  midtrans_redirect_url: string | null;
  midtrans_init_state: MidtransInitializationState;
}

type PaymentInitializationResult =
  | { outcome: "ready"; redirectUrl: string; amount: number }
  | { outcome: "compensated"; message: string }
  | { outcome: "review"; message: string };

const RECOVERY_MESSAGE = "Pesanan sudah dibuat, tetapi pembayaran masih sedang diperiksa.";

async function markInitializationUnknown(
  orderCode: string,
  userId: string,
  claimId: string,
  reason: MidtransUnknownReason,
) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("mark_midtrans_initialization_unknown", {
      p_order_code: orderCode,
      p_user_id: userId,
      p_claim_id: claimId,
      p_reason: reason,
    });
    if (error) {
      logError("checkout.midtrans_mark_unknown", "Gagal menandai inisialisasi untuk pemeriksaan.", {
        orderCode,
        category: getErrorCategory(error),
      });
    }
  } catch (error) {
    logError("checkout.midtrans_mark_unknown", "Gagal menandai inisialisasi untuk pemeriksaan.", {
      orderCode,
      category: getErrorCategory(error),
    });
  }
}

async function compensateInitialization(
  orderCode: string,
  userId: string,
  claimId: string,
  reason: MidtransCompensationReason,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("compensate_midtrans_initialization", {
      p_order_code: orderCode,
      p_user_id: userId,
      p_claim_id: claimId,
      p_reason: reason,
    });
    if (error) {
      logError("checkout.midtrans_compensate", "Kompensasi inisialisasi pembayaran gagal.", {
        orderCode,
        category: getErrorCategory(error),
      });
      return false;
    }
    return ["released", "already_released"].includes(getRpcOutcome(data) ?? "");
  } catch (error) {
    logError("checkout.midtrans_compensate", "Kompensasi inisialisasi pembayaran gagal.", {
      orderCode,
      category: getErrorCategory(error),
    });
    return false;
  }
}

async function readDurableMidtransReference(
  orderCode: string,
  userId: string,
  expectedUrl?: string,
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select("midtrans_init_state, midtrans_order_id, midtrans_redirect_url, status, payment_status, deleted_at")
      .eq("order_code", orderCode)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data || data.deleted_at !== null) return null;

    const redirectUrl = getSafeMidtransRedirectUrl(
      data.midtrans_redirect_url,
      process.env.MIDTRANS_IS_PRODUCTION === "true",
    );
    if (
      data.midtrans_init_state !== "ready"
      || data.midtrans_order_id !== orderCode
      || !redirectUrl
      || (expectedUrl !== undefined && redirectUrl !== expectedUrl)
    ) {
      return null;
    }
    return redirectUrl;
  } catch {
    return null;
  }
}

async function initializeMidtransPayment(
  order: InitializableOrder,
  userId: string,
  localPreflightValid = true,
): Promise<PaymentInitializationResult> {
  const admin = createAdminClient();
  const amount = parseWholeRupiahAmount(order.total);
  const { data: claimData, error: claimError } = await admin.rpc(
    "claim_midtrans_initialization",
    { p_order_code: order.order_code, p_user_id: userId },
  );

  if (claimError) {
    logError("checkout.midtrans_claim", "Gagal memperoleh klaim inisialisasi pembayaran.", {
      orderCode: order.order_code,
      category: getErrorCategory(claimError),
    });
    return { outcome: "review", message: RECOVERY_MESSAGE };
  }

  const claimOutcome = getRpcOutcome(claimData);
  if (claimOutcome === "ready") {
    const redirectUrl = await readDurableMidtransReference(order.order_code, userId);
    return redirectUrl && amount !== null
      ? { outcome: "ready", redirectUrl, amount }
      : { outcome: "review", message: RECOVERY_MESSAGE };
  }
  if (claimOutcome !== "claimed") {
    return { outcome: "review", message: RECOVERY_MESSAGE };
  }

  const claimId = getClaimId(claimData);
  if (!claimId) {
    return { outcome: "review", message: RECOVERY_MESSAGE };
  }

  if (!localPreflightValid || amount === null) {
    const reason: MidtransCompensationReason = amount === null
      ? "amount_invalid"
      : "local_preflight";
    const compensated = await compensateInitialization(
      order.order_code,
      userId,
      claimId,
      reason,
    );
    return compensated
      ? {
          outcome: "compensated",
          message: amount === null
            ? "Total pembayaran tidak valid. Pesanan dibatalkan dan stok telah dikembalikan."
            : "Pesanan belum dapat diproses. Stok telah dikembalikan.",
        }
      : { outcome: "review", message: RECOVERY_MESSAGE };
  }

  let redirectUrl: string;
  try {
    const transaction = await createMidtransTransaction({
      orderCode: order.order_code,
      amount,
      customerEmail: (order.customer_email || "").trim() || `${order.order_code}@autentik.co`,
      customerName: order.customer_name,
      customerPhone: order.customer_phone ?? undefined,
    });
    redirectUrl = transaction.redirect_url;
  } catch (error) {
    const failure = classifyMidtransCreateFailure(error);
    if (failure.outcome === "definitive") {
      const compensated = await compensateInitialization(
        order.order_code,
        userId,
        claimId,
        failure.reason,
      );
      return compensated
        ? { outcome: "compensated", message: "Pembayaran belum dapat dimulai. Stok telah dikembalikan." }
        : { outcome: "review", message: RECOVERY_MESSAGE };
    }

    await markInitializationUnknown(
      order.order_code,
      userId,
      claimId,
      failure.reason,
    );
    return { outcome: "review", message: RECOVERY_MESSAGE };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data, error } = await admin.rpc("finalize_midtrans_initialization", {
        p_order_code: order.order_code,
        p_user_id: userId,
        p_claim_id: claimId,
        p_redirect_url: redirectUrl,
      });
      const outcome = getRpcOutcome(data);
      if (!error && ["finalized", "already_finalized"].includes(outcome ?? "")) {
        const durableUrl = await readDurableMidtransReference(
          order.order_code,
          userId,
          redirectUrl,
        );
        if (durableUrl) return { outcome: "ready", redirectUrl: durableUrl, amount };
      }
      if (!error && ["claim_mismatch", "ineligible"].includes(outcome ?? "")) break;
    } catch {
      // A bounded retry below handles transient database failures.
    }
  }

  await markInitializationUnknown(
    order.order_code,
    userId,
    claimId,
    "provider_unpersisted",
  );
  return { outcome: "review", message: RECOVERY_MESSAGE };
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

  if (data.items.length > 50) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: { items: "Maksimal 50 item pesanan." },
    };
  }

  // Authenticated per-user limit for order-creating attempts only; no page view or shipping quote counts.
  if (!checkRateLimit(`checkout:create:${user.id}`, 10, 10 * 60_000).allowed) {
    return { success: false, message: "Terlalu banyak permintaan. Silakan coba lagi beberapa saat." };
  }

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
    logError("checkout.create_order", "Gagal membuat pesanan.", {
      category: "rpc_error",
      code: /^[A-Z0-9]{5,8}$/.test(error.code ?? "") ? error.code : "unknown",
    });
    const errText = error.message || "";
    let customerMessage = "Pesanan belum dapat dibuat. Periksa kembali keranjang dan data pengiriman Anda.";
    if (errText.includes(SHIPPING_UNAVAILABLE_MESSAGE)) {
      customerMessage = SHIPPING_UNAVAILABLE_MESSAGE;
    } else if (errText.includes("memerlukan pemilihan varian")) {
      customerMessage = "Salah satu produk memerlukan pemilihan varian. Silakan pilih varian terlebih dahulu.";
    } else if (
      errText.includes("Stok varian") ||
      errText.includes("Stok produk") ||
      errText.includes('Stok "') ||
      errText.includes("tidak mencukupi")
    ) {
      customerMessage = "Stok produk tidak mencukupi. Silakan periksa kembali keranjang Anda.";
    } else if (errText.includes("belum memiliki harga jual")) {
      customerMessage = "Harga produk telah berubah. Silakan periksa kembali keranjang Anda.";
    } else if (errText.includes("tidak dapat dibeli")) {
      customerMessage = "Produk tidak tersedia untuk dibeli saat ini.";
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
      .select("id, order_code, subtotal, shipping_cost, shipping_total_weight_g, shipping_zone_id, shipping_rate_id, total, status, payment_status, payment_method, customer_name, customer_email, customer_phone, midtrans_order_id, midtrans_redirect_url, midtrans_init_state")
      .eq("order_code", orderCode)
      .eq("user_id", user.id)
      .single();

    if (orderError || !orderRow) {
      logError("checkout.order_read", "Pesanan tidak dapat dibaca setelah checkout.", {
        orderCode,
        category: getErrorCategory(orderError),
      });
      return {
        success: false,
        message: RECOVERY_MESSAGE,
        orderCode,
        recoveryRequired: true,
      };
    }

    const shippingCost = Number(orderRow.shipping_cost ?? 0);
    const shippingTotalWeightG = Number(orderRow.shipping_total_weight_g ?? 0);
    const shippingIsValid = (
      shippingCost <= 0 ||
      shippingTotalWeightG <= 0 ||
      !orderRow.shipping_zone_id ||
      !orderRow.shipping_rate_id
    ) === false;
    const initialization = await initializeMidtransPayment(
      orderRow as InitializableOrder,
      user.id,
      shippingIsValid,
    );

    if (initialization.outcome === "ready") {
      return {
        success: true,
        message: "Pesanan berhasil dibuat.",
        orderCode,
        redirectUrl: initialization.redirectUrl,
        subtotal: Number(orderRow.subtotal),
        shippingCost,
        shippingTotalWeightG,
        shippingZoneId: orderRow.shipping_zone_id,
        shippingRateId: orderRow.shipping_rate_id,
        total: initialization.amount,
      };
    }

    const result: CheckoutResult = {
      success: false,
      message: shippingIsValid ? initialization.message : SHIPPING_UNAVAILABLE_MESSAGE,
      orderCode,
      recoveryRequired: initialization.outcome === "review",
    };
    return result;
  } catch (err) {
    logError("checkout.midtrans_initialization", "Inisialisasi pembayaran memerlukan pemeriksaan.", {
      orderCode,
      category: getErrorCategory(err),
    });
    return {
      success: false,
      message: RECOVERY_MESSAGE,
      orderCode,
      recoveryRequired: true,
    };
  }
}

// --- Regenerate Midtrans Payment (fallback if original transaction creation failed) ---
export interface RegenerateResult {
  success: boolean;
  message: string;
  redirectUrl?: string;
  recoveryRequired?: boolean;
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
      .select("id, order_code, total, status, payment_status, payment_method, customer_name, customer_email, customer_phone, midtrans_order_id, midtrans_redirect_url, midtrans_init_state")
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

    if (["paid", "refunded"].includes(order.payment_status)) {
      return { success: false, message: "Status pembayaran pesanan ini sudah tidak dapat diproses ulang." };
    }

    if (
      order.payment_status !== "pending"
      || ["cancelled", "completed", "shipped"].includes(order.status)
      || order.midtrans_init_state === "compensated"
    ) {
      return { success: false, message: "Pesanan ini sudah tidak dapat dibayar." };
    }

    if (order.midtrans_init_state === "ready") {
      const redirectUrl = await readDurableMidtransReference(orderCode, user.id);
      return redirectUrl
        ? { success: true, message: "Link pembayaran sudah ada.", redirectUrl }
        : { success: false, message: RECOVERY_MESSAGE, recoveryRequired: true };
    }

    if (["initializing", "unknown"].includes(order.midtrans_init_state)) {
      return { success: false, message: RECOVERY_MESSAGE, recoveryRequired: true };
    }

    if (order.midtrans_init_state !== "idle") {
      return { success: false, message: RECOVERY_MESSAGE, recoveryRequired: true };
    }

    const initialization = await initializeMidtransPayment(
      order as InitializableOrder,
      user.id,
    );
    if (initialization.outcome === "ready") {
      return {
        success: true,
        message: "Link pembayaran berhasil dibuat.",
        redirectUrl: initialization.redirectUrl,
      };
    }
    return {
      success: false,
      message: initialization.message,
      recoveryRequired: initialization.outcome === "review",
    };
  } catch (err) {
    logError("checkout.regenerate_midtrans", "Pemulihan pembayaran Midtrans gagal.", {
      orderCode,
      category: getErrorCategory(err),
    });
    return { success: false, message: RECOVERY_MESSAGE, recoveryRequired: true };
  }
}
