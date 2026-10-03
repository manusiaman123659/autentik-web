-- RBAC AKA Phase 1. PREPARED ONLY: review before applying.
-- No users/bootstrap, organization column, or payment/checkout business changes.
BEGIN;

LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'viewer') THEN
    RAISE EXCEPTION 'Legacy viewer masih ada. Tinjau akun sebelum menerapkan RBAC; tidak ada konversi otomatis.';
  END IF;
END;
$$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'staff', 'editor', 'customer'));
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'customer';

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data ->> 'full_name', ''), 'customer')
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;
  RETURN new;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_cms_capability(p_capability text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_active
      AND CASE p_capability
        WHEN 'cms' THEN p.role IN ('super_admin', 'admin', 'staff', 'editor')
        WHEN 'operations' THEN p.role IN ('super_admin', 'admin', 'staff')
        WHEN 'content' THEN p.role IN ('super_admin', 'admin', 'editor')
        WHEN 'shipping' THEN p.role IN ('super_admin', 'admin')
        WHEN 'audit' THEN p.role IN ('super_admin', 'admin')
        WHEN 'sensitive' THEN p.role = 'super_admin'
        WHEN 'users' THEN p.role = 'super_admin'
        ELSE false
      END
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_cms_capability('cms');
$$;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_cms_capability('shipping');
$$;
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.has_cms_capability('sensitive');
$$;
REVOKE EXECUTE ON FUNCTION public.has_cms_capability(text), public.is_staff(), public.is_admin(), public.is_super_admin()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_cms_capability(text), public.is_staff(), public.is_admin(), public.is_super_admin()
  TO anon, authenticated, service_role;

-- No authenticated profile mutation in Phase 1, including for super_admin.
-- Staff management stays read-only; trusted bootstrap happens separately.
DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
ALTER POLICY profiles_staff_select ON public.profiles USING (public.has_cms_capability('users'));
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM PUBLIC, anon, authenticated;
DO $$
DECLARE v_columns text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO v_columns FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles';
  EXECUTE format('REVOKE INSERT (%s), UPDATE (%s) ON public.profiles FROM PUBLIC, anon, authenticated', v_columns, v_columns);
END;
$$;

-- Replace only the authorization term of known existing policies. Preserve
-- their other predicates (archive/public eligibility), commands and grants.
DO $$
DECLARE r record; p record; v_sql text; v_using text; v_check text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('products', 'products_staff_select', 'operations'),
    ('products', 'products_staff_all', 'operations'),
    ('product_categories', 'categories_staff_all', 'operations'),
    ('product_variants', 'product_variants_staff_select', 'operations'),
    ('product_variants', 'product_variants_staff_all', 'operations'),
    ('product_hotspots', 'product_hotspots_staff_select', 'operations'),
    ('product_hotspots', 'product_hotspots_staff_all', 'operations'),
    ('product_photo_hotspots', 'product_photo_hotspots_staff_select', 'operations'),
    ('product_photo_hotspots', 'product_photo_hotspots_staff_all', 'operations'),
    ('orders', 'orders_staff_all', 'operations'),
    ('order_items', 'order_items_staff_select', 'operations'),
    ('order_items', 'order_items_staff_all', 'operations'),
    ('technical_documents', 'techdocs_staff_all', 'operations'),
    ('quotation_requests', 'rfq_staff_select', 'operations'),
    ('quotation_requests', 'rfq_staff_update', 'operations'),
    ('quotation_requests', 'rfq_staff_delete', 'operations'),
    ('contact_messages', 'messages_staff_select', 'operations'),
    ('contact_messages', 'messages_staff_all', 'operations'),
    ('document_download_leads', 'docleads_staff_select', 'operations'),
    ('document_download_leads', 'docleads_staff_all', 'operations'),
    ('whatsapp_leads', 'leads_staff_select', 'operations'),
    ('brands', 'brands_staff_all', 'content'),
    ('careers', 'careers_staff_all', 'content'),
    ('articles', 'articles_staff_all', 'content'),
    ('team_members', 'team_staff_all', 'content'),
    ('group_companies', 'groups_staff_all', 'content'),
    ('partners', 'partners_staff_all', 'content'),
    ('distribution_entities', 'distribution_entities_staff_select', 'content'),
    ('distribution_entities', 'distribution_entities_staff_insert', 'content'),
    ('distribution_entities', 'distribution_entities_staff_update', 'content'),
    ('shipping_zones', 'shipping_zones_staff_all', 'shipping'),
    ('shipping_rates', 'shipping_rates_staff_all', 'shipping'),
    ('shipping_zone_regions', 'shipping_zone_regions_staff_all', 'shipping'),
    ('audit_log', 'audit_staff_select', 'audit'),
    ('revisions', 'revisions_staff_select', 'audit'),
    ('revisions', 'revisions_staff_insert', 'cms')
  ) AS permissions(table_name, policy_name, capability)
  LOOP
    SELECT * INTO p FROM pg_catalog.pg_policies
      WHERE schemaname = 'public' AND tablename = r.table_name AND policyname = r.policy_name;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Policy RBAC yang diharapkan tidak ditemukan: %.%', r.table_name, r.policy_name;
    END IF;
    v_using := regexp_replace(p.qual, '(public[.])?is_staff[(][)]',
      format('public.has_cms_capability(%L)', r.capability), 'g');
    v_check := regexp_replace(p.with_check, '(public[.])?is_staff[(][)]',
      format('public.has_cms_capability(%L)', r.capability), 'g');
    v_sql := format('ALTER POLICY %I ON public.%I', r.policy_name, r.table_name);
    IF v_using IS NOT NULL THEN v_sql := v_sql || ' USING (' || v_using || ')'; END IF;
    IF v_check IS NOT NULL THEN v_sql := v_sql || ' WITH CHECK (' || v_check || ')'; END IF;
    EXECUTE v_sql;
  END LOOP;
END;
$$;

-- Newsletter exists on production despite the historical feature removal.
-- Keep subscribers_public_insert (PUBLIC, INSERT, WITH CHECK true) unchanged.
-- Fresh installations where the legacy table is absent need no policy patch.
DO $$
BEGIN
  IF to_regclass('public.newsletter_subscribers') IS NOT NULL THEN
    DROP POLICY IF EXISTS subscribers_staff_all ON public.newsletter_subscribers;
    DROP POLICY IF EXISTS subscribers_staff_select ON public.newsletter_subscribers;
    CREATE POLICY subscribers_operational_all ON public.newsletter_subscribers
      FOR ALL TO authenticated
      USING (public.has_cms_capability('operations'))
      WITH CHECK (public.has_cms_capability('operations'));

    -- RLS separates application roles within authenticated. Anonymous access
    -- needs INSERT only; remove the old ALL/DDL privileges that bypass RLS.
    REVOKE ALL ON public.newsletter_subscribers FROM PUBLIC, anon, authenticated;
    GRANT INSERT ON public.newsletter_subscribers TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
  END IF;
END;
$$;

-- Operational forms must be able to read inactive brand choices without
-- giving staff editorial mutation rights.
CREATE POLICY brands_operational_select ON public.brands FOR SELECT TO authenticated
  USING (public.has_cms_capability('operations'));
-- Deleting a brand nulls product FKs and removes logos; editorial updates are
-- allowed, but this destructive cross-content operation requires admin.
DROP POLICY brands_staff_all ON public.brands;
CREATE POLICY brands_editorial_select ON public.brands FOR SELECT TO authenticated
  USING (public.has_cms_capability('content'));
CREATE POLICY brands_editorial_insert ON public.brands FOR INSERT TO authenticated
  WITH CHECK (public.has_cms_capability('content'));
CREATE POLICY brands_editorial_update ON public.brands FOR UPDATE TO authenticated
  USING (public.has_cms_capability('content')) WITH CHECK (public.has_cms_capability('content'));
CREATE POLICY brands_admin_delete ON public.brands FOR DELETE TO authenticated
  USING (public.is_admin());

-- Staff may update active products; archive/restore remains admin-only.
ALTER POLICY products_staff_all ON public.products
  USING (public.has_cms_capability('operations') AND (deleted_at IS NULL OR public.is_admin()))
  WITH CHECK (public.has_cms_capability('operations') AND (deleted_at IS NULL OR public.is_admin()));

ALTER POLICY settings_staff_all ON public.site_settings
  USING (
    public.has_cms_capability('sensitive') OR
    (key IN ('compro', 'recruitment', 'home_hero') AND public.has_cms_capability('content'))
  )
  WITH CHECK (
    public.has_cms_capability('sensitive') OR
    (key IN ('compro', 'recruitment', 'home_hero') AND public.has_cms_capability('content'))
  );
ALTER POLICY audit_staff_insert ON public.audit_log
  WITH CHECK (
    public.has_cms_capability('cms') AND user_id = auth.uid()
    AND COALESCE(user_email, '') = COALESCE((SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()), auth.jwt() ->> 'email', '')
  );

-- Existing broad Storage policies would otherwise let editor overwrite
-- product media and staff overwrite editorial media. Minimum separation only.
CREATE FUNCTION public.can_manage_cms_media(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_super_admin() OR
    (split_part(p_path, '/', 1) IN ('products', 'brochures', 'models', 'documents')
      AND public.has_cms_capability('operations')) OR
    (split_part(p_path, '/', 1) IN ('brands', 'team', 'grup_kami', 'partners', 'distribution', 'compro')
      AND public.has_cms_capability('content'));
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_cms_media(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_cms_media(text) TO anon, authenticated, service_role;
ALTER POLICY media_objects_staff_insert ON storage.objects
  WITH CHECK (bucket_id = 'media' AND public.can_manage_cms_media(name));
ALTER POLICY media_objects_staff_select ON storage.objects
  USING (bucket_id = 'media' AND public.can_manage_cms_media(name));
ALTER POLICY media_objects_staff_update ON storage.objects
  USING (bucket_id = 'media' AND public.can_manage_cms_media(name))
  WITH CHECK (bucket_id = 'media' AND public.can_manage_cms_media(name));
ALTER POLICY media_objects_staff_delete ON storage.objects
  USING (bucket_id = 'media' AND public.can_manage_cms_media(name));
ALTER POLICY media_staff_all ON public.media_items
  USING (public.can_manage_cms_media(storage_path))
  WITH CHECK (public.can_manage_cms_media(storage_path));
ALTER POLICY technical_documents_objects_staff_all ON storage.objects
  USING (bucket_id = 'technical-documents' AND public.has_cms_capability('operations'))
  WITH CHECK (bucket_id = 'technical-documents' AND public.has_cms_capability('operations'));
ALTER POLICY technical_documents_objects_private_guard ON storage.objects
  USING (bucket_id <> 'technical-documents' OR public.has_cms_capability('operations'))
  WITH CHECK (bucket_id <> 'technical-documents' OR public.has_cms_capability('operations'));

-- Preserve the existing RPC bodies byte-for-byte by moving them to a private
-- schema, then expose same-signature capability-guarded wrappers. This avoids
-- copying/changing payment, stock, row-lock and idempotency business logic.
CREATE SCHEMA rbac_internal;
REVOKE ALL ON SCHEMA rbac_internal FROM PUBLIC, anon, authenticated, service_role;
ALTER FUNCTION public.upsert_product_variants(text, jsonb) SET SCHEMA rbac_internal;
ALTER FUNCTION public.upsert_product_hotspots(text, jsonb) SET SCHEMA rbac_internal;
ALTER FUNCTION public.upsert_product_photo_hotspots(text, jsonb) SET SCHEMA rbac_internal;
ALTER FUNCTION public.cancel_order(uuid, text) SET SCHEMA rbac_internal;
ALTER FUNCTION public.update_order_fulfillment(uuid, text, text, text) SET SCHEMA rbac_internal;
ALTER FUNCTION public.soft_delete_order(text, uuid, text) SET SCHEMA rbac_internal;
ALTER FUNCTION public.restore_order(text, uuid) SET SCHEMA rbac_internal;
ALTER FUNCTION public.record_manual_order_refund(uuid, text, text) SET SCHEMA rbac_internal;
ALTER FUNCTION public.test_shipping_rate(text, text, bigint) SET SCHEMA rbac_internal;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA rbac_internal FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA rbac_internal REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE FUNCTION public.upsert_product_variants(p_product_id text, p_variants jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_cms_capability('operations') THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  PERFORM rbac_internal.upsert_product_variants(p_product_id, p_variants);
END;
$$;
CREATE FUNCTION public.upsert_product_hotspots(p_product_id text, p_hotspots jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_cms_capability('operations') THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  PERFORM rbac_internal.upsert_product_hotspots(p_product_id, p_hotspots);
END;
$$;
CREATE FUNCTION public.upsert_product_photo_hotspots(p_product_id text, p_hotspots jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_cms_capability('operations') THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  PERFORM rbac_internal.upsert_product_photo_hotspots(p_product_id, p_hotspots);
END;
$$;
CREATE FUNCTION public.cancel_order(p_order_id uuid, p_cancel_reason text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_cms_capability('operations') THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  RETURN rbac_internal.cancel_order(p_order_id, p_cancel_reason);
END;
$$;
CREATE FUNCTION public.update_order_fulfillment(p_order_id uuid, p_status text, p_tracking_courier text, p_tracking_number text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_cms_capability('operations') THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  RETURN rbac_internal.update_order_fulfillment(p_order_id, p_status, p_tracking_courier, p_tracking_number);
END;
$$;
CREATE FUNCTION public.soft_delete_order(p_order_id text, p_admin_id uuid, p_reason text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() OR p_admin_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  RETURN rbac_internal.soft_delete_order(p_order_id, p_admin_id, p_reason);
END;
$$;
CREATE FUNCTION public.restore_order(p_order_id text, p_admin_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() OR p_admin_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  RETURN rbac_internal.restore_order(p_order_id, p_admin_id);
END;
$$;
CREATE FUNCTION public.record_manual_order_refund(p_order_id uuid, p_reference text DEFAULT NULL, p_note text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  RETURN rbac_internal.record_manual_order_refund(p_order_id, p_reference, p_note);
END;
$$;
CREATE FUNCTION public.test_shipping_rate(p_province text, p_city text, p_total_weight_g bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_cms_capability('shipping') THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  RETURN rbac_internal.test_shipping_rate(p_province, p_city, p_total_weight_g);
END;
$$;
CREATE FUNCTION public.get_shipping_admin_enabled() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_cms_capability('shipping') THEN RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501'; END IF;
  RETURN COALESCE((SELECT (value ->> 'enableShipping')::boolean FROM public.site_settings WHERE key = 'store'), false);
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.upsert_product_variants(text, jsonb), public.upsert_product_hotspots(text, jsonb),
  public.upsert_product_photo_hotspots(text, jsonb), public.cancel_order(uuid, text),
  public.update_order_fulfillment(uuid, text, text, text), public.soft_delete_order(text, uuid, text),
  public.restore_order(text, uuid), public.record_manual_order_refund(uuid, text, text),
  public.test_shipping_rate(text, text, bigint), public.get_shipping_admin_enabled()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.upsert_product_variants(text, jsonb), public.upsert_product_hotspots(text, jsonb),
  public.upsert_product_photo_hotspots(text, jsonb), public.cancel_order(uuid, text),
  public.update_order_fulfillment(uuid, text, text, text), public.soft_delete_order(text, uuid, text),
  public.restore_order(text, uuid), public.record_manual_order_refund(uuid, text, text),
  public.test_shipping_rate(text, text, bigint), public.get_shipping_admin_enabled()
  TO authenticated, service_role;

-- Abort on an unreviewed permissive policy still using the broadened helper.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (COALESCE(qual, '') ~ '(public[.])?is_staff[(][)]'
        OR COALESCE(with_check, '') ~ '(public[.])?is_staff[(][)]')
  ) THEN RAISE EXCEPTION 'Ada policy is_staff yang belum dipetakan. RBAC dibatalkan untuk ditinjau.'; END IF;
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
