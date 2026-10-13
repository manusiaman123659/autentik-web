# PRODUCT-TRANSLATION-002 — Editor Terjemahan Produk

## Scope and prerequisites

001 is closed: migrations 0066/0067 and their complete catalog audit are
user-confirmed applied/passed. 002 adds the Indonesian Admin editor only.
No migration, RPC/RLS/grant change, public Product consumption, child translation,
AI, dimensions, shipping or stock-architecture changes are included.

## Architecture

- `ProductEditor` is a client shell around the existing `ProductForm`, with
  accessible Konten Utama / English / 简体中文 tabs. Hidden panels remain mounted
  to preserve source and independent locale buffers. Edit routes key the shell
  by Product ID, never by source revision or translation version.
- `ProductTranslationEditor` renders paired persisted-source/translation fields,
  derived badges, stale review, inline feedback and lifecycle actions.
- `lib/product-translation-editor.ts` projects/validates the minimal source,
  requires UUID/version on management rows, initializes buffers and constructs
  full-state requests using existing validation/domain helpers.
- `reloadProductTranslationEditor` is a read-only server action. It authorizes
  operations before input validation/querying, reuses `getProduct` and
  `readManagedProductTranslations`, and returns the safe action envelope with
  optional snapshot metadata. Loading failure never means an absent locale.
- Existing save/unpublish/delete server actions and RPCs remain the mutation
  boundary. There is no direct translation DML in the editor.

## Create and edit

Create source content normally. Translation tabs are visible but disabled until
the canonical Product has been saved. Both B2B and Komponen creates redirect to
their saved edit route. No translation is required.

The canonical form keeps its existing configuration/children and edit-save
navigation. If translation buffers are dirty, canonical Save/Cancel and internal
link navigation require confirmation before leaving. Cancellation keeps buffers.
Reload/hard navigation gets the browser's before-unload protection. Browser
Back/Forward also gets confirmation where the browser supports cancellable
Navigation API traversal (verified in Edge).

Translation references use only the saved source snapshot, including its positive
`translation_source_revision`. Unsaved Konten Utama values are not the source.

## Full-state contract

Every save explicitly submits `name`, `description`, `features`, `specs`,
`seo_title`, `seo_description`. Editing one field does not drop hidden fields.
Blank optional text normalizes to NULL using the existing schema.

Each locale retains its loaded expected source revision, row version and UUID.
NULL row expectations are used only after authoritative loading proves absence.
Buttons/fields for the acted locale lock during a request; the other locale can
still be edited, but lifecycle/reload actions serialize until the request ends.

After a successful mutation, the editor refetches authoritative state and accepts
it only for the acted locale. The other buffer and its expectations are retained.
If the newly observed source revision differs from another buffer's source,
that buffer must reload/review before saving; unpublish/delete need no rebase.

## Features and specifications

- Whole-block Indonesian fallback sends NULL.
- Enabled feature translation has exactly one nonblank value per source index.
  There are no add/remove/reorder controls; source indices are reconstructed.
- Enabled specification translation retains source order/count. Labels are
  translatable. Values are translatable only for explicit `value_kind='text'`.
- Missing `value_kind` means technical. Technical values remain read-only and
  outgoing `value_text` is always NULL. The source classification UI is unchanged.
- Malformed source blocks disable unsafe saves and direct the user to repair
  Konten Utama. Existing arrays are not silently filtered or coerced.

## Lifecycle and stale review

- Simpan Draf: full-state save with status draft.
- Terbitkan: full-state save with status published and nonempty translated content.
- Batalkan Terbit: guarded unpublish of stored content; no source rebase needed.
- Hapus Terjemahan: confirmation, guarded deletion of that locale only.

Status badges distinguish Belum dibuat / Draf / Terbit / Perlu ditinjau ulang.
Stale means saved row source revision differs from the source being reviewed.
The stored Draf/Terbit status is also shown; stale data is retained.

Equal-length stale blocks remain candidates, not implicitly approved alignment.
Saving requires explicit acknowledgement tied to the loaded source revision.
Changed-length blocks show their old values and require deliberate rebuild
against current source indices or explicit whole-block fallback. Saved values
remain available as read-only reference; no silent truncate/pad/reorder occurs.

Saving an acknowledged full snapshot intentionally rebases the row. A reviewed
Draft is a current Draft; no extra DB status or source snapshot table is added.

## Conflicts and uncertain outcomes

Source/version/UUID/unavailable failures use the existing safe Indonesian action
messages. Local edits and original expectations remain intact. Writes block until
Muat ulang data succeeds; dirty reload requires discard confirmation. No automatic
retry, newer-token substitution or last-write-wins merge is performed.

If the write succeeded but refetch failed, the editor shows:
`Tersimpan, data terbaru belum dapat dimuat.` Further writes remain blocked.
Thrown transport failures likewise require refetch before another write.

## RBAC

Operations-capable active super_admin/admin/staff can read/mutate. Editor and
customer cannot; inactive users cannot. Route, reader, action and RPC guards
remain authoritative. The browser never receives a service-role key.

## Verification commands

```powershell
node scripts/verify-product-translation-editor.cjs
node scripts/verify-product-translation-editor-browser.cjs
node scripts/verify-product-translation-foundation.cjs
node scripts/verify-rbac.cjs
npm run lint
npm run build
git diff --check
```

The first browser command runs actual UI components against isolated action/auth
fixtures in a separate headless Edge profile. It performs no database writes.

### Explicit live UI QA

With localhost:3000 running and the controlled visible Edge CDP endpoint on
127.0.0.1:19657, manually log in as an active Admin with maintenance capabilities.
The driver reuses the normal browser SDK/session and creates its own QA tabs.
It never exports cookies, passwords, JWTs or tokens and leaves the original
browser tab intact.

```powershell
node scripts/verify-product-translation-editor-browser.cjs --live
```

Only random IDs beginning `qa-translation-002-` generated by this invocation are
allowed. Both Product types are created via the actual Admin form, inactive/draft;
Komponen is also hidden from Store. A strictly allowlisted authenticated helper
sets source-only QA features/specs (including a text-classified spec) because 002
intentionally adds no classification control. All translation lifecycle writes
are performed through the actual UI/actions; cleanup uses guarded delete RPCs.

Tests cover create redirects, EN/ZH lifecycle, six-field preservation, technical
read-only/text values, stale source edit/review and real two-editor version/source/
UUID delete-recreate conflicts, narrow layout and keyboard/dark presentation.
Cleanup removes only owned translations and soft-archives only owned Products.
No canonical Product is physically deleted and no real sparepart is used.

Report: `%TEMP%\opencode\product-translation-002-live-report.json`.
If a live run fails, inspect its listed fixture IDs and cleanup result before
retrying. Never rerun the closed 001 live suite to test this UI.

## Known limits and future AI

- Buffers are local, not an autosave/offline store. Deliberate confirmed discard
  replaces the acted locale with current DB content.
- Native Back/Forward interception depends on browser Navigation API support;
  internal editor controls/links and hard unload retain their separate guards.
- There is no historical Indonesian snapshot to prove stale ordering. Review is
  explicit even when counts match; count changes require reconstruction.
- Publication records translation status only. It does not activate a Draft/
  inactive canonical Product or wire translations into public pages.
- A future optional AI task can populate `LocaleContent` and call the same Draft
  lifecycle. No AI button, provider dependency, secret or auto-publication exists.

Next task: PRODUCT-TRANSLATION-003 — Public B2B Product Consumption (not started).

## Observed 002 verification

- Model/reload/full-state/safety verifier: 58 passed.
- Actual-component browser fixtures: 30 passed (no DB writes).
- Foundation regression: 201 passed; closed 001 live suite not rerun.
- Existing RBAC verifier: 546 passed (isolated roles/auth/data).
- Production build/TypeScript and ESLint passed.
- Final live UI run: 46 assertions passed using a normal active Admin session.
  Both creates redirected to edit; EN/ZH lifecycle, canonical integrity, stale
  review and real source/version/UUID conflicts passed.
- All four Products created across the two live QA passes had their translations
  removed through guarded RPCs and were soft-archived. No physical Product deletion.
  A separate read-only authenticated lookup confirmed all four archived states,
  zero remaining translation rows and continued canonical Product existence.
  Latest run IDs: `qa-translation-002-b2b-fbb026bf-cc82-42ed-a0af-ae222fe13f04`
  and `qa-translation-002-component-2ccf4591-3b55-4c52-9ca2-ad4c451d5243`.

Live negative-role sessions were not created/altered. Their checks use isolated
fixtures and the existing RBAC regression; only the active Admin was exercised
against the live application.
