"use server";

import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { inquireMidtransPaymentStatus } from "@/lib/payments/midtransInquiry";
import { reconcileMidtransPayment } from "@/lib/payments/midtransReconciliation";
import type { MidtransInquiryResult, MidtransReconciliationResult } from "@/lib/payments/types";
import { midtransReconciliationSchema } from "@/lib/validations/paymentReconciliationSchema";

const orderIdSchema = z.string().uuid();

export async function checkMidtransPaymentStatus(
  orderId: string,
): Promise<MidtransInquiryResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return {
      success: false,
      category: "error",
      message: "Anda tidak memiliki akses.",
    };
  }

  const parsedOrderId = orderIdSchema.safeParse(orderId);
  if (!parsedOrderId.success) {
    return {
      success: false,
      category: "error",
      message: "ID pesanan tidak valid.",
    };
  }

  try {
    return await inquireMidtransPaymentStatus(parsedOrderId.data);
  } catch {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      event: "midtrans.status_inquiry",
      source: "admin",
      orderId: parsedOrderId.data,
      result: "unexpected_error",
    }));
    return {
      success: false,
      category: "error",
      message: "Status pembayaran belum dapat diperiksa. Coba lagi nanti.",
    };
  }
}

export async function reconcileMidtransPaymentStatus(
  input: unknown,
): Promise<MidtransReconciliationResult> {
  const admin = await getAdminUser();
  if (!admin) {
    return {
      success: false,
      category: "error",
      message: "Anda tidak memiliki akses.",
    };
  }

  const parsed = midtransReconciliationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      category: "error",
      message: "Data konfirmasi rekonsiliasi tidak valid. Periksa status pembayaran kembali.",
    };
  }

  try {
    return await reconcileMidtransPayment(
      parsed.data.orderId,
      parsed.data.expectedFingerprint,
      admin.id,
    );
  } catch (error) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      event: "midtrans.manual_reconciliation",
      source: "admin",
      actorId: admin.id,
      orderId: parsed.data.orderId,
      result: "unexpected_error",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return {
      success: false,
      category: "error",
      message: "Status pesanan belum dapat disinkronkan. Coba lagi nanti.",
    };
  }
}
