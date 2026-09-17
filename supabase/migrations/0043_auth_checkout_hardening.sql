-- 0043_auth_checkout_hardening.sql
-- Harden customer signup defaults and authenticated checkout access.
-- This migration intentionally does not change any existing profile role.

-- Keep the column default aligned with the public signup policy.
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'customer';

-- Every new auth user receives a non-staff role. Authorization never reads
-- role from user-editable metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;
  RETURN new;
END;
$$;

-- Trigger functions are invoked by the trigger, not directly by API roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Recreate the latest variant-aware checkout RPC with an authenticated-user
-- guard. Return type and signature are unchanged from migration 0033.
CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_items            jsonb,
  p_customer_name    text,
  p_customer_email   text DEFAULT NULL,
  p_customer_phone   text DEFAULT NULL,
  p_shipping_address jsonb DEFAULT '{}'::jsonb,
  p_notes            text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item                jsonb;
  v_product_id          text;
  v_qty                 integer;
  v_order_id            uuid;
  v_order_code          text;
  v_code                text;
  v_subtotal            numeric := 0;
  v_shipping_cost       numeric := 0;
  v_total               numeric := 0;
  v_prod                record;
  v_user_id             uuid := auth.uid();
  v_variant_id          text;
  v_variant             record;
  v_variant_label       text;
  v_has_active_variants boolean;
  v_effective_price     numeric(14,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk membuat pesanan.'
      USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Keranjang tidak boleh kosong.';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Terlalu banyak item dalam satu checkout.';
  END IF;
  IF p_customer_name IS NULL OR trim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Nama pembeli wajib diisi.';
  END IF;

  DROP TABLE IF EXISTS tmp_checkout_items;
  CREATE TEMPORARY TABLE tmp_checkout_items (
    product_id    text,
    product_name  text,
    sku           text,
    unit_price    numeric(14,2),
    quantity      integer,
    weight_grams  integer,
    variant_id    uuid,
    variant_label text
  ) ON COMMIT DROP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id    := v_item ->> 'product_id';
    v_qty           := (v_item ->> 'quantity')::int;
    v_variant_id    := nullif(trim(v_item ->> 'variant_id'), '');
    v_variant       := NULL;
    v_variant_label := NULL;

    IF v_variant_id IS NOT NULL
       AND v_variant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Format variant_id tidak valid.';
    END IF;

    IF v_product_id IS NULL OR v_product_id = '' THEN
      RAISE EXCEPTION 'Salah satu item tidak valid (ID produk kosong).';
    END IF;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 999 THEN
      RAISE EXCEPTION 'Jumlah pesanan tidak valid.';
    END IF;

    SELECT id, name, sku, price, weight_grams, stock, product_type,
           is_store_visible, fulfillment_type
      INTO v_prod
      FROM public.products
     WHERE id = v_product_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan untuk salah satu item keranjang.';
    END IF;
    IF v_prod.product_type <> 'sparepart' OR v_prod.is_store_visible <> true THEN
      RAISE EXCEPTION 'Produk "%" tidak dapat dibeli di halaman Store.', v_prod.name;
    END IF;
    IF v_prod.fulfillment_type <> 'ready_stock' THEN
      RAISE EXCEPTION 'Produk "%" tidak dapat dibeli langsung. Silakan ajukan kebutuhan atau hubungi tim kami.', v_prod.name;
    END IF;
    IF v_prod.price IS NULL THEN
      RAISE EXCEPTION 'Produk "%" belum memiliki harga jual.', v_prod.name;
    END IF;

    SELECT EXISTS (
      SELECT 1
        FROM public.product_variants
       WHERE product_id = v_product_id
         AND is_active = true
         AND deleted_at IS NULL
    ) INTO v_has_active_variants;

    IF v_has_active_variants AND v_variant_id IS NULL THEN
      RAISE EXCEPTION 'Produk "%" memerlukan pemilihan varian.', v_prod.name;
    END IF;

    IF v_variant_id IS NOT NULL THEN
      SELECT id, label, stock, price_override
        INTO v_variant
        FROM public.product_variants
       WHERE id = v_variant_id::uuid
         AND product_id = v_product_id
         AND is_active = true
         AND deleted_at IS NULL
         FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Varian tidak ditemukan atau tidak sesuai untuk produk "%".', v_prod.name;
      END IF;

      IF v_variant.stock < v_qty THEN
        RAISE EXCEPTION 'Stok varian "% — %" tidak mencukupi (tersedia %, diminta %).',
          v_prod.name, v_variant.label, v_variant.stock, v_qty;
      END IF;

      UPDATE public.product_variants
         SET stock = stock - v_qty
       WHERE id = v_variant_id::uuid
         AND stock >= v_qty;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stok varian "% — %" berubah saat checkout. Silakan coba lagi.',
          v_prod.name, v_variant.label;
      END IF;

      v_effective_price := COALESCE(v_variant.price_override, v_prod.price);
      v_variant_label   := v_variant.label;
    ELSE
      IF v_prod.stock < v_qty THEN
        RAISE EXCEPTION 'Stok "%" tidak mencukupi (tersedia %, diminta %).',
          v_prod.name, v_prod.stock, v_qty;
      END IF;

      UPDATE public.products
         SET stock = stock - v_qty
       WHERE id = v_product_id
         AND stock >= v_qty;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stok "%" berubah saat checkout. Silakan coba lagi.', v_prod.name;
      END IF;

      v_effective_price := v_prod.price;
    END IF;

    v_subtotal := v_subtotal + (v_effective_price * v_qty);

    INSERT INTO tmp_checkout_items (
      product_id,
      product_name,
      sku,
      unit_price,
      quantity,
      weight_grams,
      variant_id,
      variant_label
    ) VALUES (
      v_prod.id,
      v_prod.name,
      v_prod.sku,
      v_effective_price,
      v_qty,
      COALESCE(v_prod.weight_grams, 0),
      v_variant_id::uuid,
      v_variant_label
    );
  END LOOP;

  v_shipping_cost := public.estimate_shipping_cost(p_items, p_shipping_address);
  v_total         := v_subtotal + v_shipping_cost;

  LOOP
    v_code := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
              lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    BEGIN
      v_order_id := gen_random_uuid();
      INSERT INTO public.orders (
        id,
        order_code,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        subtotal,
        shipping_cost,
        total,
        payment_method,
        payment_status,
        status,
        notes,
        created_by,
        user_id
      ) VALUES (
        v_order_id,
        v_code,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        p_shipping_address,
        v_subtotal,
        v_shipping_cost,
        v_total,
        'midtrans',
        'pending',
        'pending',
        p_notes,
        NULL,
        v_user_id
      );
      v_order_code := v_code;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    sku,
    unit_price,
    quantity,
    weight_grams,
    variant_id,
    variant_label
  )
  SELECT
    v_order_id,
    product_id,
    product_name,
    sku,
    unit_price,
    quantity,
    weight_grams,
    variant_id,
    variant_label
  FROM tmp_checkout_items;

  DROP TABLE tmp_checkout_items;

  RETURN v_order_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_checkout_order(jsonb, text, text, text, jsonb, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb, text, text, text, jsonb, text)
  TO authenticated;

-- Customers may read item snapshots only through their own undeleted order.
DROP POLICY IF EXISTS order_items_select_own ON public.order_items;
CREATE POLICY order_items_select_own
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = (SELECT auth.uid())
        AND o.deleted_at IS NULL
    )
  );

NOTIFY pgrst, 'reload schema';
