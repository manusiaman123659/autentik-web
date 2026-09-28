import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeMoneyAmount } from "../lib/payments/money";
import {
  MIDTRANS_WEBHOOK_BODY_LIMIT,
  processMidtransNotification,
  type MidtransWebhookDependencies,
  type MidtransWebhookOrder,
} from "../lib/payments/midtransWebhook";

const SERVER_KEY = "sandbox-server-key-for-local-assertions";
const ORDER_CODE = "ORDER-PAY-001";
const NOW = "2026-09-28T12:00:00.000Z";

const baseOrder: MidtransWebhookOrder = {
  id: "00000000-0000-4000-8000-000000000001",
  order_code: ORDER_CODE,
  midtrans_order_id: ORDER_CODE,
  payment_method: "midtrans",
  total: "100000.00",
  status: "pending",
  payment_status: "pending",
  deleted_at: null,
};

interface HarnessOptions {
  order?: MidtransWebhookOrder | null;
  rereadOrder?: MidtransWebhookOrder | null;
  rpcResult?: boolean | null;
}

function createHarness(options: HarnessOptions = {}) {
  const rpcCalls: Array<{
    orderCode: string;
    transactionStatus: string;
    paidAt: string | null;
    paymentType: string | null;
  }> = [];
  const order = options.order === undefined ? baseOrder : options.order;
  const rereadOrder = options.rereadOrder === undefined ? order : options.rereadOrder;
  const dependencies: MidtransWebhookDependencies = {
    serverKey: SERVER_KEY,
    async getOrderByCode() {
      return { data: order, errorCode: null };
    },
    async getOrderById() {
      return { data: rereadOrder, errorCode: null };
    },
    async applyNotification(params) {
      rpcCalls.push(params);
      return {
        data: options.rpcResult === undefined ? true : options.rpcResult,
        errorCode: null,
      };
    },
    now: () => NOW,
    log: () => undefined,
  };
  return { dependencies, rpcCalls };
}

function signatureFor(payload: Record<string, unknown>) {
  return createHash("sha512")
    .update(
      String(payload.order_id)
      + String(payload.status_code)
      + String(payload.gross_amount)
      + SERVER_KEY,
    )
    .digest("hex");
}

interface RequestOptions {
  bodySignature?: "valid" | "absent" | string;
  headerSignature?: string;
}

function createRequest(
  overrides: Record<string, unknown> = {},
  options: RequestOptions = {},
) {
  const payload: Record<string, unknown> = {
    order_id: ORDER_CODE,
    transaction_status: "settlement",
    status_code: "200",
    gross_amount: "100000.00",
    payment_type: "qris",
    ...overrides,
  };
  const validSignature = signatureFor(payload);
  if (options.bodySignature !== "absent") {
    payload.signature_key = options.bodySignature === undefined || options.bodySignature === "valid"
      ? validSignature
      : options.bodySignature;
  }
  const headers = new Headers({ "content-type": "application/json" });
  if (options.headerSignature) headers.set("x-signature", options.headerSignature);
  return new Request("https://example.test/api/webhooks/midtrans", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

async function readResult(response: Response) {
  return {
    status: response.status,
    body: await response.json() as {
      received: boolean;
      processed: boolean;
      category: string;
    },
  };
}

async function runCase(
  overrides: Record<string, unknown>,
  harnessOptions: HarnessOptions = {},
  requestOptions: RequestOptions = {},
) {
  const harness = createHarness(harnessOptions);
  const response = await processMidtransNotification(
    createRequest(overrides, requestOptions),
    harness.dependencies,
  );
  return { ...await readResult(response), rpcCalls: harness.rpcCalls };
}

async function main() {
  console.log("Running PAY-001 Midtrans webhook assertions...\n");

  const settlement = await runCase({ transaction_status: "settlement", payment_type: "qris" });
  assert.equal(settlement.status, 200);
  assert.equal(settlement.body.processed, true);
  assert.equal(settlement.rpcCalls.length, 1, "A: valid settlement must call RPC once");
  assert.equal(settlement.rpcCalls[0].paymentType, "qris");
  assert.equal(settlement.rpcCalls[0].paidAt, NOW);

  const captureAccept = await runCase({ transaction_status: "capture", fraud_status: " ACCEPT " });
  assert.equal(captureAccept.rpcCalls.length, 1, "B: accepted capture must call RPC once");

  for (const [label, fraudStatus] of [
    ["C: challenge", "challenge"],
    ["D: deny", "deny"],
    ["E: missing", undefined],
  ] as const) {
    const capture = await runCase({ transaction_status: "capture", fraud_status: fraudStatus });
    assert.equal(capture.status, 200);
    assert.equal(capture.body.category, "fraud_not_accepted");
    assert.equal(capture.rpcCalls.length, 0, `${label} capture must not call RPC`);
  }

  const amountMismatch = await runCase({ gross_amount: "100001.00" });
  assert.equal(amountMismatch.body.category, "amount_mismatch");
  assert.equal(amountMismatch.rpcCalls.length, 0, "F: amount mismatch must not call RPC");

  const malformedAmount = await runCase({ gross_amount: "100000.000" });
  assert.equal(malformedAmount.body.category, "amount_mismatch");
  assert.equal(malformedAmount.rpcCalls.length, 0, "G: malformed amount must not call RPC");

  const unknownOrder = await runCase({}, { order: null });
  assert.equal(unknownOrder.body.category, "order_not_found");
  assert.equal(unknownOrder.rpcCalls.length, 0, "H: unknown order must not mutate");

  const manualOrder = await runCase({}, {
    order: { ...baseOrder, payment_method: "transfer" },
  });
  assert.equal(manualOrder.body.category, "midtrans_identity_mismatch");
  assert.equal(manualOrder.rpcCalls.length, 0, "I: non-Midtrans order must not mutate");

  const referenceMismatch = await runCase({}, {
    order: { ...baseOrder, midtrans_order_id: "OTHER-ORDER" },
  });
  assert.equal(referenceMismatch.body.category, "midtrans_identity_mismatch");
  assert.equal(referenceMismatch.rpcCalls.length, 0, "J: reference mismatch must not mutate");

  const pendingReference = await runCase({}, {
    order: { ...baseOrder, midtrans_order_id: null },
  });
  assert.equal(pendingReference.status, 503);
  assert.equal(pendingReference.body.category, "midtrans_reference_pending");
  assert.equal(pendingReference.rpcCalls.length, 0, "K: pending reference must not mutate");

  const failed = await runCase({ transaction_status: "expire", payment_type: "bank_transfer" });
  assert.equal(failed.rpcCalls.length, 1, "L: valid terminal failure must call RPC once");
  assert.equal(failed.rpcCalls[0].transactionStatus, "expire");
  assert.equal(failed.rpcCalls[0].paidAt, null);

  const failedMismatch = await runCase({
    transaction_status: "failure",
    gross_amount: "99999.00",
  });
  assert.equal(failedMismatch.rpcCalls.length, 0, "M: failed amount mismatch must not restore stock");

  const wrongDigest = await runCase({}, {}, { bodySignature: "a".repeat(128) });
  assert.equal(wrongDigest.status, 403);
  assert.equal(wrongDigest.rpcCalls.length, 0, "N: wrong digest must be rejected");

  const wrongLength = await runCase({}, {}, { bodySignature: "a".repeat(127) });
  assert.equal(wrongLength.status, 403);
  assert.equal(wrongLength.rpcCalls.length, 0, "O: wrong signature length must be rejected safely");

  const nonHex = await runCase({}, {}, { bodySignature: "z".repeat(128) });
  assert.equal(nonHex.status, 403);
  assert.equal(nonHex.rpcCalls.length, 0, "P: non-hex signature must be rejected safely");

  const fallbackPayload = {
    order_id: ORDER_CODE,
    transaction_status: "settlement",
    status_code: "200",
    gross_amount: "100000.00",
    payment_type: "qris",
  };
  const headerFallback = await runCase(
    {},
    {},
    { bodySignature: "absent", headerSignature: signatureFor(fallbackPayload) },
  );
  assert.equal(headerFallback.status, 200);
  assert.equal(headerFallback.rpcCalls.length, 1, "Q: valid header fallback must be accepted");

  const malformedBodySignature = await runCase(
    {},
    {},
    { bodySignature: "invalid", headerSignature: signatureFor(fallbackPayload) },
  );
  assert.equal(malformedBodySignature.status, 403);
  assert.equal(
    malformedBodySignature.rpcCalls.length,
    0,
    "R: malformed body signature must not fall back to header",
  );

  const rpcFalse = await runCase({}, { rpcResult: false, rereadOrder: baseOrder });
  assert.equal(rpcFalse.status, 503);
  assert.equal(rpcFalse.body.processed, false, "S: RPC false must not be reported as processed");

  const rpcNull = await runCase({}, { rpcResult: null, rereadOrder: baseOrder });
  assert.equal(rpcNull.status, 503);
  assert.equal(rpcNull.body.processed, false, "S: RPC null must not be reported as processed");

  const incompleteFailure = await runCase(
    { transaction_status: "expire" },
    {
      rpcResult: false,
      rereadOrder: { ...baseOrder, payment_status: "failed", status: "pending" },
    },
  );
  assert.equal(incompleteFailure.status, 503);
  assert.equal(
    incompleteFailure.body.processed,
    false,
    "S: failed payment without cancellation/restock confirmation must remain retryable",
  );

  const legacyMoneyCases: Array<[unknown, string | null]> = [
    [100000, "100000.00"],
    [100000.5, "100000.50"],
    [" 00100000.5 ", "100000.50"],
    ["100000.00", "100000.00"],
    ["100000.000", null],
    ["-1.00", null],
    [Number.POSITIVE_INFINITY, null],
    [null, null],
  ];
  for (const [input, expected] of legacyMoneyCases) {
    assert.equal(normalizeMoneyAmount(input), expected, `T: money regression for ${String(input)}`);
  }
  const inquirySource = readFileSync(
    resolve(process.cwd(), "lib/payments/midtransInquiry.ts"),
    "utf8",
  );
  assert.match(
    inquirySource,
    /export \{ normalizeMoneyAmount \} from "@\/lib\/payments\/money";/,
    "T: midtransInquiry must preserve its normalizeMoneyAmount export",
  );

  const oversizedBody = JSON.stringify({ padding: "x".repeat(MIDTRANS_WEBHOOK_BODY_LIMIT) });
  const oversizedHarness = createHarness();
  const oversizedResponse = await processMidtransNotification(
    new Request("https://example.test/api/webhooks/midtrans", {
      method: "POST",
      body: oversizedBody,
    }),
    oversizedHarness.dependencies,
  );
  assert.equal(oversizedResponse.status, 413, "Oversized bodies must be rejected before JSON handling");
  assert.equal(oversizedHarness.rpcCalls.length, 0);

  console.log("All PAY-001 assertions passed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
