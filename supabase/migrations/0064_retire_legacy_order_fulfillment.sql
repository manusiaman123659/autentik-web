BEGIN;

DO $contract$
DECLARE
  v_public_v1 oid := pg_catalog.to_regprocedure('public.update_order_fulfillment(uuid,text,text,text)');
  v_public_v2 oid := pg_catalog.to_regprocedure('public.update_order_fulfillment_v2(uuid,text,text,text,timestamptz)');
  v_private_v1 oid := pg_catalog.to_regprocedure('rbac_internal.update_order_fulfillment(uuid,text,text,text)');
  v_private_schema oid := pg_catalog.to_regnamespace('rbac_internal');
  v_oid oid;
  v_role text;
  v_public_v1_definition text;
  v_public_v2_definition text;
  v_private_v1_definition text;
  v_v2_acl aclitem[];
  v_private_acl aclitem[];
  v_schema_acl aclitem[];
BEGIN
  IF v_public_v1 IS NULL OR v_public_v2 IS NULL OR v_private_v1 IS NULL OR v_private_schema IS NULL THEN
    RAISE EXCEPTION 'Kontrak fulfillment tidak lengkap. Periksa exact signature dan baseline 0061/0063.';
  END IF;

  FOREACH v_oid IN ARRAY ARRAY[v_public_v1, v_public_v2, v_private_v1] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid = v_oid AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
        AND p.prokind = 'f' AND NOT p.proretset AND p.prorettype = 'pg_catalog.bool'::regtype
    ) THEN
      RAISE EXCEPTION 'Owner atau return contract function fulfillment tidak sesuai. Abort untuk review.';
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
    WHERE p.oid = v_public_v2 AND p.prosecdef AND p.provolatile = 'v' AND l.lanname = 'plpgsql'
      AND p.pronargdefaults = 0
      AND p.proargnames = ARRAY['p_order_id', 'p_status', 'p_tracking_courier', 'p_tracking_number', 'p_expected_updated_at']::text[]
      AND EXISTS (
        SELECT 1 FROM pg_catalog.unnest(p.proconfig) AS settings(setting)
        WHERE setting LIKE 'search_path=%'
          AND replace(btrim(substring(setting FROM 13)), '"', '') = ''
      )
  ) THEN
    RAISE EXCEPTION 'Metadata keamanan/argumen V2 tidak sesuai baseline 0063. Abort untuk review.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
    WHERE p.oid IN (v_public_v2, v_private_v1) AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Ditemukan PUBLIC EXECUTE pada V2/private V1. Abort untuk review ACL drift.';
  END IF;

  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF pg_catalog.to_regrole(v_role) IS NULL THEN
      RAISE EXCEPTION 'Role API % tidak ditemukan.', v_role;
    END IF;
    IF pg_catalog.has_function_privilege(v_role, v_public_v2, 'EXECUTE') IS DISTINCT FROM (v_role = 'authenticated') THEN
      RAISE EXCEPTION 'Effective EXECUTE V2 untuk % tidak sesuai baseline 0063.', v_role;
    END IF;
    IF pg_catalog.has_function_privilege(v_role, v_private_v1, 'EXECUTE')
      OR pg_catalog.has_schema_privilege(v_role, v_private_schema, 'USAGE') THEN
      RAISE EXCEPTION 'Akses efektif private V1/schema untuk % tidak sesuai baseline. Abort untuk review.', v_role;
    END IF;
  END LOOP;

  v_public_v1_definition := pg_catalog.pg_get_functiondef(v_public_v1);
  v_public_v2_definition := pg_catalog.pg_get_functiondef(v_public_v2);
  v_private_v1_definition := pg_catalog.pg_get_functiondef(v_private_v1);
  SELECT proacl INTO v_v2_acl FROM pg_catalog.pg_proc WHERE oid = v_public_v2;
  SELECT proacl INTO v_private_acl FROM pg_catalog.pg_proc WHERE oid = v_private_v1;
  SELECT nspacl INTO v_schema_acl FROM pg_catalog.pg_namespace WHERE oid = v_private_schema;

  REVOKE EXECUTE ON FUNCTION public.update_order_fulfillment(uuid, text, text, text)
    FROM PUBLIC, anon, authenticated, service_role;
  COMMENT ON FUNCTION public.update_order_fulfillment(uuid, text, text, text)
    IS 'Legacy API entry point retired; application callers must use public.update_order_fulfillment_v2.';

  IF pg_catalog.to_regprocedure('public.update_order_fulfillment(uuid,text,text,text)')::oid IS DISTINCT FROM v_public_v1
    OR pg_catalog.to_regprocedure('public.update_order_fulfillment_v2(uuid,text,text,text,timestamptz)')::oid IS DISTINCT FROM v_public_v2
    OR pg_catalog.to_regprocedure('rbac_internal.update_order_fulfillment(uuid,text,text,text)')::oid IS DISTINCT FROM v_private_v1 THEN
    RAISE EXCEPTION 'Function fulfillment harus tetap ada dengan identity/OID yang sama.';
  END IF;

  FOREACH v_oid IN ARRAY ARRAY[v_public_v1, v_public_v2, v_private_v1] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid = v_oid AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
    ) OR NOT pg_catalog.has_function_privilege('postgres', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'Owner/execution postgres pada function fulfillment tidak boleh berubah.';
    END IF;
  END LOOP;

  IF pg_catalog.pg_get_functiondef(v_public_v1) IS DISTINCT FROM v_public_v1_definition
    OR pg_catalog.pg_get_functiondef(v_public_v2) IS DISTINCT FROM v_public_v2_definition
    OR pg_catalog.pg_get_functiondef(v_private_v1) IS DISTINCT FROM v_private_v1_definition
    OR (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = v_public_v2) IS DISTINCT FROM v_v2_acl
    OR (SELECT proacl FROM pg_catalog.pg_proc WHERE oid = v_private_v1) IS DISTINCT FROM v_private_acl
    OR (SELECT nspacl FROM pg_catalog.pg_namespace WHERE oid = v_private_schema) IS DISTINCT FROM v_schema_acl THEN
    RAISE EXCEPTION 'Definition fulfillment atau ACL V2/private/schema berubah di luar scope contract.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
    WHERE p.oid IN (v_public_v1, v_public_v2, v_private_v1) AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'PUBLIC EXECUTE fulfillment masih tersedia. Contract dibatalkan.';
  END IF;

  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF pg_catalog.has_function_privilege(v_role, v_public_v1, 'EXECUTE') THEN
      RAISE EXCEPTION 'V1 masih executable oleh % termasuk melalui role inheritance. Contract dibatalkan.', v_role;
    END IF;
    IF pg_catalog.has_function_privilege(v_role, v_public_v2, 'EXECUTE') IS DISTINCT FROM (v_role = 'authenticated') THEN
      RAISE EXCEPTION 'Effective EXECUTE V2 untuk % berubah. Contract dibatalkan.', v_role;
    END IF;
    IF pg_catalog.has_function_privilege(v_role, v_private_v1, 'EXECUTE')
      OR pg_catalog.has_schema_privilege(v_role, v_private_schema, 'USAGE') THEN
      RAISE EXCEPTION 'Private V1/schema masih accessible oleh %. Contract dibatalkan.', v_role;
    END IF;
  END LOOP;
END;
$contract$;

NOTIFY pgrst, 'reload schema';
COMMIT;
