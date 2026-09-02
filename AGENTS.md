<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: autentik-web

Situs company profile untuk **PT Autentik Karya Analitika** (produk industri/IoT Indonesia). Next.js 16.3.0, App Router, React 19, TypeScript strict, Tailwind CSS v4, default Turbopack.

## Perintah
- `npm run dev` / `npm run build` / `npm run start` — standar Next.js.
- `npm run lint` — menjalankan ESLint langsung (`eslint`). `next lint` **dihapus** di v16 dan `next build` tidak lagi menjalankan lint.
- `npm run seed:build` — meregenerasi `supabase/seed.sql` dari `lib/data/*` lewat `scripts/build-seed.ts` (butuh `tsx`, devDependency). Terapkan skema + seed di SQL editor Supabase.
- Tidak ada test runner; verifikasi dengan `npm run lint` + `npm run build` (build melakukan typecheck). Jalankan keduanya sebelum menyelesaikan sebuah perubahan.

## Env Variables
- `NEXT_PUBLIC_SUPABASE_URL` — URL project Supabase
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key (bukan service_role)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only, bypasses RLS; hanya dipakai di `utils/supabase/admin.ts`)
- `NEXT_PUBLIC_SITE_URL` — untuk metadataBase (default: `http://localhost:3000`)
- `GEMINI_API_KEY` — Google Gemini API key untuk chatbot AI (`/api/chat`)
- `MIDTRANS_SERVER_KEY` — Midtrans payment gateway server key (server-only)
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` — Midtrans payment gateway client key (public)
- `MIDTRANS_IS_PRODUCTION` — `"false"` untuk sandbox, `"true"` untuk production
- Semua di `.env.local` (sudah di-gitignore); tidak ada key yang di-commit. Lihat `.env.example` untuk template.

## Gotcha Next.js 16 di repo ini
- **API request async wajib**: `params`/`searchParams`/`cookies()`/`headers()` berupa Promise dan harus di-await. Halaman dinamis di sini sudah mengikuti `type Props = { params: Promise<{ slug: string }> }` lalu `const { slug } = await params` (mis. `app/(site)/products/[slug]/page.tsx`). Pertahankan pola itu.
- Turbopack adalah default untuk dev dan build; tidak perlu flag `--turbopack`. `next build` gagal jika ada webpack config — jangan menambahkannya.
- `revalidateTag` butuh argumen profil `cacheLife` kedua; API caching `unstable_*` kini stabil.
- `middleware` diganti nama jadi `proxy` — **dan memang dipakai di repo ini** (lihat "Autentikasi Admin & CMS" di bawah untuk fungsinya). Jangan anggap kodnya mati.
- **`proxy.ts`** = Supabase auth session refresh (bukan middleware biasa). Fungsi: `createClient(request)` → `supabase.auth.getUser()` → propagate cookies baru. Matcher: semua route kecuali static files (`_next/static`, `_next/image`, `favicon.ico`, `*.svg|png|jpg|jpeg|gif|webp`). Jangan modifikasi kecuali perlu ubah matcher/auth flow.
- Default `next/image` berubah (mis. `qualities` default `[75]`, `minimumCacheTTL` 86400 (24 jam), `remotePatterns` untuk Supabase storage).

## Status Architecture (PENTING)
Tabel `orders` punya **dua kolom status** yang berbeda fungsi — jangan campur aduk:

| Kolom | Fungsi | Nilai yang diizinkan |
|-------|--------|---------------------|
| `payment_status` | Status **pembayaran** (bayar belum?) | `pending`, `paid`, `failed`, `refunded` |
| `status` | Status **proses pesanan** (diproses kirim?) | `pending`, `processing`, `shipped`, `completed`, `cancelled` |

**Flow yang benar:**
```
Customer checkout
  → payment_status: "pending", status: "pending"

Midtrans webhook (settlement)
  → payment_status: "paid", status: "processing"

Admin kirim barang
  → status: "shipped"

Barang diterima
  → status: "completed"
```

**Gotcha:**
- **Jangan pernah set `status = "paid"`** — pembayaran diwakili oleh `payment_status: "paid"`. Nilai `"paid"` sudah dihapus dari CHECK constraint `orders_status_check` (migration `0028`).
- Webhook Midtrans (`app/api/webhooks/midtrans/route.ts`) langsung `.update()` ke tabel `orders` — set `payment_status: "paid"` + `status: "processing"`, bukan memanggil RPC.
- Dashboard queries (`lib/admin-data.ts`) memakai `payment_status` untuk filter "pending orders" dan "revenue", bukan `status`.
- Zod schema `ORDER_STATUSES` di `lib/validations/storeSchema.ts` hanya berisi `["pending", "processing", "shipped", "completed", "cancelled"]` — tidak ada `"paid"`.

## Real-Time Updates
Dua mekanisme untuk update otomatis di admin:

1. **SSE (Server-Sent Events)** — endpoint `app/api/orders/[code]/status/route.ts` polling DB setiap 2 detik. Dipakai di `components/admin/AdminOrderDetailClient.tsx` untuk halaman detail order. Auto-close saat `payment_status` mencapai terminal (`paid`/`completed`/`failed`).

2. **Supabase Realtime** — subscription langsung ke tabel `orders`:
   - `components/admin/OrdersListClient.tsx` — list orders auto-update saat ada perubahan.
   - `components/admin/RecentOrdersWidget.tsx` — widget "Pesanan Terbaru" di dashboard auto-update.
   - Realtime diaktifkan di migration `0026` untuk tabel `orders`.

## Konten & arsitektur
- **Sumber kebenaran konten situs publik kini Supabase** untuk halaman yang di-wire (katalog, store, careers, about, seksi home) — lihat "Wiring halaman publik → Supabase" di bawah. `lib/data/*.ts` tetap dipakai sebagai **fallback statis** saat query Supabase error dan untuk konten yang memang statis (`solutions`, `team`, `faq`, konteks AI). Tambahkan produk/karir baru via CMS admin, bukan langsung ke file data.
- **Company profile `/about` kini dua mode**: `components/ui/CompanyProfileViewer.tsx` (komponen client, framer-motion) menampilkan **render PDF per-halaman via `pdfjs-dist`** (slide kiri/kanan ala PPT: panah, keyboard, thumbnail strip, fullscreen — di-lazy-load hanya saat manifest ada), atau **fallback slideshow hardcoded lama** (`TOTAL_SLIDES` = 40, `/images/compro/slide-{n}.jpg`, `COMPRO-AKA-2026.pdf`) bila manifest kosong. CTA download di seksi "Profil Perusahaan" `app/(site)/about/page.tsx`.
- **Manifest company profile disimpan di `site_settings` (key `compro`)** — tanpa migrasi baru (tabel + RLS `settings_public_select` anon baca sudah ada). Skema di `lib/validations/comproSchema.ts`, diatur lewat section admin `/admin/compro` (`components/admin/ComproForm.tsx` + `lib/actions/compro.ts`), dibaca server-side di halaman `/about` (pakai `cookies()` → halaman jadi dynamic) dengan fallback ke nilai hardcoded bila kosong/error. Upload PDF (maks **50MB**) memakai bucket `media` (pola `ProductForm` / `0004_media_storage_policies.sql`) ke path `compro/<timestamp>-<name>.pdf`.
- **UI copy, pesan error, dan respons API dalam Bahasa Indonesia** (`lang="id"`). Jaga copy baru dalam bahasa Indonesia.
- Halaman adalah Server Components secara default; tambahkan `"use client"` hanya untuk interaktivitas (seksi home, tampilan contact/careers, form, GSAP).
- Aset gambar ada di `public/images/` (subfolder brand/product/partner); URL gambar produk direferensikan dari `lib/data/products.ts`.

### Wiring halaman publik → Supabase
Situs publik **sudah membaca dari Supabase** lewat `lib/public-data.ts` (lapisan baca server-only — pakai `cookies()`, jadi halaman pemakainya dynamic; **jangan import ke komponen client**):
- `/products` & `/store` — sudah wired lebih dulu (fungsi di `lib/admin-data.ts` + `dynamic = "force-dynamic"`). Store memakai sidebar filter (`components/store/StoreFilterSidebar.tsx`) + card compact (`components/store/StoreProductCard.tsx`).
- `/careers` (route karir; **bukan `/news` lagi**) — list + detail baca tabel `careers` (status `open`), fallback ke `lib/data/careers.ts` bila query error. Tombol "Lamar Posisi Ini" memakai `getRecruitmentUrl()` (`lib/public-data.ts`) yang membaca `site_settings` key `recruitment` (value `{ url }`); bila kosong tombol jadi disabled. URL diatur admin lewat `components/admin/RecruitmentForm.tsx` di `/admin/karir` (aksi `lib/actions/recruitment.ts`).
- `/about` — company profile manifest (`site_settings` key `compro`, fallback viewer hardcoded) + Grup Kami (`group_companies`) + Partner Kami (`partners`) + Tim Kami (`team_members`).
- Seksi home — **Brands** (`brands`) & **HomeCareers** (`careers`), fetch server-side di `app/(site)/page.tsx` lalu di-pass sebagai props ke komponen client.
- **SearchModal** — query anon client-side (browser Supabase client) utk produk b2b `published`+`is_active` dan karir `open`; RLS menegakkan filter publik.
- **Sisa statis**: `solutions` (`lib/data/solutions.ts`), konteks AI (`lib/ai/*`), Hero home (sengaja hardcoded). `industries.ts` & `projects.ts` **sudah dihapus** (dead code). `lib/data/news.ts` **tetap dipertahankan** meski halaman `/news` sudah tidak ada — dipakai `scripts/build-seed.ts` untuk seed tabel `articles` (dormant); jangan hapus. `lib/data/team.ts` tetap dipertahankan sebagai fallback statis untuk Tim Kami.
- Pola: fungsi di `lib/public-data.ts` beri fallback ke array statis `lib/data/*` bila Supabase error; katalog/karir/home memakai `export const dynamic = "force-dynamic"`.

### Customer Auth & E-Commerce Flow
Sistem autentikasi customer terpisah dari admin, mengalir dari store → auth → checkout → order:

- **Auth routes**: `app/(site)/auth/login/` + `app/(site)/auth/register/` (komponen client: `LoginForm.tsx`, `RegisterForm.tsx` — react-hook-form + zod + Supabase client auth). Skema di `lib/validations/authSchema.ts`. Default `role='customer'` (migration `0025`).
- **`CustomerAuthGuard`** (`components/auth/CustomerAuthGuard.tsx`) — client guard, cek session Supabase. Tampilkan spinner lalu redirect ke `/auth/login?redirect=...` jika belum login. Dipakai di halaman checkout, order history, dll.
- **`CustomerAuthButton`** (`components/auth/CustomerAuthButton.tsx`) — tombol profil customer di navbar. Desktop: dropdown dengan nama user, Wishlist (dengan badge count), Riwayat Pesanan, Dashboard Admin (jika admin), Keluar. Mobile: variant button di MobileMenu.
- **Cart system**: `CartProvider` (`components/cart/CartProvider.tsx`) — localStorage-backed (key `autentik-cart:v1`). Hanya produk `ready_stock`. Hook `useCart()` → `addItem/removeItem/updateQty/clearCart`. `AddToCartButton` punya 2 variant: `"detail"` (qty stepper + tombol + opsi buy now) dan `"card"` (tombol compact satu baris).
- **Checkout flow**: `/store/checkout` → `CheckoutClient.tsx` (react-hook-form, alamat, estimasi ongkir via `estimate_shipping_cost` RPC, metode bayar Midtrans). Submit ke `submitCheckout()` (`lib/actions/checkout.ts`) → redirect ke Midtrans Snap. Order snapshot disimpan di sessionStorage (`lib/order-snapshot.ts`).
- **Order confirmation**: `/store/orders/[code]` → `OrderConfirmationClient.tsx` — lookup pakai **admin client** (`createAdminClient()`) untuk reliable lookup (bypass RLS). SSE live updates. Dual CTA: "Bayar Sekarang" (jika unpaid) atau "Lihat Riwayat".
- **Order history**: `/store/orders` → `OrderHistoryList.tsx` — fetch orders berdasarkan `user_id = auth.uid()`. Status badge, payment status, link ke detail.
- **Wishlist**: `useWishlist` hook (`components/store/useWishlist.ts`) — localStorage-backed (key `autentik-wishlist:v1`, max 100 items). `WishlistButton` punya 3 variant: `"card"` (absolute position), `"detail"` (inline), `"bar"` (untuk StickyMobileBar). Toggle di card, detail, dan MobileMenu.
- **Recently viewed**: `useRecentlyViewed` hook (`components/store/useRecentlyViewed.ts`) — localStorage-backed (key `autentik-recently-viewed:v1`, max 8 items). `RecentlyViewed` component: horizontal scroll strip. `RelatedProducts` component: 4-card grid berdasarkan brand/kategori.

### Store UI (JakartaNotebook Style)
Desain store mengikuti gaya JakartaNotebook: dense, hard-edge, minimal white space, font padat.

- **Design tokens**: `rounded-sm`/`rounded` (bukan `rounded-2xl`), padding `p-2`–`p-2.5`, contrast border tinggi, pricing warna merah `text-red-600`.
- **StoreProductDetail** (`components/store/StoreProductDetail.tsx`) — komponen utama halaman detail produk. Sidebar purchase sticky, image gallery, tabs (deskripsi/spesifikasi), dual CTA (Beli Langsung solid + Keranjang outline). Handle `handleBuyNow` auth-aware: `addItem()` sebelum auth check.
- **StoreProductCard** (`components/store/StoreProductCard.tsx`) — card dense, CTA solid teal `bg-[#0EA5E9]`, wishlist heart `absolute bottom-1.5 right-1.5`.
- **StickyMobileBar** (`components/store/StickyMobileBar.tsx`) — fixed bottom bar (`lg:hidden`, `z-40`). Price + dominant CTA + WA icon + share icon + wishlist icon. `pb-20 lg:pb-0` content offset.
- **ShareProductButton** (`components/store/ShareProductButton.tsx`) — Web Share API + clipboard fallback, feedback "Tersalin!".
- **CopyLinkButton** (`components/store/CopyLinkButton.tsx`) — clipboard copy, desktop only.
- **ProductImageGallery** (`components/store/ProductImageGallery.tsx`) — multi-image dengan thumbnail strip.
- **StoreSearchBar** (`components/store/StoreSearchBar.tsx`) — autosuggest debounced 250ms, max 6, keyboard navigable, URL sync.
- **CategoryToolbar** (`components/store/CategoryToolbar.tsx`) — horizontal scrollable brand pills, auto-scroll dengan chevron buttons.
- **StoreTrustStrip** (`components/store/StoreTrustStrip.tsx`) — 4 trust badges (100% Original, Garansi Toko, Ready Stock, Pengiriman Cepat).
- **StorePromoBanner** (`components/store/StorePromoBanner.tsx`) — 3-column promo grid.

## Styling & design system
- Tailwind v4 CSS-first config: `@import "tailwindcss"` + token `@theme` di `app/globals.css` (palet navy/teal). **Tidak ada file `tailwind.config.*`.**
- Dark mode adalah kelas `.dark` khusus di `<html>` lewat `components/ThemeProvider.tsx` (key localStorage `autentik-theme`), bukan varian `dark:` Tailwind. Komponen memakai variabel CSS semantik (mis. `style={{ color: "var(--text-primary)" }}`) dari blok `:root`/`.dark` di `globals.css`; warna brand dari `lib/design-tokens.ts` (kelas badge/pill).
- `cn()` di `lib/utils.ts` hanya penggabung kelas sederhana — tanpa clsx/tailwind-merge.
- Ikon: `lucide-react`. Animasi scroll: GSAP `ScrollTrigger` via `components/ui/ScrollAnimations.tsx` (`AnimatedElement`, `type="fade-up" | "stagger"`); `framer-motion` juga tersedia.

## Form & route API
- **Form publik** (contact form, login) memakai react-hook-form + `@hookform/resolvers` + **zod v4**; skema ada di `lib/validations/*.ts` dan dibagi antara form client dengan server handler.
- **Zod v4**: `z.enum(arr, { errorMap })` **tidak valid** — argumen kedua untuk enum adalah string message, bukan `errorMap`: `z.enum(careerTypes, "Tipe pekerjaan tidak valid")` (contoh `lib/validations/careerSchema.ts`).
- **Form admin** (mis. `ProductForm` di `/admin/produk`, `/admin/sparepart`) **tidak** memakai react-hook-form. Mereka memakai `useState` lokal untuk state field dan memanggil server action langsung saat submit. Ikuti pola ini untuk form admin baru — jangan perkenalkan react-hook-form ke `app/admin/`.
- **Upload gambar admin**: `ProductForm` meng-upload gambar client-side lewat browser Supabase client (`utils/supabase/client.ts`) ke bucket publik `media` (policy RLS `storage.objects` khusus staf di `0004_media_storage_policies.sql`) lalu menyimpan URL publik hasilnya di `products.image_url`. Tidak ada field input URL.
- **Linking produk → merek**: `products.brand` tetap **teks bebas** (tidak pernah dipaksa jadi FK). `products.brand_id` (FK opsional → `brands.id`, on delete set null) diisi bila admin memilih merek dari dropdown `ProductForm` (prop `brands` dari `listBrands()`); opsi **"Merek lain… (tulis manual)"** ada sengaja untuk kasus di luar daftar merek (sparepart generik, brand belum terdaftar) → `brand_id` NULL, bukan bug. Saat simpan `lib/actions/products.ts` men-derive `brand_id` otomatis (case-insensitive) bila teks brand cocok dengan merek terdaftar. Filter publik (`/products`, `/store`, `SearchModal`, marquee home) **tetap berbasis string `products.brand`**, TIDAK memakai `brand_id` — mengubahnya ke berbasis `brand_id` bukan perilaku saat ini.
- `app/api/contact` memvalidasi dengan zod `safeParse` lalu memasukkan submission ke tabel `contact_messages` (anon insert via RLS) — muncul di `/admin/inquiry`. Jaga bentuk respons `{ success, message, errors? }`.
- **Order snapshot**: `lib/order-snapshot.ts` menyimpan snapshot order di sessionStorage setelah checkout. Dipakai di halaman konfirmasi publik `/store/orders/[code]` (bukan DB).

## Data admin & pola server action
- **`lib/admin-data.ts`** adalah lapisan data server-only (memakai `cookies()`) untuk membaca data admin (statistik dashboard, orders, inquiries, dsb). **Jangan pernah import ke komponen client** — batasan sama seperti `lib/admin.ts` di bawah, tapi yang ini untuk fetch data, bukan auth.
- **Server actions** (`lib/actions/*`) mengikuti bentuk konsisten:
  - Kembalikan `ActionResult`: `{ success: boolean; message: string; errors?: ... }`.
  - Mulai dengan guard `getAdminUser()` — tolak jika tidak ada sesi admin/editor valid sebelum melakukan apa pun.
  - Panggil `recordAudit()` untuk aksi yang sebaiknya terlacak (membuat/mengedit/menghapus produk, mengganti status order, dsb.) — ini menulis ke audit log yang dibaca `/admin/riwayat`.
  - Panggil `revalidatePath()` setelah mutasi sukses agar list admin yang relevan render ulang dengan data segar.
  - Server action baru harus mengikuti bentuk ini, bukan menciptakan tipe return baru.

## UI admin
- Primitif UI admin bersama (button, input, badge, table shell, dsb.) ada di `components/admin/ui.tsx` — gunakan kembali ini, bukan menulis markup mentah untuk layar admin baru.
- Aksi admin client yang menampilkan feedback sukses/error bergantung pada `ToastProvider`, yang di-mount sekali di layout dashboard (`app/admin/(dashboard)/layout.tsx`). Jangan mount `ToastProvider` kedua di dalam halaman/komponen admin.

## Autentikasi Admin & CMS (Supabase)
- **Tombol login** di navbar/menu mobile adalah `components/auth/AdminNavButton.tsx` (client): "Masuk" → `/admin/login`, berubah jadi "Admin" + logout saat signed in.
- **Routes**: `app/admin/login` (login publik) dan `app/admin/(dashboard)/*` (ter-guard). `app/admin/(dashboard)/layout.tsx` memanggil `getAdminUser()`; jika gagal `redirect("/admin/login")`.
- **Status section**: `BUILT_SECTION_KEYS` di `lib/admin-sections.ts` = tepat **14 section keys** yang sudah dibangun: produk, **compro**, sparepart, stok, orders, inquiry, lead, **rfq**, integrasi, akses-staff, riwayat, **karir**, **merek**, **relasi** (dashboard adalah `/admin`, bukan key section). Section compro, karir, merek, relasi, rfq punya route sendiri (`/admin/compro`, `/admin/karir`, `/admin/merek`, `/admin/relasi`, `/admin/rfq`). **Semua section sudah dibangun** — tidak ada lagi placeholder; route catch-all `app/admin/(dashboard)/[section]/` memanggil `notFound()` untuk key apa pun yang ada di `BUILT_SECTION_KEYS` (key yang sudah dibangun ada di folder route sendiri, bukan di catch-all). Cek `BUILT_SECTION_KEYS` sebelum berasumsi sebuah halaman section ada.
- **`lib/admin.ts`** = server-only; `getAdminUser()` (react `cache`) memvalidasi sesi via `auth.getUser()` lalu memuat baris `profiles` (self-select RLS) dan membutuhkan `role in ('admin','editor')` + `is_active`. **Jangan import ke komponen client** — ia menarik `next/headers`. Data/tipe murni bersama ada di `lib/admin-sections.ts` (re-export dari `lib/admin.ts`; import dari `admin-sections` di kode client, mis. `components/admin/AdminShell.tsx`).
- `lib/admin-sections.ts` mengekspor `ADMIN_SECTIONS` (link/meta section) dan `AdminUser`. Ikon section: `components/admin/sectionIcons.ts`.
- Skema dibagi dalam migrasi berurutan, diterapkan berurutan di SQL editor Supabase — kini **`0001_schema.sql` … `0029_order_user_id.sql`**:
  - `0001_schema.sql` — skema dasar; trigger `profiles` awalnya membuat `role='editor'` saat signup (diubah `0015` menjadi `'viewer'`).
  - `0002_store_orders.sql` — menambah tabel `orders`, `order_items`, `whatsapp_leads`, plus kolom e-commerce (price, stock, weight, dsb.) di `products`.
  - `0007_chat_rate_limit.sql` — rate-limit chatbot AI (tabel `ai_chat_sessions`, RPC `track_chat_message`) untuk `/api/chat`.
  - `0008`–`0010` — bekas sistem live chat CS custom (`chat_conversations`, `chat_messages`, RPC `start_chat_conversation`/`get_chat_history`/`send_chat_message`, `broadcast_token`, realtime). **Sudah dihapus oleh `0013_remove_chat_cs.sql`** (tabel + RPC + publication di-drop) karena live chat digantikan link WhatsApp +62 821-3738-4029; jangan pakai ulang objek-objek itu.
  - `0014_link_products_brand.sql` — backfill `products.brand_id` (FK → `brands.id`, on delete set null) untuk produk yang `brand_id is null` dan `lower(brands.name) = lower(products.brand)`, plus index `idx_products_brand_id`.
  - `0015_profiles_role_viewer.sql` — akun baru tidak lagi otomatis staf: default `role='viewer'` (non-privileged) menggantikan `'editor'` saat signup; `is_staff()`/`is_admin()` tidak berubah. REVOKE execute `handle_new_user()` dari public/anon/authenticated sengaja ditunda (defense-in-depth).
  - `0016_whatsapp_setting.sql` — nomor WhatsApp publik jadi **satu sumber di `site_settings` key `whatsapp`** (`{"number":"6282137384029"}`); memperketat `settings_public_select` dari `using (true)` menjadi allowlist `('recruitment','compro','whatsapp')`; membersihkan dummy `6281234567890` di seed key `contact`/`socials`.
  - `0017_shipping_cost.sql` — kalkulator ongkir internal (Jalur A, tabel tarif): tabel `shipping_zones` (provinsi/kota) + `shipping_rates` (rentang berat gram × ongkir), RLS staff-all + public-select zona aktif, RPC baru `estimate_shipping_cost(jsonb, jsonb)` (SECURITY DEFINER) = **satu sumber logika ongkir**; `create_checkout_order` di-recreate memakainya untuk isi `shipping_cost`/`total`. Master switch = `site_settings` key `store` → `enableShipping` (false → ongkir 0, perilaku lama). Zona tak cocok → 0; berat melebihi band terakhir → cost band terakhir. Admin kelola di `/admin/integrasi` (bagian "Tarif Ongkir"), koreksi manual via `OrderStatusForm` di detail order.
  - `0018_order_cancel_restock.sql` — restore stok otomatis saat order di-cancel: RPC `cancel_order(uuid, text)` (SECURITY DEFINER, authenticated + guard `is_staff()`) men-transisi status → `cancelled` **dan** mengembalikan `products.stock` dari `order_items` secara **atomik** (row lock order + produk dalam 1 transaksi). Guard anti double-restore: status lama sudah `cancelled` → no-op (return false). Dipanggil `updateOrderStatus` hanya saat status baru `cancelled`; audit terpisah `order.stock_restored`; revalidate `/admin/stok`. Tanpa logika simetris re-decrement saat order di-restore dari cancelled (dikoreksi manual via `/admin/stok`).
  - `0019_order_delete.sql` — hapus permanen pesanan: RPC `delete_order(uuid)` (SECURITY DEFINER, authenticated + guard `is_staff()`) **hanya** untuk pesanan berstatus `cancelled` (menjamin stok sudah dikembalikan oleh `cancel_order`); row lock order, `delete` order → `order_items` ikut via cascade, order tak ditemukan → no-op (return false). Dipanggil `deleteOrder` (`lib/actions/store.ts`) dari tombol "Hapus Pesanan" di detail order (`components/admin/OrderDeleteButton.tsx`, zona berbahaya, status ≠ cancelled ditolak dgn pesan); audit `order.deleted`; revalidate `/admin/orders`.
  - `0020_bank_account_setting.sql` — pengaturan rekening bank (site_settings).
  - `0021_b2b_rfq_and_technical_docs.sql` — tabel RFQ (Request for Quotation) B2B + dokumen teknis produk; section admin `/admin/rfq` dengan list/detail view (`RfqListClient.tsx`, `RfqDetailClient.tsx`).
  - `0022_soft_delete_and_security.sql` — soft-delete pada `orders`, `products`, `quotation_requests`, `careers`; RPC `soft_delete_order(text, uuid, text)` dan `restore_order(text, uuid)`; RLS policy updates untuk exclude `deleted_at IS NULL`; indexes pada `orders.deleted_at` dan `products.deleted_at`.
  - `0023_rfq_rate_limit.sql` — rate-limit RFQ publik (anti-spam): tabel `rfq_rate_limits`, RPC `track_rfq_submission(text, int, int)` (SECURITY DEFINER, 3 submission per jam per sesi); diakses via `/api/rfq` (cookie httpOnly `autentik-rfq-session`, pola identik `/api/chat`).
  - `0025_customer_auth.sql` — autentikasi customer (login/register). Default `role='customer'` untuk akun baru. RLS policy untuk customer melihat own orders.
  - `0026_midtrans_migration.sql` — migrasi dari Xendit ke Midtrans: tambah kolom `midtrans_order_id`, `midtrans_redirect_url`, `paid_at` di `orders`; RPC `handle_midtrans_notification` (SECURITY DEFINER); enable Supabase Realtime untuk tabel `orders`.
  - `0028_fix_orders_status_constraint.sql` — fix CHECK constraint `orders_status_check`: hapus `'paid'` (redundan dengan `payment_status`), tambah `'processing'` untuk flow Midtrans webhook.
  - `0029_order_user_id.sql` — tambah kolom `user_id uuid REFERENCES auth.users(id)` ke `orders` untuk link order ke akun customer. Update `create_checkout_order` RPC untuk capture `auth.uid()`. Index `idx_orders_user_id`. Update RLS policy `orders_select_own` filter by `user_id = auth.uid()`. Drop redundant `orders_staff_select`.
- **Nomor WhatsApp publik — satu sumber kebenaran**: `site_settings` key `whatsapp` dibaca server-side via `getWhatsAppNumber()` (`lib/public-data.ts`, memakai `cookies()` → halaman pemakainya dynamic) dan client-side via browser Supabase client di `components/chatbot/FaqWidget.tsx` (fetch sekali saat mount, tombol disabled sampai terisi). UI link/tombol WA memakai `components/ui/WhatsAppButton.tsx` (client dumb, props `number` + `label?`/`message?`/`variant?: "link"|"button"`/`className?`/`id?`; disabled saat `number` null). **Ganti nomor = `UPDATE site_settings` key `whatsapp`** (belum ada form admin) — jangan hardcode di komponen. `lib/whatsapp.ts` (konstanta lama) sudah dihapus; tidak ada dua sumber.
- **Chatbot AI (Gemini)** tetap dipakai penuh: `components/chatbot/FaqWidget.tsx` hanya mode AI (`/api/chat`, rate-limit `ai_chat_sessions`), dengan tombol "Hubungi via WhatsApp" ke nomor dari `site_settings` key `whatsapp` sebagai fallback kontak. Tidak ada live chat CS/Tawk lagi.
- Promosikan admin pertama di SQL editor Supabase:
  ```sql
  update public.profiles set role = 'admin' where email = 'your@email.com';
  ```
- **Gotcha PostgREST**: jika sebuah halaman tampil kosong tepat setelah migrasi membuat/mengubah tabel, cache skema PostgREST mungkin usang — jalankan `NOTIFY pgrst, 'reload schema';` di SQL editor.
- Env Supabase: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local`. Client: `utils/supabase/client.ts` (browser) / `utils/supabase/server.ts` (RSC) / `utils/supabase/middleware.ts`; refresh sesi di-wire lewat `proxy.ts`. Tidak ada key yang di-commit.

## How to
- **Tambah admin section baru** → load skill `admin-crud-pattern`
- **Tambah/ubah migration SQL** → load skill `supabase-migration-safety`
- **Tambah/ubah UI** → load skill `no-ai-slop-design`
- **Selesai task** → load skill `verification-before-done` (tampilkan full lint output, full SQL block, jangan auto-commit)

## Directory structure
- `app/(site)/` — halaman publik: home, about, products, store (listing, detail, cart, checkout, orders), careers, contact, services, custom-request, auth (login, register)
- `app/admin/(dashboard)/` — 14 admin sections (orders, sparepart, stok, produk, compro, merek, karir, relasi, inquiry, lead, rfq, akses-staff, integrasi, riwayat)
- `app/api/` — API routes: chat (Gemini), contact, newsletter, orders SSE, rfq, webhooks midtrans
- `components/admin/` — komponen admin UI (reuse primitives dari `ui.tsx`); termasuk `AdminOrderDetailClient.tsx` (SSE real-time), `OrdersListClient.tsx` (Supabase Realtime), `RecentOrdersWidget.tsx` (dashboard widget real-time)
- `components/auth/` — `AdminNavButton` (admin login/logout), `CustomerAuthButton` (customer profile dropdown + wishlist badge), `CustomerAuthGuard` (session check + redirect)
- `components/cart/` — `CartProvider` (localStorage cart context), `AddToCartButton` (2 variant: card/detail), `CartClient` (cart page UI)
- `components/checkout/` — `CheckoutClient` (checkout form + submit + Midtrans redirect)
- `components/orders/` — `OrderConfirmationClient` (confirmation + SSE), `PrintCustomerInvoice` (printable invoice)
- `components/store/` — 17 komponen store: `StoreFilterSidebar`, `StoreProductCard`, `StoreProductDetail`, `StickyMobileBar`, `ShareProductButton`, `CopyLinkButton`, `WishlistButton`, `RelatedProducts`, `RecentlyViewed`, `ProductImageGallery`, `StoreSearchBar`, `CategoryToolbar`, `StoreTrustStrip`, `StorePromoBanner`, `OrderHistoryList`, `useWishlist`, `useRecentlyViewed`
- `components/ui/` — komponen publik bersama (Button, Badge, SectionHeading, WhatsAppButton, CompanyProfileViewer, ScrollAnimations)
- `components/product/` — komponen produk (Product3DViewer, ProductMediaTabs, RfqButton/Modal, TechnicalDocsSection, GatedDownloadModal)
- `components/home/` — seksi home (Hero, AboutUs, Brands, FeaturedProducts, CoreSolutions, CompanyStats, CtaBanner, HomeCareers, WhyChooseUs, ScrollAnimations)
- `components/careers/`, `components/requests/` — komponen karir & custom request
- `components/seo/` — `JsonLd` (structured data)
- `components/chatbot/` — `FaqWidget` (AI chatbot + WhatsApp fallback)
- `lib/actions/` — 12 server action files (brands, careers, checkout, compro, products, recruitment, relasi, rfq, settings, shipping, store, technicalDocuments)
- `lib/validations/` — 13 Zod schemas (auth, brand, career, chat, compro, contact, login, product, recruitment, relasi, rfq, shipping, store)
- `lib/data/` — static fallback data: brands, careers, faq, groups, news, partners, products, solutions, team (jangan hapus meski sudah di-wire ke Supabase)
- `lib/format.ts` — `formatRupiah()` currency formatter
- `lib/midtrans.ts` — Midtrans Snap client wrapper (`createMidtransTransaction`)
- `lib/logger.ts` — structured logging (`logError`, `logAudit`)
- `supabase/migrations/` — 27 SQL migrations (0001–0029, gaps: 0024, 0027); file baru lanjut `0030_`
- `utils/supabase/` — client (browser), server (RSC), middleware (proxy)
- `.agents/skills/` — 6 custom skills (admin-crud-pattern, no-ai-slop-design, supabase, supabase-migration-safety, supabase-postgres-best-practices, verification-before-done)

## Runtime testing
- Tampilkan full lint output, bukan summary
- Untuk SQL migration: tampilkan full `CREATE FUNCTION ... $$ ... $$` block
- Setelah edit, re-read file untuk pastikan tidak ada stale duplicate
- Migrasi belum "done" sampai dijalankan di SQL editor
- Jangan auto-commit; tunggu approval

## Skill custom project
Skill proyek ada di `.agents/skills/` (ter-daftar via `opencode.json` → `skills.paths: [".agents/skills"]`, di-scan rekursif untuk `**/SKILL.md`): `admin-crud-pattern`, `no-ai-slop-design`, `supabase`, `supabase-migration-safety`, `supabase-postgres-best-practices`, `verification-before-done`. Load skill relevan sebelum menulis kode (isi penuh via tool `skill`). Skill baru = folder `.agents/skills/<nama>/SKILL.md`, frontmatter `name` (wajib, = nama folder) + `description` (wajib).
