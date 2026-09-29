# PAY-003 Runtime QA Plan

Status: **HOLD**. Do not execute this plan until migration `0060_checkout_idempotency.sql` has been reviewed, approved, and applied to an isolated QA database. Never use the two known production duplicate orders as fixtures.

## Safety Rules

- Use a disposable QA project or transactionally isolated fixtures.
- Use dedicated customer accounts and products created for this test.
- Record stock, order count, order rows, and Midtrans state before and after every case.
- Use two independent PostgreSQL sessions for concurrency cases.
- Do not call Midtrans until the database-only cases pass and Sandbox execution is explicitly approved.
- Delete QA fixtures only through an approved cleanup procedure after evidence is captured.

## A-O Cases

### A. Catalog and ownership preflight

Confirm the old and v2 signatures resolve exactly once. Record `pg_proc.proowner`, `prosecdef`, `proconfig`, and `proacl`. Confirm both functions have the same non-login owner before invoking v2.

Expected: v2 is `SECURITY DEFINER`, has `search_path` set to an empty string, and its owner matches the old checkout function owner.

### B. Additive schema and historical rows

Inspect existing orders immediately after applying `0060`.

Expected: historical rows remain unchanged with both new columns null; the pair CHECK and partial unique index are valid; no stock or order status changes occur.

### C. Sequential identical replay

Call v2 twice as the same customer with the same UUID and byte-for-byte equivalent checkout request. Capture stock before, between, and after calls.

Expected: both calls return the same order code, exactly one order exists for the key, and stock decreases exactly once.

### D. Concurrent identical replay

From two authenticated sessions for the same customer, start the same key and request concurrently while holding the first transaction long enough to prove serialization.

Expected: both calls return the same order code, one order exists, and stock decreases once. The second session waits rather than entering the old checkout function concurrently.

### E. Same key with changed payload

Replay a completed key after changing quantity, item, variant, customer data, shipping address, or notes one field at a time.

Expected: SQLSTATE `P0023` with `idempotency_conflict`; no new order, stock, shipping snapshot, or payment state mutation.

### F. Canonical item ordering

Replay one key with the same valid items in a different JSON array order and with equivalent UUID casing/whitespace accepted by the wrapper.

Expected: the fingerprint is equal and the original order code is returned without another stock decrement.

### G. Different key, same customer

Submit the same request with a deliberately new UUID after documenting that this represents a new checkout intent.

Expected: a distinct order is allowed and stock decreases again. This documents the boundary: idempotency is per customer plus key, not cart-content deduplication.

### H. Same key, different customers

Use the same UUID from two different authenticated customer accounts with otherwise equivalent requests.

Expected: each customer receives its own order. Neither customer can replay or discover the other customer’s order through ownership lookup.

### I. Variant stock serialization

Repeat C and D with a product that has an active variant and verify both `product_variants.stock` and `order_items.variant_id`/`variant_label`.

Expected: variant stock decreases once, product-level stock is not incorrectly decremented, and the snapshot fields are stable.

### J. Failure rollback

Use controlled fixtures to trigger insufficient stock and an attachment failure after the delegated old RPC would otherwise create an order.

Expected: the whole transaction rolls back; no order survives, no idempotency metadata is orphaned, and stock is unchanged.

### K. Archived replay

Soft-delete a QA order created with an idempotency key, then replay both the same request and a modified request.

Expected: SQLSTATE `P0025` (`idempotency_order_archived`), no replacement order, and no stock mutation. The key remains reserved.

### L. ACL cutover

Test both RPC signatures as `PUBLIC`/unauthenticated, `anon`, `authenticated`, and `service_role` using catalog privilege checks and actual denied calls that cannot mutate valid fixtures.

Expected: old RPC denied to every API role; v2 allowed only to `authenticated`; owner retains implicit execution so the nested call works.

Also submit 10 sequential and 11 concurrent fresh keys for one QA customer inside 10 minutes.

Expected: at most 10 orders commit; every additional fresh key receives `P0026`. Replays of an existing key remain available and do not consume another slot.

### M. PAY-002 idle and ready integration

After database cases pass, allow one approved Sandbox checkout from `idle + pending + pending`, then replay its idempotency key after state becomes `ready`.

Expected: one Midtrans transaction is created, the durable redirect URL is reused, and replay never issues a second provider CREATE.

### N. PAY-002 held and terminal states

Using controlled QA state transitions, replay keys for `initializing`, `unknown`, `compensated`, paid, failed, refunded, and cancelled orders.

Expected: `initializing`/`unknown` return recovery without provider CREATE; `ready` reuses its URL; paid returns the existing order; compensated/cancelled/failed/refunded are terminal and do not create replacements under the same key.

### O. Browser lifecycle and interruption

Exercise cart and direct-buy checkout under double-click, delayed response, lost response, refresh, blocked storage, account switch, mode switch, and two tabs.

Expected: one tab retains one key through retry until a definite outcome; order association is stored before local cart clearing; cart clearing is durable before intent completion; active conflicts cannot rotate keys; account and cart/direct scopes do not leak. Two tabs with independently generated keys remain explicitly outside the same-key guarantee and must be documented as separate intents.

## Evidence Required

For every case retain sanitized SQL output, timestamps, session identifiers, returned order codes, before/after stock, matching order count, SQLSTATE, function ACL/owner output, and provider request count where applicable. A failure in any case blocks production rollout.
