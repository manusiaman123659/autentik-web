# Product Translation Foundation 001 — application gate

## Status

Migration `supabase/migrations/0066_product_translation_foundation.sql` is
**APPLIED — manually, as confirmed by the user**. The supplied post-apply audit
confirms columns/defaults, triggers, all expected constraints/indexes, RLS/public
policy, SELECT-only client table privileges and guarded RPC grants/settings.
Initial translation row count was 0. Deployed migration-history numbering was
unavailable; runtime lifecycle and real-session evidence are recorded separately.

No public surfaces or translation editor consume this foundation yet.

## Review decisions

- Common translation RLS requires parent Published + active + nondeleted and a
  matching source revision. Store visibility remains the Store caller's scope;
  it is not a global translation policy.
- Source revision tracks only name, description, features, specs, and SEO fields.
  It does not use/update Product `updated_at`. INSERT initializes revision 1;
  manual revision assignments cannot reset an existing revision.
- Mutation array entries carry `source_index` so rearranged request rows are
  rejected. Stored features are strings; stored specs are `{label,value_text}`.
  Index correspondence is used only inside one checked source revision. It is
  not a merge across independently edited source arrays. Semantic translation
  correctness still requires human review in phase 002.
- Missing `value_kind` means technical. Only explicit `text` permits a value
  translation. No existing Product JSON is rewritten. ProductForm preserves
  existing classification metadata without exposing classification controls.
- Updates check translation UUID **and** version, avoiding a delete/recreate ABA
  match. Creation requires both expected identity/version to be NULL.
- Audit events are inserted in the RPC transaction, not duplicated by actions.
  The migration reserves those event names in the existing audit insert policy.
- Authenticated callers execute only guarded mutation RPCs. Pure SQL constraint
  helpers are executable by their owner and trusted service maintenance, not clients.
- Revalidation uses Next's rewritten route destination: `/en/...` and
  `/zh-CN/...`; public Chinese browser URLs remain `/zh-cn/...`.
- Operational SELECT intentionally exposes Draft/stale rows to authorized CMS
  users. Public readers explicitly filter and validate even under that session.
  The batch lookup also joins current parent eligibility/revision in the same
  query, checking it against the canonical snapshot without adding Products.

## Apply manually

1. Review the entire 0066 file, including all function bodies and exact grants.
2. In the intended Supabase project's SQL Editor, execute the **entire file**
   together, including `BEGIN` and `COMMIT`. Do not execute fragments.
3. If any precondition/compiler/permission error occurs, stop and share the error;
   the transaction must roll back. Do not skip constraints or grants to proceed.
4. Execute `docs/sql/0066_product_translation_post_apply_audit.sql` (read-only).
5. Return all result sets for review. Do not paste keys/passwords/JWTs into chat.

Expected initial state: all existing Products have revision 1; no translation
rows are created. Public behavior stays unchanged. The migration ends with
PostgREST schema-cache notification.

## Exact mutation contracts

`save_product_translation(text,text,jsonb,text,integer,integer,uuid)` returns
Product route metadata and the persisted version as JSONB. The UUID argument
defaults to NULL; updates must supply the management row's UUID.

`unpublish_product_translation(text,text,integer,uuid)` and
`delete_product_translation(text,text,integer,uuid)` use the existing row's
version and UUID. They do not require rebasing stale source content.

Payload keys: `name`, `description`, `features`, `specs`, `seo_title`,
`seo_description`. Missing/null fields fall back; saves replace the locale
content rather than patching unspecified fields.

```json
{
  "name": "Approved display name",
  "description": null,
  "features": [{"source_index": 0, "text": "Approved translated feature"}],
  "specs": [{"source_index": 0, "label": "Capacity", "value_text": null}],
  "seo_title": null,
  "seo_description": null
}
```

Actual array counts must match the chosen Product source. Arrays may be NULL to
use the source block. Limits: 1000 items per block; name/SEO title/spec labels
500 characters, description 20000, SEO description/features/value text 2000;
request payload 256 KiB. Whitespace-only optional text becomes NULL. Published
rows require actual translated text, not just source-index/null entries.

Errors after hotfix 0067: `P1061` source conflict, `P1062` translation identity/version conflict,
`P1063` missing/archived Product, `42501` authorization, `22023` invalid payload,
`23514` constraint rejection. Actions do not expose raw database prose.

## Post-apply real-session verification

Run in the intended safe environment using one designated disposable Product.
Do not change important Product content or delete canonical Products. Use actual
anonymous/customer/operations/editor/inactive sessions through the Data API;
service-role SELECT or SQL Editor impersonation is not proof of real-session RLS.
Keep session secrets local.

1. Read the safe Product and its revision. Verify baseline fields and IDs.
2. Operations user saves EN Draft with current source revision, NULL expected
   version/UUID. Management reads return Draft; anon/customer reads do not.
3. Publish EN with its current UUID/version. Anon/customer reads return it.
4. Create ZH independently; failure/conflict in one locale leaves the other intact.
5. Two sessions load one UUID/version; after B saves, A's save must fail `P1062`.
6. Change source description and confirm one revision increment. Translation
   content/status/version remain unchanged but public reads exclude the stale row;
   the resolver returns base content. Save against the old source fails `P1061`.
7. Repeat source checks for name/features/specs/SEO; reorder a source array. One
   multi-field UPDATE increments once. Same-value UPDATE does not increment.
8. Change price/stock/image/sort only; source revision does not change.
9. Unpublish stale EN with current UUID/version; content retained, status Draft,
   version incremented. Delete a stale test translation only; Product survives.
10. Recreate the locale and ensure a former UUID/version cannot overwrite it.
11. Invalid counts, reversed indexes, unknown keys, technical `value_text`, empty
    publication, and wrong locale fail. Explicit text-classified values can translate.
12. Under anon/customer, verify current Published only; reject draft/inactive/
    deleted parents. Under staff public adapter, verify the same explicit filtering.
    Check B2B with store visibility false remains common-policy eligible; Store
    callers must apply their own Product type/visibility scope.
13. Editor without operations and inactive users cannot call mutators. Direct
    INSERT/UPDATE/DELETE/TRUNCATE is denied for anon/authenticated, including staff.
14. Verify audit records and transaction rollback on failed writes. Ordinary
    clients cannot forge reserved translation audit events.
15. Restore test Product fields/flags as appropriate and remove test translations
    through guarded RPCs. Do not reset the monotonic revision or delete the Product.

The user's successful manual application establishes live SQL compilation. The
supplied SQL audit establishes schema/constraint/index and grant definitions.
Source-trigger execution, RPC concurrency, and real-role lifecycle results must
still be exercised; audit definitions alone do not establish those runtime results.

### Live runner (verification only)

Set private `PRODUCT_TRANSLATION_QA_OPERATIONS_JWT` locally from a real operations
session. Optional `PRODUCT_TRANSLATION_QA_CUSTOMER_JWT`,
`PRODUCT_TRANSLATION_QA_EDITOR_JWT`, and `PRODUCT_TRANSLATION_QA_INACTIVE_JWT`
cover other actors. Never paste session tokens into chat or use NEXT_PUBLIC names.
No Auth accounts or profile roles are created/changed by this runner.

```powershell
node scripts/verify-product-translation-live.cjs --run
```

After supplying missing sessions, add `--resume-owned` to reuse the same QA
Product recorded in the previous report. The runner checks its ownership marker,
hidden state and restored source before touching it; its revision is never reset.

The runner creates one uniquely named QA Komponen with `is_store_visible=false`,
so it cannot appear in Store, B2B catalogue, Hero or search. It records/restores
source content, removes only its own translation fixtures with trusted maintenance,
and soft-archives its own QA Product; canonical Product data is never physically
deleted. It prints no JWTs, emails or real user IDs. Its report is written to the
approved temporary directory as `product-translation-live-report.json`.

If no operations session is available, source-trigger and anonymous RLS checks
can run with trusted fixture setup, but **guarded RPC lifecycle, concurrency and
audit are explicitly unavailable**. Service-role fixture setup is not operations
authorization proof. Missing real actors remain reported separately.

### Observed post-apply result

The available live run passed **32 assertions**: no-op/stock/price/media/sort
revision stability; all six source-content changes and a multi-field restoration;
anonymous direct DML/RPC denial; Draft/current Published/stale and parent-state
visibility; current-Published stability after stock/price edits; real FK-joined
batch reading; and preservation of a stale row's content/status/revision/version.

The same owned Product was reused across verification passes:
`i18n-qa-698604be-49de-4eb2-b01c-1fc8c4ba64a1`. Its source fields were restored,
translations removed, and the Product soft-archived. Its revision remains monotonic
(28 after the last cleanup); no canonical Product was physically deleted.

During the initial anonymous-only run, operations/customer/editor/inactive JWT
variables were not configured. That run did not exercise guarded-RPC lifecycle,
concurrency or audit. The subsequent browser-session evidence is recorded below.

### Authenticated browser verification — blocked at conflict response

The user manually logged in to a controlled visible local Admin browser. The
application `utils/supabase/client.ts` client confirmed an active Admin with
operations capability. No cookies, passwords or tokens were exported. The
verification browser mode needs no JWT environment variable or service-role client.

The authenticated run passed 49 assertions, including guarded EN/ZH Draft,
Publish, Unpublish, management/public visibility, full-state snapshots, locale
independence, explicit textual spec values, legacy technical-value preservation,
and direct authenticated INSERT/UPDATE/DELETE denial. It also verified stale-row
preservation and anonymous stale filtering.

The run then FAILED at the source-revision conflict: the browser received
`QA_BROWSER_ERROR` rather than the expected `PT001` response. PostgREST reserves
`PTxyz` SQLSTATEs for HTTP status codes; the migration's PT001/PT002/PT003 domain
codes collide with that mechanism (001/002/003 are not suitable HTTP statuses).
Reference: https://docs.postgrest.org/en/stable/references/errors.html#raise-errors-with-http-status-codes

As required, verification stopped and no architecture/migration fix was made.
Version/UUID conflicts, explicit technical override rejection, and audit
creation/spoof assertions after that point remain unverified. Cleanup used the
authenticated browser: translations removed, source values restored, owned QA
Product archived again; final revision 30, no canonical Product deletion.

An approved corrective change must replace reserved PT-domain error codes and
update matching action/test classifications before 001 can close. Do not edit
already-applied migration history or start phase 002 without that review.

Browser command (after a separately approved correction):

```powershell
node scripts/verify-product-translation-live.cjs --run --resume-owned --browser-session
```

## Approved conflict SQLSTATE hotfix — 0067 NOT APPLIED

PostgREST interprets `PTxyz` as custom HTTP statuses. Replace only these seven
error literals in the three deployed RPCs: `PT001` → `P1061` (source conflict,
one site), `PT002` → `P1062` (translation version/UUID conflict, three sites),
`PT003` → `P1063` (Product unavailable, three sites). These are normal structured
PostgREST errors (expected HTTP 400), not custom HTTP 409 responses.

The user-supplied deployed `pg_get_functiondef` definitions matched immutable
0066 exactly after PostgreSQL header/default formatting normalization. Migration
0067 aborts the entire transaction if the deployed function bodies, relevant
attributes, defaults, owner or execution permissions differ from the reviewed
baseline. Unexpected direct EXECUTE grantees and effective inherited access by
other non-owner/non-superuser roles also abort. `CREATE OR REPLACE`
preserves the existing function identities/ACLs; it does not issue grants or
change tables, policies, triggers, source revision, audit rules or lifecycle.

### Manual application and audit

1. Review the **complete SQL file**, including all three full function bodies:
   `supabase/migrations/0067_product_translation_conflict_sqlstates.sql`.
2. Run that entire file once in the Supabase SQL editor as the normal migration
   owner. If a precondition fails, stop and return the error plus current
   definitions/attributes for review; do not bypass the precondition or edit 0066.
3. Run the complete read-only audit:
   `docs/sql/0067_product_translation_conflict_post_apply_audit.sql`.
   Expect three `audit_pass = true` rows, code counts `(1,1,1)` for save and
   `(0,1,1)` for unpublish/delete, no reserved PT codes in deployed bodies,
   `jsonb`, `plpgsql`, `SECURITY DEFINER`, empty search path, owner `postgres`,
   and authenticated-only non-owner EXECUTE. Review the returned full definitions
   and ACL rows as well. Body hashes with reversed code substitutions must match
   the deployed pre-hotfix baseline.
4. Return those audit results before resuming any live mutations. The application
   action mapping must be released with 0067; old applications will safely return
   generic errors for the new codes until their matching mapping is available.

### Remaining real-session checks (only after successful manual audit)

Reuse the controlled visible browser with a normal manually signed-in active
Admin and the same owned hidden fixture. No cookies/passwords/tokens are exported.

```powershell
node scripts/verify-product-translation-live.cjs --run --resume-owned --browser-session --remaining-only
```

This mode skips the previously completed revision/permissions/full lifecycle
suite. It creates just the EN/ZH Draft/Published state required to finish:
source conflict `P1061`, concurrent/version and UUID/ABA conflicts `P1062` for
save/unpublish/delete, technical override rejection `22023`, archived-parent
unavailability `P1063` for all three RPCs, stale withdrawal, and guarded audit
creation/spoof denial. Audit checks capture pre-run event IDs and require new
events from this run, never historical events from the reused fixture.
Conflict/unavailability checks assert no overwrite of
the translation snapshots (including the other locale). It restores source
fields, removes only owned-fixture translations, and soft-archives the fixture
without resetting source revision or deleting the canonical Product.

Optional customer/editor/inactive coverage remains **UNAVAILABLE — NO SAFE QA
SESSION** unless a safe session is supplied. Static checks do not claim database
compilation, successful SQL application, or post-hotfix browser results.

## Deferred

Phase 002: Admin translation editor; source-field classification UI; source-edit
revalidation for all fallback locales (including old/new slug and archive/restore).
Phase 003/004: Product public/search/SEO/store wiring and static `Detail` messages.
Children: variants/hotspots/document title translation and child-save lifecycle.
No global DTO, Product timestamp, category-FK, media, checkout or payment hardening.

Rollback: revert consumers first; export translations before destructive removal.
Use a reviewed forward migration. Preserve Products/media and existing audit rules.
