-- 0048_shipping_rate_matcher_hotfix.sql
-- HOTFIX: Replace resolve_shipping_rate_for_weight() to remove all uuid aggregate
-- calls (min(uuid), max(uuid)) that cause PostgreSQL ERROR 42883.
-- Root cause: SELECT count(*), min(r.id), min(r.zone_id), min(z.name) in 0047.
-- Fix: Separate COUNT + deterministic SELECT ... LIMIT 1 pattern for every lookup.
--
-- Applies on top of live 0045, 0046, 0047 migrations.
-- Does NOT touch: historical migrations, business data, other functions, or indexes.

BEGIN;

-- ============================================================
-- Patch: resolve_shipping_rate_for_weight(text, text, bigint)
-- ============================================================
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
  v_province      text    := lower(btrim(coalesce(p_province, '')));
  v_city          text    := lower(btrim(coalesce(p_city, '')));
  v_match_count   integer := 0;
  v_region_id     uuid;
  v_zone_id       uuid;
  v_zone_name     text;
  v_rate_id       uuid;
  v_weight_from_g integer;
  v_weight_to_g   integer;
  v_cost          numeric(14,2);
  v_match_type    text;
BEGIN
  -- -- Input validation ----------------------------------------------------
  IF v_province = '' THEN
    RETURN jsonb_build_object(
      'status', 'SHIPPING_UNAVAILABLE',
      'reasonCode', 'INVALID_ADDRESS'
    );
  END IF;

  IF p_total_weight_g IS NULL OR p_total_weight_g <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'INVALID_WEIGHT',
      'reasonCode', 'INVALID_TOTAL_WEIGHT'
    );
  END IF;

  IF p_total_weight_g > 2147483647 THEN
    RETURN jsonb_build_object(
      'status', 'INVALID_WEIGHT',
      'reasonCode', 'WEIGHT_OUT_OF_RANGE'
    );
  END IF;

  -- -- STEP A: Exact province + city lookup --------------------------------
  IF v_city <> '' THEN

    -- Count first - no uuid aggregate
    SELECT count(*)
      INTO v_match_count
      FROM public.shipping_zone_regions r
      JOIN public.shipping_zones z ON z.id = r.zone_id
     WHERE r.is_active = true
       AND z.is_active = true
       AND r.city IS NOT NULL
       AND lower(btrim(r.province)) = v_province
       AND lower(btrim(r.city))     = v_city;

    IF v_match_count > 1 THEN
      RETURN jsonb_build_object(
        'status', 'CONFIGURATION_ERROR',
        'reasonCode', 'AMBIGUOUS_REGION'
      );
    END IF;

    IF v_match_count = 1 THEN
      -- Deterministic row fetch - identical WHERE, LIMIT 1
      SELECT r.id, r.zone_id, z.name
        INTO v_region_id, v_zone_id, v_zone_name
        FROM public.shipping_zone_regions r
        JOIN public.shipping_zones z ON z.id = r.zone_id
       WHERE r.is_active = true
         AND z.is_active = true
         AND r.city IS NOT NULL
         AND lower(btrim(r.province)) = v_province
         AND lower(btrim(r.city))     = v_city
       LIMIT 1;

      v_match_type := 'CITY';
    END IF;

  END IF;

  -- -- STEP B: Province-wide fallback (city IS NULL) -----------------------
  IF v_match_count = 0 THEN

    SELECT count(*)
      INTO v_match_count
      FROM public.shipping_zone_regions r
      JOIN public.shipping_zones z ON z.id = r.zone_id
     WHERE r.is_active = true
       AND z.is_active = true
       AND r.city IS NULL
       AND lower(btrim(r.province)) = v_province;

    IF v_match_count = 0 THEN
      RETURN jsonb_build_object(
        'status', 'SHIPPING_UNAVAILABLE',
        'reasonCode', 'REGION_NOT_FOUND'
      );
    END IF;

    IF v_match_count > 1 THEN
      RETURN jsonb_build_object(
        'status', 'CONFIGURATION_ERROR',
        'reasonCode', 'AMBIGUOUS_REGION'
      );
    END IF;

    -- count = 1: fetch the single province-wide row
    SELECT r.id, r.zone_id, z.name
      INTO v_region_id, v_zone_id, v_zone_name
      FROM public.shipping_zone_regions r
      JOIN public.shipping_zones z ON z.id = r.zone_id
     WHERE r.is_active = true
       AND z.is_active = true
       AND r.city IS NULL
       AND lower(btrim(r.province)) = v_province
     LIMIT 1;

    v_match_type := 'PROVINCE';

  END IF;

  -- -- STEP C: Rate lookup for matched zone --------------------------------

  -- Count active matching weight bands - no uuid / numeric aggregate
  SELECT count(*)
    INTO v_match_count
    FROM public.shipping_rates r
   WHERE r.zone_id       = v_zone_id
     AND r.is_active     = true
     AND r.weight_from_g <= p_total_weight_g
     AND r.weight_to_g   >= p_total_weight_g;

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

  -- count = 1: fetch the single matching rate row
  SELECT r.id, r.cost, r.weight_from_g, r.weight_to_g
    INTO v_rate_id, v_cost, v_weight_from_g, v_weight_to_g
    FROM public.shipping_rates r
   WHERE r.zone_id       = v_zone_id
     AND r.is_active     = true
     AND r.weight_from_g <= p_total_weight_g
     AND r.weight_to_g   >= p_total_weight_g
   LIMIT 1;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'CONFIGURATION_ERROR',
      'reasonCode', 'INVALID_RATE',
      'zoneId', v_zone_id,
      'zoneName', v_zone_name
    );
  END IF;

  -- -- Success -------------------------------------------------------------
  RETURN jsonb_build_object(
    'status',       'QUOTED',
    'reasonCode',   'OK',
    'cost',         v_cost,
    'totalWeightG', p_total_weight_g,
    'zoneId',       v_zone_id,
    'zoneName',     v_zone_name,
    'rateId',       v_rate_id,
    'weightFromG',  v_weight_from_g,
    'weightToG',    v_weight_to_g,
    'matchType',    v_match_type
  );

EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN jsonb_build_object(
      'status', 'SHIPPING_UNAVAILABLE',
      'reasonCode', 'INVALID_INPUT'
    );
END;
$$;

-- -- Permissions -------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.resolve_shipping_rate_for_weight(text, text, bigint)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_shipping_rate_for_weight(text, text, bigint)
  TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
