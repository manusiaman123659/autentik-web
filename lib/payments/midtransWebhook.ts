import { createHash, timingSafeEqual } from "node:crypto";
import { normalizeMoneyAmount } from "@/lib/payments/money";

export const MIDTRANS_WEBHOOK_BODY_LIMIT = 64 * 1024;

const FAILED_STATUSES = new Set(["deny", "cancel", "expire", "failure"]);
const ORDER_SELECT = "id, order_code, midtrans_order_id, payment_method, total, status, payment_status, deleted_at";

export interface MidtransWebhookOrder {
  id: string;
  order_code: string;
  midtrans_order_id: string | null;
  payment_method: string | null;
  total: unknown;
  status: string;
  payment_status: string;
  deleted_at: string | null;
}

interface QueryResult<T> {
  data: T | null;
  errorCode: string | null;
}

interface RpcResult {
  data: boolean | null;
  errorCode: string | null;
}

interface NotificationParams {
  orderCode: string;
  transactionStatus: string;
  paidAt: string | null;
  paymentType: string | null;
}

type LogLevel = "info" | "error";

export interface MidtransWebhookDependencies {
  serverKey: string;
  getOrderByCode(orderCode: string): Promise<QueryResult<MidtransWebhookOrder>>;
  getOrderById(orderId: string): Promise<QueryResult<MidtransWebhookOrder>>;
  applyNotification(params: NotificationParams): Promise<RpcResult>;
  now?: () => string;
  log?: (level: LogLevel, reason: string, context: Record<string, unknown>) => void;
}

class BodyTooLargeError extends Error {}

function defaultLog(level: LogLevel, reason: string, context: Record<string, unknown>) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    event: "midtrans.webhook",
    reason,
    ...context,
  });
  if (level === "error") console.error(entry);
  else console.log(entry);
}

function jsonResponse(
  status: number,
  category: string,
  options: { received?: boolean; processed?: boolean } = {},
) {
  return Response.json(
    {
      received: options.received ?? status < 400,
      processed: options.processed ?? false,
      category,
    },
    { status },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getOptionalNormalizedString(value: unknown): { valid: boolean; value: string | null } {
  if (value === undefined || value === null) return { valid: true, value: null };
  if (typeof value !== "string") return { valid: false, value: null };
  const normalized = value.trim().toLowerCase();
  return normalized ? { valid: true, value: normalized } : { valid: false, value: null };
}

async function readBodyWithLimit(request: Request): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MIDTRANS_WEBHOOK_BODY_LIMIT) {
    throw new BodyTooLargeError();
  }

  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MIDTRANS_WEBHOOK_BODY_LIMIT) {
      await reader.cancel().catch(() => undefined);
      throw new BodyTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  incomingSignature: string,
  serverKey: string,
): boolean {
  if (!/^[a-fA-F0-9]{128}$/.test(incomingSignature)) return false;

  const expected = createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest();
  const incoming = Buffer.from(incomingSignature, "hex");
  return incoming.length === expected.length && timingSafeEqual(expected, incoming);
}

export async function processMidtransNotification(
  request: Request,
  dependencies: MidtransWebhookDependencies,
): Promise<Response> {
  const log = dependencies.log ?? defaultLog;
  let rawBody: string;
  try {
    rawBody = await readBodyWithLimit(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      log("error", "payload_too_large", {});
      return jsonResponse(413, "payload_too_large", { received: false });
    }
    log("error", "payload_read_error", {});
    return jsonResponse(400, "payload_invalid", { received: false });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    log("error", "payload_invalid", {});
    return jsonResponse(400, "payload_invalid", { received: false });
  }

  if (!isRecord(parsedPayload)) {
    log("error", "payload_invalid", {});
    return jsonResponse(400, "payload_invalid", { received: false });
  }

  const orderCode = getRequiredString(parsedPayload, "order_id");
  const rawTransactionStatus = getRequiredString(parsedPayload, "transaction_status");
  const statusCode = getRequiredString(parsedPayload, "status_code");
  const grossAmount = getRequiredString(parsedPayload, "gross_amount");
  if (!orderCode || !rawTransactionStatus || !statusCode || !grossAmount) {
    log("error", "payload_invalid", {});
    return jsonResponse(400, "payload_invalid", { received: false });
  }

  const serverKey = dependencies.serverKey.trim();
  if (!serverKey) {
    log("error", "server_configuration_missing", {
      orderCode,
      statusCategory: "unclassified",
    });
    return jsonResponse(500, "server_configuration_missing", { received: false });
  }

  const bodySignaturePresent = Object.hasOwn(parsedPayload, "signature_key")
    && parsedPayload.signature_key !== null;
  const signatureValue = bodySignaturePresent
    ? parsedPayload.signature_key
    : request.headers.get("x-signature");
  if (
    typeof signatureValue !== "string"
    || !verifyMidtransSignature(orderCode, statusCode, grossAmount, signatureValue, serverKey)
  ) {
    log("error", "signature_invalid", {
      orderCode,
      statusCategory: "unclassified",
    });
    return jsonResponse(403, "signature_invalid", { received: false });
  }

  const transactionStatus = rawTransactionStatus.trim().toLowerCase();
  const fraudStatus = getOptionalNormalizedString(parsedPayload.fraud_status);
  if (transactionStatus === "capture" && fraudStatus.value !== "accept") {
    log("info", "fraud_not_accepted", {
      orderCode,
      statusCategory: "paid",
    });
    return jsonResponse(200, "fraud_not_accepted");
  }

  const isPaid = transactionStatus === "settlement" || transactionStatus === "capture";
  const isFailed = FAILED_STATUSES.has(transactionStatus);
  if (!isPaid && !isFailed) {
    log("info", "status_skipped", {
      orderCode,
      statusCategory: "non_mutating",
    });
    return jsonResponse(200, "status_skipped");
  }

  const paymentType = getOptionalNormalizedString(parsedPayload.payment_type);
  if (!paymentType.valid) {
    log("error", "payload_invalid", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(400, "payload_invalid", { received: false });
  }

  let orderResult: QueryResult<MidtransWebhookOrder>;
  try {
    orderResult = await dependencies.getOrderByCode(orderCode);
  } catch {
    log("error", "order_lookup_error", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(503, "temporary_processing_failure", { received: false });
  }

  if (orderResult.errorCode) {
    log("error", "order_lookup_error", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(503, "temporary_processing_failure", { received: false });
  }

  const order = orderResult.data;
  if (!order || order.deleted_at !== null) {
    log("info", "order_not_found", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(200, "order_not_found");
  }

  if (order.order_code !== orderCode || order.payment_method !== "midtrans") {
    log("error", "midtrans_identity_mismatch", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(200, "midtrans_identity_mismatch");
  }

  if (order.midtrans_order_id === null) {
    log("error", "midtrans_reference_pending", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(503, "midtrans_reference_pending", { received: false });
  }

  if (order.midtrans_order_id !== order.order_code) {
    log("error", "midtrans_identity_mismatch", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(200, "midtrans_identity_mismatch");
  }

  const providerAmount = normalizeMoneyAmount(grossAmount);
  const localAmount = normalizeMoneyAmount(order.total);
  if (providerAmount === null || localAmount === null || providerAmount !== localAmount) {
    log("error", "amount_mismatch", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(200, "amount_mismatch");
  }

  let rpcResult: RpcResult;
  try {
    rpcResult = await dependencies.applyNotification({
      orderCode,
      transactionStatus,
      paidAt: isPaid ? (dependencies.now?.() ?? new Date().toISOString()) : null,
      paymentType: paymentType.value,
    });
  } catch {
    log("error", "rpc_error", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(503, "temporary_processing_failure", { received: false });
  }

  if (rpcResult.errorCode) {
    log("error", "rpc_error", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(503, "temporary_processing_failure", { received: false });
  }

  if (rpcResult.data === true) {
    log("info", "processed", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(200, "processed", { processed: true });
  }

  let rereadResult: QueryResult<MidtransWebhookOrder>;
  try {
    rereadResult = await dependencies.getOrderById(order.id);
  } catch {
    log("error", "rpc_false", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(503, "temporary_processing_failure", { received: false });
  }

  if (rereadResult.errorCode) {
    log("error", "rpc_false", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(503, "temporary_processing_failure", { received: false });
  }

  const currentOrder = rereadResult.data;
  if (!currentOrder || currentOrder.deleted_at !== null) {
    log("info", "rpc_false_order_unavailable", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(200, "order_not_found");
  }

  const expectedMutationApplied = isPaid
    ? currentOrder.payment_status === "paid"
    : currentOrder.payment_status === "failed" && currentOrder.status === "cancelled";
  if (expectedMutationApplied) {
    log("info", "already_applied", {
      orderCode,
      statusCategory: isPaid ? "paid" : "failure",
    });
    return jsonResponse(200, "already_applied", { processed: true });
  }

  log("error", "rpc_false", {
    orderCode,
    statusCategory: isPaid ? "paid" : "failure",
  });
  return jsonResponse(503, "temporary_processing_failure", { received: false });
}

export { ORDER_SELECT as MIDTRANS_WEBHOOK_ORDER_SELECT };
