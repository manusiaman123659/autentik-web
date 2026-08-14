---
name: admin-crud-pattern
description: Use this skill whenever adding a new admin CRUD module/section under app/admin/(dashboard)/ (e.g. a new content type like "merek", "karir", "relasi"), or any new server action in lib/actions/*. Ensures consistency with the existing admin modules (produk, sparepart, orders, inquiry, etc).
---

# Admin CRUD Module Pattern

This project's admin panel (`app/admin/(dashboard)/`) follows one consistent
shape across every module (produk, sparepart, stok, orders, inquiry, lead,
integrasi, akses-staff, riwayat, karir). New admin modules must follow the same
shape — don't invent a new pattern for a new content type.

## Server actions (`lib/actions/*.ts`)

Every mutating server action follows this shape:

```ts
"use server";

export async function someAdminAction(input: SomeInput): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = someSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Data tidak valid.", errors: parsed.error.flatten() };
  }

  // ... perform the mutation via the authenticated server client (utils/supabase/server) ...

  await recordAudit({ action: "...", entity: "...", entityId: "..." /* etc */ });
  revalidatePath("/admin/<section>");
  return { success: true, message: "Berhasil disimpan." };
}
```

Rules:
- `ActionResult` shape is always `{ success: boolean; message: string; errors?: ... }`
  — do not invent a different return shape for a new action.
- `getAdminUser()` guard is always first, before touching any input or database
  call. Never skip it because "this action seems low-risk."
- Validation uses a Zod schema from `lib/validations/*.ts` — reuse the pattern of
  existing schemas (e.g. discriminated unions for product types) rather than
  writing ad-hoc validation inline.
- `recordAudit()` is called for anything that creates/edits/deletes data or
  changes a status — this is what powers `/admin/riwayat`. If in doubt, record
  it; audit trail is cheap and the alternative (a silent untracked mutation) is
  the kind of gap this project deliberately avoids.
- `revalidatePath()` targets the admin list path so the UI reflects the change
  immediately, and the public path too if the module is wired to a public page
  (e.g. `/katalog-produk`, `/store`, `/careers`).
- Uses the server-side Supabase client from `utils/supabase/server.ts`
  (cookie-based session, respects RLS as the logged-in staff user) — never the
  service role key, and never the anon client, for admin actions.

## Admin forms (client components)

Admin forms do **not** use react-hook-form. They use local `useState` for field
state and call the server action directly on submit — this is deliberately
different from public-facing forms (contact, custom-request), which do use
react-hook-form + zodResolver. Do not introduce react-hook-form into a new admin
form; follow the `useState` + direct action call pattern of `ProductForm.tsx`.

Reuse shared UI primitives from `components/admin/ui.tsx` (buttons, inputs,
badges, table shells) rather than writing raw markup. Client-side actions that
show success/error feedback rely on `ToastProvider`, already mounted once in the
dashboard layout — never mount a second one inside an individual page.

## Registering a new section

A new admin module needs to be added to `ADMIN_SECTIONS` and
`BUILT_SECTION_KEYS` in `lib/admin-sections.ts`. When editing these lists:
- List the **full, exact set** of keys explicitly in the instruction/diff —
  don't use a vague "add X to the list" instruction, which has previously
  resulted in a duplicate/stale entry being left behind instead of a clean
  replace. Show the complete before/after list.
- Match the icon convention in `components/admin/sectionIcons.ts`.
- The catch-all route `app/admin/(dashboard)/[section]/` renders an
  "under construction" placeholder for any key NOT in `BUILT_SECTION_KEYS`, and
  calls `notFound()` for keys that ARE built (because those have their own
  route folder). Don't invert this logic — built sections must NOT be handled
  by the catch-all.

## Removing a module

When a module is deprioritized/removed (this has happened before — e.g. the
custom CS live chat module), remove it symmetrically:
- Route folder, any dedicated components, the entry in `ADMIN_SECTIONS` /
  `BUILT_SECTION_KEYS`, any dashboard stat card referencing it, any queries in
  `lib/admin-data.ts`, and any server actions that only existed for that module.
- A new migration to drop the underlying tables/functions if the module owned
  its own tables — never edit an old migration file to do this.
- Before dropping any table, check whether it might contain real (non-test)
  data and ask before deleting it.
