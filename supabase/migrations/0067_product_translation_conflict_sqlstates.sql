-- PRODUCT-TRANSLATION-001: codes-only conflict hotfix. Manual application.
BEGIN;

-- Fail closed if the reviewed deployed baseline has drifted.
DO $$
DECLARE v_expected record; v_proc record;
BEGIN
  FOR v_expected IN SELECT * FROM (VALUES
    ('public.save_product_translation(text,text,jsonb,text,integer,integer,uuid)', '029f0537789640c1329f14a49e5eef5c', 1),
    ('public.unpublish_product_translation(text,text,integer,uuid)', 'c482c873e6dd5c06dd60b2edea61d8d5', 0),
    ('public.delete_product_translation(text,text,integer,uuid)', 'b9a86383d28382d2218145d57649d891', 0)
  ) AS expected(signature, body_md5, defaults) LOOP
    SELECT p.*, l.lanname, r.rolname INTO v_proc FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_language l ON l.oid = p.prolang
      JOIN pg_catalog.pg_roles r ON r.oid = p.proowner
      WHERE p.oid = pg_catalog.to_regprocedure(v_expected.signature);
    IF NOT FOUND THEN RAISE EXCEPTION 'RPC terjemahan tidak tersedia: %.', v_expected.signature; END IF;
    IF pg_catalog.md5(pg_catalog.replace(pg_catalog.replace(v_proc.prosrc, E'\r\n', E'\n'), E'\r', E'\n')) IS DISTINCT FROM v_expected.body_md5
      OR v_proc.prorettype <> 'jsonb'::regtype OR v_proc.proretset
      OR v_proc.lanname <> 'plpgsql' OR NOT v_proc.prosecdef
      OR v_proc.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
      OR v_proc.rolname <> 'postgres' OR v_proc.provolatile <> 'v'
      OR v_proc.proisstrict OR v_proc.proleakproof OR v_proc.proparallel <> 'u'
      OR v_proc.prokind <> 'f' OR v_proc.pronargdefaults <> v_expected.defaults
      OR (v_expected.defaults = 1 AND pg_catalog.pg_get_expr(v_proc.proargdefaults, 0) IS DISTINCT FROM 'NULL::uuid')
      OR NOT pg_catalog.has_function_privilege('authenticated', v_proc.oid, 'EXECUTE')
      OR pg_catalog.has_function_privilege('anon', v_proc.oid, 'EXECUTE')
      OR pg_catalog.has_function_privilege('service_role', v_proc.oid, 'EXECUTE')
      OR EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(v_proc.proacl,
        pg_catalog.acldefault('f', v_proc.proowner))) a
        WHERE a.grantee NOT IN (v_proc.proowner, 'authenticated'::regrole) AND a.privilege_type = 'EXECUTE')
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_roles r
        WHERE r.oid <> v_proc.proowner AND r.rolname <> 'authenticated' AND NOT r.rolsuper
          AND pg_catalog.has_function_privilege(r.oid, v_proc.oid, 'EXECUTE')) THEN
      RAISE EXCEPTION 'RPC terjemahan berbeda dari baseline yang ditinjau: %.', v_expected.signature;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_product_translation(
  p_product_id text, p_locale text, p_payload jsonb, p_status text,
  p_expected_source_revision integer, p_expected_translation_version integer,
  p_expected_translation_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_parent public.products%ROWTYPE; v_before public.product_translations%ROWTYPE;
  v_after public.product_translations%ROWTYPE; v_email text; v_found boolean;
  v_key text; v_item jsonb; v_original jsonb; v_index bigint; v_text text;
  v_fields jsonb := '{}'::jsonb; v_features jsonb; v_specs jsonb;
  v_label text; v_value text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid() AND is_active FOR SHARE;
  IF NOT FOUND OR NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501'; END IF;
  IF p_locale IS NULL OR p_locale NOT IN ('en','zh-CN') OR p_status IS NULL OR p_status NOT IN ('draft','published') THEN
    RAISE EXCEPTION 'Bahasa/status tidak valid.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_parent FROM public.products WHERE id = p_product_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak tersedia.' USING ERRCODE = 'P1063'; END IF;
  IF p_expected_source_revision IS DISTINCT FROM v_parent.translation_source_revision THEN
    RAISE EXCEPTION 'Konten sumber berubah.' USING ERRCODE = 'P1061'; END IF;
  SELECT * INTO v_before FROM public.product_translations WHERE product_id = p_product_id AND locale = p_locale FOR UPDATE;
  v_found := FOUND;
  -- Row identity also prevents an old version matching a deleted/recreated row.
  IF (v_found AND (p_expected_translation_version IS DISTINCT FROM v_before.version
      OR p_expected_translation_id IS DISTINCT FROM v_before.id))
    OR (NOT v_found AND (p_expected_translation_version IS NOT NULL OR p_expected_translation_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'Terjemahan berubah.' USING ERRCODE = 'P1062'; END IF;
  IF p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload) <> 'object'
    OR pg_catalog.octet_length(p_payload::text) > 262144 THEN
    RAISE EXCEPTION 'Payload tidak valid.' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(p_payload) AS keys(key)
    WHERE key NOT IN ('name','description','features','specs','seo_title','seo_description')) THEN
    RAISE EXCEPTION 'Bidang tidak diizinkan.' USING ERRCODE = '22023'; END IF;
  FOREACH v_key IN ARRAY ARRAY['name','description','seo_title','seo_description'] LOOP
    v_text := NULL;
    IF p_payload -> v_key IS NOT NULL AND p_payload -> v_key <> 'null'::jsonb THEN
      IF pg_catalog.jsonb_typeof(p_payload -> v_key) <> 'string' THEN
        RAISE EXCEPTION 'Teks tidak valid.' USING ERRCODE = '22023'; END IF;
      v_text := public.normalize_product_translation_text(p_payload ->> v_key);
      IF pg_catalog.length(v_text) > (CASE v_key WHEN 'description' THEN 20000 WHEN 'seo_description' THEN 2000 ELSE 500 END) THEN
        RAISE EXCEPTION 'Teks terlalu panjang.' USING ERRCODE = '22023'; END IF;
    END IF;
    v_fields := v_fields || pg_catalog.jsonb_build_object(v_key, v_text);
  END LOOP;
  IF p_payload -> 'features' IS NOT NULL AND p_payload -> 'features' <> 'null'::jsonb THEN
    IF pg_catalog.jsonb_typeof(p_payload -> 'features') <> 'array'
      OR pg_catalog.jsonb_typeof(v_parent.features) <> 'array' THEN
      RAISE EXCEPTION 'Fitur tidak valid.' USING ERRCODE = '22023'; END IF;
    IF pg_catalog.jsonb_array_length(p_payload -> 'features') <> pg_catalog.jsonb_array_length(v_parent.features)
      OR pg_catalog.jsonb_array_length(p_payload -> 'features') > 1000 THEN
      RAISE EXCEPTION 'Struktur fitur berubah.' USING ERRCODE = '22023'; END IF;
    v_features := '[]'::jsonb;
    FOR v_item, v_index IN SELECT value, ordinality FROM pg_catalog.jsonb_array_elements(p_payload -> 'features') WITH ORDINALITY LOOP
      IF pg_catalog.jsonb_typeof(v_item) <> 'object' THEN
        RAISE EXCEPTION 'Fitur tidak valid.' USING ERRCODE = '22023'; END IF;
      IF v_item -> 'source_index' IS DISTINCT FROM pg_catalog.to_jsonb(v_index - 1)
        OR pg_catalog.jsonb_typeof(v_item -> 'text') IS DISTINCT FROM 'string'
        OR pg_catalog.jsonb_typeof(v_parent.features -> (v_index::integer - 1)) IS DISTINCT FROM 'string'
        OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_item) AS keys(key) WHERE key NOT IN ('source_index','text')) THEN
        RAISE EXCEPTION 'Urutan/bidang fitur tidak valid.' USING ERRCODE = '22023'; END IF;
      v_text := public.normalize_product_translation_text(v_item ->> 'text');
      IF v_text IS NULL OR pg_catalog.length(v_text) > 2000 THEN
        RAISE EXCEPTION 'Teks fitur tidak valid.' USING ERRCODE = '22023'; END IF;
      v_features := v_features || pg_catalog.jsonb_build_array(v_text);
    END LOOP;
  END IF;
  IF p_payload -> 'specs' IS NOT NULL AND p_payload -> 'specs' <> 'null'::jsonb THEN
    IF pg_catalog.jsonb_typeof(p_payload -> 'specs') <> 'array'
      OR pg_catalog.jsonb_typeof(v_parent.specs) <> 'array' THEN
      RAISE EXCEPTION 'Spesifikasi tidak valid.' USING ERRCODE = '22023'; END IF;
    IF pg_catalog.jsonb_array_length(p_payload -> 'specs') <> pg_catalog.jsonb_array_length(v_parent.specs)
      OR pg_catalog.jsonb_array_length(p_payload -> 'specs') > 1000 THEN
      RAISE EXCEPTION 'Struktur spesifikasi berubah.' USING ERRCODE = '22023'; END IF;
    v_specs := '[]'::jsonb;
    FOR v_item, v_index IN SELECT value, ordinality FROM pg_catalog.jsonb_array_elements(p_payload -> 'specs') WITH ORDINALITY LOOP
      v_original := v_parent.specs -> (v_index::integer - 1);
      IF pg_catalog.jsonb_typeof(v_item) <> 'object' THEN
        RAISE EXCEPTION 'Spesifikasi tidak valid.' USING ERRCODE = '22023'; END IF;
      IF v_item -> 'source_index' IS DISTINCT FROM pg_catalog.to_jsonb(v_index - 1)
        OR pg_catalog.jsonb_typeof(v_original -> 'label') IS DISTINCT FROM 'string'
        OR pg_catalog.jsonb_typeof(v_original -> 'value') IS DISTINCT FROM 'string'
        OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_item) AS keys(key) WHERE key NOT IN ('source_index','label','value_text')) THEN
        RAISE EXCEPTION 'Urutan/bidang spesifikasi tidak valid.' USING ERRCODE = '22023'; END IF;
      FOREACH v_key IN ARRAY ARRAY['label','value_text'] LOOP
        IF v_item -> v_key IS NOT NULL AND v_item -> v_key <> 'null'::jsonb
          AND pg_catalog.jsonb_typeof(v_item -> v_key) <> 'string' THEN
          RAISE EXCEPTION 'Teks spesifikasi tidak valid.' USING ERRCODE = '22023'; END IF;
      END LOOP;
      v_label := public.normalize_product_translation_text(v_item ->> 'label');
      v_value := public.normalize_product_translation_text(v_item ->> 'value_text');
      IF pg_catalog.length(v_label) > 500 OR pg_catalog.length(v_value) > 2000 THEN
        RAISE EXCEPTION 'Teks spesifikasi terlalu panjang.' USING ERRCODE = '22023'; END IF;
      IF v_value IS NOT NULL AND (v_original ->> 'value_kind') IS DISTINCT FROM 'text' THEN
        RAISE EXCEPTION 'Nilai teknis tidak dapat diterjemahkan.' USING ERRCODE = '22023'; END IF;
      v_specs := v_specs || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('label', v_label, 'value_text', v_value));
    END LOOP;
  END IF;
  IF v_found THEN
    UPDATE public.product_translations SET name = v_fields ->> 'name', description = v_fields ->> 'description',
      features = v_features, specs = v_specs, seo_title = v_fields ->> 'seo_title', seo_description = v_fields ->> 'seo_description',
      status = p_status, source_revision = v_parent.translation_source_revision WHERE id = v_before.id RETURNING * INTO v_after;
  ELSE
    INSERT INTO public.product_translations (product_id, locale, name, description, features, specs, seo_title, seo_description, status, source_revision)
    VALUES (p_product_id, p_locale, v_fields ->> 'name', v_fields ->> 'description', v_features, v_specs,
      v_fields ->> 'seo_title', v_fields ->> 'seo_description', p_status, v_parent.translation_source_revision) RETURNING * INTO v_after;
  END IF;
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
  VALUES (auth.uid(), COALESCE(v_email, ''), CASE WHEN p_status = 'published' THEN 'product.translation_published' ELSE 'product.translation_saved' END,
    'product_translation', v_after.id::text, pg_catalog.jsonb_build_object('product_id', p_product_id, 'locale', p_locale,
      'version', v_after.version, 'source_revision', v_after.source_revision, 'status', v_after.status));
  RETURN pg_catalog.jsonb_build_object('product_id', p_product_id, 'slug', v_parent.slug,
    'product_type', v_parent.product_type, 'locale', p_locale, 'version', v_after.version);
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_product_translation(p_product_id text, p_locale text, p_expected_translation_version integer, p_expected_translation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_parent public.products%ROWTYPE; v_row public.product_translations%ROWTYPE; v_email text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid() AND is_active FOR SHARE;
  IF NOT FOUND OR NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501'; END IF;
  IF p_locale IS NULL OR p_locale NOT IN ('en','zh-CN') THEN
    RAISE EXCEPTION 'Bahasa tidak valid.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_parent FROM public.products WHERE id = p_product_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak tersedia.' USING ERRCODE = 'P1063'; END IF;
  SELECT * INTO v_row FROM public.product_translations WHERE product_id = p_product_id AND locale = p_locale FOR UPDATE;
  IF NOT FOUND OR p_expected_translation_version IS DISTINCT FROM v_row.version OR p_expected_translation_id IS DISTINCT FROM v_row.id THEN
    RAISE EXCEPTION 'Terjemahan berubah.' USING ERRCODE = 'P1062'; END IF;
  UPDATE public.product_translations SET status = 'draft' WHERE id = v_row.id RETURNING * INTO v_row;
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
  VALUES (auth.uid(), COALESCE(v_email, ''), 'product.translation_unpublished', 'product_translation', v_row.id::text,
    pg_catalog.jsonb_build_object('product_id', p_product_id, 'locale', p_locale, 'version', v_row.version, 'source_revision', v_row.source_revision));
  RETURN pg_catalog.jsonb_build_object('product_id', p_product_id, 'slug', v_parent.slug,
    'product_type', v_parent.product_type, 'locale', p_locale, 'version', v_row.version);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_product_translation(p_product_id text, p_locale text, p_expected_translation_version integer, p_expected_translation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_parent public.products%ROWTYPE; v_row public.product_translations%ROWTYPE; v_email text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid() AND is_active FOR SHARE;
  IF NOT FOUND OR NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501'; END IF;
  IF p_locale IS NULL OR p_locale NOT IN ('en','zh-CN') THEN
    RAISE EXCEPTION 'Bahasa tidak valid.' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_parent FROM public.products WHERE id = p_product_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak tersedia.' USING ERRCODE = 'P1063'; END IF;
  SELECT * INTO v_row FROM public.product_translations WHERE product_id = p_product_id AND locale = p_locale FOR UPDATE;
  IF NOT FOUND OR p_expected_translation_version IS DISTINCT FROM v_row.version OR p_expected_translation_id IS DISTINCT FROM v_row.id THEN
    RAISE EXCEPTION 'Terjemahan berubah.' USING ERRCODE = 'P1062'; END IF;
  DELETE FROM public.product_translations WHERE id = v_row.id;
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
  VALUES (auth.uid(), COALESCE(v_email, ''), 'product.translation_deleted', 'product_translation', v_row.id::text,
    pg_catalog.jsonb_build_object('product_id', p_product_id, 'locale', p_locale, 'version', v_row.version, 'source_revision', v_row.source_revision));
  RETURN pg_catalog.jsonb_build_object('product_id', p_product_id, 'slug', v_parent.slug,
    'product_type', v_parent.product_type, 'locale', p_locale, 'version', v_row.version);
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
