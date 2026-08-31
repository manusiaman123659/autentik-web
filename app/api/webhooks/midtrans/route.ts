import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const PAID_STATUSES = ["capture", "settlement"];
const FAILED_STATUSES = ["deny", "cancel", "expire", "failure"];

function logWebhook(ctx: string, meta: Record<string, unknown>) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), ctx, ...meta }));
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    logWebhook("webhook.midtrans.parse_error", { msg: "Gagal parse JSON body" });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderCode = payload.order_id as string | undefined;
  const transactionStatus = payload.transaction_status as string | undefined;
  const paymentType = (payload.payment_type as string | null) ?? null;

  logWebhook("webhook.midtrans.incoming", {
    orderCode,
    transactionStatus,
    paymentType,
    allKeys: Object.keys(payload),
  });

  if (!orderCode || !transactionStatus) {
    logWebhook("webhook.midtrans.missing_fields", {
      orderCode: orderCode ?? "(null)",
      transactionStatus: transactionStatus ?? "(null)",
    });
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const isPaid = PAID_STATUSES.includes(transactionStatus);
  const isFailed = FAILED_STATUSES.includes(transactionStatus);

  if (!isPaid && !isFailed) {
    logWebhook("webhook.midtrans.skip", {
      orderCode,
      transactionStatus,
      msg: "Status bukan paid/failed — skip update",
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const paymentStatus = isPaid ? "paid" : "failed";
  const orderStatus = isPaid ? "processing" : "failed";

  const { data: updatedRows, error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: paymentStatus,
      status: orderStatus,
      payment_method: paymentType || null,
      paid_at: isPaid ? now : null,
      updated_at: now,
    })
    .eq("order_code", orderCode)
    .eq("payment_status", "pending")
    .select("id, order_code");

  if (updateError) {
    logWebhook("webhook.midtrans.update_error", {
      orderCode,
      error: updateError.message,
      code: updateError.code,
    });
  } else {
    logWebhook("webhook.midtrans.ok", {
      orderCode,
      paymentStatus,
      updatedRows: updatedRows?.length ?? 0,
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
