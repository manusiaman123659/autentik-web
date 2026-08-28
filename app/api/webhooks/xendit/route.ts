import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logError } from "@/lib/logger";

const WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN;

export async function POST(request: NextRequest) {
  try {
    // 1. Verify callback token
    const callbackToken = request.headers.get("x-callback-token");
    if (!WEBHOOK_TOKEN || callbackToken !== WEBHOOK_TOKEN) {
      return NextResponse.json(
        { error: "Invalid webhook token" },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const { external_id, status, payment_method, paid_at } = payload;

    if (!external_id || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Update order via service_role RPC (bypasses RLS)
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("handle_xendit_webhook", {
      p_order_code: external_id,
      p_xendit_status: status,
      p_payment_method: payment_method || null,
      p_paid_at: paid_at || null,
    });

    if (error) {
      logError("webhook.xendit.rpc", error, { external_id, status });
      return NextResponse.json(
        { error: "Failed to process webhook" },
        { status: 500 }
      );
    }

    // data === true → order found & updated (or already paid = idempotent)
    // data === false → order not found
    if (data !== true) {
      logError("webhook.xendit.order_not_found", new Error("Order not found"), {
        external_id,
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    logError("webhook.xendit.exception", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
