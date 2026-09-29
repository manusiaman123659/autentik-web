import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

console.log("Running PAY-003 source-shape assertions...\n");

const migration = source("supabase/migrations/0060_checkout_idempotency.sql");
assert.match(migration, /ADD COLUMN checkout_idempotency_key uuid/);
assert.match(migration, /ADD COLUMN checkout_request_fingerprint text/);
assert.match(migration, /orders_checkout_idempotency_pair_check/);
assert.match(
  migration,
  /CREATE UNIQUE INDEX orders_checkout_user_key_uidx[\s\S]*?\(user_id, checkout_idempotency_key\)[\s\S]*?WHERE checkout_idempotency_key IS NOT NULL;/,
  "The final uniqueness boundary must be scoped by authenticated owner and key",
);
assert.match(migration, /CREATE FUNCTION public\.create_checkout_order_v2\(/);
assert.match(migration, /SECURITY DEFINER[\s\S]*?SET search_path = ''/);
assert.match(migration, /v_user_id uuid := auth\.uid\(\)/, "Owner must come from the authenticated JWT");
assert.doesNotMatch(
  migration.match(/CREATE FUNCTION public\.create_checkout_order_v2\([\s\S]*?\)\nRETURNS text/)?.[0] ?? "",
  /p_user_id/,
  "The browser must not supply an owner ID",
);
assert.match(migration, /pg_catalog\.sha256\(pg_catalog\.convert_to\(v_payload::text, 'UTF8'\)\)/);
assert.match(migration, /'version', 1/);
assert.match(migration, /item ORDER BY item ->> 'product_id', item ->> 'variant_id' NULLS FIRST/);
assert.match(migration, /pg_catalog\.pg_advisory_xact_lock\(/);
assert.match(migration, /checkout-v2-user:/);
assert.match(
  migration,
  /IF \(\s*SELECT pg_catalog\.count\(\*\)\s*FROM public\.orders\s*WHERE user_id = v_user_id\s*AND checkout_idempotency_key IS NOT NULL\s*AND created_at >= pg_catalog\.now\(\) - INTERVAL '10 minutes'\s*\) >= 10 THEN\s*RAISE EXCEPTION 'checkout_rate_limit_exceeded'\s*USING ERRCODE = 'P0026';/,
  "P0026 must count only prior orders created through the idempotent v2 checkout path",
);
assert.match(migration, /user_id = v_user_id[\s\S]*?checkout_idempotency_key = p_idempotency_key[\s\S]*?FOR UPDATE;/);
assert.match(migration, /RAISE EXCEPTION 'idempotency_conflict'[\s\S]*?ERRCODE = 'P0023'/);
const archivedPosition = migration.indexOf("IF v_existing.deleted_at IS NOT NULL");
const conflictPosition = migration.indexOf("IF v_existing.checkout_request_fingerprint IS DISTINCT FROM v_fingerprint");
assert(archivedPosition > 0 && archivedPosition < conflictPosition, "Archived keys must be terminal before fingerprint comparison");
assert.match(migration, /RETURN v_existing\.order_code;/);

const lockPosition = migration.indexOf("pg_catalog.pg_advisory_xact_lock");
const lookupPosition = migration.indexOf("SELECT id, order_code, checkout_request_fingerprint, deleted_at");
const oldRpcPosition = migration.indexOf("v_order_code := public.create_checkout_order");
assert(lockPosition > 0 && lockPosition < lookupPosition, "The advisory lock must precede the idempotency lookup");
assert(lookupPosition < oldRpcPosition, "Replay lookup must happen before stock-mutating checkout");
assert.match(
  migration,
  /UPDATE public\.orders[\s\S]*?checkout_idempotency_key = p_idempotency_key[\s\S]*?user_id = v_user_id[\s\S]*?IF NOT FOUND THEN[\s\S]*?ERRCODE = 'P0024'/,
  "Metadata attachment must be owned, required, and transaction-fatal on failure",
);
assert.match(
  migration,
  /REVOKE EXECUTE ON FUNCTION public\.create_checkout_order\([\s\S]*?\) FROM PUBLIC, anon, authenticated, service_role;/,
  "The old non-idempotent RPC must not remain an API bypass",
);
assert.match(
  migration,
  /GRANT EXECUTE ON FUNCTION public\.create_checkout_order_v2\([\s\S]*?\) TO authenticated;/,
);
assert.match(migration, /has_function_privilege\(v_owner_name, v_old_oid, 'EXECUTE'\)/);

const action = source("lib/actions/checkout.ts");
assert.match(action, /\.rpc\("create_checkout_order_v2"/);
assert.match(action, /p_idempotency_key: data\.idempotencyKey/);
assert.match(action, /error\.code === "P0023"/);
assert.match(action, /Data checkout berubah/);
assert.match(action, /canStartNewIntent/);
const submitStart = action.indexOf("export async function submitCheckout");
const submitSource = action.slice(submitStart, action.indexOf("export interface RegenerateResult"));
const paymentInitCall = submitSource.indexOf("const initialization = await initializeMidtransPayment");
for (const branch of [
  'orderRow.payment_status === "paid"',
  'orderRow.midtrans_init_state === "ready"',
  '["initializing", "unknown"].includes(orderRow.midtrans_init_state)',
  'orderRow.midtrans_init_state === "compensated"',
]) {
  const position = submitSource.indexOf(branch);
  assert(position > 0 && position < paymentInitCall, `${branch} must prevent another provider CREATE`);
}

const helper = source("lib/checkout-intent.ts");
assert.match(helper, /window\.sessionStorage\.setItem/);
assert.match(helper, /window\.sessionStorage\.getItem/);
assert.match(helper, /if \(existing && !existing\.completed\)/);
assert.match(helper, /key: existing\.key/, "Retry must retain the existing intent key");
assert.match(helper, /window\.crypto\.randomUUID\(\)/);

const client = source("components/checkout/CheckoutClient.tsx");
assert.match(client, /if \(submissionGuard\.current\) return;/, "Double-click needs a synchronous guard");
assert.match(client, /submissionGuard\.current = true/);
assert.match(client, /authGeneration\.current !== requestAuthGeneration/);
assert.match(client, /getOrCreateCheckoutIntent\(/);
assert.match(client, /idempotencyKey: intent\.key/);
assert.match(client, /associateCheckoutIntentOrder\([\s\S]*?clearCart\(\)/, "Order identity must persist before cart clearing");
assert.match(client, /resetCheckoutIntent\(/, "A new key requires an explicit checkout-intent action");

const schema = source("lib/validations/storeSchema.ts");
assert.match(schema, /idempotencyKey: z\.string\(\)\.uuid/);
assert.match(schema, /checkoutOrderSchema\.omit\(\{ idempotencyKey: true, items: true \}\)/);

console.log("All PAY-003 source-shape assertions passed successfully!");
