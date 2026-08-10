-- =============================================================================
-- Autentik CMS - Store, Orders & Leads (Phase: store admin)
-- Apply after 0001_schema.sql. Paste into the Supabase SQL editor (or CLI).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- products: product_type (required) + e-commerce fields
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists product_type text not null default 'b2b_system' check (product_type in ('b2b_system', 'sparepart')),
  add column if not exists sku text,
  add column if not exists price numeric(14,2) check (price >= 0),
  add column if not exists compare_at_price numeric(14,2) check (compare_at_price >= 0),
  add column if not exists weight_grams integer check (weight_grams >= 0),
  add column if not exists stock integer not null default 0 check (stock >= 0),
  add column if not exists low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  add column if not exists variants jsonb not null default '[]'::jsonb,
  add column if not exists is_store_visible boolean not null default true;

create index if not exists idx_products_type on public.products (product_type, is_active);
create index if not exists idx_products_stock on public.products (product_type, stock);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  shipping_address jsonb not null default '{}'::jsonb,
  subtotal numeric(14,2) not null default 0,
  shipping_cost numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  payment_method text check (payment_method in ('transfer', 'cod', 'midtrans')),
  payment_status text not null default 'pending' check (payment_status in ('unpaid', 'pending', 'paid', 'refunded')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
  tracking_courier text,
  tracking_number text,
  notes text,
  cancel_reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_created on public.orders (created_at desc);
create index if not exists idx_orders_status on public.orders (status, created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
create policy "orders_public_insert" on public.orders for insert with check (true);
create policy "orders_staff_select" on public.orders for select using (public.is_staff());
create policy "orders_staff_all" on public.orders for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text references public.products (id) on delete set null,
  product_name text not null default '',
  sku text,
  variant jsonb not null default '{}'::jsonb,
  unit_price numeric(14,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  weight_grams integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order on public.order_items (order_id);

alter table public.order_items enable row level security;
create policy "order_items_public_insert" on public.order_items for insert with check (true);
create policy "order_items_staff_select" on public.order_items for select using (public.is_staff());
create policy "order_items_staff_all" on public.order_items for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- whatsapp_leads (klik tombol WhatsApp dari halaman produk/landing)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_leads (
  id uuid primary key default gen_random_uuid(),
  source text,
  product_slug text,
  page_path text,
  target_phone text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_created on public.whatsapp_leads (created_at desc);

alter table public.whatsapp_leads enable row level security;
create policy "leads_public_insert" on public.whatsapp_leads for insert with check (true);
create policy "leads_staff_select" on public.whatsapp_leads for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- site_settings: konfigurasi toko (integrasi Midtrans/kurir bersifat konfig)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value)
values (
  'store',
  '{"currency":"IDR","enableShipping":false,"couriers":[],"midtrans":{"enabled":false,"sandbox":true,"clientKey":""}}'::jsonb
)
on conflict (key) do nothing;