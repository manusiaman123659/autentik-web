---
name: no-ai-slop-design
description: Use this skill whenever creating or editing any UI — a new component, a new page section, a new admin form, or restyling something existing. The goal is to make new UI look like it belongs in this specific project, not like generic default-Tailwind AI output.
---

# Design Discipline — This Project Has a Design System, Use It

"AI slop" UI happens when new components get built from generic defaults instead
of the system that already exists in this codebase. Before writing any JSX/CSS,
check what's already established and match it — don't invent a new visual
language for one new component.

## The actual design system (verify against these files, don't guess)

- **Colors are CSS variables, not raw Tailwind color classes.** Tailwind v4 here
  is CSS-first: tokens live in `@theme` in `app/globals.css`, no
  `tailwind.config.*` file exists. The palette is navy (`#0B1F3A`–`#0E2A4D`) as
  the primary corporate color and teal (`#0EA5A0` / `#14B8A6`) as the accent for
  primary buttons, icons, and links. **Do not reach for Tailwind's default
  `blue-500`, `indigo-600`, `purple-*`, or any off-palette color** just because
  it's a convenient utility class — that's the single fastest way to make a
  component look like it wasn't designed for this site.
- **Dark mode is a custom `.dark` class**, toggled via `components/ThemeProvider.tsx`
  (localStorage key `autentik-theme`) — **not** Tailwind's `dark:` variant.
  Components read semantic CSS variables like `var(--text-primary)`,
  `var(--text-secondary)`, `var(--text-muted)`, `var(--bg-card)`,
  `var(--bg-secondary)`, `var(--border-subtle)` (defined in `:root`/`.dark`
  blocks in `globals.css`) via inline `style={{ ... }}` or the existing
  utility patterns — not `dark:bg-gray-800` style Tailwind variants, which will
  silently do nothing here.
- **Badge/pill/brand-category styling comes from `lib/design-tokens.ts`** — reuse
  those tokens for anything brand- or category-related (e.g. HSE/ENV/Platform/Lab
  badges) instead of inventing a new color-per-category scheme inline.
- **Icons are `lucide-react` only.** Don't introduce emoji-as-icon or a second
  icon library for a new component — check `components/admin/sectionIcons.ts`
  for the existing icon-per-section convention before picking a new one.
- **Motion**: GSAP `ScrollTrigger` via `components/ui/ScrollAnimations.tsx`
  (`AnimatedElement`, `type="fade-up" | "stagger"`) is the established pattern
  for scroll-triggered reveals; `framer-motion` is available for
  interaction-driven motion (menus, hover, drag). Don't add a third
  animation approach, and don't animate everything just because motion is
  available — restraint is part of the existing feel of the site (business/
  laboratory equipment brand, not a consumer app).
- **`cn()` in `lib/utils.ts`** is a plain class-joiner (no clsx/tailwind-merge) —
  don't add a new className-merging dependency.

## Slop patterns to actively avoid

- **Generic centered hero with a gradient blob and `shadow-2xl rounded-3xl`
  everywhere.** If a new section needs a hero/banner, look at how existing ones
  (Home hero, Solutions hero) are actually built — same overlay treatment,
  same button hierarchy (solid teal primary + outline secondary), not a new
  invented style per page.
- **Cookie-cutter 3-column icon-card grids with no visual hierarchy.** This
  project already has this pattern (Core Solutions, Industries, brand cards) —
  reuse the actual card component/spacing rhythm instead of re-deriving a
  "new" version that's subtly different (different border-radius, different
  shadow depth, different padding scale) for no reason.
- **Default light-gray placeholder boxes standing in for real content.**
  Product/brand imagery goes through `next/image` from `public/images/` or
  Supabase Storage — don't ship a component with an unstyled gray `<div>`
  where an image belongs unless a placeholder state is explicitly the point
  (e.g. loading state), and even then, match existing skeleton/loading patterns
  already used elsewhere (e.g. the 3D viewer's `useProgress` overlay) rather
  than a generic spinner.
- **Inconsistent spacing scale.** If most sections use a given vertical rhythm
  (padding between sections, gap in grids), a new section shouldn't invent its
  own arbitrary `py-14 gap-7` — match the scale already in use nearby.
- **Badges/pills in random colors per component.** Status colors (open/closed,
  paid/pending, stock available/low/out) already have established colors in
  places like the Store stock badges and admin order status badges — reuse that
  mapping instead of picking new colors for a conceptually similar status
  elsewhere.
- **Copy tone drift.** All public UI copy is Bahasa Indonesia (`lang="id"`) in a
  professional, B2B-appropriate register (see existing FAQ, product, and form
  copy) — don't default to casual English placeholder text ("Lorem ipsum",
  "Click here") even temporarily; write real Indonesian copy matching the
  existing tone from the start.

## Before finishing a new UI piece, ask

1. Does this look like it was designed by the same person who built the rest
   of the site, or does it look like a new component library was dropped in?
2. Did I reuse an existing color/spacing/shadow/radius decision, or did I pick
   a new one because it was the first thing Tailwind's defaults suggested?
3. Would this still make sense in dark mode using the CSS-variable pattern, or
   did I hardcode a light-mode-only color?
4. If this is admin UI, did I use `components/admin/ui.tsx` primitives instead
   of raw markup?
