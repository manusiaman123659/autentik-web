import type { NextRequest } from "next/server";
import {
  MIDTRANS_WEBHOOK_ORDER_SELECT,
  processMidtransNotification,
  type MidtransWebhookDependencies,
  type MidtransWebhookOrder,
} from "@/lib/payments/midtransWebhook";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

function createWebhookDependencies(): MidtransWebhookDependencies {
  let adminClient: ReturnType<typeof createAdminClient> | undefined;
  const getAdminClient = () => {
    adminClient ??= createAdminClient();
    return adminClient;
  };

  return {
    serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
    async getOrderByCode(orderCode) {
      const { data, error } = await getAdminClient()
        .from("orders")
        .select(MIDTRANS_WEBHOOK_ORDER_SELECT)
        .eq("order_code", orderCode)
        .maybeSingle();
      return {
        data: data as MidtransWebhookOrder | null,
        errorCode: error?.code ?? null,
      };
    },
    async getOrderById(orderId) {
      const { data, error } = await getAdminClient()
        .from("orders")
        .select(MIDTRANS_WEBHOOK_ORDER_SELECT)
        .eq("id", orderId)
        .maybeSingle();
      return {
        data: data as MidtransWebhookOrder | null,
        errorCode: error?.code ?? null,
      };
    },
    async applyNotification({ orderCode, transactionStatus, paidAt, paymentType }) {
      const { data, error } = await getAdminClient().rpc(
        "handle_midtrans_notification",
        {
          p_order_code: orderCode,
          p_midtrans_status: transactionStatus,
          p_payment_method: "midtrans",
          p_paid_at: paidAt,
          p_midtrans_payment_type: paymentType,
        },
      );
      return {
        data: typeof data === "boolean" ? data : null,
        errorCode: error?.code ?? null,
      };
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    return await processMidtransNotification(request, createWebhookDependencies());
  } catch (error) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      event: "midtrans.webhook",
      reason: "unexpected_error",
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return Response.json(
      {
        received: false,
        processed: false,
        category: "temporary_processing_failure",
      },
      { status: 500 },
    );
  }
}
