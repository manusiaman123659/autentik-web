-- =============================================================================
-- Autentik CMS - Public Checkout (Phase: store public checkout)
-- Apply after 0004_media_storage_policies.sql in the Supabase SQL editor.
-- create_checkout_order: SATU-SATUNYA jalur tulis order publik. Atomic:
--   - decrement stok + tulis order/items dalam 1 transaksi (RAISE => rollback)
--   - harga & stok diambil dari DATABASE, bukan dari client
-- SECURITY DEFINER WAJIB: anon TIDAK punya izin UPDATE products di bawah RLS;
--   dengan definer, body berjalan sebagai owner (bypass RLS) untuk operasi di atas.
--   search_path diset eksplisit (tanpa pg_temp) anti search_path hijack.
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
    select id, name, sku, price, weight_grams, stock, product_type, is_store_visible
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
        p_shipping_address, v_subtotal, 0, v_subtotal,
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

-- anon & authenticated butuh EXECUTE untuk memanggil function (cukup; isi body
-- dijalankan sebagai definer/owner sehingga UPDATE products & INSERT orders
-- berhasil tanpa policy tambahan).
grant execute on function public.create_checkout_order(jsonb, text, text, text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tutup celah: anon sebelumnya bisa INSERT orders/order_items LANGSUNG via REST
-- dengan id/qty/harga arbitrer (orders_public_insert / order_items_public_insert
-- = for insert with check (true)). Sekarang create_checkout_order (SECURITY
-- DEFINER) jadi satu-satunya jalur tulis publik. Admin manual order (server action
-- berjalan sebagai sesi admin) tetap jalan via orders_staff_all/order_items_staff_all
-- (FOR ALL USING is_staff()), jadi tidak perlu policy pengganti.
-- ---------------------------------------------------------------------------
drop policy if exists "orders_public_insert" on public.orders;
drop policy if exists "order_items_public_insert" on public.order_items;
