# PRODUCT-TRANSLATION-AUTO-001

> **SUPERSEDED** by [PRODUCT-TRANSLATION-AI-001](./PRODUCT-TRANSLATION-AI-001.md).
> The Google Cloud Translation approach (Cloud Translation v3 NMT, `google-auth-library`,
> `GOOGLE_CLOUD_TRANSLATION_*` env names, Google attribution UI) described here was never
> committed and has been fully replaced by the Gemini-based AI draft generation
> (`@google/genai`, existing `GEMINI_API_KEY`/`GEMINI_CHAT_MODEL`). Kept for history only;
> do not implement from this document.

## Purpose and domain

Optional **B2B-only** EN / Simplified Chinese machine-translation draft generation in
the existing Product Translation Editor. Indonesian persisted source → machine candidate
→ **human post-edit** → existing explicit Save Draft / Publish lifecycle.

There is no second editor, autosave, autopublish, database provenance, migration, public
renderer change, or Store localization. PRODUCT-TRANSLATION-004 is not part of this task.
Manual translation works without Google configuration, availability or quota.

## Provider and authentication

- Cloud Translation Advanced v3, explicitly standard NMT.
- `POST https://translate.googleapis.com/v3/projects/{project}/locations/global:translateText`.
- Model `projects/{project}/locations/global/models/general/nmt`.
- Source `id`; target mapping `en → en`, `zh-CN → zh-CN` (not URL prefix `zh-cn`).
- `mimeType: text/plain`, not HTML, rewriting, Translation LLM, Gemini or Vertex generative models.
- Native server-side fetch for translation; direct `google-auth-library@10.9.1` dependency
  for service-account OAuth and token caching. It was already locked transitively, but
  is now declared directly; package engine requires Node>=18, compatible with repo Node24.
- Server-only provider validates configuration lazily, scopes OAuth to Cloud Translation,
  permits no credential-defined endpoints/personal-ADC fallback, and reuses auth by a
  private in-memory credential fingerprint. Nothing is authenticated at build time.
- Configuration values and credential/token/auth-header/raw provider-error objects never
  enter client props, HTML, toast, action response or application log.

## Source allowlist and safety

The guarded action accepts ONLY `productId`, `locale`, `expectedSourceRevision`.
It requires active operations capability (super_admin/admin/staff), validates the input,
and reads a narrow persisted canonical source projection with the authenticated RLS client.
Draft/inactive saved B2B catalogue sources are allowed; archived/unavailable/non-B2B are not.
No unsaved ProductForm values, stored EN/ZH content or public fallback feed the provider.

Only name, description, each feature, spec labels, **text-classified** spec values, SEO
title and SEO description become ordered provider strings. IDs, slug, brand, category,
SKU, price, inventory, weight, Product Attributes, media/document URLs/files, hotspots,
customer/actor data, status and revision/path/index metadata do not.

Missing or invalid `value_kind` is technical. Technical values are never added to slots; their
translated label may change but candidate `value_text` stays NULL and UI stays read-only.
Technical tokens already within authorized prose are left to NMT/human review; no glossary,
masking, marketing enhancement or heuristic rewrite is introduced.

Literal URLs are rejected before any provider call, not stripped/replaced. The detector
matches scheme://, www., mailto addresses, tel numeric URIs and data URI comma forms.
Ordinary notation such as m/s, 12 V and chemical formulae is not rewritten. Source strings
are plain React text; no HTML translation/decoding/dangerouslySetInnerHTML is used.

## Deterministic mapping and bounds

Slots are ordered: name, description, features in source order, each spec label then its
eligible text value, SEO title, SEO description. Paths/indices remain local. Repeated text
is not deduplicated. Results correspond by batch/slot index regardless of completion order.
Blank optional fields are skipped and return NULL; source blank feature rows fail safely
because the existing feature payload requires nonempty text. No row is silently dropped.

| Bound | Value |
| --- | --- |
| Total input | 25,000 Unicode code points |
| Nonblank slots | 256 |
| Entries/batch | 128 |
| Normal packing target | 5,000 code points |
| Large description | One unsplit item/batch; source max20,000, provider max30,000 |
| Batches | 8 |
| Concurrent batches | 2 |
| Serialized provider request | 128 KiB |
| Generation deadline | 25 seconds (source reads, auth, translation, recheck) |
| Auth transport timeout | 5 seconds; retry disabled |
| Individual translation timeout | 8 seconds, also bounded by overall signal |
| Raw response | 512 KiB |

Current per-field limits stay name500, description20,000, feature2,000, spec label500 /
text value2,000, SEO500/2,000; final payload max262,144 bytes. Output overflow/incomplete
fields fail atomically, never truncate. No automatic paid translation retry.

## No-write and revision invariants

Generation never calls translation save/unpublish/delete, mutation RPC, recordAudit or
revalidation. Success/error events are **console-only** via sanitized logger calls.
No `product_translations` row, product field, version, publication status or DB audit row
is changed by generation. Only a typed local candidate is returned.

The server rejects a revision mismatch before provider and freshly reloads the source
after all provider results are valid. Revision changes/archive/type/unavailability discard
the entire candidate. No source read uses a cross-request cache. Identity is checked.

Client checks product/locale/revision, request token, selected-buffer epoch/anchor and mount.
Late, superseded, locally edited, source-refreshed or unmounted results cannot replace content.
Other locale edits remain intact. A later change after the final server read remains
possible; candidate is bound to revision N and the original optimistic save RPC remains
the final authority for source/translation-ID/version concurrency.

## Human post-edit policy

Successful candidate application deep-copies editable content and creates a deeply frozen
normalized `generatedCandidateSnapshot` on that locale. Source, persisted row identity,
version/status, baseline and concurrency expectations are retained.

Normalization compares only name/description/features/spec labels/text-kind value_text/SEO:
trim, blank nullable→NULL, array order retained, empty-block defaults unified, technical
value_text and row/revision/review/UI metadata ignored. Intermediate invalid text does not
throw during render; original save validation still rejects invalid content.

While normalized content equals the generated snapshot, **Draft and Publish are disabled**.
Independent dispatcher and `buildSaveInput()` guards also refuse untouched candidates.
One genuine normalized content change permits the original lifecycle rules; reverting to
the normalized machine snapshot locks both actions again. There is no one-way edited flag.
Whitespace/default changes, technical values or a review checkbox do not unlock persistence.

Stale generation realigns full structure but resets the stale human acknowledgement:
post-edit and stale structured review are separate requirements. No automatic rebase.
Published rows remain live/unchanged until an explicit post-edited save/publish.

This is an **existing-editor workflow guard**, not server-side forensic origin classification
for arbitrary manually supplied text. There is deliberately no persistent provenance or
new mutation contract; manually authored inputs keep their existing behavior.

## Confirmation, errors and navigation

Stored Draft/Published or dirty selected buffers require confirmation **before** provider.
Cancel preserves content/snapshot and makes no generation call. Only the selected locale
is replaced. Failures keep any previous candidate/snapshot exactly; errors are separate UI
state and do not block an ordinary manual draft/publish merely because Google failed.

Missing/ambiguous/malformed credentials, auth/quota/unavailability, timeout/abort, malformed
response, source/structure/size failures produce fixed safe Indonesian messages. Raw provider
messages/config/headers are not forwarded. A failed sibling batch cancels outstanding work;
no partial candidate is applied. Google may still count already-processed requests on failure.

Synchronous per-locale client guards and a process-local actor/product/locale in-flight set
prevent duplicate work. Existing fixed-window limiter allows6/user/10minutes across EN+ZH.
This resets on restart/is not shared by PM2 workers or serverless instances. Google project
character/day/minute quotas must be set by the operator for the approved spend ceiling;
the default daily quota is unlimited. No Redis/billing subsystem is added.

Fields stay visible, selected locale is temporarily guarded while generating, other locale
manual fields/actions remain usable subject to existing lifecycle busy state. Pending source
save/navigation is guarded. A generated snapshot is pending local work even if output equals
the persisted baseline. Confirmed selected reload discards it and restores stored state;
other locale is preserved. Untouched status alone does not disable Unpublish/Delete; normal
destructive confirmations still apply.

## Admin attribution and observability

Control: **Terjemahkan Otomatis**. Helper: “Membuat draf terjemahan otomatis dari konten
Indonesia tersimpan. Tinjau hasil sebelum menyimpan atau menerbitkan.” Untouched notice:
“Hasil terjemahan otomatis. Tinjau dan edit hasil sebelum menyimpan atau menerbitkan.”

Approved Powered by Google Translate graphic links to Google Translate adjacent to control /
candidate area. The unoptimized static graphic uses no-referrer policy and no API credential.
Provider branding guidelines: https://cloud.google.com/translate/attribution .
Cloud Translation is used only for drafts requiring human post-edit; no public renderer,
provenance column or public machine-translation markup is added in this release.

Logs may contain event, local Product ID, locale, source revision, planned input code-point /
batch counts, duration and sanitized category. They contain no source/translated prose,
private key, credential JSON, token, headers, raw Google Error or its config/stack. Counts
describe attempted generation, not authoritative billing; Google metrics remain billing evidence.

## Configuration and portable deployment

Server-only names:

```dotenv
GOOGLE_CLOUD_TRANSLATION_PROJECT_ID=
# Choose exactly one:
GOOGLE_CLOUD_TRANSLATION_CREDENTIALS_JSON=
# OR:
GOOGLE_APPLICATION_CREDENTIALS=
```

Enable Cloud Translation API and billing in the intended Google Cloud project. Use a
dedicated service account with Cloud Translation User role (or least-privilege custom
NMT-predict permission), not Owner/Editor/Admin. Credential `project_id` must match configured
project ID. No personal gcloud ADC fallback/CLI runtime requirement. Missing credential
returns “Layanan terjemahan otomatis belum dikonfigurasi.” Manual editing/build still work.

- **Local:** `.env.local`; prefer an external credential JSON file, absolute path (Windows
  forward slashes work), outside repo. JSON env is also supported. Never paste keys into chat.
- **Hostinger VPS PRIMARY production:** ordinary Linux Node24/Next server. Prefer protected
  `/etc/autentik/secrets/cloud-translation.json`, readable only by app user/group, e.g.0400
  owned by app user. Keep outside repo/web root. Set absolute `GOOGLE_APPLICATION_CREDENTIALS`
  and project ID in protected runtime environment. Permit outbound HTTPS/DNS to Google.
- **PM2/systemd:** use protected environment/EnvironmentFile or external secret path. Do not
  put JSON credentials in tracked ecosystem/service files. Reload processes with new env.
  Nginx must preserve normal Next Host/forwarded headers and use timeout above25s.
- **Docker:** runtime read-only secret mount, e.g. `/run/secrets/cloud-translation.json`.
  Set Google env at runtime, never build ARG/COPY. Existing image uses non-root UID1001:
  host file ownership/read permissions must allow that UID. `.env*` is already dockerignored;
  external credential file must not be in build context. Existing standalone Node server works.
- **Vercel TEMPORARY:** project ID plus JSON credential in normal server environment variables.
  Node runtime; no persistent file assumption/Edge/Vercel secret API dependency. Configure
  platform execution timeout to accommodate the bounded action and DB overhead.
- **Rotation:** install new secret, restart/redeploy (cached auth is process-local), verify
  harmless authorized QA translation, then revoke old key. Previously issued access tokens
  may outlive key revocation; do not assume deleting a key instantly invalidates every token.

## Verification and live provider QA

Routine verifiers use real domain/editor/action modules with isolated external boundaries;
provider tests stub auth/native fetch and inspect the actual v3 REST request. Browser fixture
runs the actual controller/editor with isolated server transport. No paid API is required.

```sh
node scripts/verify-product-translation-auto.cjs
node scripts/verify-product-translation-auto-browser.cjs
node scripts/verify-product-translation-auto.cjs --artifacts
node scripts/verify-product-translation-foundation.cjs
node scripts/verify-product-translation-editor.cjs
node scripts/verify-public-b2b-product-translations.cjs
node scripts/verify-komponen-save-navigation.cjs
node scripts/verify-rbac.cjs
npm run lint
npm run build
git diff --check
```

Verification evidence for review:
- Focused domain/provider/action: **134 PASS**; browser/controller fixture: **40 PASS**.
- Production client-artifact scan: **478 PASS including the134 focused assertions**;
  credential environment names and synthetic credential canaries absent from client JS.
- Translation001 foundation201, Translation002 model58/browser30, Translation003
  resolver/presentation134, Komponen save-navigation27, Admin RBAC546 all PASS.
- Production build/typecheck and full lint PASS without Google credentials.
- Fresh read-only production-code review found no actionable findings; it did not
  exercise a real provider/deployment. Old browser verifiers added only the new server
  transport mock boundary; their lifecycle/navigation assertions were retained.
- **NOT RUN — GOOGLE CREDENTIAL NOT CONFIGURED** for optional live Google QA.
  No paid translation, live Product/translation fixture, or DB mutation was performed.
- Dependency installation reported9 audit findings (8 high/1 critical). Lockfile changes
  only promote the already-installed10.9.1 auth library to a direct dependency; no unrelated
  dependency upgrade/audit-fix was attempted.

Optional live Google QA needs configured credentials **and explicit authorization**. Use
one owned hidden B2B Product: “Sensor suhu industri”; technical “Tegangan Kerja =12 V”;
text “Material =Baja tahan karat”. Generate EN/ZH once each, inspect slot exclusion and
candidate mapping, prove no translation row/version/timestamp change, then prove post-edit
required before an explicitly authorized save. Clean up only owned translation rows and
soft archive/preserve the owned canonical Product. Never use manually entered Product text
without approval, log a credential, or generate commerce/payment orders for this test.

## Limits and next task

No semantic/NLP post-edit test; a genuine normalized content difference is the policy.
No persistent machine provenance, server-side origin classification for arbitrary manual
input, glossary, translation memory, whole-catalog job, attributes/Store/hotspot/PDF translation,
public renderer changes, migration or distributed quotas. NMT/prose tokens need human review;
global endpoint does not promise processing residency in the VPS country.

Next task: **PRODUCT-TRANSLATION-004 — Marketplace Product Localization**. Not started.
No commit/push/deploy is part of this task; stop for review.
