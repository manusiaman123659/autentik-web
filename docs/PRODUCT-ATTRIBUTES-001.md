# PRODUCT-ATTRIBUTES-001 — Komponen-only

## Final domain boundary

**This feature applies only to Komponen / Sparepart / Store purchase flow.**
The internal discriminator remains `product_type = 'sparepart'`.
It does not provide Product Attribute controls, optional-weight editing, or public
attribute presentation for B2B Products (`b2b_system`).

Migration 0068 was already manually applied and audited before the final business
scope correction. It is preserved verbatim: no rollback, drop, replacement, new
migration, RLS change, or ACL change is required by this application-only correction.

The shared `products` table still technically contains the additive columns on all
rows. Original B2B rows have DB minimum1 and NULL unit/dimensions/note. These values
are not exposed/used as B2B application-domain attributes. Existing technical values,
including the archived historical B2B QA row, are not cleaned or normalized.

## Current application boundaries

| Boundary | Komponen / sparepart | B2B |
| --- | --- | --- |
| Admin `Atribut Produk` | Visible, one canonical weight control | Absent |
| Product schema | Validates/defaults attributes | Pre-task fields only; unknown attributes stripped |
| Form submit | Explicit attribute payload | Omits all eight attribute-oriented inputs, including weight |
| Product upsert | Writes validated canonical attributes | Does not write new columns; existing `weight_grams: null` behavior restored |
| Detail presentation | Store shows canonical attributes with ID/EN/ZH labels | No new attribute block |
| Minimum purchase | Enforced for ready-stock commerce | No attribute procurement/RFQ behavior introduced |

B2B weight handling remains **outside this task**. The earlier optional-weight fix
was removed from the uncommitted application build. Restoring pre-task save behavior
is not a live B2B data rewrite: this correction performs no Product writes.

`/products/[slug]` and its EN/ZH variants, public B2B loader, and public locale root
layout are restored to their pre-task versions. Translation003 DTOs, translated
name/description/features/specs/SEO, JSON-LD and RFQ canonical identity remain unchanged.
Attribute messages are retained because Store uses them, but their client provider
is scoped to the Store layout instead of the public root/B2B detail provider.

## Canonical backing schema (applied 0068)

| Column | Contract |
| --- | --- |
| `min_purchase_qty` | Integer NOT NULL DEFAULT 1, CHECK 1..999 |
| `unit` | Nullable free text, max50; trim/blank→NULL, reject inappropriate controls |
| `length`, `width`, `height` | Independently nullable numeric, >0, scale<=3, <=999999999.999 |
| `dimension_unit` | Nullable mm/cm/m; required if any axis exists, NULL if all axes absent |
| `dimensions_note` | Nullable text, max2000; line breaks allowed, unsafe controls rejected |
| `weight_grams` | Existing column/name/type/constraint retained |

Numeric columns have no rounding typmod: excess precision, NaN/Infinity, nonpositive
and malformed input are rejected. Komponen Admin supports comma decimal entry and
sends normalized numeric text. Blank axes become NULL, not0. No guessed missing axis,
automatic conversion, diameter parser, or volumetric shipping exists.

## Komponen minimum, unit and dimensions

Minimum is a **lower bound, not an order multiple**: minimum10 accepts10/11/12/etc.
It applies independently per Product + variant line; variantA5 + variantB5 does not
satisfy minimum10. Stock below minimum can be stored but blocks direct purchase.

Unit describes one sale quantity. Price, stock and weight remain per sale unit.
Suggestions: Pcs, Liter, Batang, Set, Unit, Pack; safe custom text is allowed. Pack
does not infer package contents; Liter does not enable fractional quantities.
Existing Products receive no fabricated Pcs unit.

Store renders full L/W/H dimensions, explicit known axes for partial dimensions,
and note-only or structured+note cases. Empty/default-only details render no block.
Labels use ID/EN/ZH messages, values remain canonical. Note text intentionally stays
canonical Indonesian. Unit price is never multiplied by minimum and labelled Product price.

## Preserved cart, direct-buy and checkout behavior

- Add/detail/quick-add/sticky quantity starts at minimum; decrement floor is minimum.
- Explicit cart quantity actions enforce integer, minimum, stock and global max999.
- Cart canonical-rule refresh preserves payable quantity/price and retains unavailable
  lines for review. Correction requires a customer action; no silent checkout increase.
- Direct-buy metadata provides UX only; current locked Product data is authoritative.
- Generic checkout schema remains integer1..999, not a browser-supplied Product rule.
- Base RPC locks Product/variant rows, then rejects a below-minimum line with `P1064`
  before order/stock/payment-affecting mutation. The application maps that code safely.
- V2 remains unchanged: existing successful intent replay returns its order before
  calling the base function. Later minimum changes do not invalidate that replay.

| RPC | Owner | Mode | search_path | Client execution |
| --- | --- | --- | --- | --- |
| Base | postgres | SECURITY DEFINER | public | none; owner only |
| V2 | postgres | SECURITY DEFINER | empty | authenticated only; also owner |

Confirmed applied normalized body fingerprints, unchanged by correction:

- Base: `6fd1aa190ee315a9c373afefe508825c`.
- V2: `5a0f78d8166ce81f679cb957ab299174`.

The applied migration verifies the original live signatures/bodies/owners/security/ACL
and uses two uniquely checked substitutions on the audited live definition. It does
not replay an old GRANT. Scope correction changes neither the migration nor either RPC.

## Translation boundary

No attribute fields are added to `product_translations`. The existing source-revision
trigger still only watches name, description, features, specs, seo_title, seo_description.
Its definition is unchanged. The final scope does not require B2B attribute-edit/staleness
QA; those obsolete application expectations were removed. Translation001/002/003 behavior
and their original verifiers remain intact.

## Verification after scope correction

```sh
node scripts/verify-product-attributes.cjs
node scripts/verify-product-attributes-browser.cjs
node scripts/verify-product-attributes-live.cjs
node scripts/verify-product-translation-foundation.cjs
node scripts/verify-product-translation-editor.cjs
node scripts/verify-public-b2b-product-translations.cjs
node scripts/verify-public-b2b-product-translations-browser.cjs
node scripts/verify-komponen-save-navigation.cjs
node scripts/verify-rbac.cjs
npx tsx scripts/verify-checkout-idempotency.ts
npx tsx scripts/verify-midtrans-initialization.ts
npm run lint
npm run build
git diff --check
```

The scoped module/action verifier checks B2B stripping, omitted canonical attribute
writes, pre-task NULL-weight behavior, and Komponen validation/enforcement. The real
component browser fixture checks B2B controls absent, raw payload exclusion and source
navigation, plus Komponen save/reopen and Store/cart/direct-buy behavior.
Correction results: **84 module/action assertions**, **96 browser-fixture assertions**,
and **37 read-only database/public-route assertions** passed. Actual hydrated ID/EN/ZH
B2B pages have no attribute block/messages; existing Komponen pages retain the scoped
Store provider and attribute block. No new live QA Products or checkout orders were generated.

`verify-product-attributes-live.cjs` is now **read-only**. The obsolete write-generating
B2B QA harness was replaced. It checks original Product hashes, archived fixtures,
retained order state and EXECUTE denial; its authenticated v2 probe uses an empty cart,
which fails before locks/order lookup/stock/payment mutation. It generates no new orders,
restores no fixtures, changes no credentials/profile, and performs no business-data writes.
Its report is `%TEMP%/opencode/product-attributes-scope-audit.json`.
The controlled authenticated browser was closed during correction, so its optional
authenticated EXECUTE probe was not repeated. The prior successful authenticated live
audit and unchanged SQL remain the evidence for that role; fresh anon/service-role
denial probes passed. No login, credential export, or account change was attempted.

## Historical live evidence and preserved cleanup

Before the final scope clarification, the expanded-scope live harness passed231 assertions,
plus64 responsive Admin assertions. Its B2B feature results are **historical, not current
supported behavior**. Komponen live evidence remains valid: qty9/P1064 rejection with
no mutation, qty10/11 acceptance with valid quotes, stock9 block, variant5+5 rejection,
selected variant qty10 acceptance, forged client minimum rejection and idempotent retry
after a minimum change. No real gateway payment was initialized or charged.

The original user-reviewed post-apply baseline was80 Products/61 nonarchived, with:
- Weight-by-ID MD5: `e00e1ac5e0c612dee69a1d728912b47f`.
- Existing-content MD5: `adee2ced29447d476c8c21e074be9c59`.

Run ID: `88c48dfb-d655-4d48-9f94-f454a0ab6b29`.
Three canonical QA rows use `qa-attributes001-{b2b|component|variant}-<run ID>`.
They remain soft archived/inactive/hidden, with translation rows removed and no active
variants. The owned customer remains inactive/banned and retained for order foreign keys.
Original browser cart was restored and QA tabs closed.

Final historical counts:83 total = original80 + three preserved archived QA rows;
61 nonarchived. Every field on all original80 rows matched stable SHA-256:
`2eae7e28486d3d7e6851e13c6cc4fb172faad339e414b1a12a974e20cac58b81`.
Original22 B2B NULL weights and the one Komponen NULL weight were never repaired/backfilled.

Seven distinct accepted QA intents remain **cancelled**, inventory restored,
payment pending, initialization idle, with NULL gateway ID/redirect URL:
`ORD-20261014-9105`, `ORD-20261014-8526`, `ORD-20261014-4603`, `ORD-20261014-4651`,
`ORD-20261014-6129`, `ORD-20261014-5402`, `ORD-20261014-8170`.
These are separate intent keys, not duplicate orders caused by retry.

Existing0054 financial policy rejects archival of cancelled Midtrans pending/failed
orders with P0001, even without provider references. No fake payment/refund/method,
hard delete, SQL/ACL bypass, or further order generation was used to remove these rows.
They may remain visible in Admin pending-payment queries; further disposition follows
the project's financial cleanup policy. Scope correction leaves their state untouched.

Historical reports remain `%TEMP%/opencode/product-attributes-live-report.json` and
`%TEMP%/opencode/product-attributes-live-narrow-report.json`. No credentials are recorded.

## Future Excel mapping and limits

Future **Komponen-only** mapping: MINIMAL JUMLAH PEMBELIAN→min_purchase_qty;
SATUAN→unit; clear P/L/T numeric values→length/width/height; explicit dimensional
unit→dimension_unit; ambiguous/diameter/free-form size→dimensions_note.
No parser, guessing, bulk import or real Product backfill is implemented.

Limits: integer quantities only, max999; no volumetric shipping; canonical unit/note
values; cart rules can change after refresh so the database stays authoritative.
No real paid gateway transaction is claimed. Catalog body/security evidence comes
from the user-reviewed SQL audit; the correction's live checks are read-only Data API probes.

Next task: PRODUCT-TRANSLATION-AUTO-001 — Google Cloud Translation Draft Generator.
**Not started. No commit, push or deploy. Stop for review.**
