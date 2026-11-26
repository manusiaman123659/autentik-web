# Supabase Migration Ledger — autentik-web

Dokumen ini menjadi acuan status penerapan migrasi SQL di `supabase/migrations/` antara environment **Lokal/Dev** dan **Production**.

> **Aturan wajib**:
> - Jangan pernah mengedit file migrasi yang sudah diterapkan — selalu buat file migrasi baru.
> - Setelah menjalankan migrasi yang mengubah tabel, kolom, RLS, atau RPC di Supabase SQL Editor, pastikan `NOTIFY pgrst, 'reload schema';` ikut tereksekusi.

---

## Ringkasan Baseline

| Rentang Migrasi | Cakupan Utama | Status Baseline |
|---|---|---|
| `0001` – `0023` | Skema dasar CMS, Store/Orders, Media storage, Checkout RPC, Ongkir, Cancel/Delete order, RFQ, Dokumen teknis, Soft-delete dasar | Live |
| `0025` – `0038` | Customer Auth, Midtrans + Realtime, Dual-status order, `product_variants`, `product_hotspots`, RPC grant hardening | Live |
| `0040` – `0057` | Home hero, Distributor entities, Checkout/Auth/Shipping hardening, `product_photo_hotspots`, Variant-aware cancel, `ON DELETE RESTRICT` order integrity (`0052`), Private technical documents (`0057`) | Live |

---

## Migrasi Tahap Lanjut & Status Apply (Perlu Diverifikasi per Environment)

| File Migrasi | Ringkasan Perubahan | Prasyarat / Env | Dev / Lokal | Production |
|---|---|---|---|---|
| `0058_restrict_whatsapp_leads_public_insert.sql` | Mencabut direct INSERT publik pada `whatsapp_leads` | — | [ ] Verifikasi | [ ] Verifikasi |
| `0059_midtrans_initialization_recovery.sql` | Recovery state inisialisasi Midtrans | — | [ ] Verifikasi | [ ] Verifikasi |
| `0060_checkout_idempotency.sql` | Idempotency key untuk checkout order | — | [ ] Verifikasi | [ ] Verifikasi |
| `0061_rbac_roles.sql` | RBAC 5-role (`super_admin`, `admin`, `staff`, `editor`, `customer`), `has_cms_capability()`, wrapper `rbac_internal` | Tidak boleh ada akun `role = 'viewer'` | [ ] Verifikasi | [ ] Verifikasi |
| `0062_staff_access_management.sql` | Manajemen akses staff oleh `super_admin` | Setelah `0061` | [ ] Verifikasi | [ ] Verifikasi |
| `0063_order_tracking_hardening.sql` | Hardening tracking order | — | [ ] Verifikasi | [ ] Verifikasi |
| `0064_retire_legacy_order_fulfillment.sql` | Pensiun alur fulfillment lama | — | [ ] Verifikasi | [ ] Verifikasi |
| `0065_research_portfolios.sql` | Tabel `research_portfolios` (`/admin/portfolio`) | — | [ ] Verifikasi | [ ] Verifikasi |
| `0066_product_translation_foundation.sql` | Fondasi terjemahan produk B2B (`product_translations`) | — | [ ] Verifikasi | [ ] Verifikasi |
| `0067_product_translation_conflict_sqlstates.sql` | SQLSTATE konflik terjemahan produk | Setelah `0066` | [ ] Verifikasi | [ ] Verifikasi |
| `0068_product_attributes.sql` | Atribut tambahan produk Komponen | — | [ ] Verifikasi | [ ] Verifikasi |
| `0069_store_localization_search.sql` | RPC pencarian lokal store `search_store_products_v1` | Aktifkan `STORE_SEARCH_RPC_ENABLED=true` hanya setelah diterapkan & diverifikasi | [ ] Verifikasi | [ ] Verifikasi |
| `0070_truncate_privilege_hardening.sql` | `REVOKE TRUNCATE` dari `anon` & `authenticated` | — | [ ] Verifikasi | [ ] Verifikasi |
| `0071_company_contact_settings.sql` | Pengaturan kontak perusahaan privat & arsip WhatsApp | — | [ ] Verifikasi | [ ] Verifikasi |
| `20261109120000_customer_password_recovery.sql` | Tabel & RPC atomic claim `customer_password_recovery` | Butuh `CUSTOMER_RECOVERY_TOKEN_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | [ ] Verifikasi | [ ] Verifikasi |
| `20261126090000_product_lifecycle.sql` | Soft delete 2-tahap (`ACTIVE → ARCHIVED → TRASHED`) untuk B2B & Komponen, RPC `transition_product_lifecycle`, pemulihan Sampah khusus `super_admin`, proteksi RLS anak | Setelah `0061` (`has_cms_capability`) | [ ] Verifikasi | [ ] Verifikasi |

---

## Quick Check SQL (Jalankan di Supabase SQL Editor)

Untuk mengecek cepat apakah migrasi kritis terbaru sudah aktif di database target:

```sql
-- 1. Cek kolom & RPC Product Lifecycle (20261126090000)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name IN ('deleted_at', 'trashed_at', 'lifecycle_version');

SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'has_cms_capability',
    'transition_product_lifecycle',
    'search_store_products_v1',
    'issue_customer_password_recovery'
  );
```
