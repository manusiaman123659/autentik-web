-- 0033_update_create_checkout_order.sql
-- Update create_checkout_order: tambah dukungan variant_id
-- Signature TIDAK berubah (p_items tetap jsonb) → CREATE OR REPLACE tanpa DROP.

CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_items            jsonb,
  p_customer_name    text,
  p_customer_email   text default null,
  p_customer_phone   text default null,
  p_shipping_address jsonb default '{}'::jsonb,
  p_notes            text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item              jsonb;
  v_product_id        text;
  v_qty               integer;
  v_order_id          uuid;
  v_order_code        text;
  v_code              text;
  v_subtotal          numeric := 0;
  v_shipping_cost     numeric := 0;
  v_total             numeric := 0;
  v_prod              record;
  v_user_id           uuid := auth.uid();
  -- variant support
  v_variant_id        text;
  v_variant           record;
  v_variant_label     text;        -- extract dari v_variant sebelum INSERT (bukan record access di INSERT)
  v_has_active_variants boolean;
  v_effective_price   numeric(14,2);
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
    product_id    text,
    product_name  text,
    sku           text,
    unit_price    numeric(14,2),
    quantity      integer,
    weight_grams  integer,
    variant_id    uuid,
    variant_label text
  ) on commit drop;

  -- ---- proses tiap item ----
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item ->> 'product_id';
    v_qty        := (v_item ->> 'quantity')::int;
    v_variant_id := nullif(trim(v_item ->> 'variant_id'), '');
    v_variant       := null;
    v_variant_label := null;   -- reset setiap iterasi

    -- validasi format variant_id (defensive programming)
    if v_variant_id is not null and v_variant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Format variant_id tidak valid.';
    end if;

    if v_product_id is null or v_product_id = '' then
      raise exception 'Salah satu item tidak valid (ID produk kosong).';
    end if;
    if v_qty is null or v_qty < 1 or v_qty > 999 then
      raise exception 'Jumlah pesanan tidak valid.';
    end if;

    -- Kunci baris produk (products) — harus duluan sebelum lock varian
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

    -- logic variant
    select exists(
      select 1 from product_variants
       where product_id = v_product_id
         and is_active = true
         and deleted_at is null
    ) into v_has_active_variants;

    -- Produk punya varian aktif tapi client tidak kirim variant_id → REJECT
    if v_has_active_variants and v_variant_id is null then
      raise exception 'Produk "%" memerlukan pemilihan varian.', v_prod.name;
    end if;

    if v_variant_id is not null then
      -- Lock row varian SETELAH products row sudah terkunci (urutan konsisten)
      select id, label, stock, price_override
        into v_variant
        from product_variants
       where id = v_variant_id::uuid
         and product_id = v_product_id
         and is_active = true
         and deleted_at is null
         for update;

      if not found then
        raise exception 'Varian tidak ditemukan atau tidak sesuai untuk produk "%".', v_prod.name;
      end if;

      if v_variant.stock < v_qty then
        raise exception 'Stok varian "% — %" tidak mencukupi (tersedia %, diminta %).',
          v_prod.name, v_variant.label, v_variant.stock, v_qty;
      end if;

      -- Decrement atomik stok varian
      update product_variants
         set stock = stock - v_qty
       where id = v_variant_id::uuid
         and stock >= v_qty;
      if not found then
        raise exception 'Stok varian "% — %" berubah saat checkout. Silakan coba lagi.',
          v_prod.name, v_variant.label;
      end if;

      v_effective_price := coalesce(v_variant.price_override, v_prod.price);
      v_variant_label   := v_variant.label;   -- extract ke variable text SEBELUM INSERT
    else
      -- Produk tanpa varian — behavior existing: decrement products.stock
      if v_prod.stock < v_qty then
        raise exception 'Stok "%" tidak mencukupi (tersedia %, diminta %).',
          v_prod.name, v_prod.stock, v_qty;
      end if;

      update public.products
         set stock = stock - v_qty
       where id = v_product_id
         and stock >= v_qty;
      if not found then
        raise exception 'Stok "%" berubah saat checkout. Silakan coba lagi.', v_prod.name;
      end if;

      v_effective_price := v_prod.price;
    end if;

    v_subtotal := v_subtotal + (v_effective_price * v_qty);

    -- v_variant_label sudah di-extract di atas (bukan v_variant.label)
    -- v_variant_id::uuid aman karena text/uuid biasa, bukan record
    insert into tmp_checkout_items
      (product_id, product_name, sku, unit_price, quantity, weight_grams,
       variant_id, variant_label)
    values (v_prod.id, v_prod.name, v_prod.sku, v_effective_price,
            v_qty, coalesce(v_prod.weight_grams, 0),
            v_variant_id::uuid, v_variant_label);
  end loop;

  -- ---- hitung ongkir ----
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
        payment_method, payment_status, status, notes, created_by, user_id
      ) values (
        v_order_id, v_code, p_customer_name, p_customer_email, p_customer_phone,
        p_shipping_address, v_subtotal, v_shipping_cost, v_total,
        'transfer', 'pending', 'pending', p_notes, null, v_user_id
      );
      v_order_code := v_code;
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;

  -- ---- tulis item order ----
  insert into public.order_items
    (order_id, product_id, product_name, sku, unit_price, quantity, weight_grams,
     variant_id, variant_label)
  select v_order_id, product_id, product_name, sku, unit_price, quantity, weight_grams,
         variant_id, variant_label
    from tmp_checkout_items;

  drop table tmp_checkout_items;

  return v_order_code;
end;
$$;

GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb, text, text, text, jsonb, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
