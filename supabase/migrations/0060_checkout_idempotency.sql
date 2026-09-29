-- 0060_checkout_idempotency.sql
-- Guarantee one authoritative checkout mutation per authenticated user and
-- browser-generated checkout intent while preserving the existing checkout RPC.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN checkout_idempotency_key uuid,
  ADD COLUMN checkout_request_fingerprint text;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_checkout_idempotency_pair_check CHECK (
    (
      checkout_idempotency_key IS NULL
      AND checkout_request_fingerprint IS NULL
    )
    OR
    (
      checkout_idempotency_key IS NOT NULL
      AND user_id IS NOT NULL
      AND checkout_request_fingerprint IS NOT NULL
      AND checkout_request_fingerprint ~ '^[0-9a-f]{64}$'
    )
  );

CREATE UNIQUE INDEX orders_checkout_user_key_uidx
  ON public.orders (user_id, checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

CREATE FUNCTION public.create_checkout_order_v2(
  p_items jsonb,
  p_customer_name text,
  p_idempotency_key uuid,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_shipping_address jsonb DEFAULT '{}'::jsonb,
  p_notes text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_product_id text;
  v_quantity_text text;
  v_variant_text text;
  v_variant_id uuid;
  v_payload jsonb;
  v_fingerprint text;
  v_existing record;
  v_order_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk membuat pesanan.'
      USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Kunci checkout wajib diisi.'
      USING ERRCODE = '22023';
  END IF;

  IF p_items IS NULL
     OR pg_catalog.jsonb_typeof(p_items) <> 'array'
     OR pg_catalog.jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Keranjang tidak valid.'
      USING ERRCODE = '22023';
  END IF;

  IF p_customer_name IS NULL OR pg_catalog.btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Nama pembeli wajib diisi.'
      USING ERRCODE = '22023';
  END IF;

  IF p_shipping_address IS NULL
     OR pg_catalog.jsonb_typeof(p_shipping_address) <> 'object' THEN
    RAISE EXCEPTION 'Alamat pengiriman tidak valid.'
      USING ERRCODE = '22023';
  END IF;

  FOR v_item IN
    SELECT value FROM pg_catalog.jsonb_array_elements(p_items)
  LOOP
    IF pg_catalog.jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Item keranjang tidak valid.'
        USING ERRCODE = '22023';
    END IF;

    v_product_id := pg_catalog.btrim(COALESCE(v_item ->> 'product_id', ''));
    v_quantity_text := pg_catalog.btrim(COALESCE(v_item ->> 'quantity', ''));
    v_variant_text := NULLIF(pg_catalog.btrim(v_item ->> 'variant_id'), '');
    v_variant_id := NULL;

    IF v_product_id = ''
       OR v_quantity_text !~ '^[1-9][0-9]{0,2}$' THEN
      RAISE EXCEPTION 'Item keranjang tidak valid.'
        USING ERRCODE = '22023';
    END IF;

    IF v_variant_text IS NOT NULL THEN
      IF v_variant_text !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN
        RAISE EXCEPTION 'Varian tidak valid.'
          USING ERRCODE = '22023';
      END IF;
      v_variant_id := v_variant_text::uuid;
    END IF;

    IF EXISTS (
      SELECT 1
        FROM pg_catalog.jsonb_array_elements(v_items) AS existing(item)
       WHERE item ->> 'product_id' = v_product_id
         AND item ->> 'variant_id' IS NOT DISTINCT FROM v_variant_id::text
    ) THEN
      RAISE EXCEPTION 'Item keranjang duplikat.'
        USING ERRCODE = '22023';
    END IF;

    v_items := v_items || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'product_id', v_product_id,
        'quantity', v_quantity_text::integer,
        'variant_id', v_variant_id
      )
    );
  END LOOP;

  SELECT pg_catalog.jsonb_agg(
           item ORDER BY item ->> 'product_id', item ->> 'variant_id' NULLS FIRST
         )
    INTO v_items
    FROM pg_catalog.jsonb_array_elements(v_items) AS sorted(item);

  v_payload := pg_catalog.jsonb_build_object(
    'version', 1,
    'items', v_items,
    'customer_name', p_customer_name,
    'customer_email', COALESCE(p_customer_email, ''),
    'customer_phone', COALESCE(p_customer_phone, ''),
    'shipping_address', p_shipping_address,
    'notes', COALESCE(p_notes, '')
  );

  v_fingerprint := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(v_payload::text, 'UTF8')),
    'hex'
  );

  -- Serialize all new checkout intents per customer so the database-side rate
  -- limit cannot be bypassed with many concurrent UUIDs.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('checkout-v2-user:' || v_user_id::text, 0)
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'checkout-v2:' || v_user_id::text || ':' || p_idempotency_key::text,
      0
    )
  );

  SELECT id, order_code, checkout_request_fingerprint, deleted_at
    INTO v_existing
    FROM public.orders
   WHERE user_id = v_user_id
     AND checkout_idempotency_key = p_idempotency_key
   FOR UPDATE;

  IF FOUND THEN
    IF v_existing.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'idempotency_order_archived'
        USING ERRCODE = 'P0025',
              DETAIL = v_existing.order_code;
    END IF;
    IF v_existing.checkout_request_fingerprint IS DISTINCT FROM v_fingerprint THEN
      RAISE EXCEPTION 'idempotency_conflict'
        USING ERRCODE = 'P0023';
    END IF;
    RETURN v_existing.order_code;
  END IF;

  IF (
    SELECT pg_catalog.count(*)
      FROM public.orders
     WHERE user_id = v_user_id
       AND checkout_idempotency_key IS NOT NULL
       AND created_at >= pg_catalog.now() - INTERVAL '10 minutes'
  ) >= 10 THEN
    RAISE EXCEPTION 'checkout_rate_limit_exceeded'
      USING ERRCODE = 'P0026';
  END IF;

  v_order_code := public.create_checkout_order(
    p_items => v_items,
    p_customer_name => p_customer_name,
    p_customer_email => p_customer_email,
    p_customer_phone => p_customer_phone,
    p_shipping_address => p_shipping_address,
    p_notes => p_notes
  );

  UPDATE public.orders
     SET checkout_idempotency_key = p_idempotency_key,
         checkout_request_fingerprint = v_fingerprint
   WHERE order_code = v_order_code
     AND user_id = v_user_id
     AND checkout_idempotency_key IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan checkout tidak dapat diverifikasi.'
      USING ERRCODE = 'P0024';
  END IF;

  RETURN v_order_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_checkout_order_v2(
  jsonb, text, uuid, text, text, jsonb, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_checkout_order_v2(
  jsonb, text, uuid, text, text, jsonb, text
) TO authenticated;

-- Prevent authenticated clients from bypassing the idempotency boundary.
-- The shared function owner retains implicit EXECUTE for the internal v2 call.
REVOKE EXECUTE ON FUNCTION public.create_checkout_order(
  jsonb, text, text, text, jsonb, text
) FROM PUBLIC, anon, authenticated, service_role;

-- Abort deployment if ownership does not preserve the internal call after the
-- API-facing grants above are revoked.
DO $$
DECLARE
  v_old_oid oid := 'public.create_checkout_order(jsonb,text,text,text,jsonb,text)'::regprocedure::oid;
  v_v2_oid oid := 'public.create_checkout_order_v2(jsonb,text,uuid,text,text,jsonb,text)'::regprocedure::oid;
  v_old_owner oid;
  v_v2_owner oid;
  v_owner_name text;
BEGIN
  SELECT proowner INTO v_old_owner FROM pg_catalog.pg_proc WHERE oid = v_old_oid;
  SELECT proowner INTO v_v2_owner FROM pg_catalog.pg_proc WHERE oid = v_v2_oid;

  IF v_old_owner IS DISTINCT FROM v_v2_owner THEN
    RAISE EXCEPTION 'Owner RPC checkout lama dan v2 harus sama.';
  END IF;

  SELECT rolname INTO v_owner_name
    FROM pg_catalog.pg_roles
   WHERE oid = v_v2_owner;

  IF v_owner_name IS NULL
     OR NOT pg_catalog.has_function_privilege(v_owner_name, v_old_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'Owner create_checkout_order_v2 tidak dapat menjalankan RPC checkout lama.';
  END IF;
END;
$$;

COMMENT ON COLUMN public.orders.checkout_idempotency_key IS
  'Browser-generated checkout intent UUID, unique per authenticated user.';
COMMENT ON COLUMN public.orders.checkout_request_fingerprint IS
  'SHA-256 of canonical versioned checkout request identity.';

COMMIT;

NOTIFY pgrst, 'reload schema';
