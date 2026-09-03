import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const PAID_STATUSES = ["capture", "settlement"];
const FAILED_STATUSES = ["deny", "cancel", "expire", "failure"];

function logInfo(ctx: string, meta: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ctx, ...meta }));
}

function logError(ctx: string, meta: Record<string, unknown>) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), ctx, ...meta }));
}

/**
 * Verifikasi signature Midtrans: SHA-512(order_id + status_code + gross_amount + server_key)
 * Ref: https://docs.midtrans.com/docs/notifications-notifying
 */
function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  incomingSignature: string,
  serverKey: string,
): boolean {
  const expectedSignature = createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex");
  return expectedSignature === incomingSignature;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // --- Parse body ---
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    logError("webhook.midtrans.parse_error", { msg: "Gagal parse JSON body" });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderCode = payload.order_id as string | undefined;
  const transactionStatus = payload.transaction_status as string | undefined;
  const statusCode = (payload.status_code as string | undefined) ?? "";
  const grossAmount = (payload.gross_amount as string | undefined) ?? "";
  const paymentType = (payload.payment_type as string | null) ?? null;

  logInfo("webhook.midtrans.incoming", {
    orderCode,
    transactionStatus,
    paymentType,
    statusCode,
    grossAmount,
    allKeys: Object.keys(payload),
  });

  if (!orderCode || !transactionStatus) {
    logError("webhook.midtrans.missing_fields", {
      orderCode: orderCode ?? "(null)",
      transactionStatus: transactionStatus ?? "(null)",
    });
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // --- Signature verification ---
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  const incomingSignature =
    (payload.signature_key as string | undefined) ??
    request.headers.get("x-signature") ??
    "";

  if (!serverKey) {
    logError("webhook.midtrans.no_server_key", { msg: "MIDTRANS_SERVER_KEY tidak terdefinisi" });
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  if (!incomingSignature) {
    logError("webhook.midtrans.no_signature", { msg: "Signature tidak ada" });
    return NextResponse.json({ error: "Missing signature" }, { status: 403 });
  }

  if (!verifySignature(orderCode, statusCode, grossAmount, incomingSignature, serverKey)) {
    logError("webhook.midtrans.signature_invalid", { msg: "Signature tidak cocok" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // --- Early skip untuk status yang tidak relevan ---
  const isPaid = PAID_STATUSES.includes(transactionStatus);
  const isFailed = FAILED_STATUSES.includes(transactionStatus);

  if (!isPaid && !isFailed) {
    logInfo("webhook.midtrans.skip", {
      orderCode,
      transactionStatus,
      msg: "Status bukan paid/failed — skip update",
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // --- Proses via RPC handle_midtrans_notification ---
  const supabase = createAdminClient();

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "handle_midtrans_notification",
    {
      p_order_code: orderCode,
      p_midtrans_status: transactionStatus,
      p_payment_method: "midtrans",
      p_paid_at: isPaid ? new Date().toISOString() : null,
      p_midtrans_payment_type: paymentType,
    },
  );

  logInfo("webhook.midtrans.rpc_result", {
    orderCode,
    isPaid,
    transactionStatus,
    rpcResult,
    error: rpcError ? { message: rpcError.message, code: rpcError.code } : null,
  });

  if (rpcError) {
    logError("webhook.midtrans.rpc_failed", {
      orderCode,
      isPaid,
      rpcError: rpcError.message,
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
