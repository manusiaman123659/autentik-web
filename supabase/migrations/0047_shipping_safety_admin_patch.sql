-- 0047_shipping_safety_admin_patch.sql
-- Delta patch for shipping safety: active-only region index uniqueness,
-- payment null-safety immutability, active-product checkout enforcement,
-- shared internal weight matcher, and staff diagnostic test RPC.
--
-- Note: Applies on top of live 0045 and 0046 migrations.

BEGIN;

-- 1. Deployment guard: Reject migration if duplicate active normalized regions exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.shipping_zone_regions a
    JOIN public.shipping_zone_regions b
      ON b.id > a.id
     AND lower(btrim(b.province)) = lower(btrim(a.province))
     AND lower(btrim(b.city)) = lower(btrim(a.city))
     AND a.city IS NOT NULL
     AND b.city IS NOT NULL
     AND a.is_active = true
     AND b.is_active = true
  ) THEN
    RAISE EXCEPTION 'Migration 0047 dibatalkan: terdapat duplikasi pemetaan kota aktif pada shipping_zone_regions.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.shipping_zone_regions a
    JOIN public.shipping_zone_regions b
      ON b.id > a.id
     AND lower(btrim(b.province)) = lower(btrim(a.province))
     AND a.city IS NULL
     AND b.city IS NULL
     AND a.is_active = true
     AND b.is_active = true
  ) THEN
    RAISE EXCEPTION 'Migration 0047 dibatalkan: terdapat duplikasi pemetaan provinsi aktif pada shipping_zone_regions.';
  END IF;
END;
$$;

-- 2. Patch region unique indexes: enforce uniqueness only for active mappings
DROP INDEX IF EXISTS public.shipping_zone_regions_exact_city_uidx;
DROP INDEX IF EXISTS public.shipping_zone_regions_province_uidx;

CREATE UNIQUE INDEX shipping_zone_regions_exact_city_uidx
  ON public.shipping_zone_regions (lower(btrim(province)), lower(btrim(city)))
  WHERE city IS NOT NULL
    AND is_active = true;

CREATE UNIQUE INDEX shipping_zone_regions_province_uidx
  ON public.shipping_zone_regions (lower(btrim(province)))
  WHERE city IS NULL
    AND is_active = true;

-- Defense in depth: ensure legacy PUBLIC privileges are revoked
REVOKE ALL ON TABLE public.shipping_zones FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.shipping_rates FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shipping_zones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shipping_rates TO authenticated;

-- 3. Patch financial immutability: payment_status IS DISTINCT FROM 'pending'
CREATE OR REPLACE FUNCTION public.protect_order_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    OLD.midtrans_order_id IS NOT NULL
    OR OLD.midtrans_redirect_url IS NOT NULL
    OR NEW.midtrans_order_id IS NOT NULL
    OR NEW.midtrans_redirect_url IS NOT NULL
    OR OLD.payment_status IS DISTINCT FROM 'pending'
    OR NEW.payment_status IS DISTINCT FROM 'pending'
  ) AND (
    NEW.subtotal IS DISTINCT FROM OLD.subtotal
    OR NEW.shipping_cost IS DISTINCT FROM OLD.shipping_cost
    OR NEW.total IS DISTINCT FROM OLD.total
    OR NEW.shipping_total_weight_g IS DISTINCT FROM OLD.shipping_total_weight_g
    OR NEW.shipping_zone_id IS DISTINCT FROM OLD.shipping_zone_id
    OR NEW.shipping_rate_id IS DISTINCT FROM OLD.shipping_rate_id
  ) THEN
    RAISE EXCEPTION 'Nilai finansial pesanan tidak dapat diubah setelah proses pembayaran dimulai.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_order_financial_fields() FROM PUBLIC, anon, authenticated;

-- 4. Shared internal authoritative region and weight-band matcher
CREATE OR REPLACE FUNCTION public.resolve_shipping_rate_for_weight(
  p_province       text,
  p_city           text,
  p_total_weight_g bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_province      text := lower(btrim(coalesce(p_province, '')));
  v_city          text := lower(btrim(coalesce(p_city, '')));
  v_match_count   integer := 0;
  v_region_id     uuid;
  v_zone_id       uuid;
  v_zone_name     text;
  v_rate_id       uuid;
  v_weight_from_g integer;
  v_weight_to_g   integer;
  v_cost          numeric(14,2);
BEGIN
  IF v_province = '' THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'INVALID_ADDRESS');
  END IF;

  IF p_total_weight_g IS NULL OR p_total_weight_g <= 0 THEN
    RETURN jsonb_build_object('status', 'INVALID_WEIGHT', 'reasonCode', 'INVALID_TOTAL_WEIGHT');
  END IF;

  IF p_total_weight_g > 2147483647 THEN
    RETURN jsonb_build_object('status', 'INVALID_WEIGHT', 'reasonCode', 'WEIGHT_OUT_OF_RANGE');
  END IF;

  -- Exact province + city has precedence (if city is provided).
  IF v_city <> '' THEN
    SELECT count(*), min(r.id), min(r.zone_id), min(z.name)
      INTO v_match_count, v_region_id, v_zone_id, v_zone_name
      FROM public.shipping_zone_regions r
      JOIN public.shipping_zones z ON z.id = r.zone_id
     WHERE r.is_active = true
       AND z.is_active = true
       AND r.city IS NOT NULL
       AND lower(btrim(r.province)) = v_province
       AND lower(btrim(r.city)) = v_city;
  END IF;

  -- Province-wide fallback (city IS NULL).
  IF v_match_count = 0 THEN
    SELECT count(*), min(r.id), min(r.zone_id), min(z.name)
      INTO v_match_count, v_region_id, v_zone_id, v_zone_name
      FROM public.shipping_zone_regions r
      JOIN public.shipping_zones z ON z.id = r.zone_id
     WHERE r.is_active = true
       AND z.is_active = true
       AND r.city IS NULL
       AND lower(btrim(r.province)) = v_province;
  END IF;

  IF v_match_count = 0 THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'REGION_NOT_FOUND');
  END IF;
  IF v_match_count > 1 THEN
    RETURN jsonb_build_object('status', 'CONFIGURATION_ERROR', 'reasonCode', 'AMBIGUOUS_REGION');
  END IF;

  -- Match active inclusive weight band for the matched zone.
  SELECT count(*), min(r.id), min(r.cost), min(r.weight_from_g), min(r.weight_to_g)
    INTO v_match_count, v_rate_id, v_cost, v_weight_from_g, v_weight_to_g
    FROM public.shipping_rates r
   WHERE r.zone_id = v_zone_id
     AND r.is_active = true
     AND r.weight_from_g <= p_total_weight_g
     AND r.weight_to_g >= p_total_weight_g;

  IF v_match_count = 0 THEN
    RETURN jsonb_build_object(
      'status', 'SHIPPING_UNAVAILABLE',
      'reasonCode', 'RATE_NOT_FOUND',
      'zoneId', v_zone_id,
      'zoneName', v_zone_name
    );
  END IF;
  IF v_match_count > 1 THEN
    RETURN jsonb_build_object(
      'status', 'CONFIGURATION_ERROR',
      'reasonCode', 'AMBIGUOUS_RATE',
      'zoneId', v_zone_id,
      'zoneName', v_zone_name
    );
  END IF;
  IF v_cost IS NULL OR v_cost <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'CONFIGURATION_ERROR',
      'reasonCode', 'INVALID_RATE',
      'zoneId', v_zone_id,
      'zoneName', v_zone_name
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'QUOTED',
    'reasonCode', 'OK',
    'cost', v_cost,
    'totalWeightG', p_total_weight_g,
    'zoneId', v_zone_id,
    'zoneName', v_zone_name,
    'rateId', v_rate_id,
    'weightFromG', v_weight_from_g,
    'weightToG', v_weight_to_g
  );
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'INVALID_INPUT');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_shipping_rate_for_weight(text, text, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shipping_rate_for_weight(text, text, bigint)
  TO service_role;

-- 5. Replace resolve_shipping_quote(): add is_active guard and call shared matcher
CREATE OR REPLACE FUNCTION public.resolve_shipping_quote(
  p_items jsonb,
  p_shipping_address jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item          jsonb;
  v_product_id    text;
  v_quantity_text text;
  v_quantity      integer;
  v_weight_g      integer;
  v_total_weight  bigint := 0;
  v_enable        boolean := false;
  v_province      text := lower(btrim(coalesce(p_shipping_address ->> 'province', '')));
  v_city          text := lower(btrim(coalesce(p_shipping_address ->> 'city', '')));
BEGIN
  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'INVALID_ITEMS');
  END IF;

  SELECT coalesce((value ->> 'enableShipping')::boolean, false)
    INTO v_enable
    FROM public.site_settings
   WHERE key = 'store';

  IF NOT v_enable THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'SHIPPING_DISABLED');
  END IF;

  IF v_province = '' OR v_city = '' THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'INVALID_ADDRESS');
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'INVALID_ITEMS');
    END IF;

    v_product_id := btrim(coalesce(v_item ->> 'product_id', ''));
    v_quantity_text := btrim(coalesce(v_item ->> 'quantity', ''));

    IF v_product_id = '' OR v_quantity_text !~ '^[1-9][0-9]{0,2}$' THEN
      RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'INVALID_ITEMS');
    END IF;
    v_quantity := v_quantity_text::integer;

    SELECT p.weight_grams
      INTO v_weight_g
      FROM public.products p
     WHERE p.id = v_product_id
       AND p.product_type = 'sparepart'
       AND p.is_store_visible = true
       AND p.fulfillment_type = 'ready_stock'
       AND p.is_active = true
       AND p.deleted_at IS NULL;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'PRODUCT_UNAVAILABLE');
    END IF;
    IF v_weight_g IS NULL OR v_weight_g <= 0 THEN
      RETURN jsonb_build_object('status', 'INVALID_WEIGHT', 'reasonCode', 'INVALID_PRODUCT_WEIGHT');
    END IF;

    v_total_weight := v_total_weight + (v_weight_g::bigint * v_quantity::bigint);
    IF v_total_weight > 2147483647 THEN
      RETURN jsonb_build_object('status', 'INVALID_WEIGHT', 'reasonCode', 'WEIGHT_OUT_OF_RANGE');
    END IF;
  END LOOP;

  IF v_total_weight <= 0 THEN
    RETURN jsonb_build_object('status', 'INVALID_WEIGHT', 'reasonCode', 'INVALID_TOTAL_WEIGHT');
  END IF;

  RETURN public.resolve_shipping_rate_for_weight(v_province, v_city, v_total_weight);
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'INVALID_INPUT');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_shipping_quote(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shipping_quote(jsonb, jsonb)
  TO service_role;

-- 6. Replace create_checkout_order(): enforce product is_active
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
  v_item                  jsonb;
  v_product_id            text;
  v_qty_text              text;
  v_qty                   integer;
  v_order_id              uuid;
  v_order_code            text;
  v_code                  text;
  v_subtotal              numeric(14,2) := 0;
  v_shipping_cost         numeric(14,2);
  v_total                 numeric(14,2);
  v_shipping_total_weight bigint;
  v_shipping_zone_id      uuid;
  v_shipping_rate_id      uuid;
  v_quote                 jsonb;
  v_prod                  record;
  v_user_id               uuid := auth.uid();
  v_variant_id_text       text;
  v_variant_id            uuid;
  v_variant               record;
  v_variant_label         text;
  v_has_active_variants   boolean;
  v_effective_price       numeric(14,2);
  v_checkout_item         record;
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
  IF p_customer_name IS NULL OR btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Nama pembeli wajib diisi.';
  END IF;

  DROP TABLE IF EXISTS tmp_requested_items;
  CREATE TEMPORARY TABLE tmp_requested_items (
    product_id text NOT NULL,
    quantity   integer NOT NULL,
    variant_id uuid
  ) ON COMMIT DROP;

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

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Salah satu item keranjang tidak valid.';
    END IF;

    v_product_id      := btrim(coalesce(v_item ->> 'product_id', ''));
    v_qty_text        := btrim(coalesce(v_item ->> 'quantity', ''));
    v_variant_id_text := nullif(btrim(v_item ->> 'variant_id'), '');
    v_variant_id      := NULL;

    IF v_product_id = '' THEN
      RAISE EXCEPTION 'Salah satu item tidak valid (ID produk kosong).';
    END IF;
    IF v_qty_text !~ '^[1-9][0-9]{0,2}$' THEN
      RAISE EXCEPTION 'Jumlah pesanan tidak valid.';
    END IF;
    v_qty := v_qty_text::integer;

    IF v_variant_id_text IS NOT NULL THEN
      IF v_variant_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Format variant_id tidak valid.';
      END IF;
      v_variant_id := v_variant_id_text::uuid;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM tmp_requested_items r
      WHERE r.product_id = v_product_id
        AND r.variant_id IS NOT DISTINCT FROM v_variant_id
    ) THEN
      RAISE EXCEPTION 'Item keranjang duplikat. Perbarui jumlah pada satu baris item.';
    END IF;

    INSERT INTO tmp_requested_items (product_id, quantity, variant_id)
    VALUES (v_product_id, v_qty, v_variant_id);
  END LOOP;

  -- Lock and validate every purchasable row before resolving shipping.
  FOR v_checkout_item IN SELECT * FROM tmp_requested_items
  LOOP
    v_variant       := NULL;
    v_variant_label := NULL;

    SELECT id, name, sku, price, weight_grams, stock, product_type,
           is_active, is_store_visible, fulfillment_type
      INTO v_prod
      FROM public.products
     WHERE id = v_checkout_item.product_id
       AND deleted_at IS NULL
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan untuk salah satu item keranjang.';
    END IF;
    IF v_prod.is_active <> true OR v_prod.product_type <> 'sparepart' OR v_prod.is_store_visible <> true THEN
      RAISE EXCEPTION 'Produk "%" tidak dapat dibeli di halaman Store.', v_prod.name;
    END IF;
    IF v_prod.fulfillment_type <> 'ready_stock' THEN
      RAISE EXCEPTION 'Produk "%" tidak dapat dibeli langsung. Silakan ajukan kebutuhan atau hubungi tim kami.', v_prod.name;
    END IF;
    IF v_prod.price IS NULL THEN
      RAISE EXCEPTION 'Produk "%" belum memiliki harga jual.', v_prod.name;
    END IF;
    IF v_prod.weight_grams IS NULL OR v_prod.weight_grams <= 0 THEN
      RAISE EXCEPTION 'Ongkir untuk alamat atau pesanan ini perlu dikonfirmasi.'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.product_variants
      WHERE product_id = v_checkout_item.product_id
        AND is_active = true
        AND deleted_at IS NULL
    ) INTO v_has_active_variants;

    IF v_has_active_variants AND v_checkout_item.variant_id IS NULL THEN
      RAISE EXCEPTION 'Produk "%" memerlukan pemilihan varian.', v_prod.name;
    END IF;

    IF v_checkout_item.variant_id IS NOT NULL THEN
      SELECT id, label, stock, price_override
        INTO v_variant
        FROM public.product_variants
       WHERE id = v_checkout_item.variant_id
         AND product_id = v_checkout_item.product_id
         AND is_active = true
         AND deleted_at IS NULL
       FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Varian tidak ditemukan atau tidak sesuai untuk produk "%".', v_prod.name;
      END IF;
      IF v_variant.stock < v_checkout_item.quantity THEN
        RAISE EXCEPTION 'Stok varian "% — %" tidak mencukupi (tersedia %, diminta %).',
          v_prod.name, v_variant.label, v_variant.stock, v_checkout_item.quantity;
      END IF;

      v_effective_price := coalesce(v_variant.price_override, v_prod.price);
      v_variant_label   := v_variant.label;
    ELSE
      IF v_prod.stock < v_checkout_item.quantity THEN
        RAISE EXCEPTION 'Stok "%" tidak mencukupi (tersedia %, diminta %).',
          v_prod.name, v_prod.stock, v_checkout_item.quantity;
      END IF;
      v_effective_price := v_prod.price;
    END IF;

    v_subtotal := v_subtotal + (v_effective_price * v_checkout_item.quantity);

    INSERT INTO tmp_checkout_items (
      product_id, product_name, sku, unit_price, quantity,
      weight_grams, variant_id, variant_label
    ) VALUES (
      v_prod.id, v_prod.name, v_prod.sku, v_effective_price,
      v_checkout_item.quantity, v_prod.weight_grams,
      v_checkout_item.variant_id, v_variant_label
    );
  END LOOP;

  v_quote := public.resolve_shipping_quote(p_items, p_shipping_address);
  IF v_quote ->> 'status' <> 'QUOTED'
     OR coalesce((v_quote ->> 'cost')::numeric, 0) <= 0 THEN
    RAISE EXCEPTION 'Ongkir untuk alamat atau pesanan ini perlu dikonfirmasi.'
      USING ERRCODE = 'P0001';
  END IF;

  v_shipping_cost         := (v_quote ->> 'cost')::numeric(14,2);
  v_shipping_total_weight := (v_quote ->> 'totalWeightG')::bigint;
  v_shipping_zone_id      := (v_quote ->> 'zoneId')::uuid;
  v_shipping_rate_id      := (v_quote ->> 'rateId')::uuid;
  v_total                 := v_subtotal + v_shipping_cost;

  -- Stock changes happen only after shipping is valid.
  FOR v_checkout_item IN SELECT * FROM tmp_checkout_items
  LOOP
    IF v_checkout_item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
         SET stock = stock - v_checkout_item.quantity
       WHERE id = v_checkout_item.variant_id
         AND stock >= v_checkout_item.quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stok varian berubah saat checkout. Silakan coba lagi.';
      END IF;
    ELSE
      UPDATE public.products
         SET stock = stock - v_checkout_item.quantity
       WHERE id = v_checkout_item.product_id
         AND stock >= v_checkout_item.quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Stok produk berubah saat checkout. Silakan coba lagi.';
      END IF;
    END IF;
  END LOOP;

  LOOP
    v_code := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
              lpad(floor(random() * 9000 + 1000)::text, 4, '0');
    BEGIN
      v_order_id := gen_random_uuid();
      INSERT INTO public.orders (
        id, order_code, customer_name, customer_email, customer_phone,
        shipping_address, subtotal, shipping_cost, total,
        shipping_total_weight_g, shipping_zone_id, shipping_rate_id,
        payment_method, payment_status, status, notes, created_by, user_id
      ) VALUES (
        v_order_id, v_code, p_customer_name, p_customer_email, p_customer_phone,
        p_shipping_address, v_subtotal, v_shipping_cost, v_total,
        v_shipping_total_weight, v_shipping_zone_id, v_shipping_rate_id,
        'midtrans', 'pending', 'pending', p_notes, NULL, v_user_id
      );
      v_order_code := v_code;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, sku, unit_price, quantity,
    weight_grams, variant_id, variant_label
  )
  SELECT
    v_order_id, product_id, product_name, sku, unit_price, quantity,
    weight_grams, variant_id, variant_label
  FROM tmp_checkout_items;

  DROP TABLE tmp_checkout_items;
  DROP TABLE tmp_requested_items;

  RETURN v_order_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_checkout_order(jsonb, text, text, text, jsonb, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb, text, text, text, jsonb, text)
  TO authenticated;

-- 7. Staff diagnostic test RPC
CREATE OR REPLACE FUNCTION public.test_shipping_rate(
  p_province       text,
  p_city           text,
  p_total_weight_g bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enable boolean := false;
  v_quote  jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya staf yang dapat menjalankan uji tarif pengiriman.'
      USING ERRCODE = '42501';
  END IF;

  SELECT coalesce((value ->> 'enableShipping')::boolean, false)
    INTO v_enable
    FROM public.site_settings
   WHERE key = 'store';

  v_quote := public.resolve_shipping_rate_for_weight(p_province, p_city, p_total_weight_g);

  RETURN v_quote || jsonb_build_object('storeShippingEnabled', v_enable);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.test_shipping_rate(text, text, bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.test_shipping_rate(text, text, bigint)
  TO authenticated;

-- 8. Reaffirm public/anon revokes on customer-facing quote functions (authenticated only)
REVOKE EXECUTE ON FUNCTION public.get_shipping_quote(jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shipping_quote(jsonb, jsonb)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.estimate_shipping_cost(jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estimate_shipping_cost(jsonb, jsonb)
  TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

