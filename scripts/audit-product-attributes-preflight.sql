-- PRODUCT-ATTRIBUTES-001: live read-only preflight, NOT a migration.
-- Run this block in the intended project's Supabase SQL Editor.
-- Return the complete audit JSON, including function bodies (no credentials).
-- Deployment history confirmed 0067 applied; no migration registry exists.

BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

WITH product_columns AS (
  SELECT a.attnum AS position, a.attname AS name,
         pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
         a.attnotnull AS not_null,
         pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expression
    FROM pg_catalog.pg_attribute a
    LEFT JOIN pg_catalog.pg_attrdef d
      ON d.adrelid = a.attrelid AND d.adnum = a.attnum
   WHERE a.attrelid = 'public.products'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
), product_constraints AS (
  SELECT conname AS name, contype AS type, convalidated AS validated,
         pg_catalog.pg_get_constraintdef(oid, true) AS definition
    FROM pg_catalog.pg_constraint
   WHERE conrelid = 'public.products'::regclass
), checkout_functions AS (
  SELECT p.oid, p.proname AS name,
         pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
         pg_catalog.pg_get_function_arguments(p.oid) AS arguments_with_defaults,
         pg_catalog.pg_get_function_result(p.oid) AS return_type,
         pg_catalog.pg_get_userbyid(p.proowner) AS owner,
         p.prosecdef AS security_definer,
         p.proconfig AS configuration,
         p.proacl::text AS explicit_acl,
         pg_catalog.pg_get_functiondef(p.oid) AS definition,
         pg_catalog.md5(replace(replace(p.prosrc, E'\r\n', E'\n'), E'\r', E'\n')) AS normalized_body_md5,
         pg_catalog.has_function_privilege(p.proowner, p.oid, 'EXECUTE') AS owner_can_execute,
         (SELECT jsonb_agg(jsonb_build_object(
            'grantor', pg_catalog.pg_get_userbyid(x.grantor),
            'grantee', CASE WHEN x.grantee = 0 THEN 'PUBLIC'
                            ELSE pg_catalog.pg_get_userbyid(x.grantee) END,
            'privilege', x.privilege_type, 'grantable', x.is_grantable
          ) ORDER BY x.grantee, x.privilege_type)
            FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) x
         ) AS effective_acl,
         (SELECT jsonb_agg(jsonb_build_object(
            'role', r.rolname,
            'can_execute', pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE')
          ) ORDER BY r.rolname)
            FROM pg_catalog.pg_roles r
           WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
         ) AS client_access
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('create_checkout_order', 'create_checkout_order_v2')
), weight_by_type AS (
  SELECT product_type, count(*) AS product_count,
         count(*) FILTER (WHERE weight_grams IS NULL) AS null_weight_count,
         count(*) FILTER (WHERE weight_grams = 0) AS zero_weight_count,
         count(*) FILTER (WHERE weight_grams < 0) AS negative_weight_count,
         count(*) FILTER (WHERE weight_grams > 0) AS positive_weight_count,
         min(weight_grams) AS minimum_weight_grams,
         max(weight_grams) AS maximum_weight_grams,
         sum(weight_grams::bigint) AS sum_weight_grams
    FROM public.products GROUP BY product_type
), product_baseline AS (
  SELECT count(*) AS product_row_count,
         count(*) FILTER (WHERE p.deleted_at IS NULL) AS non_archived_row_count,
         -- Compare before adding QA fixtures. These omit only NEW attributes;
         -- all pre-existing content, including weight and updated_at, is covered.
         pg_catalog.md5(COALESCE(string_agg(
           (to_jsonb(p) - ARRAY['min_purchase_qty', 'unit', 'length', 'width',
                              'height', 'dimension_unit', 'dimensions_note'])::text,
           E'\n' ORDER BY p.id COLLATE "C"), '')) AS existing_content_md5,
         pg_catalog.md5(COALESCE(string_agg(
           jsonb_build_array(p.id, p.weight_grams)::text,
           E'\n' ORDER BY p.id COLLATE "C"), '')) AS weight_by_id_md5
    FROM public.products p
), translation_trigger AS (
  SELECT t.tgname AS name, t.tgenabled AS enabled,
         pg_catalog.pg_get_triggerdef(t.oid, true) AS trigger_definition,
         pg_catalog.pg_get_functiondef(t.tgfoid) AS function_definition
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.products'::regclass AND NOT t.tgisinternal
     AND t.tgname = 'products_translation_source_revision'
)
SELECT jsonb_pretty(jsonb_build_object(
  'captured_at', CURRENT_TIMESTAMP,
  'database', current_database(),
  'server_version', current_setting('server_version'),
  'migration_registry_exists', pg_catalog.to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'expected_base_signature_exists', pg_catalog.to_regprocedure('public.create_checkout_order(jsonb,text,text,text,jsonb,text)') IS NOT NULL,
  'expected_v2_signature_exists', pg_catalog.to_regprocedure('public.create_checkout_order_v2(jsonb,text,uuid,text,text,jsonb,text)') IS NOT NULL,
  'products_columns', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.position) FROM product_columns c),
  'products_constraints', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.name) FROM product_constraints c),
  'products_rls', (SELECT jsonb_build_object('enabled', c.relrowsecurity, 'forced', c.relforcerowsecurity,
                    'owner', pg_catalog.pg_get_userbyid(c.relowner), 'acl', c.relacl::text)
                    FROM pg_catalog.pg_class c WHERE c.oid = 'public.products'::regclass),
  'products_policies', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.policyname)
                         FROM pg_catalog.pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'products'),
  'checkout_functions', (SELECT jsonb_agg(to_jsonb(f) - 'oid' ORDER BY f.name, f.identity_arguments) FROM checkout_functions f),
  'product_baseline', (SELECT to_jsonb(b) FROM product_baseline b),
  'weight_by_type', (SELECT jsonb_agg(to_jsonb(w) ORDER BY w.product_type) FROM weight_by_type w),
  'translation_source_trigger', (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.name) FROM translation_trigger t)
)) AS product_attributes_preflight;

COMMIT;

-- Do not query/create/repair a migration registry. Numbering follows the
-- confirmed deployment history and the repository's next free filename.
