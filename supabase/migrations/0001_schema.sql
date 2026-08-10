-- =============================================================================
-- Autentik CMS — Schema (Phase 0)
-- Apply this file in the Supabase SQL editor (or via CLI).
-- idempotent-ish: uses IF NOT EXISTS / ON CONFLICT where it matters.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extension (safe no-op if present)
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- helper: staff (admin/editor) & admin checks
-- ---------------------------------------------------------------------------
create or replace function public.is_staff() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.role in ('admin', 'editor')
  );
$$;

create or replace function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.role = 'admin'
  );
$$;

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (links auth.users -> app role)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'editor'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_staff_select" on public.profiles
  for select using (public.is_staff());
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin());
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------
create table if not exists public.brands (
  id text primary key,
  name text not null,
  segment text check (segment in ('HSE', 'ENV', 'Platform', 'Lab')),
  segment_color text,
  tagline text,
  description text,
  accent_color text,
  logo_light text,
  logo_dark text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brands enable row level security;
create policy "brands_public_select" on public.brands
  for select using (is_active);
create policy "brands_staff_all" on public.brands
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- product_categories
-- ---------------------------------------------------------------------------
create table if not exists public.product_categories (
  id text primary key,
  name text not null unique,
  color text
);

alter table public.product_categories enable row level security;
create policy "categories_public_select" on public.product_categories
  for select using (true);
create policy "categories_staff_all" on public.product_categories
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  brand_id text references public.brands (id) on delete set null,
  brand text not null,
  brand_color text,
  category text not null,
  category_color text,
  description text not null default '',
  features jsonb not null default '[]'::jsonb,
  specs jsonb not null default '[]'::jsonb,
  image_url text,
  gallery jsonb not null default '[]'::jsonb,
  related_ids jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  status text not null default 'published' check (status in ('draft', 'published')),
  seo_title text,
  seo_description text,
  og_image text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_brand on public.products (brand);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_status on public.products (status, is_active);

alter table public.products enable row level security;
create policy "products_public_select" on public.products
  for select using (status = 'published' and is_active);
create policy "products_staff_select" on public.products
  for select using (public.is_staff());
create policy "products_staff_all" on public.products
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- careers (simple: list only — apply redirects to external recruitment site)
-- ---------------------------------------------------------------------------
create table if not exists public.careers (
  id text primary key,
  slug text not null unique,
  title text not null,
  department text not null,
  location text not null,
  type text not null,
  type_badge_color text not null default 'green' check (type_badge_color in ('green', 'purple', 'blue')),
  summary text,
  description text not null default '',
  responsibilities jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'closed')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_careers_status on public.careers (status);

alter table public.careers enable row level security;
create policy "careers_public_select" on public.careers
  for select using (status = 'open');
create policy "careers_staff_all" on public.careers
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- articles (news — dormant in UI for now)
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id text primary key,
  slug text not null unique,
  badge text,
  badge_color text,
  category text,
  date text,
  title text not null,
  excerpt text,
  content text,
  image_url text,
  featured boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles enable row level security;
create policy "articles_public_select" on public.articles
  for select using (is_visible);
create policy "articles_staff_all" on public.articles
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- about page: team, group companies, partners
-- ---------------------------------------------------------------------------
create table if not exists public.team_members (
  id text primary key,
  name text not null,
  role text not null,
  role_color text,
  bio text,
  image_url text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_companies (
  id text primary key,
  name text not null,
  legal_name text,
  logo_url text,
  url text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partners (
  id text primary key,
  name text not null,
  short_name text,
  logo_url text,
  url text,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_members enable row level security;
create policy "team_public_select" on public.team_members
  for select using (is_visible);
create policy "team_staff_all" on public.team_members
  for all using (public.is_staff());

alter table public.group_companies enable row level security;
create policy "groups_public_select" on public.group_companies
  for select using (is_visible);
create policy "groups_staff_all" on public.group_companies
  for all using (public.is_staff());

alter table public.partners enable row level security;
create policy "partners_public_select" on public.partners
  for select using (is_visible);
create policy "partners_staff_all" on public.partners
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- contact_messages (public form -> leads)
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  company text,
  industry text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'followed_up', 'done')),
  internal_note text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
create policy "messages_public_insert" on public.contact_messages
  for insert with check (true);
create policy "messages_staff_select" on public.contact_messages
  for select using (public.is_staff());
create policy "messages_staff_all" on public.contact_messages
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- newsletter_subscribers
-- ---------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  is_active boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
create policy "subscribers_public_insert" on public.newsletter_subscribers
  for insert with check (true);
create policy "subscribers_staff_select" on public.newsletter_subscribers
  for select using (public.is_staff());
create policy "subscribers_staff_all" on public.newsletter_subscribers
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- media library (Supabase Storage bucket: media)
-- ---------------------------------------------------------------------------
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  alt_text text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.media_items enable row level security;
create policy "media_staff_all" on public.media_items
  for all using (public.is_staff());

-- public storage bucket (serving uploaded images on the public site)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- site_settings (stats, contact info, socials, recruitmentUrl)
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
create policy "settings_public_select" on public.site_settings
  for select using (true);
create policy "settings_staff_all" on public.site_settings
  for all using (public.is_staff());

-- default seed values
insert into public.site_settings (key, value) values
  ('stats', '[{"value":10,"suffix":"+","label":"Tahun Pengalaman"},{"value":1000,"suffix":"+","label":"Proyek Laboratorium"},{"value":500,"suffix":"+","label":"Klien Institusi"},{"value":0,"suffix":"Nasional","label":"Cakupan Layanan"}]'::jsonb),
  ('contact', '{"address":"Jl. Klipang Ruko Amsterdam No.9E, Sendangmulyo, Tembalang, Kota Semarang, Jawa Tengah 50272","email":"autentik.info@gmail.com","phone":"+62 812 3456 7890","waNumber":"6281234567890","mapsQuery":"Ruko Amsterdam No.9E, Jln. Klipang Raya, Sendangmulya, Tembalang, Semarang","mapEmbed":"https://maps.google.com/maps?q=Ruko+Amsterdam+No.9E,+Jln.+Klipang+Raya,+Sendangmulya,+Tembalang,+Semarang&t=&z=16&ie=UTF8&iwloc=&output=embed"}'::jsonb),
  ('socials', '[{"platform":"email","label":"Email","href":"mailto:autentik.info@gmail.com"},{"platform":"whatsapp","label":"WhatsApp","href":"https://wa.me/6281234567890"}]'::jsonb),
  ('recruitment', '{"url":"","applyMode":"external","text":"Lamar via Website Recruitment"}'::jsonb),
  ('seo', '{"defaultTitle":"PT Autentik Karya Analitika | Smart Technology is Yours","defaultDescription":"Solusi penyedia produk industri dengan teknologi IoT. PT Autentik Karya Analitika memproduksi dan memasarkan IoT Quality Monitoring Devices berbasis kebutuhan industri dan teknologi IoT."}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- revisions (version history / rollback) + audit_log
-- ---------------------------------------------------------------------------
create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  data jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_revisions_entity on public.revisions (entity_type, entity_id, created_at desc);

alter table public.revisions enable row level security;
create policy "revisions_staff_select" on public.revisions
  for select using (public.is_staff());
create policy "revisions_staff_insert" on public.revisions
  for insert with check (public.is_staff());

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_created on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;
create policy "audit_staff_select" on public.audit_log
  for select using (public.is_staff());
create policy "audit_staff_insert" on public.audit_log
  for insert with check (public.is_staff());