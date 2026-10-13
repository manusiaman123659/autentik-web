-- Product Translation Foundation 001. REVIEW BEFORE MANUAL APPLICATION.
-- No translations are seeded. Product content, media and commerce are untouched.
BEGIN;

DO $$
DECLARE v_column text;
BEGIN
  IF to_regclass('public.product_translations') IS NOT NULL
    OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'products' AND column_name = 'translation_source_revision') THEN
    RAISE EXCEPTION 'Fondasi terjemahan sudah ada; periksa migrasi sebelum melanjutkan.';
  END IF;
  IF to_regprocedure('public.has_cms_capability(text)') IS NULL
    OR to_regclass('public.audit_log') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid = 'public.products'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'Prasyarat Product/RBAC/audit tidak tersedia.';
  END IF;
  FOREACH v_column IN ARRAY ARRAY['id','slug','product_type','name','description','features','specs',
    'seo_title','seo_description','status','is_active','deleted_at'] LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'products' AND column_name = v_column
      AND data_type = CASE WHEN v_column IN ('features','specs') THEN 'jsonb'
        WHEN v_column = 'is_active' THEN 'boolean'
        WHEN v_column = 'deleted_at' THEN 'timestamp with time zone' ELSE 'text' END) THEN
      RAISE EXCEPTION 'Kolom Product tidak sesuai: %.', v_column;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.products ADD COLUMN translation_source_revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.products ADD CONSTRAINT products_translation_source_revision_positive
  CHECK (translation_source_revision > 0);

CREATE FUNCTION public.track_product_translation_source_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.translation_source_revision := 1;
  ELSIF ROW(NEW.name, NEW.description, NEW.features, NEW.specs, NEW.seo_title, NEW.seo_description)
    IS DISTINCT FROM ROW(OLD.name, OLD.description, OLD.features, OLD.specs, OLD.seo_title, OLD.seo_description) THEN
    NEW.translation_source_revision := OLD.translation_source_revision + 1;
  ELSE
    NEW.translation_source_revision := OLD.translation_source_revision;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.track_product_translation_source_revision() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER products_translation_source_revision
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.track_product_translation_source_revision();

-- ECMAScript trim characters, independent of the database locale's [:space:].
CREATE FUNCTION public.normalize_product_translation_text(p_text text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT NULLIF(pg_catalog.btrim(p_text,
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), '');
$$;
REVOKE ALL ON FUNCTION public.normalize_product_translation_text(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_product_translation_text(text) TO service_role;

-- Pure constraint helper: no table access and no privileged execution.
CREATE FUNCTION public.product_translation_blocks_valid(p_features jsonb, p_specs jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_item jsonb; v_key text; v_text text;
BEGIN
  IF p_features IS NOT NULL THEN
    IF pg_catalog.jsonb_typeof(p_features) <> 'array' THEN RETURN false; END IF;
    IF pg_catalog.jsonb_array_length(p_features) > 1000 THEN RETURN false; END IF;
    FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_features) LOOP
      IF pg_catalog.jsonb_typeof(v_item) <> 'string' THEN RETURN false; END IF;
      v_text := v_item #>> '{}';
      IF pg_catalog.length(v_text) > 2000 OR public.normalize_product_translation_text(v_text) IS NULL
        OR v_text IS DISTINCT FROM public.normalize_product_translation_text(v_text) THEN RETURN false; END IF;
    END LOOP;
  END IF;
  IF p_specs IS NOT NULL THEN
    IF pg_catalog.jsonb_typeof(p_specs) <> 'array' THEN RETURN false; END IF;
    IF pg_catalog.jsonb_array_length(p_specs) > 1000 THEN RETURN false; END IF;
    FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_specs) LOOP
      IF pg_catalog.jsonb_typeof(v_item) <> 'object' THEN RETURN false; END IF;
      IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_object_keys(v_item) AS keys(key)
        WHERE key NOT IN ('label','value_text')) THEN RETURN false; END IF;
      FOREACH v_key IN ARRAY ARRAY['label','value_text'] LOOP
        IF v_item -> v_key IS NOT NULL AND v_item -> v_key <> 'null'::jsonb THEN
          IF pg_catalog.jsonb_typeof(v_item -> v_key) <> 'string' THEN RETURN false; END IF;
          v_text := v_item ->> v_key;
          IF public.normalize_product_translation_text(v_text) IS NULL OR pg_catalog.length(v_text) > (CASE WHEN v_key = 'label' THEN 500 ELSE 2000 END)
            OR v_text IS DISTINCT FROM public.normalize_product_translation_text(v_text) THEN RETURN false; END IF;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.product_translation_blocks_valid(jsonb, jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.product_translation_blocks_valid(jsonb, jsonb) TO service_role;

CREATE TABLE public.product_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('en','zh-CN')),
  name text CHECK (name IS NULL OR (pg_catalog.length(name) BETWEEN 1 AND 500
    AND name IS NOT DISTINCT FROM public.normalize_product_translation_text(name))),
  description text CHECK (description IS NULL OR (pg_catalog.length(description) BETWEEN 1 AND 20000
    AND description IS NOT DISTINCT FROM public.normalize_product_translation_text(description))),
  features jsonb,
  specs jsonb,
  seo_title text CHECK (seo_title IS NULL OR (pg_catalog.length(seo_title) BETWEEN 1 AND 500
    AND seo_title IS NOT DISTINCT FROM public.normalize_product_translation_text(seo_title))),
  seo_description text CHECK (seo_description IS NULL OR (pg_catalog.length(seo_description) BETWEEN 1 AND 2000
    AND seo_description IS NOT DISTINCT FROM public.normalize_product_translation_text(seo_description))),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  source_revision integer NOT NULL CHECK (source_revision > 0),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_translations_product_locale_key UNIQUE (product_id, locale),
  CONSTRAINT product_translations_blocks_check CHECK (public.product_translation_blocks_valid(features, specs)),
  CONSTRAINT product_translations_published_content_check CHECK (status <> 'published' OR
    name IS NOT NULL OR description IS NOT NULL OR seo_title IS NOT NULL OR seo_description IS NOT NULL
    OR (features IS NOT NULL AND pg_catalog.jsonb_array_length(features) > 0)
    OR (specs IS NOT NULL AND pg_catalog.jsonb_path_exists(specs, '$[*] ? (@.label != null || @.value_text != null)')))
);
-- The unique index covers Product FK, locale detail and batched ID lookups.

CREATE FUNCTION public.advance_product_translation_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.version := 1;
  ELSE
    NEW.version := OLD.version + 1;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_product_translation_version() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER product_translations_version_updated_at
  BEFORE INSERT OR UPDATE ON public.product_translations
  FOR EACH ROW EXECUTE FUNCTION public.advance_product_translation_version();

ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_translations_public_select ON public.product_translations
  FOR SELECT TO anon, authenticated USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_translations.product_id
        AND p.translation_source_revision = product_translations.source_revision
        AND p.status = 'published' AND p.is_active = true AND p.deleted_at IS NULL
    )
  );
CREATE POLICY product_translations_operational_select ON public.product_translations
  FOR SELECT TO authenticated USING ((SELECT public.has_cms_capability('operations')));
CREATE POLICY product_translations_operational_insert ON public.product_translations
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT public.has_cms_capability('operations')) AND EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_translations.product_id AND p.deleted_at IS NULL));
CREATE POLICY product_translations_operational_update ON public.product_translations
  FOR UPDATE TO authenticated USING (
    (SELECT public.has_cms_capability('operations')) AND EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_translations.product_id AND p.deleted_at IS NULL))
  WITH CHECK ((SELECT public.has_cms_capability('operations')) AND EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_translations.product_id AND p.deleted_at IS NULL));
CREATE POLICY product_translations_operational_delete ON public.product_translations
  FOR DELETE TO authenticated USING (
    (SELECT public.has_cms_capability('operations')) AND EXISTS (
      SELECT 1 FROM public.products p WHERE p.id = product_translations.product_id AND p.deleted_at IS NULL));
REVOKE ALL ON public.product_translations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_translations TO anon, authenticated;
GRANT ALL ON public.product_translations TO service_role;

CREATE FUNCTION public.save_product_translation(
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak tersedia.' USING ERRCODE = 'PT003'; END IF;
  IF p_expected_source_revision IS DISTINCT FROM v_parent.translation_source_revision THEN
    RAISE EXCEPTION 'Konten sumber berubah.' USING ERRCODE = 'PT001'; END IF;
  SELECT * INTO v_before FROM public.product_translations WHERE product_id = p_product_id AND locale = p_locale FOR UPDATE;
  v_found := FOUND;
  -- Row identity also prevents an old version matching a deleted/recreated row.
  IF (v_found AND (p_expected_translation_version IS DISTINCT FROM v_before.version
      OR p_expected_translation_id IS DISTINCT FROM v_before.id))
    OR (NOT v_found AND (p_expected_translation_version IS NOT NULL OR p_expected_translation_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'Terjemahan berubah.' USING ERRCODE = 'PT002'; END IF;
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

CREATE FUNCTION public.unpublish_product_translation(p_product_id text, p_locale text, p_expected_translation_version integer, p_expected_translation_id uuid)
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak tersedia.' USING ERRCODE = 'PT003'; END IF;
  SELECT * INTO v_row FROM public.product_translations WHERE product_id = p_product_id AND locale = p_locale FOR UPDATE;
  IF NOT FOUND OR p_expected_translation_version IS DISTINCT FROM v_row.version OR p_expected_translation_id IS DISTINCT FROM v_row.id THEN
    RAISE EXCEPTION 'Terjemahan berubah.' USING ERRCODE = 'PT002'; END IF;
  UPDATE public.product_translations SET status = 'draft' WHERE id = v_row.id RETURNING * INTO v_row;
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
  VALUES (auth.uid(), COALESCE(v_email, ''), 'product.translation_unpublished', 'product_translation', v_row.id::text,
    pg_catalog.jsonb_build_object('product_id', p_product_id, 'locale', p_locale, 'version', v_row.version, 'source_revision', v_row.source_revision));
  RETURN pg_catalog.jsonb_build_object('product_id', p_product_id, 'slug', v_parent.slug,
    'product_type', v_parent.product_type, 'locale', p_locale, 'version', v_row.version);
END;
$$;

CREATE FUNCTION public.delete_product_translation(p_product_id text, p_locale text, p_expected_translation_version integer, p_expected_translation_id uuid)
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
  IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak tersedia.' USING ERRCODE = 'PT003'; END IF;
  SELECT * INTO v_row FROM public.product_translations WHERE product_id = p_product_id AND locale = p_locale FOR UPDATE;
  IF NOT FOUND OR p_expected_translation_version IS DISTINCT FROM v_row.version OR p_expected_translation_id IS DISTINCT FROM v_row.id THEN
    RAISE EXCEPTION 'Terjemahan berubah.' USING ERRCODE = 'PT002'; END IF;
  DELETE FROM public.product_translations WHERE id = v_row.id;
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
  VALUES (auth.uid(), COALESCE(v_email, ''), 'product.translation_deleted', 'product_translation', v_row.id::text,
    pg_catalog.jsonb_build_object('product_id', p_product_id, 'locale', p_locale, 'version', v_row.version, 'source_revision', v_row.source_revision));
  RETURN pg_catalog.jsonb_build_object('product_id', p_product_id, 'slug', v_parent.slug,
    'product_type', v_parent.product_type, 'locale', p_locale, 'version', v_row.version);
END;
$$;

REVOKE ALL ON FUNCTION public.save_product_translation(text, text, jsonb, text, integer, integer, uuid),
  public.unpublish_product_translation(text, text, integer, uuid), public.delete_product_translation(text, text, integer, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_product_translation(text, text, jsonb, text, integer, integer, uuid),
  public.unpublish_product_translation(text, text, integer, uuid), public.delete_product_translation(text, text, integer, uuid) TO authenticated;

-- Reserve transactionally recorded events without weakening existing audit rules.
DO $$
DECLARE v_check text;
BEGIN
  SELECT with_check INTO v_check FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'audit_staff_insert';
  IF v_check IS NULL THEN RAISE EXCEPTION 'Policy audit yang diharapkan tidak tersedia.'; END IF;
  EXECUTE pg_catalog.format('ALTER POLICY audit_staff_insert ON public.audit_log WITH CHECK ((%s) AND action NOT IN (%L,%L,%L,%L))',
    v_check, 'product.translation_saved', 'product.translation_published', 'product.translation_unpublished', 'product.translation_deleted');
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
