# CAREERS-AKA-001 — Scope publik lowongan AKA

## Identitas dan enforcement

Production recruitment API: `https://recruitment.tekna.id/api/v1` (konfigurasi existing `MIKA_API_BASE_URL`). Identitas perusahaan terverifikasi: **company ID numerik 2**, nama **PT Autentik Karya Analitika**. Company ID berbeda dari job ID; lowongan lain AKA tetap diterima walaupun job ID bukan 2.

`lib/api/mika-career.ts` memegang typed constant private server-owned `AKA_RECRUITMENT_COMPANY_ID=2`. Tidak ada konfigurasi runtime baru, prefix `NEXT_PUBLIC`, field CMS, atau override visitor. Semua fetch listing, snapshot, discovery options dan pagination membangun URL sendiri dengan `company_id=2`; upstream `links` tidak diikuti.

Sebelum normalisasi/serialization, ownership wajib `company.id === 2` (angka, bukan string), dan nama perusahaan harus cocok secara exact setelah trim/collapse whitespace/uppercase. Pemeriksaan nama hanya konsistensi payload, **bukan fallback** untuk company ID yang hilang. Company missing/malformed/foreign ditolak. Normalisasi membentuk DTO field-by-field; unknown fields atau nested foreign jobs tidak ikut tersebar melalui object spread.

## Availability

Public job diterima hanya jika ketiganya benar:

```text
status === "Open"
deadline_info.is_active === true
deadline_info.is_expired === false
```

Selain itu payload display divalidasi (ID, title, company/department, salary, quota, deadline/badge, optional fields). Status lain, fields missing atau boolean malformed tidak diekspos. Deadline hanya divalidasi formatnya/diformat untuk display; aplikasi tidak menghitung ulang expiration dari jam browser. API tetap pemilik keputusan availability.

## Pagination, freshness dan batas

Listing/detail mempertahankan `next.revalidate=60`; listing timeout 4 detik, detail timeout 8 detik. Proxy/browser memakai `no-store`, tanpa polling; search debounce 280 ms. Cache request listing mencakup company ID dan visitor filters yang diizinkan.

Pagination normal memakai scope upstream. Bila perlu traversal beberapa halaman, atau defensive filtering membuang rows, server merekonsiliasi snapshot sebelum pagination untuk menjaga total/page counts. Snapshot dibatasi **20 halaman × 50 rows**, seluruh request tetap scoped. Setiap raw row harus memiliki ID valid; duplicate dicek sebelum insertion ke `Set`, termasuk dalam satu page, antar-page, serta alias numerik seperti `1`/`"01"`. Raw unique IDs dan accumulated row count wajib sama dengan `total_items`, sebelum filter ownership/availability. Tidak ada silent deduplication. Payload/meta invalid, short/empty page yang tidak sesuai total, impossible progression, batas terlampaui, perubahan total selama traversal, atau satu page gagal menghasilkan unavailable/null, bukan partial sitemap. Snapshot ini bukan fetch semua perusahaan; backend tetap selalu diminta scope AKA, kemudian divalidasi ulang.

## Public surfaces dan fallback

- `/careers`, proxy, homepage: shared API reader yang sama.
- Detail numeric job, metadata dan JobPosting JSON-LD: guarded fetcher yang sama. Foreign/nonnumeric/unavailable job tidak memakai legacy slug fallback. Foreign atau ownership/availability uncertain -> not found; upstream failure -> unavailable.
- Setelah approval tambahan untuk guard routing, `proxy.ts` menjalankan guard sempit `lib/api/career-routing.ts` hanya untuk GET/HEAD `/careers/{id}`. Known foreign/closed/missing ID mendapat HTTP 404 sebelum HTML streaming, tanpa JobPosting dan dengan noindex. Logika refresh sesi existing tetap berjalan lebih dahulu, cookie response dipertahankan, matcher/role rules tidak diubah. API unavailable diteruskan ke state unavailable existing. Fetch detail memakai React request memoization antara metadata/content; TTL upstream tetap 60 detik. Proxy preflight dapat menambah satu GET upstream per detail request; tidak ada polling atau global metadata configuration change.
- Related jobs: ownership/availability guard yang sama; department tidak dianggap company identity.
- SearchModal: careers dicari melalui scoped server proxy; product query existing tetap terpisah. API gagal -> career suggestions dihilangkan.
- Sitemap: hanya snapshot job detail AKA terverifikasi. Satu page gagal -> seluruh dynamic Careers entries dihilangkan; static `/careers` dan entry produk existing tetap ada.
- Supabase `careers`, admin CRUD dan seed tetap disimpan. Data legacy tidak punya provenance/identity/deadline yang cukup, sehingga **tidak menjadi public fallback**. Admin copy kini menjelaskan bahwa data tersebut arsip lokal.

API success empty menampilkan "Saat ini belum ada lowongan yang tersedia di PT Autentik Karya Analitika." API unavailable memakai pesan berbeda. Browser filter gagal menghapus cards sebelumnya dan menampilkan unavailable, sehingga data terakhir tidak tampak sebagai lowongan yang masih bisa dilamar; tidak ada legacy resurrection.

## Apply

Card -> `/careers/{job.id}` -> preview AKA -> `apply_url` API. **Satu policy** `lib/recruitment-url.ts` memvalidasi API URL, input CMS, stored-setting read, dan final detail link: absolute HTTPS, tanpa username/password, exact `URL.origin === "https://recruitment.tekna.id"`. Origin ini fixed dan tidak mengikuti override browser/CMS/API-base environment. HTTP, foreign origin, lookalike hostname dan credential URL ditolak. URL unsafe/malformed/foreign dihapus dari DTO. Fallback: API valid -> setting valid -> `/contact`; legacy stored settings yang off-origin tidak dipakai meskipun sebelumnya berhasil disimpan. Tidak ada form aplikasi baru di AKA. Copy sidebar tidak lagi mengklaim `mikacares.co.id`.

## Description security

Tidak ada sanitizer HTML vetted di dependency proyek. Fallback yang dipilih adalah **konversi ke plain text di lapisan DTO**: `lib/html-to-plain-text.ts` mem-parse description API dengan parser yang sudah tersedia (`next/dist/compiled/node-html-parser`, milik Next.js; dependency baru tidak ditambahkan), membuang elemen non-render (script/style/iframe/object/embed/svg/math/head/…), membaca hanya text node (atribut tidak pernah dibaca), mem-decode entity satu kali, lalu `normalizeMikaJob` menyimpan hasilnya sebagai `description`. Hasil akhir dirender sebagai React text child, tidak melalui `dangerouslySetInnerHTML`: tag `p`/list/`a` tidak pernah menjadi DOM, hanya teksnya. Paragraph/list dipisah line break (`whitespace-pre-line`); teks biasa yang mengandung `<` (mis. `gaji < 10 juta`) dan `&amp;amp;` tetap utuh. Tidak ada regex HTML sanitizer atau dependency baru. Teks anchor tetap tampil tetapi href/tab-nya tidak ikut; rich-text formatting tidak dipertahankan. Mengaktifkan formatting kembali hanya boleh melalui sanitizer allowlist yang benar dan review terpisah. Card preview memakai description DTO yang sama, bukan HTML sink. Field `responsibilities`/`requirements`/`benefits` saat ini tidak dikirim upstream; kalau nanti berisi HTML, konversi yang sama harus diterapkan untuk mereka.

Serializer JSON-LD juga meng-encode `<` sebagai JSON unicode escape `\u003c`, sehingga description (plain text hasil konversi) tidak bisa menutup blok `<script type="application/ld+json">`. JSON hasil parsing tetap mempertahankan nilai aslinya; encoding konteks script ini bukan parsing/sanitization HTML dengan regex.

## Verification

```powershell
node scripts/verify-aka-careers.cjs
npx tsx scripts/verify-mika-career-detail.ts
npx tsx scripts/verify-mika-logo-url.ts
npx tsc --noEmit
npm run lint
$env:NEXT_PUBLIC_SITE_URL='https://example.com'; npm run build
node scripts/verify-aka-careers-ui.cjs
git diff --check
git status --short
```

Functional harness mengeksekusi source TS API/server reader/proxy/page/metadata/sitemap aktual, dengan upstream/Supabase transport diisolasi. Browser memakai CSS build dan komponen aktual pada 375/768/1366/1440: one/multiple/empty/unavailable/detail, homepage states, serta SearchModal melalui proxy server aktual dengan upstream mock. Ini bukan test aplikasi rekrutmen atau submission ke backend.

Known boundaries: snapshot maksimal 1.000 upstream rows; expired/closed status hanya mengikuti fields API; department options halaman listing berasal dari halaman awal seperti sebelumnya. Legacy public slug tidak dipublikasikan lagi. Runtime deployment/Recruitment API smoke tetap diperlukan setelah review/deploy yang disetujui.
