-- PRODUCT-ATTRIBUTES-001. Apply manually only after reviewing live preflight.
-- Live 0067 baseline: base body a734e5a8aa5967d2d50a0b7a62d2cdca;
-- v2 body 5a0f78d8166ce81f679cb957ab299174. No migration registry is used.
BEGIN;

DO $preflight$
DECLARE
  v_base oid := pg_catalog.to_regprocedure('public.create_checkout_order(jsonb,text,text,text,jsonb,text)');
  v_v2 oid := pg_catalog.to_regprocedure('public.create_checkout_order_v2(jsonb,text,uuid,text,text,jsonb,text)');
  v_role text;
BEGIN
  IF v_base IS NULL OR v_v2 IS NULL THEN
    RAISE EXCEPTION 'PRODUCT-ATTRIBUTES-001: checkout signature missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid = v_base
    AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres' AND p.prosecdef
    AND p.prorettype = 'text'::regtype AND p.proconfig = ARRAY['search_path=public']
    AND pg_catalog.md5(replace(replace(p.prosrc, E'\r\n', E'\n'), E'\r', E'\n')) = 'a734e5a8aa5967d2d50a0b7a62d2cdca')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid = v_v2
    AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres' AND p.prosecdef
    AND p.prorettype = 'text'::regtype AND p.proconfig = ARRAY['search_path=""']
    AND pg_catalog.md5(replace(replace(p.prosrc, E'\r\n', E'\n'), E'\r', E'\n')) = '5a0f78d8166ce81f679cb957ab299174') THEN
    RAISE EXCEPTION 'HOLD — LIVE CHECKOUT RPC DIFFERS FROM REVIEWED BASELINE';
  END IF;
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF pg_catalog.has_function_privilege(v_role, v_base, 'EXECUTE')
      OR pg_catalog.has_function_privilege(v_role, v_v2, 'EXECUTE') IS DISTINCT FROM (v_role = 'authenticated') THEN
      RAISE EXCEPTION 'PRODUCT-ATTRIBUTES-001: unexpected checkout role access (%)', v_role;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p,
      LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) acl
    WHERE p.oid IN (v_base, v_v2) AND acl.privilege_type = 'EXECUTE'
      AND (acl.is_grantable OR NOT (
        acl.grantee = p.proowner
        OR (p.oid = v_v2 AND acl.grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated'))
      ))
  ) THEN
    RAISE EXCEPTION 'PRODUCT-ATTRIBUTES-001: unexpected checkout ACL';
  END IF;
  IF NOT pg_catalog.has_function_privilege('postgres', v_base, 'EXECUTE')
    OR NOT pg_catalog.has_function_privilege('postgres', v_v2, 'EXECUTE') THEN
    RAISE EXCEPTION 'PRODUCT-ATTRIBUTES-001: internal owner access missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = 'public.products'::regclass AND a.attname = 'weight_grams'
        AND a.atttypid = 'integer'::regtype AND NOT a.attnotnull AND NOT a.attisdropped)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = 'public.products'::regclass AND NOT a.attisdropped
        AND a.attname = ANY(ARRAY['min_purchase_qty','unit','length','width','height','dimension_unit','dimensions_note'])) THEN
    RAISE EXCEPTION 'PRODUCT-ATTRIBUTES-001: unexpected Product column baseline';
  END IF;
END;
$preflight$;

ALTER TABLE public.products
  ADD COLUMN min_purchase_qty integer NOT NULL DEFAULT 1,
  ADD COLUMN unit text,
  ADD COLUMN length numeric,
  ADD COLUMN width numeric,
  ADD COLUMN height numeric,
  ADD COLUMN dimension_unit text,
  ADD COLUMN dimensions_note text,
  ADD CONSTRAINT products_min_purchase_qty_check CHECK (min_purchase_qty BETWEEN 1 AND 999),
  ADD CONSTRAINT products_unit_check CHECK (unit IS NULL OR (
    char_length(unit) BETWEEN 1 AND 50 AND unit = btrim(unit)
    AND unit !~ E'[\u0001-\u001F\u007F-\u009F]')),
  ADD CONSTRAINT products_length_check CHECK (length IS NULL OR (length > 0 AND length <= 999999999.999 AND scale(length) <= 3)),
  ADD CONSTRAINT products_width_check CHECK (width IS NULL OR (width > 0 AND width <= 999999999.999 AND scale(width) <= 3)),
  ADD CONSTRAINT products_height_check CHECK (height IS NULL OR (height > 0 AND height <= 999999999.999 AND scale(height) <= 3)),
  ADD CONSTRAINT products_dimension_unit_check CHECK (dimension_unit IS NULL OR dimension_unit IN ('mm', 'cm', 'm')),
  ADD CONSTRAINT products_dimension_consistency_check CHECK (
    CASE WHEN length IS NULL AND width IS NULL AND height IS NULL THEN dimension_unit IS NULL
         ELSE dimension_unit IS NOT NULL END),
  ADD CONSTRAINT products_dimensions_note_check CHECK (dimensions_note IS NULL OR (
    char_length(dimensions_note) BETWEEN 1 AND 2000 AND dimensions_note = btrim(dimensions_note)
    AND dimensions_note !~ E'[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]'));

-- Patch the exact audited live definition, not a historical CREATE statement
-- whose old GRANT would reopen the base RPC. CREATE OR REPLACE preserves owner/ACL.
DO $checkout$
DECLARE
  v_base oid := 'public.create_checkout_order(jsonb,text,text,text,jsonb,text)'::regprocedure;
  v_original text := pg_catalog.pg_get_functiondef(v_base);
  v_definition text;
  v_select text := 'SELECT id, name, sku, price, weight_grams, stock, product_type,';
  v_anchor text := '    v_subtotal := v_subtotal + (v_effective_price * v_checkout_item.quantity);';
  v_check text := $check$    IF v_checkout_item.quantity < v_prod.min_purchase_qty THEN
      RAISE EXCEPTION 'product_minimum_purchase_not_met'
        USING ERRCODE = 'P1064';
    END IF;

$check$;
  v_acl aclitem[];
  v_owner oid;
  v_configuration text[];
BEGIN
  v_original := replace(replace(v_original, E'\r\n', E'\n'), E'\r', E'\n');
  IF (length(v_original) - length(replace(v_original, v_select, ''))) / length(v_select) <> 1
    OR (length(v_original) - length(replace(v_original, v_anchor, ''))) / length(v_anchor) <> 1 THEN
    RAISE EXCEPTION 'PRODUCT-ATTRIBUTES-001: checkout patch anchors are not unique';
  END IF;
  SELECT proacl, proowner, proconfig INTO v_acl, v_owner, v_configuration
    FROM pg_catalog.pg_proc WHERE oid = v_base;
  v_definition := replace(v_original, v_select,
    'SELECT id, name, sku, price, weight_grams, stock, product_type, min_purchase_qty,');
  v_definition := replace(v_definition, v_anchor, v_check || v_anchor);
  EXECUTE v_definition;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid = v_base
    AND p.proacl IS NOT DISTINCT FROM v_acl AND p.proowner = v_owner
    AND p.proconfig IS NOT DISTINCT FROM v_configuration AND p.prosecdef
    AND p.prorettype = 'text'::regtype) THEN
    RAISE EXCEPTION 'PRODUCT-ATTRIBUTES-001: checkout security changed; transaction aborted';
  END IF;
END;
$checkout$;

COMMENT ON COLUMN public.products.min_purchase_qty IS 'Integer lower bound per product + variant checkout line; not an order multiple. B2B: procurement information.';
COMMENT ON COLUMN public.products.unit IS 'Canonical sale unit: price, stock and weight_grams describe one quantity. No fractional quantity or package-content inference.';
COMMENT ON COLUMN public.products.dimensions_note IS 'Canonical Indonesian dimension note; may coexist with structured dimensions or stand alone.';

COMMIT;
NOTIFY pgrst, 'reload schema';
