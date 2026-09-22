# AKA Website — Current Project Status

Last updated: 21 September 2026

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict
- Tailwind CSS
- Supabase / PostgreSQL
- Midtrans

---

## Business Source of Truth

AKA = manufacturer.

### AKA

- Product showcase untuk produk manufaktur.
- Lima brand utama:
  - TALPHA
  - AUTENTIK
  - CYLAB
  - ULLUN
  - EPAL
- Marketplace AKA hanya menjual KOMPONEN.
- Internal discriminator komponen tetap dapat menggunakan:
  - `product_type = "sparepart"`
- Komponen/commerce support → PPIC AKA.
- RFQ tetap disimpan di AKA.
- Produk manufaktur dapat memiliki:
  - galeri foto
  - 3D model
  - 3D hotspot
  - Photo Hotspot / hotspot pada gambar

### MIKA

Menangani:
- penjualan produk
- sparepart
- custom/customization
- distributor inquiry
- RFQ commercial follow-up

Jangan hardcode nomor WhatsApp.

Gunakan communication resolver existing.

---

# Completed

- Task 1 — Store terminology → Komponen
- Task 2 — COD removal for new orders
- Task 3 — Product / Store boundary
- Task 4 — WhatsApp communication routing
- Task 5 — Manufacturer homepage
- Task 5.1 — Homepage polish
- Task 5.2 — RFQ portal/modal fix
- Task 6 — Distributor / Sub-distributor network
- Task 7 — Research & Partnership
- Navbar redesign
- Task 8A — Auth & Checkout Security Hardening
- Task 8B — Hero Homepage + Payment Admin Cleanup
- Task 8C — Shipping Safety Core
- Task 8D — Shipping Admin UX + Uji Tarif
- Task 9B-A — AKA → MIKA Product Sync API v1 (full reconciliation, zero migration)
- Interactive Photo Hotspot system
- Photo Hotspot light/dark mode polish
- Photo Hotspot callout responsive positioning
- Photo Hotspot image `object-contain` fix

---

# Distributor

Public:
- `/distributors`

Admin:
- `/admin/relasi`
- menu: Jaringan Distribusi

Verified initial entities:
- PT Mitra Karya Analitika
- CV Agra Prima Indonesia

Do not classify CV Agra Prima Indonesia as sub-distributor without new evidence.

Customer routing to distributor/sub-distributor tetap dikendalikan melalui MIKA.

---

# Research & Partnership

Public:
- `/research-partnership`

Gunakan verified collaboration only.

Verified collaboration yang digunakan:
- BBSPJPPI Semarang
- Teknologi Pertanian UNAND
- Teknik Mesin UNAND

Trademark certificates:
- TALPHA
- ePal
- CYLAB
- ULLUN

Harus disebut:
- Trademark
- Sertifikat Merek

NOT:
- Patent / Paten

Jangan membuat data partnership, research, IP, atau patent yang belum diverifikasi.

---

# Product Media

## 3D Product

Produk manufaktur dapat memiliki:
- `.glb`
- orbit / rotate / zoom
- hotspot 3D
- title
- description

3D hanya untuk produk jadi/manufaktur yang memang memiliki asset.

Tidak wajib untuk komponen Store.

## Photo Hotspot

Photo Hotspot merupakan sistem terpisah dari 3D hotspot.

Public behavior:
- hotspot ditampilkan pada gambar produk
- posisi memakai koordinat persentase relatif terhadap actual rendered image
- click hotspot → floating information card
- card memiliki:
  - title
  - image
  - description

Admin:
- hotspot dapat ditambahkan ke gambar produk tertentu
- target image menggunakan URL gambar, bukan index gallery
- reorder gallery tidak mengubah target hotspot
- jika gambar target dihapus:
  - hotspot tidak otomatis dihapus
  - admin melihat orphan state
  - public menyembunyikan orphan hotspot

Callout image:
- menggunakan `object-contain`
- tidak boleh crop image yang diupload

Photo Hotspot hanya untuk:
- `product_type = "b2b_system"`

Migration:
- `0046_product_photo_hotspots.sql`

Status:
- applied / live
- RLS dan RPC sudah diverifikasi

---

# AKA → MIKA Product Sync API

Server-to-server endpoints:

- `GET /api/integrations/mika/v1/products`
- `GET /api/integrations/mika/v1/products/[id]`
- `GET /api/integrations/mika/v1/brands`

Authentication:

- bearer secret dari `MIKA_INTEGRATION_SECRET`
- server-only, tidak disimpan di CMS dan tidak dikirim ke browser
- MIKA tidak mendapat service-role key, password database, atau akun admin AKA

Scope produk:

- hanya `product_type = 'b2b_system'`
- hanya brand `talpha`, `autentik`, `cylab`, `ullun`, `epal`
- free-text brand hanya menjadi fallback bila `brand_id IS NULL`
- Store Komponen, Mytekna, harga, stok, marketplace SKU, fulfillment commerce, dan varian tidak disinkronkan

Status:

- active bila published + active + tidak soft-deleted
- draft/inactive/soft-deleted dikirim sebagai tombstone minimal
- hard-deleted dideteksi melalui full snapshot reconciliation

Reconciliation contract:

1. MIKA memulai satu sync run.
2. Ambil halaman pertama dan upsert berdasarkan `aka_product_id`.
3. Pertahankan seluruh field komersial milik MIKA.
4. Ikuti `next_cursor` sampai `has_more=false`.
5. Hanya setelah semua halaman berhasil, tandai ID AKA lama yang tidak terlihat sebagai inactive.
6. Jika satu halaman gagal, jangan menjalankan missing-row deactivation.

API v1 sengaja tidak menyediakan delta timestamp karena lifecycle timestamp/delete produk belum cukup andal. Migration Task 9B-A: **0**.

---

# Auth

`public.profiles` roles currently include:
- customer
- admin
- editor
- legacy viewer may exist

New public signup:
- MUST become `customer`

Customer:
- must never automatically become staff

Staff:
- admin
- editor

Customer redirect:
- hanya boleh menuju route customer Store yang aman
- tidak boleh redirect ke admin/external URL

Checkout:
- wajib menggunakan authenticated user
- ownership order harus diverifikasi server-side

---

# Payment

Customer checkout:
- Midtrans only

New orders:
- `payment_method = "midtrans"`
- `payment_status = "pending"` saat dibuat

Disabled for new orders:
- COD
- manual bank transfer
- admin manual order creation

Legacy:
- COD / transfer records may remain readable

Do not remove legacy compatibility unless explicitly approved.

Midtrans credentials:
- ENV only
- never store secret/server key in CMS
- admin integration UI hanya status/read-only configuration information

`payment_status`:
- source of truth untuk status pembayaran

`orders.status`:
- fulfillment / order progress

Financial order fields menjadi immutable setelah payment intent dimulai / payment tidak lagi pending.

Protected fields:
- subtotal
- shipping_cost
- total
- shipping_total_weight_g
- shipping_zone_id
- shipping_rate_id

---

# Shipping Architecture

Shipping menggunakan tarif internal/manual.

Tidak menggunakan:
- JNE realtime API
- J&T realtime API
- third-party courier rate API

Target model:

`Zone + Region + Weight Range + Rate`

Tables:
- `shipping_zones`
- `shipping_zone_regions`
- `shipping_rates`

## Region Model

`shipping_zone_regions`

Mode:

### Province-wide

```text
province = "Jawa Tengah"
city = NULL
