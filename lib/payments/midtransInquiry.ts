import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { getMidtransStatus } from "@/lib/midtrans";
import type { MidtransInquiryDetails, MidtransInquiryResult } from "@/lib/payments/types";
import { createClient } from "@/utils/supabase/server";

const INQUIRY_TIMEOUT_MS = 10_000;

const optionalText = z.preprocess(
  (value) => value === null ? undefined : value,
  z.string().trim().min(1).optional(),
);

const providerResponseSchema = z.object({
  order_id: optionalText,
  transaction_id: optionalText,
  transaction_status: optionalText,
  status_code: optionalText,
  gross_amount: z.preprocess(
    (value) => value === null ? undefined : value,
    z.union([z.string(), z.number().finite()]).optional(),
  ),
  payment_type: optionalText,
  fraud_status: optionalText,
  transaction_time: optionalText,
  settlement_time: optionalText,
});

type InquiryErrorCategory =
  | "not_found"
  | "timeout"
  | "authentication"
  | "rate_limited"
  | "provider_unavailable"
  | "network"
  | "unknown";

function toMoneyMinorUnits(value: unknown): bigint | null {
  let normalized: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    normalized = value.toFixed(2);
  } else if (typeof value === "string") {
    normalized = value.trim();
  } else {
    return null;
  }

  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return BigInt(match[1]) * BigInt(100) + BigInt(fraction || "0");
}

function formatProviderAmount(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  const minorUnits = toMoneyMinorUnits(value);
  if (minorUnits === null) return undefined;
  const whole = minorUnits / BigInt(100);
  const fraction = (minorUnits % BigInt(100)).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as {
    httpStatusCode?: unknown;
    ApiResponse?: { status_code?: unknown };
  };
  const rawStatus = candidate.httpStatusCode ?? candidate.ApiResponse?.status_code;
  const status = typeof rawStatus === "number" ? rawStatus : Number(rawStatus);
  return Number.isFinite(status) ? status : null;
}

function classifyProviderError(error: unknown): InquiryErrorCategory {
  if (error instanceof Error && error.name === "MidtransInquiryTimeoutError") return "timeout";
  const status = getErrorStatus(error);
  if (status === 404) return "not_found";
  if (status === 401 || status === 403) return "authentication";
  if (status === 429) return "rate_limited";
  if (status !== null && status >= 500) return "provider_unavailable";
  if (typeof error === "object" && error !== null && "rawHttpClientData" in error) return "network";
  return "unknown";
}

async function getStatusWithTimeout(providerOrderId: string): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getMidtransStatus(providerOrderId),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          const error = new Error("Midtrans status inquiry timed out");
          error.name = "MidtransInquiryTimeoutError";
          reject(error);
        }, INQUIRY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function logInquiry(meta: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    event: "midtrans.status_inquiry",
    source: "admin",
    ...meta,
  }));
}

export async function inquireMidtransPaymentStatus(
  orderId: string,
): Promise<MidtransInquiryResult> {
  const startedAt = Date.now();
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_code, status, payment_status, payment_method, midtrans_order_id, total, deleted_at")
    .eq("id", orderId)
    .is("deleted_at", null)
    .maybeSingle();

  if (orderError || !order) {
    logInquiry({ orderId, result: "order_unavailable", durationMs: Date.now() - startedAt });
    return {
      success: false,
      category: "ineligible",
      message: "Pesanan tidak ditemukan atau sudah tidak tersedia.",
    };
  }

  const logResult = (result: string, providerStatus?: string) => {
    logInquiry({
      orderId: order.id,
      orderCode: order.order_code,
      result,
      providerStatus,
      durationMs: Date.now() - startedAt,
    });
  };

  if (
    order.payment_method !== "midtrans"
    || order.status !== "pending"
    || order.payment_status !== "pending"
    || !order.midtrans_order_id
  ) {
    logResult("ineligible");
    return {
      success: false,
      category: "ineligible",
      message: "Pesanan ini tidak memenuhi syarat pemeriksaan status Midtrans.",
    };
  }

  if (order.midtrans_order_id !== order.order_code) {
    logResult("identifier_configuration_mismatch");
    return {
      success: false,
      category: "identity_mismatch",
      message: "Referensi transaksi Midtrans tidak cocok dengan kode pesanan. Periksa secara manual.",
    };
  }

  let rawResponse: unknown;
  try {
    rawResponse = await getStatusWithTimeout(order.midtrans_order_id);
  } catch (error) {
    const errorCategory = classifyProviderError(error);
    logResult(errorCategory);
    if (errorCategory === "not_found") {
      return {
        success: true,
        category: "not_found",
        message: "Status transaksi belum ditemukan di Midtrans. Ini dapat terjadi jika pelanggan belum memilih metode pembayaran pada halaman Snap.",
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      success: false,
      category: "error",
      message: "Status pembayaran belum dapat diperiksa. Coba lagi nanti.",
    };
  }

  const parsed = providerResponseSchema.safeParse(rawResponse);
  if (!parsed.success) {
    logResult("malformed_response");
    return {
      success: false,
      category: "error",
      message: "Respons status Midtrans tidak dapat divalidasi. Periksa kembali nanti.",
    };
  }

  const response = parsed.data;
  if (!response.order_id || !response.transaction_status) {
    logResult("malformed_response");
    return {
      success: false,
      category: "error",
      message: "Respons status Midtrans tidak dapat divalidasi. Periksa kembali nanti.",
    };
  }

  const providerStatus = response.transaction_status.toLowerCase();
  const details: MidtransInquiryDetails = {
    transactionStatus: providerStatus,
    paymentType: response.payment_type,
    grossAmount: formatProviderAmount(response.gross_amount),
    fraudStatus: response.fraud_status?.toLowerCase(),
    settlementTime: response.settlement_time,
  };

  if (response.order_id !== order.midtrans_order_id || response.order_id !== order.order_code) {
    logResult("provider_identity_mismatch", providerStatus);
    return {
      success: false,
      category: "identity_mismatch",
      message: "Data transaksi Midtrans tidak cocok dengan pesanan ini. Periksa secara manual.",
      checkedAt: new Date().toISOString(),
      details,
    };
  }

  const hasProviderAmount = response.gross_amount !== undefined;
  if (hasProviderAmount) {
    const providerAmount = toMoneyMinorUnits(response.gross_amount);
    const orderAmount = toMoneyMinorUnits(order.total);
    if (providerAmount === null || orderAmount === null) {
      logResult("invalid_amount", providerStatus);
      return {
        success: false,
        category: "requires_review",
        message: "Nominal transaksi Midtrans tidak dapat divalidasi. Periksa secara manual.",
        checkedAt: new Date().toISOString(),
        details,
      };
    }
    if (providerAmount !== orderAmount) {
      logResult("amount_mismatch", providerStatus);
      return {
        success: false,
        category: "amount_mismatch",
        message: "Nominal transaksi Midtrans tidak cocok dengan total pesanan. Periksa secara manual.",
        checkedAt: new Date().toISOString(),
        details,
      };
    }
  }

  const checkedAt = new Date().toISOString();
  if (providerStatus === "pending") {
    logResult("pending", providerStatus);
    return {
      success: true,
      category: "pending",
      message: "Midtrans: Pembayaran masih menunggu.",
      checkedAt,
      details,
    };
  }

  if (providerStatus === "settlement") {
    if (!hasProviderAmount) {
      logResult("confirmed_missing_amount", providerStatus);
      return {
        success: true,
        category: "requires_review",
        message: "Pembayaran terkonfirmasi, tetapi nominal provider tidak tersedia untuk divalidasi.",
        checkedAt,
        details,
      };
    }
    logResult("confirmed", providerStatus);
    return {
      success: true,
      category: "confirmed",
      message: "Midtrans: Pembayaran terkonfirmasi.",
      checkedAt,
      details,
    };
  }

  if (providerStatus === "capture") {
    if (details.fraudStatus === "accept" && hasProviderAmount) {
      logResult("confirmed", providerStatus);
      return {
        success: true,
        category: "confirmed",
        message: "Midtrans: Pembayaran kartu terkonfirmasi.",
        checkedAt,
        details,
      };
    }
    logResult("capture_requires_review", providerStatus);
    return {
      success: true,
      category: "requires_review",
      message: details.fraudStatus !== "accept"
        ? "Status capture Midtrans memerlukan pemeriksaan fraud secara manual."
        : "Pembayaran kartu terkonfirmasi, tetapi nominal provider tidak tersedia untuk divalidasi.",
      checkedAt,
      details,
    };
  }

  if (["expire", "deny", "cancel", "failure"].includes(providerStatus)) {
    logResult("terminal_failure", providerStatus);
    return {
      success: true,
      category: "terminal_failure",
      message: providerStatus === "expire"
        ? "Midtrans: Transaksi telah berakhir."
        : "Midtrans: Pembayaran berstatus gagal atau dibatalkan.",
      checkedAt,
      details,
    };
  }

  logResult("requires_review", providerStatus);
  return {
    success: true,
    category: "requires_review",
    message: "Status transaksi Midtrans memerlukan pemeriksaan manual.",
    checkedAt,
    details,
  };
}
