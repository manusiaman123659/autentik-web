-- 0045_shipping_safety.sql
-- Fail-closed shipping quotes for Marketplace Komponen.
--
-- IMPORTANT DEPLOYMENT GUARD:
-- This migration intentionally seeds no regions, zones, or rates. Do not apply
-- it to production checkout until the live read-only audit is clean and real
-- region/rate configuration is ready. Once applied, missing configuration makes
-- shipping unavailable; it never means free shipping.

BEGIN;

-- Normalized region membership. A null city is a province-wide fallback;
-- a non-null city is an exact province + city match and has precedence.
CREATE TABLE public.shipping_zone_regions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     uuid NOT NULL REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  province    text NOT NULL CHECK (btrim(province) <> ''),
  city        text CHECK (city IS NULL OR btrim(city) <> ''),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX shipping_zone_regions_exact_city_uidx
  ON public.shipping_zone_regions (lower(btrim(province)), lower(btrim(city)))
  WHERE city IS NOT NULL;

CREATE UNIQUE INDEX shipping_zone_regions_province_uidx
  ON public.shipping_zone_regions (lower(btrim(province)))
  WHERE city IS NULL;

CREATE INDEX shipping_zone_regions_zone_idx
  ON public.shipping_zone_regions (zone_id);

CREATE INDEX shipping_zone_regions_active_lookup_idx
  ON public.shipping_zone_regions (lower(btrim(province)), lower(btrim(city)))
  WHERE is_active = true;

CREATE TRIGGER shipping_zone_regions_set_updated_at
  BEFORE UPDATE ON public.shipping_zone_regions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.shipping_zone_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping_zone_regions_staff_all"
  ON public.shipping_zone_regions
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

REVOKE ALL ON TABLE public.shipping_zone_regions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shipping_zone_regions TO authenticated;
GRANT ALL ON TABLE public.shipping_zone_regions TO service_role;

-- Public clients quote through the narrow RPC, not direct table reads.
DROP POLICY IF EXISTS "shipping_zones_public_select" ON public.shipping_zones;
DROP POLICY IF EXISTS "shipping_rates_public_select" ON public.shipping_rates;
REVOKE ALL ON TABLE public.shipping_zones FROM anon;
REVOKE ALL ON TABLE public.shipping_rates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shipping_zones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shipping_rates TO authenticated;

-- Existing data must pass these constraints. The migration intentionally does
-- not repair or invent business data.
ALTER TABLE public.shipping_rates
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.shipping_rates
  DROP CONSTRAINT IF EXISTS shipping_rates_weight_to_g_check,
  DROP CONSTRAINT IF EXISTS shipping_rates_cost_check;

ALTER TABLE public.shipping_rates
  ADD CONSTRAINT shipping_rates_valid_weight_range_check
    CHECK (weight_from_g >= 0 AND weight_to_g >= weight_from_g),
  ADD CONSTRAINT shipping_rates_positive_cost_check
    CHECK (cost > 0),
  ADD CONSTRAINT shipping_rates_zone_id_id_key
    UNIQUE (zone_id, id);

-- btree_gist is not declared in the current project and live availability could
-- not be assumed while drafting. Serialize writes per zone with a transaction-
-- level advisory lock, then reject inclusive range overlap. This is safe against
-- concurrent inserts/updates without requiring an extension.
CREATE OR REPLACE FUNCTION public.prevent_shipping_rate_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.zone_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.shipping_rates r
    WHERE r.zone_id = NEW.zone_id
      AND r.id <> NEW.id
      AND r.is_active = true
      AND NEW.is_active = true
      AND r.weight_from_g <= NEW.weight_to_g
      AND NEW.weight_from_g <= r.weight_to_g
  ) THEN
    RAISE EXCEPTION 'Rentang berat bertumpang tindih dengan tarif aktif lain pada zona yang sama.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_shipping_rate_overlap() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.shipping_rates a
    JOIN public.shipping_rates b
      ON b.zone_id = a.zone_id
     AND b.id > a.id
     AND a.is_active = true
     AND b.is_active = true
     AND a.weight_from_g <= b.weight_to_g
     AND b.weight_from_g <= a.weight_to_g
  ) THEN
    RAISE EXCEPTION 'Migration 0045 dibatalkan: terdapat rentang tarif aktif yang bertumpang tindih.';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS shipping_rates_prevent_overlap ON public.shipping_rates;
CREATE TRIGGER shipping_rates_prevent_overlap
  BEFORE INSERT OR UPDATE OF zone_id, weight_from_g, weight_to_g, is_active
  ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_shipping_rate_overlap();

CREATE INDEX shipping_rates_active_zone_range_idx
  ON public.shipping_rates (zone_id, weight_from_g, weight_to_g)
  WHERE is_active = true;

-- Nullable evidence keeps legacy orders readable. RESTRICT preserves provenance:
-- referenced zones/rates must be retained and deactivated instead of deleted.
ALTER TABLE public.orders
  ADD COLUMN shipping_total_weight_g bigint,
  ADD COLUMN shipping_zone_id uuid,
  ADD COLUMN shipping_rate_id uuid,
  ADD CONSTRAINT orders_shipping_weight_positive_check
    CHECK (shipping_total_weight_g IS NULL OR shipping_total_weight_g > 0),
  ADD CONSTRAINT orders_shipping_zone_fk
    FOREIGN KEY (shipping_zone_id)
    REFERENCES public.shipping_zones(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT orders_shipping_rate_fk
    FOREIGN KEY (shipping_zone_id, shipping_rate_id)
    REFERENCES public.shipping_rates(zone_id, id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT orders_shipping_evidence_complete_check
    CHECK (
      (shipping_total_weight_g IS NULL AND shipping_zone_id IS NULL AND shipping_rate_id IS NULL)
      OR
      (shipping_total_weight_g IS NOT NULL AND shipping_zone_id IS NOT NULL AND shipping_rate_id IS NOT NULL)
    );

CREATE INDEX orders_shipping_zone_idx
  ON public.orders (shipping_zone_id)
  WHERE shipping_zone_id IS NOT NULL;

CREATE INDEX orders_shipping_rate_idx
  ON public.orders (shipping_rate_id)
  WHERE shipping_rate_id IS NOT NULL;

-- Freeze only financial and quote-evidence fields once a Midtrans intent exists
-- or payment has left pending. Fulfillment status/tracking updates remain valid.
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
    OR OLD.payment_status <> 'pending'
    OR NEW.payment_status <> 'pending'
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

DROP TRIGGER IF EXISTS orders_protect_financial_fields ON public.orders;
CREATE TRIGGER orders_protect_financial_fields
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.protect_order_financial_fields();

-- Internal authoritative resolver. The reasonCode is deliberately private;
-- customer callers receive only the sanitized status and generic message from
-- get_shipping_quote().
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
  v_match_count   integer := 0;
  v_region_id     uuid;
  v_zone_id       uuid;
  v_rate_id       uuid;
  v_cost          numeric(14,2);
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

  -- Exact province + city has precedence.
  SELECT count(*), min(r.id), min(r.zone_id)
    INTO v_match_count, v_region_id, v_zone_id
    FROM public.shipping_zone_regions r
    JOIN public.shipping_zones z ON z.id = r.zone_id
   WHERE r.is_active = true
     AND z.is_active = true
     AND r.city IS NOT NULL
     AND lower(btrim(r.province)) = v_province
     AND lower(btrim(r.city)) = v_city;

  IF v_match_count = 0 THEN
    SELECT count(*), min(r.id), min(r.zone_id)
      INTO v_match_count, v_region_id, v_zone_id
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

  SELECT count(*), min(r.id), min(r.cost)
    INTO v_match_count, v_rate_id, v_cost
    FROM public.shipping_rates r
   WHERE r.zone_id = v_zone_id
     AND r.is_active = true
     AND r.weight_from_g <= v_total_weight
     AND r.weight_to_g >= v_total_weight;

  IF v_match_count = 0 THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'RATE_NOT_FOUND');
  END IF;
  IF v_match_count > 1 THEN
    RETURN jsonb_build_object('status', 'CONFIGURATION_ERROR', 'reasonCode', 'AMBIGUOUS_RATE');
  END IF;
  IF v_cost IS NULL OR v_cost <= 0 THEN
    RETURN jsonb_build_object('status', 'CONFIGURATION_ERROR', 'reasonCode', 'INVALID_RATE');
  END IF;

  RETURN jsonb_build_object(
    'status', 'QUOTED',
    'reasonCode', 'OK',
    'cost', v_cost,
    'totalWeightG', v_total_weight,
    'zoneId', v_zone_id,
    'rateId', v_rate_id
  );
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN jsonb_build_object('status', 'SHIPPING_UNAVAILABLE', 'reasonCode', 'INVALID_INPUT');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_shipping_quote(jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shipping_quote(jsonb, jsonb)
  TO service_role;

-- New structured preview RPC. Failure details are intentionally sanitized.
CREATE OR REPLACE FUNCTION public.get_shipping_quote(
  p_items jsonb,
  p_shipping_address jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk menghitung ongkir.'
      USING ERRCODE = '42501';
  END IF;

  v_quote := public.resolve_shipping_quote(p_items, p_shipping_address);

  IF v_quote ->> 'status' = 'QUOTED'
     AND coalesce((v_quote ->> 'cost')::numeric, 0) > 0 THEN
    RETURN (v_quote - 'reasonCode') || jsonb_build_object('message', NULL);
  END IF;

  RETURN jsonb_build_object(
    'status', coalesce(v_quote ->> 'status', 'CONFIGURATION_ERROR'),
    'cost', NULL,
    'totalWeightG', NULL,
    'zoneId', NULL,
    'rateId', NULL,
    'message', 'Ongkir untuk alamat atau pesanan ini perlu dikonfirmasi.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_shipping_quote(jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shipping_quote(jsonb, jsonb)
  TO authenticated;

-- Temporary numeric compatibility wrapper. It keeps the existing return
-- contract but is now fail-closed instead of using zero as an error sentinel.
CREATE OR REPLACE FUNCTION public.estimate_shipping_cost(
  p_items jsonb,
  p_shipping_address jsonb DEFAULT '{}'::jsonb
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk menghitung ongkir.'
      USING ERRCODE = '42501';
  END IF;

  v_quote := public.resolve_shipping_quote(p_items, p_shipping_address);
  IF v_quote ->> 'status' <> 'QUOTED'
     OR coalesce((v_quote ->> 'cost')::numeric, 0) <= 0 THEN
    RAISE EXCEPTION 'Ongkir untuk alamat atau pesanan ini perlu dikonfirmasi.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN (v_quote ->> 'cost')::numeric;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.estimate_shipping_cost(jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estimate_shipping_cost(jsonb, jsonb)
  TO authenticated;

-- Recreate the effective 0043 authenticated, variant-aware checkout. Shipping
-- is resolved before any stock decrement and evidence is persisted atomically.
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

  -- Lock and validate every purchasable row before resolving shipping. No stock
  -- mutation occurs until the authoritative quote is valid.
  FOR v_checkout_item IN SELECT * FROM tmp_requested_items
  LOOP
    v_variant       := NULL;
    v_variant_label := NULL;

    SELECT id, name, sku, price, weight_grams, stock, product_type,
           is_store_visible, fulfillment_type
      INTO v_prod
      FROM public.products
     WHERE id = v_checkout_item.product_id
       AND deleted_at IS NULL
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

  -- Stock changes happen only after shipping is valid. Any later exception rolls
  -- the transaction back, including every decrement below.
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

COMMIT;

NOTIFY pgrst, 'reload schema';
