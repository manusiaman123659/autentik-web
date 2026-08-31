import { createHmac } from "crypto";
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

function verifySignature(rawBody: string, signatureHeader: string, serverKey: string): boolean {
  const expectedSignature = createHmac("sha512", serverKey).update(rawBody).digest("hex");
  return expectedSignature === signatureHeader;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // --- Signature verification ---
  const signatureHeader = request.headers.get("x-signature") ?? "";
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();

  if (serverKey && signatureHeader) {
    if (!verifySignature(rawBody, signatureHeader, serverKey)) {
      logError("webhook.midtrans.signature_invalid", { msg: "X-Signature tidak cocok" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

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
  const statusCode = payload.status_code as string | undefined;
  const grossAmount = payload.gross_amount as string | undefined;
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

  // --- Direct update via supabase service_role client ---
  const supabase = createAdminClient();

  const { data: updatedRows, error: updateError } = await supabase
    .from("orders")
    .update({
      payment_status: isPaid ? "paid" : "failed",
      status: isPaid ? "processing" : "failed",
      payment_method: "midtrans",
      paid_at: isPaid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("order_code", orderCode)
    .select("id, order_code, payment_status, status");

  logInfo("webhook.midtrans.update_result", {
    orderCode,
    isPaid,
    transactionStatus,
    updatedCount: updatedRows?.length ?? 0,
    rows: updatedRows,
    error: updateError
      ? { message: updateError.message, code: updateError.code, details: updateError.details }
      : null,
  });

  if (updateError || !updatedRows || updatedRows.length === 0) {
    logError("webhook.midtrans.update_failed", {
      orderCode,
      isPaid,
      updateError: updateError?.message ?? "no rows updated",
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
