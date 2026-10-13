-- Read-only audit. Run after manually applying all of migration 0067.
-- Expect three rows, each audit_pass = true. Inspect the full definitions below.
WITH expected(signature, baseline_md5, defaults, source_sites, version_sites, unavailable_sites) AS (
  VALUES
    ('public.save_product_translation(text,text,jsonb,text,integer,integer,uuid)', '029f0537789640c1329f14a49e5eef5c', 1, 1, 1, 1),
    ('public.unpublish_product_translation(text,text,integer,uuid)', 'c482c873e6dd5c06dd60b2edea61d8d5', 0, 0, 1, 1),
    ('public.delete_product_translation(text,text,integer,uuid)', 'b9a86383d28382d2218145d57649d891', 0, 0, 1, 1)
), observed AS (
  SELECT e.*, p.oid, p.prosrc, p.prosecdef, p.proconfig, p.proacl, p.proowner,
    p.pronargdefaults, p.proargdefaults, p.prorettype, p.proretset, p.provolatile,
    p.proisstrict, p.proleakproof, p.proparallel, p.prokind,
    l.lanname, r.rolname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_catalog.pg_get_function_arguments(p.oid) AS arguments_with_defaults,
    pg_catalog.pg_get_function_result(p.oid) AS return_type,
    pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
    pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
    pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute,
    EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,
      pg_catalog.acldefault('f', p.proowner))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_execute,
    (EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,
      pg_catalog.acldefault('f', p.proowner))) a
      WHERE a.grantee NOT IN (p.proowner, 'authenticated'::regrole) AND a.privilege_type = 'EXECUTE')
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_roles extra
        WHERE extra.oid <> p.proowner AND extra.rolname <> 'authenticated' AND NOT extra.rolsuper
          AND pg_catalog.has_function_privilege(extra.oid, p.oid, 'EXECUTE'))) AS unexpected_execute,
    pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(
      pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(p.prosrc,
        '''P1061''', '''PT001'''), '''P1062''', '''PT002'''), '''P1063''', '''PT003'''),
      E'\r\n', E'\n'), E'\r', E'\n')) = e.baseline_md5 AS body_codes_only,
    (pg_catalog.length(p.prosrc) - pg_catalog.length(pg_catalog.replace(p.prosrc, 'ERRCODE = ''P1061''', ''))) / pg_catalog.length('ERRCODE = ''P1061''') AS source_count,
    (pg_catalog.length(p.prosrc) - pg_catalog.length(pg_catalog.replace(p.prosrc, 'ERRCODE = ''P1062''', ''))) / pg_catalog.length('ERRCODE = ''P1062''') AS version_count,
    (pg_catalog.length(p.prosrc) - pg_catalog.length(pg_catalog.replace(p.prosrc, 'ERRCODE = ''P1063''', ''))) / pg_catalog.length('ERRCODE = ''P1063''') AS unavailable_count
  FROM expected e LEFT JOIN pg_catalog.pg_proc p ON p.oid = pg_catalog.to_regprocedure(e.signature)
  LEFT JOIN pg_catalog.pg_language l ON l.oid = p.prolang
  LEFT JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
)
SELECT signature, identity_arguments, arguments_with_defaults, return_type,
  lanname, rolname AS owner, prosecdef AS security_definer, proconfig, proacl,
  authenticated_execute, anon_execute, service_role_execute, public_execute, unexpected_execute,
  body_codes_only, source_count, version_count, unavailable_count,
  COALESCE(oid IS NOT NULL AND body_codes_only AND source_count = source_sites
    AND version_count = version_sites AND unavailable_count = unavailable_sites
    AND prosrc !~ 'PT00[123]' AND prorettype = 'jsonb'::regtype AND NOT proretset
    AND lanname = 'plpgsql' AND rolname = 'postgres' AND prosecdef
    AND proconfig = ARRAY['search_path=""']::text[] AND provolatile = 'v'
    AND NOT proisstrict AND NOT proleakproof AND proparallel = 'u' AND prokind = 'f'
    AND pronargdefaults = defaults
    AND (defaults = 0 OR pg_catalog.pg_get_expr(proargdefaults, 0) = 'NULL::uuid')
    AND authenticated_execute AND NOT anon_execute AND NOT service_role_execute
    AND NOT public_execute AND NOT unexpected_execute, false) AS audit_pass
FROM observed ORDER BY signature;

-- Full deployed CREATE OR REPLACE definitions, including signatures/defaults.
SELECT p.oid::regprocedure AS signature, pg_catalog.pg_get_functiondef(p.oid) AS full_definition
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN
  ('save_product_translation', 'unpublish_product_translation', 'delete_product_translation')
ORDER BY p.proname;

-- Effective ACL entries; only owner/postgres and authenticated should execute.
SELECT p.oid::regprocedure AS signature,
  CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END AS grantee,
  pg_catalog.pg_get_userbyid(a.grantor) AS grantor, a.privilege_type, a.is_grantable
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
WHERE n.nspname = 'public' AND p.proname IN
  ('save_product_translation', 'unpublish_product_translation', 'delete_product_translation')
ORDER BY signature, grantee;
