import "server-only";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { recordAudit } from "@/lib/audit";
import { logAudit, logError } from "@/lib/logger";
import {
  getValidatedMidtransInquiry,
  normalizeMoneyAmount,
  type MidtransInquiryOrder,
} from "@/lib/payments/midtransInquiry";
import type {
  MidtransProviderFingerprint,
  MidtransReconciliationResult,
} from "@/lib/payments/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const ORDER_SELECT = "id, order_code, status, payment_status, payment_method, midtrans_order_id, total, deleted_at";

function fingerprintsMatch(
  expected: MidtransProviderFingerprint,
  actual: MidtransProviderFingerprint | undefined,
): boolean {
  return actual !== undefined
    && expected.transactionStatus === actual.transactionStatus
    && expected.transactionId === actual.transactionId
    && expected.grossAmount === actual.grossAmount
    && expected.paymentType === actual.paymentType
    && expected.fraudStatus === actual.fraudStatus;
}

function hasSameLocalIdentity(before: MidtransInquiryOrder, after: MidtransInquiryOrder): boolean {
  return after.deleted_at === null
    && before.order_code === after.order_code
    && before.payment_method === after.payment_method
    && before.midtrans_order_id === after.midtrans_order_id
    && normalizeMoneyAmount(before.total) === normalizeMoneyAmount(after.total);
}

function revalidateOrderPaths(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/stok");
  revalidatePath("/admin");
}

function logReconciliation(meta: Record<string, unknown>) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    event: "midtrans.manual_reconciliation",
    source: "admin",
    ...meta,
  }));
}

export async function reconcileMidtransPayment(
  orderId: string,
  expectedFingerprint: MidtransProviderFingerprint,
  actorId: string,
): Promise<MidtransReconciliationResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: initialOrder, error: initialError } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .is("deleted_at", null)
    .maybeSingle();

  if (initialError || !initialOrder) {
    logReconciliation({ actorId, orderId, outcome: "order_unavailable" });
    return {
      success: false,
      category: "ineligible",
      message: "Pesanan tidak ditemukan atau sudah tidak tersedia.",
    };
  }

  const order = initialOrder as MidtransInquiryOrder;
  if (
    order.payment_method !== "midtrans"
    || order.status !== "pending"
    || order.payment_status !== "pending"
    || !order.midtrans_order_id
    || order.midtrans_order_id !== order.order_code
  ) {
    logReconciliation({
      actorId,
      orderId,
      orderCode: order.order_code,
      outcome: "ineligible",
    });
    return {
      success: false,
      category: "ineligible",
      message: "Pesanan tidak lagi memenuhi syarat rekonsiliasi. Muat ulang halaman dan periksa kembali.",
    };
  }

  const inquiry = await getValidatedMidtransInquiry(order);
  if (!fingerprintsMatch(expectedFingerprint, inquiry.result.fingerprint)) {
    logReconciliation({
      actorId,
      orderId,
      orderCode: order.order_code,
      providerStatus: inquiry.providerStatus,
      outcome: "provider_state_changed",
    });
    return {
      success: false,
      category: "stale_provider_result",
      message: "Status Midtrans berubah atau tidak lagi dapat divalidasi. Tinjau hasil terbaru lalu konfirmasi kembali.",
      inquiry: inquiry.result,
    };
  }

  if (inquiry.unsupportedReconciliation) {
    return {
      success: false,
      category: "unsupported_reconciliation",
      message: "Metode pembayaran ini belum dapat direkonsiliasi otomatis karena ID transaksi provider tidak tersimpan.",
      inquiry: inquiry.result,
    };
  }

  if (!inquiry.actionableIntent || !inquiry.providerStatus || !inquiry.paymentType) {
    return {
      success: false,
      category: "not_actionable",
      message: inquiry.result.message,
      inquiry: inquiry.result,
    };
  }

  const { data: currentOrder, error: currentError } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .is("deleted_at", null)
    .maybeSingle();

  if (
    currentError
    || !currentOrder
    || !hasSameLocalIdentity(order, currentOrder as MidtransInquiryOrder)
    || currentOrder.status !== "pending"
    || currentOrder.payment_status !== "pending"
  ) {
    logReconciliation({
      actorId,
      orderId,
      orderCode: order.order_code,
      providerStatus: inquiry.providerStatus,
      outcome: "local_state_changed_before_rpc",
    });
    return {
      success: false,
      category: "state_changed",
      message: "Status pesanan berubah saat pemeriksaan. Muat ulang dan periksa kembali.",
      inquiry: inquiry.result,
    };
  }

  const adminClient = createAdminClient();
  const { data: rpcResult, error: rpcError } = await adminClient.rpc(
    "handle_midtrans_notification",
    {
      p_order_code: currentOrder.order_code,
      p_midtrans_status: inquiry.providerStatus,
      p_payment_method: "midtrans",
      p_paid_at: inquiry.actionableIntent === "success" ? (inquiry.paidAt ?? null) : null,
      p_midtrans_payment_type: inquiry.paymentType,
    },
  );

  if (rpcError) {
    logError("action.midtrans_manual_reconciliation", rpcError.message, {
      actorId,
      orderId,
      orderCode: currentOrder.order_code,
      providerStatus: inquiry.providerStatus,
      rpcCode: rpcError.code,
      rpcResult,
    });
    return {
      success: false,
      category: "error",
      message: "Status pesanan belum dapat disinkronkan. Muat ulang dan coba lagi.",
      inquiry: inquiry.result,
    };
  }

  const { data: finalOrder, error: finalError } = await adminClient
    .from("orders")
    .select("id, order_code, status, payment_status, deleted_at")
    .eq("id", orderId)
    .maybeSingle();

  if (finalError || !finalOrder || finalOrder.deleted_at !== null) {
    logReconciliation({
      actorId,
      orderId,
      orderCode: currentOrder.order_code,
      providerStatus: inquiry.providerStatus,
      rpcResult,
      outcome: "final_order_unavailable",
    });
    if (rpcResult === true) {
      await recordAudit("payment.midtrans_manual_reconciliation", "order", orderId, {
        source: "admin_inquiry",
        provider_status: inquiry.providerStatus,
        outcome: "final_order_unavailable",
      });
      revalidateOrderPaths(orderId);
    }
    return {
      success: false,
      category: "state_changed",
      message: "Lifecycle telah diproses, tetapi keadaan akhir pesanan tidak dapat diverifikasi. Periksa pesanan secara manual.",
      inquiry: inquiry.result,
    };
  }

  const finalState = {
    orderStatus: finalOrder.status,
    paymentStatus: finalOrder.payment_status,
  };

  if (rpcResult !== true) {
    logError("action.midtrans_manual_reconciliation", "RPC returned false", {
      actorId,
      orderId,
      orderCode: currentOrder.order_code,
      providerStatus: inquiry.providerStatus,
      rpcResult,
      finalOrderStatus: finalOrder.status,
      finalPaymentStatus: finalOrder.payment_status,
    });
    return {
      success: false,
      category: "error",
      message: "Lifecycle pembayaran tidak menerima perubahan. Muat ulang dan periksa status pesanan.",
      inquiry: inquiry.result,
      finalState,
    };
  }

  const isExpectedSuccess = inquiry.actionableIntent === "success"
    && finalOrder.status === "processing"
    && finalOrder.payment_status === "paid";
  const isExpectedFailure = inquiry.actionableIntent === "failure"
    && finalOrder.status === "cancelled"
    && finalOrder.payment_status === "failed";

  let outcome: MidtransReconciliationResult;
  if (isExpectedSuccess) {
    outcome = {
      success: true,
      category: "reconciled",
      message: "Pembayaran berhasil disinkronkan. Pesanan masuk ke proses pemenuhan.",
      inquiry: inquiry.result,
      finalState,
    };
  } else if (isExpectedFailure) {
    outcome = {
      success: true,
      category: "reconciled",
      message: "Status pembayaran disinkronkan. Pesanan dibatalkan dan stok dikembalikan oleh lifecycle pesanan.",
      inquiry: inquiry.result,
      finalState,
    };
  } else if (finalOrder.status === "cancelled" && finalOrder.payment_status === "paid") {
    outcome = {
      success: false,
      category: "financial_reconciliation_required",
      message: "Pembayaran tercatat berhasil pada pesanan yang sudah dibatalkan. Lanjutkan melalui rekonsiliasi finansial.",
      inquiry: inquiry.result,
      finalState,
    };
  } else {
    outcome = {
      success: false,
      category: "state_changed",
      message: "Keadaan pesanan berubah selama rekonsiliasi. Tinjau status aktual sebelum melakukan tindakan lain.",
      inquiry: inquiry.result,
      finalState,
    };
  }

  const auditDetails = {
    source: "admin_inquiry",
    provider_status: inquiry.providerStatus,
    outcome: outcome.category,
    final_order_status: finalOrder.status,
    final_payment_status: finalOrder.payment_status,
  };
  await recordAudit("payment.midtrans_manual_reconciliation", "order", orderId, auditDetails);
  logAudit("payment.midtrans_manual_reconciliation", "order", orderId, {
    actorId,
    orderCode: finalOrder.order_code,
    ...auditDetails,
  });
  revalidateOrderPaths(orderId);
  return outcome;
}
