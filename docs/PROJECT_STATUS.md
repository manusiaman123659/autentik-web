# AKA Website — Current Project Status

Last updated: 17 September 2026

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict
- Tailwind CSS
- Supabase
- Midtrans

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
- Komponen/commerce support → PPIC AKA.
- RFQ tetap disimpan di AKA.

### MIKA
Menangani:
- penjualan produk
- sparepart
- custom/customization
- distributor inquiry
- RFQ commercial follow-up

Jangan hardcode nomor WhatsApp.
Gunakan communication resolver existing.

## Completed

- Task 1 Store terminology → Komponen
- Task 2 COD removal for new orders
- Task 3 Product/Store boundary
- Task 4 WhatsApp communication routing
- Task 5 Manufacturer homepage
- Task 5.1 Homepage polish
- Task 5.2 RFQ portal/modal fix
- Task 6 Distributor/Sub-distributor network
- Task 7 Research & Partnership
- Navbar redesign
- Task 8A Auth & Checkout Security Hardening

## Distributor

Public:
- /distributors

Admin:
- /admin/relasi → Jaringan Distribusi

Verified initial entities:
- PT Mitra Karya Analitika
- CV Agra Prima Indonesia

Do not classify Agra as sub-distributor without new evidence.

## Research & Partnership

Public:
- /research-partnership

Verified collaboration only.
Trademark certificates are Trademark / Sertifikat Merek,
NOT patents.

## Auth

public.profiles roles currently include:
- customer
- admin
- editor
- legacy viewer may exist

New public signup must be customer.

Customer must never automatically become staff.

Admin/staff:
- admin
- editor

## Payment

Customer checkout:
- Midtrans only

New orders:
- payment_method = midtrans

Legacy:
- COD / transfer records may remain readable

Do not remove backward compatibility unless explicitly approved.

Midtrans credentials:
- ENV only
- never store secrets in CMS

## Database Migrations Applied Manually

Applied through:
- 0042_distribution_entities.sql
- 0043_auth_checkout_hardening.sql

IMPORTANT:
Do not infer live DB migration status only from repository files.
This section is the current manual deployment record.

## Current Verification

Latest milestone:
- npm run lint: PASS
- npm run build: PASS
- git diff --check: PASS

## Current Next Work

Task 8B:
Hero Homepage + Payment Admin Cleanup.

After that:
Task 8C:
Shipping Safety Core.

Task 8D:
Shipping Admin UX + Uji Tarif.

Task 8E:
Google OAuth Customer Login.

Task 8F:
Real shipping zones/rates after business approval from Pak Aang.

## Shipping Business Rule

Manual shipping rates.

Target model:
Zone + Region + Weight Range + Rate.

Shipping must FAIL CLOSED.

Never interpret:
- missing zone
- missing rate
- invalid weight
- RPC error
- cost = 0

as free shipping.

Unconfigured shipping:
block checkout before Midtrans and route customer to PPIC AKA.

## Agent Safety Rules

- Repository source code is source of truth for implementation.
- This document is orientation/business/deployment context.
- If this document conflicts with current source code, report the conflict.
- Do not guess missing database state.
- Do not invent business data.
- Do not edit unrelated features.
- No automatic migration apply.
- No automatic commit.