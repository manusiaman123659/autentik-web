import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyMidtransCreateFailure,
  getSafeMidtransRedirectUrl,
  MidtransCreatePreflightError,
  MidtransCreateResponseError,
  parseWholeRupiahAmount,
} from "../lib/payments/midtransInitialization";

type ModelState = "idle" | "initializing" | "unknown" | "ready" | "compensated";

class InitializationModel {
  state: ModelState = "idle";
  claimId: string | null = null;
  redirectUrl: string | null = null;
  stock = 8;
  restoreCount = 0;

  claim(claimId: string) {
    if (this.state === "ready") return "ready";
    if (this.state === "initializing") return "in_progress";
    if (this.state !== "idle" || this.claimId !== null) return "needs_review";
    this.state = "initializing";
    this.claimId = claimId;
    return "claimed";
  }

  finalize(claimId: string, redirectUrl: string) {
    if (this.claimId !== claimId) return "claim_mismatch";
    if (this.state === "ready" && this.redirectUrl === redirectUrl) return "already_finalized";
    if (this.state !== "initializing" && this.state !== "unknown") return "ineligible";
    this.state = "ready";
    this.redirectUrl = redirectUrl;
    return "finalized";
  }

  markUnknown(claimId: string) {
    if (this.claimId !== claimId) return "claim_mismatch";
    if (this.state === "unknown") return "already_unknown";
    if (this.state !== "initializing") return "ineligible";
    this.state = "unknown";
    return "marked_unknown";
  }

  compensate(claimId: string) {
    if (this.claimId !== claimId) return "claim_mismatch";
    if (this.state === "compensated") return "already_released";
    if (this.state !== "initializing") return "ineligible";
    this.stock += 2;
    this.restoreCount += 1;
    this.state = "compensated";
    return "released";
  }
}

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

console.log("Running PAY-002 Midtrans initialization assertions...\n");

assert.equal(parseWholeRupiahAmount("100000.00"), 100000);
assert.equal(parseWholeRupiahAmount(100000), 100000);
assert.equal(parseWholeRupiahAmount("100000.50"), null, "Fractional IDR must not be rounded");
assert.equal(parseWholeRupiahAmount("0.00"), null);
assert.equal(parseWholeRupiahAmount(Number.POSITIVE_INFINITY), null);

const sandboxUrl = "https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token";
const productionUrl = "https://app.midtrans.com/snap/v2/vtweb/test-token";
assert.equal(getSafeMidtransRedirectUrl(sandboxUrl, false), sandboxUrl);
assert.equal(getSafeMidtransRedirectUrl(productionUrl, true), productionUrl);
assert.equal(getSafeMidtransRedirectUrl(productionUrl, false), null);
assert.equal(getSafeMidtransRedirectUrl(sandboxUrl, true), null);
assert.equal(getSafeMidtransRedirectUrl("https://evil.example/snap/token", false), null);
assert.equal(getSafeMidtransRedirectUrl("https://app.sandbox.midtrans.com.evil/snap/token", false), null);
assert.equal(getSafeMidtransRedirectUrl(`${sandboxUrl}#secret`, false), null);

assert.deepEqual(
  classifyMidtransCreateFailure(new MidtransCreatePreflightError("local")),
  { outcome: "definitive", reason: "local_preflight" },
  "Only errors known to happen before the request may be compensated",
);
assert.deepEqual(
  classifyMidtransCreateFailure(new MidtransCreateResponseError("bad response")),
  { outcome: "unknown", reason: "provider_unpersisted" },
);
for (const error of [
  new Error("timeout"),
  { httpStatusCode: 400 },
  { httpStatusCode: 500 },
  { code: "ECONNRESET" },
  { message: "transaction_details.order_id has already been taken" },
]) {
  assert.deepEqual(
    classifyMidtransCreateFailure(error),
    { outcome: "unknown", reason: "transport_unknown" },
    "Unrecognized provider/SDK errors must fail closed as unknown",
  );
}

const concurrent = new InitializationModel();
assert.equal(concurrent.claim("claim-a"), "claimed", "A: first claim must win");
assert.equal(concurrent.claim("claim-b"), "in_progress", "A/H: second CREATE must be blocked");

const finalized = new InitializationModel();
assert.equal(finalized.claim("claim-a"), "claimed");
assert.equal(finalized.finalize("claim-a", sandboxUrl), "finalized");
assert.equal(finalized.finalize("claim-a", sandboxUrl), "already_finalized", "B: finalize is idempotent");
assert.equal(finalized.claim("claim-b"), "ready", "G: ready cannot acquire a new claim");

const compensated = new InitializationModel();
assert.equal(compensated.claim("claim-a"), "claimed");
assert.equal(compensated.compensate("claim-a"), "released");
assert.equal(compensated.compensate("claim-a"), "already_released", "C: compensation is idempotent");
assert.equal(compensated.restoreCount, 1, "C/O: inventory restoration must run once");
assert.equal(compensated.stock, 10);
assert.equal(compensated.finalize("claim-a", sandboxUrl), "ineligible", "D: compensate wins race");

const finalizeWins = new InitializationModel();
assert.equal(finalizeWins.claim("claim-a"), "claimed");
assert.equal(finalizeWins.finalize("claim-a", sandboxUrl), "finalized");
assert.equal(finalizeWins.compensate("claim-a"), "ineligible", "D: finalize wins race");

const unknown = new InitializationModel();
assert.equal(unknown.claim("claim-a"), "claimed");
assert.equal(unknown.markUnknown("claim-a"), "marked_unknown");
assert.equal(unknown.compensate("claim-a"), "ineligible", "E: unknown cannot auto-compensate");
assert.equal(unknown.claim("claim-b"), "needs_review", "F/R: unknown cannot acquire another claim");

const migration = source("supabase/migrations/0059_midtrans_initialization_recovery.sql");
assert.match(migration, /ADD COLUMN midtrans_init_state text NOT NULL DEFAULT 'idle'/);
assert.match(migration, /ELSE 'unknown'[\s\S]*ELSE 'legacy_unverified'/, "Legacy missing refs must be unknown");
assert.equal((migration.match(/FOR UPDATE;/g) ?? []).length, 4, "Every transition RPC must row-lock the order");
assert.equal(
  (migration.match(/PERFORM public\.restore_order_inventory_internal\(v_order\.id\);/g) ?? []).length,
  1,
  "O: migration must use the existing variant-aware restore helper exactly once",
);
assert.match(migration, /midtrans_init_state IS DISTINCT FROM 'initializing'/, "E: only initializing can compensate");
assert.match(migration, /midtrans_init_state NOT IN \('initializing', 'unknown'\)/, "M: same claim can finalize unknown");
assert.match(migration, /midtrans_init_reason IS NOT NULL[\s\S]*?legacy_unverified/, "Unknown reason cannot be NULL");
assert.match(migration, /midtrans_order_id IS NOT DISTINCT FROM order_code/, "Ready reference cannot bypass CHECK through NULL");
assert.match(migration, /CREATE TRIGGER orders_protect_midtrans_initialization_hold/, "Admin updates must not race an unresolved CREATE");
assert.match(migration, /OLD\.midtrans_init_state IN \('initializing', 'unknown'\)[\s\S]*?NEW\.status IS DISTINCT FROM OLD\.status/);
assert.match(
  migration,
  /REVOKE EXECUTE ON FUNCTION public\.delete_order\(uuid\)[\s\S]*?FROM PUBLIC, anon, authenticated, service_role;/,
  "Legacy hard delete must not bypass the unresolved-state hold",
);
assert.doesNotMatch(
  migration.match(/ADD CONSTRAINT orders_midtrans_init_compensated_check[\s\S]*?\);/)?.[0] ?? "",
  /payment_status = 'failed'/,
  "Q: compensated constraint must allow cancelled + late paid",
);
for (const functionName of [
  "claim_midtrans_initialization",
  "finalize_midtrans_initialization",
  "mark_midtrans_initialization_unknown",
  "compensate_midtrans_initialization",
]) {
  assert.match(migration, new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${functionName}\\(`));
  assert.match(
    migration,
    new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${functionName}\\([\\s\\S]*?TO service_role;`),
  );
}

const checkout = source("lib/actions/checkout.ts");
const initializationHelper = source("lib/payments/midtransInitialization.ts");
assert.doesNotMatch(checkout, /Math\.round\(/, "I: checkout and regeneration must not round totals");
assert.match(checkout, /attempt < 2/, "M: finalization must use a bounded retry");
assert.match(initializationHelper, /reason: "transport_unknown"/, "K/L: ambiguous failures must become unknown");
assert.match(checkout, /\["initializing", "unknown"\][\s\S]*RECOVERY_MESSAGE/, "R: regeneration must hold unknown");
assert.doesNotMatch(checkout, /\.from\("products"\)[\s\S]{0,120}\.update\(/, "No direct stock compensation is allowed");

const webhook = source("lib/payments/midtransWebhook.ts");
assert.match(
  webhook,
  /order\.midtrans_order_id === null[\s\S]*?503, "midtrans_reference_pending"/,
  "P: webhook before finalize must remain retryable",
);

const failureRpc = source("supabase/migrations/0055_midtrans_failure_stock_release.sql");
assert.match(failureRpc, /WHEN v_order\.status = 'pending' THEN 'processing'[\s\S]*?ELSE v_order\.status/);
assert.match(failureRpc, /IF v_order\.status = 'cancelled'/, "Q: cancelled late-payment policy must remain intact");
assert.match(failureRpc, /UPDATE public\.product_variants[\s\S]*?stock = stock \+ v_item\.quantity/);

console.log("All PAY-002 assertions passed successfully!");
