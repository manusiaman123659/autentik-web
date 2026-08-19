-- =============================================================================
-- Autentik CMS - Kalkulator Ongkir Internal (Jalur A, tabel tarif)
-- Apply after 0016_whatsapp_setting.sql in the Supabase SQL editor.
--   - shipping_zones / shipping_rates: tarif per-zone (provinsi/kota) x rentang
--     berat (gram). Dikelola admin via /admin/integrasi.
--   - estimate_shipping_cost(): SATU-SATUNYA sumber logika ongkir. Dipakai
--     publik (estimasi sebelum submit di checkout) DAN oleh
--     create_checkout_order saat order dibuat -> nilai konsisten.
--   - Master switch tetap site_settings key 'store' -> enableShipping. Bila
--     false (default saat ini) maka ongkir = 0 -> perilaku lama tak berubah.
--   - Perilaku alamat/berat di luar tabel: zona tak cocok => ongkir 0;
--     berat melebihi band terakhir => cost band terakhir (bukan gratis).
-- =============================================================================

-- ---- zona pengiriman ----
create table public.shipping_zones (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  provinces   text[] not null default '{}',  -- match lower(province) exact
  cities      text[] not null default '{}',  -- match lower(city) exact
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.shipping_zones is
  'Zona pengiriman; alamat dicocokkan (lower, trim) ke provinsi ATAU kota zona.';
comment on column public.shipping_zones.provinces is 'List provinsi (lower exact) milik zona.';
comment on column public.shipping_zones.cities is 'List kota/kabupaten (lower exact) milik zona.';

-- ---- tarif per rentang berat ----
create table public.shipping_rates (
  id            uuid primary key default gen_random_uuid(),
  zone_id       uuid not null references public.shipping_zones(id) on delete cascade,
  weight_from_g integer not null check (weight_from_g >= 0),
  weight_to_g   integer not null check (weight_to_g > weight_from_g),
  cost          numeric(14,2) not null check (cost >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_shipping_rates_zone_id on public.shipping_rates (zone_id);

comment on table public.shipping_rates is
  'Tarif ongkir per rentang berat (gram) dalam satu zona; band non-overlap, lookup pakai weight_from_g <= berat order by weight_from_g desc limit 1 (berat melebihi band terakhir => cost band terakhir).';

-- trigger updated_at (reuse set_updated_at dari 0001)
drop trigger if exists shipping_zones_set_updated_at on public.shipping_zones;
create trigger shipping_zones_set_updated_at
  before update on public.shipping_zones
  for each row execute function public.set_updated_at();
drop trigger if exists shipping_rates_set_updated_at on public.shipping_rates;
create trigger shipping_rates_set_updated_at
  before update on public.shipping_rates
  for each row execute function public.set_updated_at();

-- ---- RLS ----
alter table public.shipping_zones enable row level security;
alter table public.shipping_rates enable row level security;

-- staff all (admin/editor via is_staff())
create policy "shipping_zones_staff_all"
  on public.shipping_zones for all
  to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "shipping_rates_staff_all"
  on public.shipping_rates for all
  to authenticated using (public.is_staff()) with check (public.is_staff());

-- publik baca zona aktif + tarif zona aktif (untuk estimasi ongkir di checkout)
create policy "shipping_zones_public_select"
  on public.shipping_zones for select
  to anon, authenticated using (is_active = true);
create policy "shipping_rates_public_select"
  on public.shipping_rates for select
  to anon, authenticated using (
    exists (
      select 1 from public.shipping_zones z
      where z.id = zone_id and z.is_active = true
    )
  );

-- =============================================================================
-- estimate_shipping_cost: hitung ongkir deterministik dari isi keranjang (db)
-- + alamat pengiriman. Read-only; dipanggil publik (estimasi checkout) dan
-- internal (create_checkout_order).
-- =============================================================================
create or replace function public.estimate_shipping_cost(
  p_items            jsonb,           -- [{"product_id":"<id>","quantity":2}, ...]
  p_shipping_address jsonb default '{}'::jsonb  -- {address, city, province, postal_code}
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row           record;
  v_wg            integer;
  v_total_weight  integer := 0;
  v_enable        boolean := false;
  v_zone_id       uuid;
  v_cost          numeric(14,2) := 0;
  v_province      text := lower(trim(coalesce(p_shipping_address ->> 'province', '')));
  v_city          text := lower(trim(coalesce(p_shipping_address ->> 'city', '')));
begin
  -- ---- guard input ----
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return 0;
  end if;
  -- guard ukuran input: batasi jumlah item agar loop tidak tak hingga.
  -- function estimasi read-only -> gagal diam-diam (return 0), bukan raise.
  if jsonb_array_length(p_items) > 50 then
    return 0;
  end if;

  -- ---- master switch ongkir (default mati -> perilaku lama) ----
  select coalesce((value ->> 'enableShipping')::boolean, false)
    into v_enable
    from public.site_settings
   where key = 'store';
  if not v_enable then
    return 0;
  end if;

  -- ---- total berat diambil dari DATABASE, bukan client ----
  for v_row in
    select (it ->> 'product_id')::text as product_id,
           (it ->> 'quantity')::int    as quantity
      from jsonb_array_elements(p_items) as it
  loop
    if v_row.product_id is null or v_row.product_id = '' or v_row.quantity is null or v_row.quantity < 1 then
      return 0;
    end if;
    select coalesce(weight_grams, 0) into v_wg
      from public.products
     where id = v_row.product_id;
    v_total_weight := v_total_weight + (v_wg * v_row.quantity);
  end loop;

  if v_total_weight <= 0 then
    return 0;
  end if;

  -- ---- cari zona aktif yang cocok (provinsi ATAU kota), urut sort_order ----
  select z.id into v_zone_id
    from public.shipping_zones z
   where z.is_active = true
     and (
       (v_province <> '' and exists (
         select 1 from unnest(z.provinces) p where lower(trim(p)) = v_province
       ))
       or
       (v_city <> '' and exists (
         select 1 from unnest(z.cities) c where lower(trim(c)) = v_city
       ))
     )
   order by z.sort_order asc, z.created_at asc
   limit 1;

  if v_zone_id is null then
    return 0;  -- zona belum diatur => gratis
  end if;

  -- ---- band tarif; berat > band terakhir => cost band terakhir ----
  select cost into v_cost
    from public.shipping_rates
   where zone_id = v_zone_id
     and weight_from_g <= v_total_weight
   order by weight_from_g desc
   limit 1;

  return coalesce(v_cost, 0);
end;
$$;

grant execute on function public.estimate_shipping_cost(jsonb, jsonb) to anon, authenticated;

-- =============================================================================
-- create_checkout_order di-recreate (return type tetap text -> CREATE OR REPLACE,
-- GRANT dari 0005/0006 tetap berlaku). Basis: versi 0006 (dengan guard
-- fulfillment_type). Perubahan dari 0006:
--   1) declare tambah v_shipping_cost & v_total
--   2) setelah loop item: hitung ongkir via estimate_shipping_cost
--   3) INSERT orders memakai v_shipping_cost & v_total (bukan 0 / v_subtotal)
-- security definer + set search_path = public tetap eksplisit.
-- =============================================================================
create or replace function public.create_checkout_order(
  p_items            jsonb,           -- [{"product_id":"<id>","quantity":2}, ...]
  p_customer_name    text,
  p_customer_email   text default null,
  p_customer_phone   text default null,
  p_shipping_address jsonb default '{}'::jsonb,  -- {address, city, province, postal_code}
  p_notes            text default null
)
returns text  -- order_code (ORD-YYYYMMDD-XXXX)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item         jsonb;
  v_product_id   text;
  v_qty          integer;
  v_order_id     uuid;
  v_order_code   text;
  v_code         text;
  v_subtotal     numeric := 0;
  v_shipping_cost numeric := 0;
  v_total         numeric := 0;
  v_prod         record;
begin
  -- ---- guard input ----
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang tidak boleh kosong.';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Terlalu banyak item dalam satu checkout.';
  end if;
  if p_customer_name is null or trim(p_customer_name) = '' then
    raise exception 'Nama pembeli wajib diisi.';
  end if;

  drop table if exists tmp_checkout_items;
  create temporary table tmp_checkout_items (
    product_id   text,
    product_name text,
    sku          text,
    unit_price   numeric(14,2),
    quantity     integer,
    weight_grams integer
  ) on commit drop;

  -- ---- proses tiap item ----
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item ->> 'product_id';
    v_qty        := (v_item ->> 'quantity')::int;

    if v_product_id is null or v_product_id = '' then
      raise exception 'Salah satu item tidak valid (ID produk kosong).';
    end if;
    if v_qty is null or v_qty < 1 or v_qty > 999 then
      raise exception 'Jumlah pesanan tidak valid.';
    end if;

    -- Kunci baris produk; harga & data diambil dari DATABASE (bukan client)
    select id, name, sku, price, weight_grams, stock, product_type, is_store_visible, fulfillment_type
      into v_prod
      from public.products
     where id = v_product_id
       for update;

    if not found then
      raise exception 'Produk tidak ditemukan untuk salah satu item keranjang.';
    end if;
    if v_prod.product_type <> 'sparepart' or v_prod.is_store_visible <> true then
      raise exception 'Produk "%" tidak dapat dibeli di halaman Store.', v_prod.name;
    end if;
    if v_prod.fulfillment_type <> 'ready_stock' then
      raise exception 'Produk "%" tidak dapat dibeli langsung. Silakan ajukan kebutuhan atau hubungi tim kami.', v_prod.name;
    end if;
    if v_prod.price is null then
      raise exception 'Produk "%" belum memiliki harga jual.', v_prod.name;
    end if;
    if v_prod.stock < v_qty then
      raise exception 'Stok "%" tidak mencukupi (tersedia %s, diminta %s).',
        v_prod.name, v_prod.stock, v_qty;
    end if;

    -- decrement atomik dengan guard; jika gagal -> trx rollback
    update public.products
       set stock = stock - v_qty
     where id = v_product_id
       and stock >= v_qty;
    if not found then
      raise exception 'Stok "%" berubah saat checkout. Silakan coba lagi.', v_prod.name;
    end if;

    v_subtotal := v_subtotal + (v_prod.price * v_qty);

    insert into tmp_checkout_items
      (product_id, product_name, sku, unit_price, quantity, weight_grams)
    values (v_prod.id, v_prod.name, v_prod.sku, v_prod.price,
            v_qty, coalesce(v_prod.weight_grams, 0));
  end loop;

  -- ---- hitung ongkir (deterministik, satu sumber logika dgn estimasi checkout) ----
  v_shipping_cost := public.estimate_shipping_cost(p_items, p_shipping_address);
  v_total         := v_subtotal + v_shipping_cost;

  -- ---- buat order dengan kode unik ORD-YYYYMMDD-XXXX (retry saat bentrok) ----
  loop
    v_code := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
              lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    begin
      v_order_id := gen_random_uuid();
      insert into public.orders (
        id, order_code, customer_name, customer_email, customer_phone,
        shipping_address, subtotal, shipping_cost, total,
        payment_method, payment_status, status, notes, created_by
      ) values (
        v_order_id, v_code, p_customer_name, p_customer_email, p_customer_phone,
        p_shipping_address, v_subtotal, v_shipping_cost, v_total,
        'transfer', 'pending', 'pending', p_notes, null
      );
      v_order_code := v_code;
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;

  -- ---- tulis item order ----
  insert into public.order_items
    (order_id, product_id, product_name, sku, unit_price, quantity, weight_grams)
  select v_order_id, product_id, product_name, sku, unit_price, quantity, weight_grams
    from tmp_checkout_items;

  drop table tmp_checkout_items;

  return v_order_code;
end;
$$;

-- GRANT untuk create_checkout_order tidak berubah (return type & signature sama);
-- ditulis ulang eksplisit agar tak bergantung pada definisi lama bila migrate ulang.
grant execute on function public.create_checkout_order(jsonb, text, text, text, jsonb, text) to anon, authenticated;
