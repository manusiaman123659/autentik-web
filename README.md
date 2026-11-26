# autentik-web — PT Autentik Karya Analitika

Situs company profile, katalog produk B2B, marketplace **Komponen** (`/store`), dan **Autentik CMS** (`/admin`) untuk **PT Autentik Karya Analitika** (produsen perangkat industri & IoT Indonesia).

## Tech Stack

- **Framework**: Next.js `16.4.6` (App Router, Turbopack), React 19, TypeScript strict
- **Styling & UI**: Tailwind CSS v4 (CSS-first, `app/globals.css`), `lucide-react`, `framer-motion`, GSAP, Three.js (`@react-three/fiber` / `drei`), `pdfjs-dist`
- **Internasionalisasi (i18n)**: `next-intl` — locale `id` (default, tanpa prefix), `en` (`/en`), dan `zh-CN` (`/zh-cn`)
- **Backend & Database**: Supabase (PostgreSQL, Auth, RLS, Storage bucket `media` & `technical-documents`, Realtime)
- **Integrasi**: Midtrans Snap (checkout Komponen), Google Gemini AI (`/api/chat`), MIKA Careers API, MIKA Product Sync API v1 (`/api/integrations/mika/v1/*`), Resend (customer password recovery)

## Memulai di Lokal

1. **Install dependensi**:
   ```bash
   npm ci
   ```
2. **Siapkan environment variables**:
   Salin `.env.example` menjadi `.env.local` lalu isi kredensial Supabase (dan layanan opsional lain sesuai kebutuhan):
   ```bash
   cp .env.example .env.local
   ```
   > **Catatan build produksi**: `NEXT_PUBLIC_SITE_URL` wajib origin HTTPS publik yang valid saat `NODE_ENV=production` (contoh: `https://autentik.co.id`).
3. **Jalankan server development**:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`.

## Perintah Utama

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server development Next.js (Turbopack) |
| `npm run lint` | Menjalankan ESLint langsung (`next lint` dihapus di Next.js 16) |
| `npm run build` | Build produksi + TypeScript typecheck |
| `npm run start` | Menjalankan hasil build produksi |
| `npm run seed:build` | Regenerasi `supabase/seed.sql` dari `lib/data/*` |

## Struktur Direktori Utama

- `app/(public)/[locale]/(site)/` — Halaman publik multi-bahasa (home, about, products, store, careers, distributors, research-partnership, contact, auth)
- `app/admin/(dashboard)/` — 16 section Admin CMS dengan RBAC 5-role (`super_admin`, `admin`, `staff`, `editor`, `customer`)
- `app/api/` — Route handler API (chat AI, contact, RFQ, orders SSE, Midtrans webhook, MIKA Sync v1, auth recovery)
- `components/` — Komponen UI publik & admin (primitif admin bersama di `components/admin/ui.tsx`)
- `lib/` — Data layer server-only, server actions (`lib/actions/`), validasi Zod v4 (`lib/validations/`), helper lifecycle & RBAC
- `i18n/` & `messages/` — Konfigurasi locale `next-intl` dan kamus terjemahan (`id`, `en`, `zh-CN`)
- `supabase/migrations/` — Migrasi SQL berurutan (lihat [docs/MIGRATION-LEDGER.md](docs/MIGRATION-LEDGER.md))

## Migrasi Database & Deployment

- Semua perubahan skema berada di `supabase/migrations/` dan diterapkan di Supabase SQL Editor secara berurutan. Rujuk [docs/MIGRATION-LEDGER.md](docs/MIGRATION-LEDGER.md) untuk status migrasi terbaru.
- Panduan teknis dan konvensi repo lengkap tersedia di [AGENTS.md](AGENTS.md).
- Konvensi remote Git:
  - `origin` (`https://github.com/manusiaman123659/autentik-web.git`) — repositori pribadi / pengembangan lokal.
  - `magang-origin` (`https://github.com/Magang-Tekan/Autentik-Company-Profile-V2.git`) — repositori production (`autentik.co.id`, dilengkapi CI/CD `.github/workflows/deploy.yml`).
