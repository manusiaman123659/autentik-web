<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: autentik-web

Company profile site for **PT Autentik Karya Analitika** (Indonesian IoT/industrial products). Next.js 16.3.0, App Router, React 19, TypeScript strict, Tailwind CSS v4, Turbopack by default.

## Commands
- `npm run dev` / `npm run build` / `npm run start` — standard Next.js.
- `npm run lint` — runs ESLint directly (`eslint`). `next lint` was **removed** in v16 and `next build` no longer runs linting.
- `npm run seed:build` — regenerates `supabase/seed.sql` from `lib/data/*` via `scripts/build-seed.ts` (needs `tsx`, a devDependency). Apply schema + seed in the Supabase SQL editor.
- No test runner is configured; verify with `npm run lint` + `npm run build` (build does typechecking). Run both before finishing a change.

## Next.js 16 gotchas in this repo
- **Async request APIs are mandatory**: `params`/`searchParams`/`cookies()`/`headers()` are Promises and must be awaited. Dynamic pages here already follow `type Props = { params: Promise<{ slug: string }> }` then `const { slug } = await params` (e.g. `app/katalog-produk/[slug]/page.tsx:20`). Keep that pattern.
- Turbopack is the default for dev and build; no `--turbopack` flag needed. `next build` fails if a webpack config appears — don't add one.
- `revalidateTag` needs a second `cacheLife` profile arg; `unstable_*` caching APIs are stable now.
- `middleware` is renamed to `proxy` — **and it IS used in this repo** (see "Admin & CMS auth" below for what it does). Don't assume it's dead code.
- `next/image` defaults changed (e.g. `qualities` defaults to `[75]`, `minimumCacheTTL` to 4h).

## Content & architecture
- **Public site content is static data** in `lib/data/*.ts` (products, brands, news, careers, team, partners, projects, solutions, industries, groups), typed by interfaces in `types/index.ts`. List/detail pages generate routes from these arrays via `generateStaticParams` + `generateMetadata`. Add new products/articles to the data file (not a DB) **unless you are specifically working on wiring a public page to Supabase** — check the gotcha below before assuming static data is still the source of truth for a given page.
- **UI copy, error messages, and API responses are in Indonesian** (`lang="id"`). Keep new copy in Indonesian.
- Pages are Server Components by default; add `"use client"` only for interactivity (home sections, contact/news views, forms, GSAP).
- Image assets live in `public/images/` (brand/product/partner subfolders); product image URLs are referenced from `lib/data/products.ts`.

### ⚠️ Known gap: public site does not read from Supabase yet
The admin CMS (`app/admin/`) writes to Supabase (products, orders, etc.), but the public pages (`/katalog-produk`, `/store`, home sections) still read from `lib/data/*.ts`. **Editing a product in the admin will not appear on the public site** until that specific page is wired to a Supabase query. Do not assume a public page reflects admin data unless you've confirmed it queries Supabase — check the page/route for a Supabase client call before relying on this.

## Styling & design system
- Tailwind v4 CSS-first config: `@import "tailwindcss"` + `@theme` tokens in `app/globals.css` (navy/teal palette). **There is no `tailwind.config.*` file.**
- Dark mode is a custom `.dark` class on `<html>` via `components/ThemeProvider.tsx` (localStorage key `autentik-theme`), not Tailwind's `dark:` variant. Components use semantic CSS variables (e.g. `style={{ color: "var(--text-primary)" }}`) from `:root`/`.dark` blocks in `globals.css`; brand colors come from `lib/design-tokens.ts` (badge/pill classes).
- `cn()` in `lib/utils.ts` is a simple class joiner — no clsx/tailwind-merge.
- Icons: `lucide-react`. Scroll animations: GSAP `ScrollTrigger` via `components/ui/ScrollAnimations.tsx` (`AnimatedElement`, `type="fade-up" | "stagger"`); also `framer-motion` is available.

## Forms & API routes
- **Public-facing forms** (contact form, login) use react-hook-form + `@hookform/resolvers` + **zod v4**; schemas live in `lib/validations/*.ts` and are shared between client forms and server handlers.
- **Admin forms** (e.g. `ProductForm` under `/admin/produk`, `/admin/sparepart`) do **not** use react-hook-form. They use local `useState` for field state and call a server action directly on submit. Follow this pattern for new admin forms — don't introduce react-hook-form into `app/admin/`.
- `app/api/contact` validates with zod `safeParse` then only `console.log` — email/DB integration is an explicit TODO. Keep response shape `{ success, message, errors? }`.

## Admin data & server action patterns
- **`lib/admin-data.ts`** is a server-only data layer (uses `cookies()`) for reading admin data (dashboard stats, orders, inquiries, etc). **Never import it into a client component** — same constraint as `lib/admin.ts` below, but this one is for data fetching rather than auth.
- **Server actions** (`lib/actions/*`) follow a consistent shape:
  - Return `ActionResult`: `{ success: boolean; message: string; errors?: ... }`.
  - Start with a `getAdminUser()` guard — reject if there's no valid admin/editor session before doing anything else.
  - Call `recordAudit()` for actions that should be traceable (creating/editing/deleting products, changing order status, etc.) — this writes to the audit log read by `/admin/riwayat`.
  - Call `revalidatePath()` after a successful mutation so the relevant admin list re-renders with fresh data.
  - New admin actions should follow this same shape rather than inventing a new return type.

## Admin UI
- Shared admin UI primitives (buttons, inputs, badges, table shells, etc.) live in `components/admin/ui.tsx` — reuse these instead of writing raw markup for new admin screens.
- Client-side admin actions that show success/error feedback depend on `ToastProvider`, which is mounted once in the dashboard layout (`app/admin/(dashboard)/layout.tsx`). Don't mount a second `ToastProvider` inside an individual admin page/component.

## Admin & CMS auth (Supabase)
- **Login button** in navbar/mobile menu is `components/auth/AdminNavButton.tsx` (client): "Masuk" → `/admin/login`, swaps to "Admin" + logout when signed in.
- **Routes**: `app/admin/login` (public login) and `app/admin/(dashboard)/*` (guarded). `app/admin/(dashboard)/layout.tsx` calls `getAdminUser()`; on failure it `redirect("/admin/login")`.
- **Section status**: `BUILT_SECTION_KEYS` in `lib/admin-sections.ts` = exactly 9 built sections: produk, sparepart, stok, orders, inquiry, lead, integrasi, akses-staff, riwayat (dashboard is `/admin`, not a section key). The 3 not-yet-built sections (merek, karir, relasi) render the "under construction" placeholder via `app/admin/(dashboard)/[section]/`; that route `notFound()`s any key present in `BUILT_SECTION_KEYS` (built keys live in their own route folders, not the catch-all). Check `BUILT_SECTION_KEYS` before assuming a section page exists.
- **`lib/admin.ts`** = server-only; `getAdminUser()` (react `cache`) validates session via `auth.getUser()` then loads the `profiles` row (self-select RLS) and requires `role in ('admin','editor')` + `is_active`. **Do not import it into client components** — it pulls `next/headers`. Shared pure data/types live in `lib/admin-sections.ts` (re-exported from `lib/admin.ts`; import from `admin-sections` in client code, e.g. `components/admin/AdminShell.tsx`).
- `lib/admin-sections.ts` exports `ADMIN_SECTIONS` (section links/meta) and `AdminUser`. Section icons: `components/admin/sectionIcons.ts`.
- Schema is split across two migrations, applied in order in the Supabase SQL editor:
  - `supabase/migrations/0001_schema.sql` — base schema; `profiles` trigger auto-creates `role='editor'` on signup.
  - `supabase/migrations/0002_store_orders.sql` — adds `orders`, `order_items`, `whatsapp_leads` tables, plus e-commerce columns (price, stock, weight, etc.) on `products`.
- Promote the first admin in the Supabase SQL editor:
  ```sql
  update public.profiles set role = 'admin' where email = 'your@email.com';
  ```
- Supabase env: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Clients: `utils/supabase/client.ts` (browser) / `server.ts` (RSC) / `middleware.ts`; session refresh wired through `proxy.ts`. No keys are committed.

## Repo status
All work described above is uncommitted — `git log` currently shows only the initial `Create Next App` commit. This is informational context (helps explain why there's no PR history to check), not an instruction: **do not run `git commit` or `git push`** unless explicitly asked to in a given task.