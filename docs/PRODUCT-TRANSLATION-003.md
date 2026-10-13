# PRODUCT-TRANSLATION-003 — Public B2B Product Consumption

## Scope

001/002 and the Komponen first-save navigation hotfix are closed prerequisites.
003 connects public B2B presentation to their approved resolver. No migration,
RPC/RLS/grant change, AI, Product Attributes or Marketplace localization is added.

## Pipeline and canonical identity

`Canonical ProductRow[] → readPublicProductTranslations →
resolveLocalizedProductContent → narrow public DTO`.

`lib/public-b2b-products.ts` is a server boundary using the normal publishable,
cookie-aware client. It does not import a management reader or use service_role.
Raw rows and resolved content remain separate; no translated object is spread
onto a canonical row.

`lib/public-product-presentation.ts` projects only fields needed by each surface:

- Catalogue: canonical ID/slug/brand/category/media and canonical name/description
  for matching/RFQ; separate display name/description/specifications.
- Home: canonical ID/slug/brand/category/media; separate display name/description.
- Search: canonical ID/slug/brand/category/matching text; separate display text.

Public client DTOs contain no translation UUID/version/status/revision, management
rows, price/stock configuration or raw source blocks. SKU/price/stock/fulfillment,
brand/category identity, media and integrations remain source-owned.

## Eligibility and fallback

ID always uses source and performs no translation read. EN/ZH load only their
requested locale. The existing reader/resolver is the only eligibility logic:
published/current/structurally valid row, matching Product/locale, and eligible
published/active/nondeleted parent.

Missing, Draft, stale, malformed, foreign or failed reads fall back to the entire
canonical source representation. Valid optional scalar NULL values fall back to
their corresponding source fields. NULL features/specs use their entire source
block. Non-NULL specs use the existing resolver's label/text fallback; technical
values always come from source, including missing value_kind (technical).

## Batch and request memoization

IDs are deduplicated. Translation batches cap at 100 Products and approximately
6000 encoded ID-query characters; large lists produce batch queries, never one
query per Product. Empty lists/ID requests make no translation queries.

The detail loader uses React `cache` with primitive `(slug, locale)` arguments,
so metadata/page share a snapshot within one request. There is no cross-request
TTL or global Product cache. Existing public source query membership/order remains.

## Public surfaces

- Home resolves a union of configured featured Products and model-bearing
  catalogue Products once, then reuses it for Hero/Featured/3D teaser. Selection
  order, canonical links/media/brands and company fallback slides stay unchanged.
- Catalogue resolves before projection; filtering and sorting use canonical
  fields, while cards/spec previews/alt text use display fields.
- Detail uses the shared loader for name/description/features/specs and metadata.
  Media, hotspot and document lookups still use canonical Product ID.
- There is no B2B related section. Store related lookup/rendering is unchanged
  and remains a 004 concern.

## Search

`GET /api/products/search?locale=id|en|zh-CN` is a public read-only boundary with
private/no-store responses. It explicitly selects published, active, nondeleted
B2B Products, resolves one locale, and returns narrow search DTOs.

SearchModal loads one index on opening, not on keystrokes. Matching remains literal
case-insensitive canonical name/description/brand/category matching with the old
five-result limit/order. Display strings may be localized. Content remounts on
opening/locale, and obsolete requests are aborted/ignored. Failed loading cannot
keep a previous locale's results. Translated-text/specification search/indexing
is not implemented.

## Product shell and shared viewer

`messages/{id,en,zh-CN}/products.json` supplies catalogue/detail/media/document UI,
metadata, pagination, empty-state and accessibility labels. The public root still
ships common/navigation only; Product pages ship their scoped leaves.

Brand/category CMS values, technical units, hotspot contents and document
titles/bodies are not translated. Product3DViewer receives optional labels from
its public caller and retains Indonesian defaults with no next-intl hook, so the
Admin viewer and its editing behavior remain unchanged.

The existing separately guarded technical-document metadata path on detail still
uses a server admin client and sanitizes into public document DTOs. That path is
not reused for Product/translation reads and its download/gating contract is
unchanged; only its public shell/form feedback is localized.

## SEO and JSON-LD

Resolved explicit SEO values take priority, including corresponding source
fallbacks. If explicit SEO is absent, existing templates use resolved display
name/description. `publicMetadata` preserves canonical locale URLs, hreflang,
x-default, OG locale/URL and canonical slug. Sitemap is unchanged.

B2B productSchema accepts only optional display name/description. SKU, brand,
category, media and URL identity remain canonical. No offers/price/availability
are invented. Store productOfferSchema is unchanged. JsonLd retains `<` encoding
and is tested with hostile `</script>` text.

## RFQ

RfqButton/RfqModal have an optional displayName for the visible heading. Payload
productId/productName are always canonical props; displayName is not serialized.
The backend contract, limiter and authoritative WhatsApp response remain intact.
Live QA intercepts only its owned Product's RFQ POST to check this boundary without
creating RFQ submissions or sending messages.

## Invalidation

`lib/product-public-revalidation.ts` invalidates B2B Home/catalogue/detail route
destinations across `/id`, `/en`, `/zh-CN`, including old/new slugs. Visible Chinese
URLs remain `/zh-cn`.

Canonical source save invalidates immediately after the primary successful write,
including paths that subsequently return child-save warnings. Archive/restore use
returned canonical type/slug to invalidate B2B paths. Existing persistence, audit,
permissions, Store behavior and Admin navigation are preserved. Translation
actions already invalidate their own locale and are unchanged.

Immediate fallback means the next fresh request/render. Already-open DOM/index
snapshots need reopen/reload/navigation; no realtime synchronization is added.

## Verification

```powershell
node scripts/verify-public-b2b-product-translations.cjs
node scripts/verify-public-b2b-product-translations-browser.cjs
node scripts/verify-public-b2b-product-translations-browser.cjs --live
```

Default browser mode uses actual public components in an isolated loopback host
with only backend/Next boundaries mocked. It covers Home Hero/Featured/3D,
catalogue, canonical matching, localized presentation, RFQ payloads, narrow layouts,
failed/obsolete locale loads, and Published/Draft/stale source fallback.

Live mode requires localhost:3000 and a controlled visible Edge on CDP 19657 with a
normal manually signed-in active Admin. It opens dedicated QA tabs and generates
only its own `qa-public-b2b-003-` ID. Normal authenticated SDK setup supplies only
owned source blocks/SEO/public image; lifecycle/review uses the existing 002 UI.
No cookies, credentials, JWTs or storage are exported. Shared Home selection is
never modified: Home visual verification uses isolated fixtures and real DTOs.

Live cleanup uses guarded translation deletion, verifies zero active children,
soft-archives the Product, and rereads archive/canonical existence. No physical
Product deletion or real sparepart modification occurs.

Report: `%TEMP%\opencode\public-b2b-003-live-report.json`.

Observed: focused checks 134 passed; actual public component browser checks 123
passed; live checks 278 passed with ID/EN/ZH desktop/narrow detail/catalogue/search,
SEO/JSON-LD, technical/text specs, anonymous DTO/HTML exposure, canonical RFQ,
unpublish/source-stale fallback and existing Admin re-review restoration. The final
owned Product was archived with zero translations and zero active children.
A separate authenticated read-only audit confirmed cleanup/canonical existence
for all five Products created during live-driver development and the final run.
Public i18n foundation/company regressions passed 611/1049 checks; the marketing/
RFQ regression passed 987 checks, and normal-dev RFQ entry smoke passed 34.
Foundation/editor/RBAC regressions passed 201/58/546, and the unchanged Komponen
navigation verifier passed 27. A scoped read-only final review found no blocker.

## Limits and next task

- Canonical-only search/sorting is explicit; translated-text indexing is separate.
- No B2B related section is created, and Store localization remains 004 scope.
- Children retain canonical content even when the Product shell is translated.
- Existing public lists retain the Supabase source page limit; batching solves
  translation URL/N+1 behavior, not a new catalogue pagination architecture.
- No runtime machine translation or cross-request caching architecture.

Next requested task: PRODUCT-ATTRIBUTES-001 (minimum purchase quantity, unit,
length/width/height, dimension unit/note). It has not been started.
