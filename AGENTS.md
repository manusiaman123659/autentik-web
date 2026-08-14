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

## Gotcha Next.js 16 di repo ini
- **API request async wajib**: `params`/`searchParams`/`cookies()`/`headers()` berupa Promise dan harus di-await. Halaman dinamis di sini sudah mengikuti `type Props = { params: Promise<{ slug: string }> }` lalu `const { slug } = await params` (mis. `app/(site)/katalog-produk/[slug]/page.tsx`). Pertahankan pola itu.
- Turbopack adalah default untuk dev dan build; tidak perlu flag `--turbopack`. `next build` gagal jika ada webpack config — jangan menambahkannya.
- `revalidateTag` butuh argumen profil `cacheLife` kedua; API caching `unstable_*` kini stabil.
- `middleware` diganti nama jadi `proxy` — **dan memang dipakai di repo ini** (lihat "Autentikasi Admin & CMS" di bawah untuk fungsinya). Jangan anggap kodnya mati.
- Default `next/image` berubah (mis. `qualities` default `[75]`, `minimumCacheTTL` 4 jam).

## Konten & arsitektur
- **Sumber kebenaran konten situs publik kini Supabase** untuk halaman yang di-wire (katalog, store, careers, about, seksi home) — lihat "Wiring halaman publik → Supabase" di bawah. `lib/data/*.ts` tetap dipakai sebagai **fallback statis** saat query Supabase error dan untuk konten yang memang statis (`solutions`, `team`, `faq`, konteks AI). Tambahkan produk/karir baru via CMS admin, bukan langsung ke file data.
- **Company profile `/about` kini dua mode**: `components/ui/CompanyProfileViewer.tsx` (komponen client, framer-motion) menampilkan **render PDF per-halaman via `pdfjs-dist`** (slide kiri/kanan ala PPT: panah, keyboard, thumbnail strip, fullscreen — di-lazy-load hanya saat manifest ada), atau **fallback slideshow hardcoded lama** (`TOTAL_SLIDES` = 40, `/images/compro/slide-{n}.jpg`, `COMPRO-AKA-2026.pdf`) bila manifest kosong. CTA download di seksi "Profil Perusahaan" `app/(site)/about/page.tsx`.
- **Manifest company profile disimpan di `site_settings` (key `compro`)** — tanpa migrasi baru (tabel + RLS `settings_public_select` anon baca sudah ada). Skema di `lib/validations/comproSchema.ts`, diatur lewat section admin `/admin/compro` (`components/admin/ComproForm.tsx` + `lib/actions/compro.ts`), dibaca server-side di halaman `/about` (pakai `cookies()` → halaman jadi dynamic) dengan fallback ke nilai hardcoded bila kosong/error. Upload PDF (maks **50MB**) memakai bucket `media` (pola `ProductForm` / `0004_media_storage_policies.sql`) ke path `compro/<timestamp>-<name>.pdf`.
- **UI copy, pesan error, dan respons API dalam Bahasa Indonesia** (`lang="id"`). Jaga copy baru dalam bahasa Indonesia.
- Halaman adalah Server Components secara default; tambahkan `"use client"` hanya untuk interaktivitas (seksi home, tampilan contact/careers, form, GSAP).
- Aset gambar ada di `public/images/` (subfolder brand/product/partner); URL gambar produk direferensikan dari `lib/data/products.ts`.

### Wiring halaman publik → Supabase
Situs publik **sudah membaca dari Supabase** lewat `lib/public-data.ts` (lapisan baca server-only — pakai `cookies()`, jadi halaman pemakainya dynamic; **jangan import ke komponen client**):
- `/katalog-produk` & `/store` — sudah wired lebih dulu (fungsi di `lib/admin-data.ts` + `dynamic = "force-dynamic"`).
- `/careers` (route karir; **bukan `/news` lagi**) — list + detail baca tabel `careers` (status `open`), fallback ke `lib/data/careers.ts` bila query error. Tombol "Lamar Posisi Ini" memakai `getRecruitmentUrl()` (`lib/public-data.ts`) yang membaca `site_settings` key `recruitment` (value `{ url }`); bila kosong tombol jadi disabled. URL diatur admin lewat `components/admin/RecruitmentForm.tsx` di `/admin/karir` (aksi `lib/actions/recruitment.ts`).
- `/about` — company profile manifest (`site_settings` key `compro`, fallback viewer hardcoded) + Grup Kami (`group_companies`) + Partner Kami (`partners`). Tim internal (`team_members`) dikelola di `/admin/relasi` tapi belum dirender publik (dormant, seperti `articles`).
- Seksi home — **Brands** (`brands`) & **HomeCareers** (`careers`), fetch server-side di `app/(site)/page.tsx` lalu di-pass sebagai props ke komponen client.
- **SearchModal** — query anon client-side (browser Supabase client) utk produk b2b `published`+`is_active` dan karir `open`; RLS menegakkan filter publik.
- **Sisa statis**: `solutions` (`lib/data/solutions.ts`), konteks AI (`lib/ai/*`), seksi team/About di `/about` (`lib/data/team.ts`), Hero home (sengaja hardcoded). `industries.ts` & `projects.ts` **sudah dihapus** (dead code). `lib/data/news.ts` **tetap dipertahankan** meski halaman `/news` sudah tidak ada — dipakai `scripts/build-seed.ts` untuk seed tabel `articles` (dormant); jangan hapus.
- Pola: fungsi di `lib/public-data.ts` beri fallback ke array statis `lib/data/*` bila Supabase error; katalog/karir/home memakai `export const dynamic = "force-dynamic"`.

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
- `app/api/contact` memvalidasi dengan zod `safeParse` lalu memasukkan submission ke tabel `contact_messages` (anon insert via RLS) — muncul di `/admin/inquiry`. Jaga bentuk respons `{ success, message, errors? }`.

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
- **Status section**: `BUILT_SECTION_KEYS` di `lib/admin-sections.ts` = tepat **13 section** yang sudah dibangun: produk, **compro**, sparepart, stok, orders, inquiry, lead, integrasi, akses-staff, riwayat, **karir**, **merek**, **relasi** (dashboard adalah `/admin`, bukan key section). Section compro, karir, merek, relasi punya route sendiri (`/admin/compro`, `/admin/karir`, `/admin/merek`, `/admin/relasi`). **Semua section sudah dibangun** — tidak ada lagi placeholder; route catch-all `app/admin/(dashboard)/[section]/` memanggil `notFound()` untuk key apa pun yang ada di `BUILT_SECTION_KEYS` (key yang sudah dibangun ada di folder route sendiri, bukan di catch-all). Cek `BUILT_SECTION_KEYS` sebelum berasumsi sebuah halaman section ada.
- **`lib/admin.ts`** = server-only; `getAdminUser()` (react `cache`) memvalidasi sesi via `auth.getUser()` lalu memuat baris `profiles` (self-select RLS) dan membutuhkan `role in ('admin','editor')` + `is_active`. **Jangan import ke komponen client** — ia menarik `next/headers`. Data/tipe murni bersama ada di `lib/admin-sections.ts` (re-export dari `lib/admin.ts`; import dari `admin-sections` di kode client, mis. `components/admin/AdminShell.tsx`).
- `lib/admin-sections.ts` mengekspor `ADMIN_SECTIONS` (link/meta section) dan `AdminUser`. Ikon section: `components/admin/sectionIcons.ts`.
- Skema dibagi dalam migrasi berurutan, diterapkan berurutan di SQL editor Supabase — kini **`0001_schema.sql` … `0013_remove_chat_cs.sql`** (file baru lanjut `0014_`):
  - `0001_schema.sql` — skema dasar; trigger `profiles` otomatis membuat `role='editor'` saat signup.
  - `0002_store_orders.sql` — menambah tabel `orders`, `order_items`, `whatsapp_leads`, plus kolom e-commerce (price, stock, weight, dsb.) di `products`.
  - `0007_chat_rate_limit.sql` — rate-limit chatbot AI (tabel `ai_chat_sessions`, RPC `track_chat_message`) untuk `/api/chat`.
  - `0008`–`0010` — bekas sistem live chat CS custom (`chat_conversations`, `chat_messages`, RPC `start_chat_conversation`/`get_chat_history`/`send_chat_message`, `broadcast_token`, realtime). **Sudah dihapus oleh `0013_remove_chat_cs.sql`** (tabel + RPC + publication di-drop) karena live chat digantikan link WhatsApp +62 821-3738-4029; jangan pakai ulang objek-objek itu.
- **Chatbot AI (Gemini)** tetap dipakai penuh: `components/chatbot/FaqWidget.tsx` hanya mode AI (`/api/chat`, rate-limit `ai_chat_sessions`), dengan tombol "Hubungi via WhatsApp" ke +62 821-3738-4029 sebagai fallback kontak. Tidak ada live chat CS/Tawk lagi.
- Promosikan admin pertama di SQL editor Supabase:
  ```sql
  update public.profiles set role = 'admin' where email = 'your@email.com';
  ```
- **Gotcha PostgREST**: jika sebuah halaman tampil kosong tepat setelah migrasi membuat/mengubah tabel, cache skema PostgREST mungkin usang — jalankan `NOTIFY pgrst, 'reload schema';` di SQL editor.
- Env Supabase: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local`. Client: `utils/supabase/client.ts` (browser) / `utils/supabase/server.ts` (RSC) / `utils/supabase/middleware.ts`; refresh sesi di-wire lewat `proxy.ts`. Tidak ada key yang di-commit.

## Status repo
Seluruh pekerjaan wiring publik→Supabase, admin `/admin/karir`, dan URL recruitment **sudah di-commit** (commit terbaru: `df55bef` "menambah admin careers"; sebelumnya `bbbcb02` hapus live chat CS, `66b3ee5` design 3D, `093cf80` brosur/katalog). Konteks informasional, bukan instruksi: **jangan `git commit` atau `git push`** kecuali diminta eksplisit di sebuah tugas.

## Skill custom project
Skill proyek ada di `.agents/skills/` (ter-daftar via `opencode.json` → `skills.paths: [".agents/skills"]`, di-scan rekursif untuk `**/SKILL.md`): `admin-crud-pattern`, `no-ai-slop-design`, `supabase`, `supabase-migration-safety`, `supabase-postgres-best-practices`, `verification-before-done`. Load skill relevan sebelum menulis kode (isi penuh via tool `skill`). Skill baru = folder `.agents/skills/<nama>/SKILL.md`, frontmatter `name` (wajib, = nama folder) + `description` (wajib).
