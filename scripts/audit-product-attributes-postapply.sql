-- Run READ ONLY immediately after manual 0068 apply, BEFORE owned QA writes.
-- Also rerun scripts/audit-product-attributes-preflight.sql to return complete
-- live column/constraint/function/owner/ACL/translation-trigger definitions.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

WITH snapshot AS (
  SELECT count(*) AS row_count, count(*) FILTER (WHERE deleted_at IS NULL) AS non_archived,
    pg_catalog.md5(COALESCE(string_agg(jsonb_build_array(id,weight_grams)::text, E'\n' ORDER BY id COLLATE "C"), '')) AS weights,
    pg_catalog.md5(COALESCE(string_agg((to_jsonb(p) - ARRAY['min_purchase_qty','unit','length','width','height','dimension_unit','dimensions_note'])::text, E'\n' ORDER BY id COLLATE "C"), '')) AS content,
    count(*) FILTER (WHERE min_purchase_qty = 1 AND unit IS NULL AND length IS NULL AND width IS NULL
      AND height IS NULL AND dimension_unit IS NULL AND dimensions_note IS NULL) AS default_only_rows
  FROM public.products p
), expected_columns(name, type, not_null) AS (
  VALUES ('min_purchase_qty','integer',true),('unit','text',false),('length','numeric',false),
    ('width','numeric',false),('height','numeric',false),('dimension_unit','text',false),('dimensions_note','text',false)
), column_checks AS (
  SELECT e.name, COALESCE(pg_catalog.format_type(a.atttypid,a.atttypmod) = e.type AND a.attnotnull = e.not_null, false) AS matches,
    pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_expression
  FROM expected_columns e LEFT JOIN pg_catalog.pg_attribute a
    ON a.attrelid = 'public.products'::regclass AND a.attname = e.name AND NOT a.attisdropped
  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
), functions AS (
  SELECT p.*, pg_catalog.pg_get_userbyid(p.proowner) AS owner_name,
    pg_catalog.md5(replace(replace(p.prosrc,E'\r\n',E'\n'),E'\r',E'\n')) AS body_md5
  FROM pg_catalog.pg_proc p WHERE p.oid IN (
    'public.create_checkout_order(jsonb,text,text,text,jsonb,text)'::regprocedure,
    'public.create_checkout_order_v2(jsonb,text,uuid,text,text,jsonb,text)'::regprocedure)
), security AS (
  SELECT f.proname, f.owner_name, f.prosecdef, f.proconfig, f.proacl::text AS acl, f.body_md5,
    f.owner_name = 'postgres' AND f.prosecdef AND f.prorettype = 'text'::regtype
      AND f.proconfig = CASE WHEN f.proname = 'create_checkout_order' THEN ARRAY['search_path=public'] ELSE ARRAY['search_path=""'] END
      AND f.body_md5 = CASE WHEN f.proname = 'create_checkout_order' THEN '6fd1aa190ee315a9c373afefe508825c' ELSE '5a0f78d8166ce81f679cb957ab299174' END
      AND NOT pg_catalog.has_function_privilege('anon',f.oid,'EXECUTE')
      AND NOT pg_catalog.has_function_privilege('service_role',f.oid,'EXECUTE')
      AND pg_catalog.has_function_privilege('authenticated',f.oid,'EXECUTE') = (f.proname = 'create_checkout_order_v2')
      AND pg_catalog.has_function_privilege('postgres',f.oid,'EXECUTE')
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(f.proacl,pg_catalog.acldefault('f',f.proowner))) a
        WHERE a.privilege_type = 'EXECUTE' AND (a.is_grantable OR NOT (a.grantee = f.proowner
          OR (f.proname = 'create_checkout_order_v2' AND a.grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname='authenticated')))))
      AS matches
  FROM functions f
)
SELECT jsonb_pretty(jsonb_build_object(
  'product_rows', (SELECT row_count FROM snapshot),
  'non_archived_rows', (SELECT non_archived FROM snapshot),
  'weight_by_id_md5', (SELECT weights FROM snapshot),
  'existing_content_md5', (SELECT content FROM snapshot),
  'baseline_unchanged', (SELECT row_count=80 AND non_archived=61 AND default_only_rows=80
    AND weights='e00e1ac5e0c612dee69a1d728912b47f'
    AND content='adee2ced29447d476c8c21e074be9c59' FROM snapshot),
  'columns', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.name) FROM column_checks c),
  'columns_match', (SELECT bool_and(matches AND CASE WHEN name='min_purchase_qty' THEN default_expression='1' ELSE default_expression IS NULL END) FROM column_checks),
  'checkout_security', (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.proname) FROM security s),
  'checkout_security_matches', (SELECT count(*)=2 AND bool_and(matches) FROM security),
  'attribute_constraints', (SELECT jsonb_agg(jsonb_build_object('name',conname,'validated',convalidated,'definition',pg_catalog.pg_get_constraintdef(oid,true)) ORDER BY conname)
    FROM pg_catalog.pg_constraint WHERE conrelid='public.products'::regclass AND conname IN (
      'products_min_purchase_qty_check','products_unit_check','products_length_check','products_width_check','products_height_check',
      'products_dimension_unit_check','products_dimension_consistency_check','products_dimensions_note_check')),
  'attribute_constraint_count_matches', (SELECT count(*)=8 AND bool_and(convalidated) FROM pg_catalog.pg_constraint
    WHERE conrelid='public.products'::regclass AND conname IN (
      'products_min_purchase_qty_check','products_unit_check','products_length_check','products_width_check','products_height_check',
      'products_dimension_unit_check','products_dimension_consistency_check','products_dimensions_note_check')),
  'weight_definition', (SELECT jsonb_build_object('type',pg_catalog.format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid))
    FROM pg_catalog.pg_attribute a LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.products'::regclass AND a.attname='weight_grams' AND NOT a.attisdropped)
)) AS product_attributes_postapply;

COMMIT;
