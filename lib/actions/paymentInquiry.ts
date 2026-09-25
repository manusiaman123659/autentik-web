"use server";

import { z } from "zod";
import { getAdminUser } from "@/lib/admin";
import { inquireMidtransPaymentStatus } from "@/lib/payments/midtransInquiry";
import type { MidtransInquiryResult } from "@/lib/payments/types";

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
