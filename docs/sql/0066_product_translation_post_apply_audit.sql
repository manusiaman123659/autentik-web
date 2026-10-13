-- READ ONLY. Run after manually applying 0066; keep all result sets for review.
SELECT table_name, ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND (table_name = 'product_translations'
  OR (table_name = 'products' AND column_name = 'translation_source_revision'))
ORDER BY table_name, ordinal_position;

SELECT c.relname, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
  pg_catalog.pg_get_userbyid(c.relowner) AS owner
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('products','product_translations');

SELECT c.relname, t.tgname, pg_catalog.pg_get_triggerdef(t.oid, true) AS definition
FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
  AND c.relname IN ('products','product_translations') ORDER BY c.relname, t.tgname;

SELECT conname, contype, pg_catalog.pg_get_constraintdef(oid, true) AS definition
FROM pg_catalog.pg_constraint
WHERE conrelid = 'public.product_translations'::regclass
  OR (conrelid = 'public.products'::regclass AND conname = 'products_translation_source_revision_positive')
ORDER BY conname;

SELECT indexname, indexdef FROM pg_catalog.pg_indexes
WHERE schemaname = 'public' AND tablename = 'product_translations' ORDER BY indexname;

SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_catalog.pg_policies
WHERE schemaname = 'public' AND (tablename = 'product_translations'
  OR (tablename = 'audit_log' AND policyname = 'audit_staff_insert')) ORDER BY tablename, policyname;

SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END AS grantee,
  a.privilege_type, a.is_grantable
FROM pg_catalog.pg_class c
CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
WHERE c.oid = 'public.product_translations'::regclass ORDER BY grantee, privilege_type;

-- Effective privileges (including inheritance), not only displayed ACL entries.
SELECT role_name,
  pg_catalog.has_table_privilege(role_name, 'public.product_translations', 'SELECT') AS can_select,
  pg_catalog.has_table_privilege(role_name, 'public.product_translations', 'INSERT') AS can_insert,
  pg_catalog.has_table_privilege(role_name, 'public.product_translations', 'UPDATE') AS can_update,
  pg_catalog.has_table_privilege(role_name, 'public.product_translations', 'DELETE') AS can_delete,
  pg_catalog.has_table_privilege(role_name, 'public.product_translations', 'TRUNCATE') AS can_truncate,
  pg_catalog.has_table_privilege(role_name, 'public.product_translations', 'TRIGGER') AS can_trigger,
  pg_catalog.has_table_privilege(role_name, 'public.product_translations', 'REFERENCES') AS can_reference
FROM (VALUES ('anon'),('authenticated'),('service_role')) roles(role_name);

SELECT p.oid::regprocedure AS signature, p.prosecdef AS security_definer,
  p.provolatile, p.proconfig, pg_catalog.pg_get_userbyid(p.proowner) AS owner,
  pg_catalog.pg_get_functiondef(p.oid) AS full_definition
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
  'track_product_translation_source_revision','product_translation_blocks_valid',
  'advance_product_translation_version','normalize_product_translation_text','save_product_translation',
  'unpublish_product_translation','delete_product_translation','has_cms_capability')
ORDER BY p.proname, p.oid;

SELECT p.oid::regprocedure AS signature,
  CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee) END AS grantee,
  a.privilege_type, a.is_grantable
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
WHERE n.nspname = 'public' AND p.proname IN (
  'track_product_translation_source_revision','product_translation_blocks_valid',
  'advance_product_translation_version','normalize_product_translation_text','save_product_translation',
  'unpublish_product_translation','delete_product_translation') ORDER BY signature, grantee;

SELECT p.oid::regprocedure AS signature, role_name,
  pg_catalog.has_function_privilege(role_name, p.oid, 'EXECUTE') AS can_execute
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) roles(role_name)
WHERE n.nspname = 'public' AND p.proname IN (
  'save_product_translation','unpublish_product_translation','delete_product_translation')
ORDER BY signature, role_name;

SELECT count(*) AS translation_rows FROM public.product_translations;
