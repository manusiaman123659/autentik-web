import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { getMidtransStatus } from "@/lib/midtrans";
import type {
  MidtransInquiryDetails,
  MidtransInquiryResult,
  MidtransProviderFingerprint,
} from "@/lib/payments/types";
import { createClient } from "@/utils/supabase/server";

const INQUIRY_TIMEOUT_MS = 10_000;
const FAILURE_STATUSES = new Set(["expire", "deny", "cancel", "failure"]);
const TRANSACTION_ID_ONLY_PAYMENT_TYPES = new Set(["dana"]);

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

export interface MidtransInquiryOrder {
  id: string;
  order_code: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  midtrans_order_id: string | null;
  total: unknown;
  deleted_at: string | null;
}

export interface ValidatedMidtransInquiry {
  result: MidtransInquiryResult;
  actionableIntent?: "success" | "failure";
  providerStatus?: string;
  paymentType?: string;
  paidAt?: string | null;
  unsupportedReconciliation?: boolean;
}

type InquiryErrorCategory =
  | "not_found"
  | "timeout"
  | "authentication"
  | "rate_limited"
  | "provider_unavailable"
  | "network"
  | "unknown";

export function normalizeMoneyAmount(value: unknown): string | null {
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
  return `${BigInt(match[1])}.${fraction}`;
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

function parseSettlementTime(value: string | undefined): string | null {
  if (!value) return null;
  const withoutZone = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/);
  const candidate = withoutZone
    ? `${withoutZone[1]}T${withoutZone[2]}+07:00`
    : value;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildFingerprint(
  response: z.infer<typeof providerResponseSchema>,
  providerStatus: string,
  normalizedAmount: string | null,
): MidtransProviderFingerprint | undefined {
  if (!response.transaction_id || !response.payment_type || normalizedAmount === null) return undefined;
  return {
    transactionStatus: providerStatus,
    transactionId: response.transaction_id,
    grossAmount: normalizedAmount,
    paymentType: response.payment_type.toLowerCase(),
    fraudStatus: response.fraud_status?.toLowerCase() ?? null,
  };
}

export async function getValidatedMidtransInquiry(
  order: MidtransInquiryOrder,
): Promise<ValidatedMidtransInquiry> {
  const startedAt = Date.now();
  const logResult = (result: string, providerStatus?: string) => {
    logInquiry({
      orderId: order.id,
      orderCode: order.order_code,
      result,
      providerStatus,
      durationMs: Date.now() - startedAt,
    });
  };

  if (!order.midtrans_order_id || order.midtrans_order_id !== order.order_code) {
    logResult("identifier_configuration_mismatch");
    return {
      result: {
        success: false,
        category: "identity_mismatch",
        message: "Referensi transaksi Midtrans tidak cocok dengan kode pesanan. Periksa secara manual.",
      },
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
        result: {
          success: true,
          category: "not_found",
          message: "Status transaksi belum ditemukan di Midtrans. Ini dapat terjadi jika pelanggan belum memilih metode pembayaran pada halaman Snap.",
          checkedAt: new Date().toISOString(),
        },
      };
    }
    return {
      result: {
        success: false,
        category: "error",
        message: "Status pembayaran belum dapat diperiksa. Coba lagi nanti.",
      },
    };
  }

  const parsed = providerResponseSchema.safeParse(rawResponse);
  if (!parsed.success) {
    logResult("malformed_response");
    return {
      result: {
        success: false,
        category: "error",
        message: "Respons status Midtrans tidak dapat divalidasi. Periksa kembali nanti.",
      },
    };
  }

  const response = parsed.data;
  if (!response.order_id || !response.transaction_status) {
    logResult("malformed_response");
    return {
      result: {
        success: false,
        category: "error",
        message: "Respons status Midtrans tidak dapat divalidasi. Periksa kembali nanti.",
      },
    };
  }

  const providerStatus = response.transaction_status.toLowerCase();
  const normalizedAmount = normalizeMoneyAmount(response.gross_amount);
  const fingerprint = buildFingerprint(response, providerStatus, normalizedAmount);
  const details: MidtransInquiryDetails = {
    transactionStatus: providerStatus,
    paymentType: response.payment_type?.toLowerCase(),
    grossAmount: normalizedAmount ?? undefined,
    fraudStatus: response.fraud_status?.toLowerCase(),
    settlementTime: response.settlement_time,
  };
  const checkedAt = new Date().toISOString();

  if (response.order_id !== order.midtrans_order_id || response.order_id !== order.order_code) {
    logResult("provider_identity_mismatch", providerStatus);
    return {
      providerStatus,
      result: {
        success: false,
        category: "identity_mismatch",
        message: "Data transaksi Midtrans tidak cocok dengan pesanan ini. Periksa secara manual.",
        checkedAt,
        details,
      },
    };
  }

  const orderAmount = normalizeMoneyAmount(order.total);
  if (response.gross_amount !== undefined && (normalizedAmount === null || orderAmount === null)) {
    logResult("invalid_amount", providerStatus);
    return {
      providerStatus,
      result: {
        success: false,
        category: "requires_review",
        message: "Nominal transaksi Midtrans tidak dapat divalidasi. Periksa secara manual.",
        checkedAt,
        details,
      },
    };
  }
  if (normalizedAmount !== null && orderAmount !== null && normalizedAmount !== orderAmount) {
    logResult("amount_mismatch", providerStatus);
    return {
      providerStatus,
      result: {
        success: false,
        category: "amount_mismatch",
        message: "Nominal transaksi Midtrans tidak cocok dengan total pesanan. Periksa secara manual.",
        checkedAt,
        details,
      },
    };
  }

  const paymentType = response.payment_type?.toLowerCase();
  if (paymentType && TRANSACTION_ID_ONLY_PAYMENT_TYPES.has(paymentType)) {
    logResult("unsupported_reconciliation", providerStatus);
    return {
      providerStatus,
      paymentType,
      unsupportedReconciliation: true,
      result: {
        success: true,
        category: "requires_review",
        message: "Metode pembayaran ini memerlukan ID transaksi provider yang belum tersimpan. Lakukan pemeriksaan manual.",
        checkedAt,
        details,
        fingerprint,
      },
    };
  }

  if (providerStatus === "pending") {
    logResult("pending", providerStatus);
    return {
      providerStatus,
      paymentType,
      result: {
        success: true,
        category: "pending",
        message: "Midtrans: Pembayaran masih menunggu.",
        checkedAt,
        details,
        fingerprint,
      },
    };
  }

  if (providerStatus === "settlement") {
    if (!fingerprint || orderAmount === null) {
      logResult("confirmed_missing_reconciliation_identity", providerStatus);
      return {
        providerStatus,
        paymentType,
        result: {
          success: true,
          category: "requires_review",
          message: "Pembayaran terkonfirmasi, tetapi identitas transaksi atau nominal provider belum lengkap untuk sinkronisasi.",
          checkedAt,
          details,
          fingerprint,
        },
      };
    }
    logResult("confirmed", providerStatus);
    return {
      actionableIntent: "success",
      providerStatus,
      paymentType,
      paidAt: parseSettlementTime(response.settlement_time),
      result: {
        success: true,
        category: "confirmed",
        message: "Midtrans: Pembayaran terkonfirmasi.",
        checkedAt,
        details,
        fingerprint,
        reconciliationIntent: "success",
      },
    };
  }

  if (providerStatus === "capture") {
    if (details.fraudStatus === "accept" && fingerprint && orderAmount !== null) {
      logResult("confirmed", providerStatus);
      return {
        actionableIntent: "success",
        providerStatus,
        paymentType,
        paidAt: null,
        result: {
          success: true,
          category: "confirmed",
          message: "Midtrans: Pembayaran kartu terkonfirmasi.",
          checkedAt,
          details,
          fingerprint,
          reconciliationIntent: "success",
        },
      };
    }
    logResult("capture_requires_review", providerStatus);
    return {
      providerStatus,
      paymentType,
      result: {
        success: true,
        category: "requires_review",
        message: details.fraudStatus !== "accept"
          ? "Status capture Midtrans memerlukan pemeriksaan fraud secara manual."
          : "Pembayaran kartu terkonfirmasi, tetapi identitas transaksi atau nominal provider belum lengkap untuk sinkronisasi.",
        checkedAt,
        details,
        fingerprint,
      },
    };
  }

  if (FAILURE_STATUSES.has(providerStatus)) {
    if (!fingerprint || orderAmount === null) {
      logResult("terminal_failure_missing_reconciliation_identity", providerStatus);
      return {
        providerStatus,
        paymentType,
        result: {
          success: true,
          category: "requires_review",
          message: "Status gagal terkonfirmasi, tetapi identitas transaksi atau nominal provider belum lengkap untuk sinkronisasi.",
          checkedAt,
          details,
          fingerprint,
        },
      };
    }
    logResult("terminal_failure", providerStatus);
    return {
      actionableIntent: "failure",
      providerStatus,
      paymentType,
      paidAt: null,
      result: {
        success: true,
        category: "terminal_failure",
        message: providerStatus === "expire"
          ? "Midtrans: Transaksi telah berakhir."
          : "Midtrans: Pembayaran berstatus gagal atau dibatalkan.",
        checkedAt,
        details,
        fingerprint,
        reconciliationIntent: "failure",
      },
    };
  }

  logResult("requires_review", providerStatus);
  return {
    providerStatus,
    paymentType,
    result: {
      success: true,
      category: "requires_review",
      message: "Status transaksi Midtrans memerlukan pemeriksaan manual.",
      checkedAt,
      details,
      fingerprint,
    },
  };
}

export async function inquireMidtransPaymentStatus(
  orderId: string,
): Promise<MidtransInquiryResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_code, status, payment_status, payment_method, midtrans_order_id, total, deleted_at")
    .eq("id", orderId)
    .is("deleted_at", null)
    .maybeSingle();

  if (orderError || !order) {
    logInquiry({ orderId, result: "order_unavailable" });
    return {
      success: false,
      category: "ineligible",
      message: "Pesanan tidak ditemukan atau sudah tidak tersedia.",
    };
  }

  if (
    order.payment_method !== "midtrans"
    || order.status !== "pending"
    || order.payment_status !== "pending"
    || !order.midtrans_order_id
  ) {
    logInquiry({ orderId: order.id, orderCode: order.order_code, result: "ineligible" });
    return {
      success: false,
      category: "ineligible",
      message: "Pesanan ini tidak memenuhi syarat pemeriksaan status Midtrans.",
    };
  }

  return (await getValidatedMidtransInquiry(order)).result;
}
