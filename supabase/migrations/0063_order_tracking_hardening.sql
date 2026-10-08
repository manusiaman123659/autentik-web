BEGIN;

DO $$
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
    WHERE c.oid = 'public.audit_log'::regclass AND c.relrowsecurity AND r.rolname = 'postgres'
      AND (NOT c.relforcerowsecurity OR r.rolbypassrls OR r.rolsuper)
  ) THEN
    RAISE EXCEPTION 'Migration memerlukan owner audit dan runner postgres yang terverifikasi.';
  END IF;
END;
$$;

CREATE FUNCTION public.advance_order_tracking_version() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.tracking_courier IS DISTINCT FROM OLD.tracking_courier
    OR NEW.tracking_number IS DISTINCT FROM OLD.tracking_number
    OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.updated_at := GREATEST(pg_catalog.clock_timestamp(), OLD.updated_at + interval '1 microsecond');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_order_tracking_version() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER orders_tracking_version BEFORE UPDATE OF tracking_courier, tracking_number ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.advance_order_tracking_version();

CREATE FUNCTION public.get_order_couriers() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_couriers jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501';
  END IF;
  SELECT value -> 'couriers' INTO v_couriers FROM public.site_settings WHERE key = 'store';
  IF jsonb_typeof(v_couriers) IS DISTINCT FROM 'array' THEN RETURN '[]'::jsonb; END IF;
  RETURN COALESCE((SELECT jsonb_agg(courier ORDER BY first_position) FROM (
    SELECT btrim(item #>> '{}') AS courier, min(position) AS first_position
    FROM jsonb_array_elements(v_couriers) WITH ORDINALITY AS entries(item, position)
    WHERE jsonb_typeof(item) = 'string'
      AND char_length(item #>> '{}') BETWEEN 1 AND 80
      AND btrim(item #>> '{}') <> ''
      AND (item #>> '{}') !~ '[[:cntrl:]<>]'
      AND (item #>> '{}') !~ U&'[\0080-\009F]'
      AND (item #>> '{}') !~* '([a-z][a-z0-9+.-]*:|www[.]|//|&(lt|gt);)'
    GROUP BY btrim(item #>> '{}')
  ) choices), '[]'::jsonb);
END;
$$;

CREATE FUNCTION public.update_order_fulfillment_v2(
  p_order_id uuid, p_status text, p_tracking_courier text,
  p_tracking_number text, p_expected_updated_at timestamptz
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_before public.orders%ROWTYPE;
  v_after public.orders%ROWTYPE;
  v_courier text := NULLIF(btrim(p_tracking_courier), '');
  v_number text := NULLIF(btrim(p_tracking_number), '');
  v_email text;
BEGIN
  IF v_actor IS NULL OR NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501';
  END IF;
  IF p_order_id IS NULL OR p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION 'ID dan versi pesanan wajib diisi.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_before FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_before.deleted_at IS NOT NULL THEN RETURN false; END IF;
  IF NOT public.has_cms_capability('operations') THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501';
  END IF;
  IF v_before.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Pesanan sudah berubah. Muat ulang halaman sebelum menyimpan kembali.' USING ERRCODE = 'P0063';
  END IF;
  IF v_before.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Informasi pengiriman pesanan terminal hanya dapat dibaca.' USING ERRCODE = '22023';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('pending', 'processing', 'shipped', 'completed') THEN
    RAISE EXCEPTION 'Status pesanan tidak valid.' USING ERRCODE = '22023';
  END IF;
  IF NOT (CASE v_before.status
    WHEN 'pending' THEN p_status IN ('pending', 'processing')
    WHEN 'processing' THEN p_status IN ('processing', 'shipped')
    WHEN 'shipped' THEN p_status IN ('shipped', 'completed')
    ELSE false END) THEN
    RAISE EXCEPTION 'Perubahan status pesanan tidak diizinkan.' USING ERRCODE = '22023';
  END IF;
  IF p_status IN ('pending', 'completed') THEN
    IF COALESCE(p_tracking_courier, '') IS DISTINCT FROM COALESCE(v_before.tracking_courier, '')
      OR COALESCE(p_tracking_number, '') IS DISTINCT FROM COALESCE(v_before.tracking_number, '') THEN
      RAISE EXCEPTION 'Resi tidak dapat diubah pada status ini.' USING ERRCODE = '22023';
    END IF;
    v_courier := v_before.tracking_courier;
    v_number := v_before.tracking_number;
  ELSE
    IF char_length(COALESCE(p_tracking_courier, '')) > 80
      OR COALESCE(p_tracking_courier, '') ~ '[[:cntrl:]<>]'
      OR COALESCE(p_tracking_courier, '') ~ U&'[\0080-\009F]'
      OR COALESCE(p_tracking_courier, '') ~* '([a-z][a-z0-9+.-]*:|www[.]|//|&(lt|gt);)' THEN
      RAISE EXCEPTION 'Kurir tidak valid.' USING ERRCODE = '22023';
    END IF;
    IF char_length(COALESCE(p_tracking_number, '')) > 100
      OR COALESCE(p_tracking_number, '') !~ '^[A-Za-z0-9 ._/-]*$'
      OR COALESCE(p_tracking_number, '') ~* '(//|www[.]|\y[a-z0-9-]+[.](com|net|org|id|co|io)([./]|$))' THEN
      RAISE EXCEPTION 'Nomor resi tidak valid.' USING ERRCODE = '22023';
    END IF;
    IF (v_number IS NOT NULL OR p_status = 'shipped') AND v_courier IS NULL THEN
      RAISE EXCEPTION 'Kurir wajib dipilih.' USING ERRCODE = '22023';
    END IF;
    IF p_status = 'shipped' AND v_number IS NULL THEN
      RAISE EXCEPTION 'Nomor resi wajib diisi saat Dikirim.' USING ERRCODE = '22023';
    END IF;
    IF v_courier IS NOT NULL AND NOT (public.get_order_couriers() @> jsonb_build_array(v_courier)) THEN
      RAISE EXCEPTION 'Pilih kurir yang terdaftar dalam pengaturan toko.' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF v_before.status IS NOT DISTINCT FROM p_status
    AND v_before.tracking_courier IS NOT DISTINCT FROM v_courier
    AND v_before.tracking_number IS NOT DISTINCT FROM v_number THEN
    RETURN true;
  END IF;
  UPDATE public.orders SET status = p_status,
    tracking_courier = v_courier, tracking_number = v_number WHERE id = p_order_id;
  SELECT * INTO v_after FROM public.orders WHERE id = p_order_id;
  SELECT email INTO v_email FROM public.profiles WHERE id = v_actor;
  IF v_before.tracking_courier IS DISTINCT FROM v_after.tracking_courier
    OR v_before.tracking_number IS DISTINCT FROM v_after.tracking_number THEN
    INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (v_actor, COALESCE(v_email, ''), 'order.tracking_updated', 'order', p_order_id::text,
      jsonb_build_object('order_code', v_before.order_code,
        'old_courier', v_before.tracking_courier, 'new_courier', v_after.tracking_courier,
        'old_tracking_number', v_before.tracking_number, 'new_tracking_number', v_after.tracking_number,
        'old_status', v_before.status, 'new_status', v_after.status));
  END IF;
  IF v_before.status IS DISTINCT FROM v_after.status THEN
    INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (v_actor, COALESCE(v_email, ''), 'order.status_changed', 'order', p_order_id::text,
      jsonb_build_object('old_status', v_before.status, 'status', v_after.status));
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_order_couriers(),
  public.update_order_fulfillment_v2(uuid, text, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_order_couriers(),
  public.update_order_fulfillment_v2(uuid, text, text, text, timestamptz) TO authenticated;

ALTER POLICY audit_staff_insert ON public.audit_log WITH CHECK (
  public.has_cms_capability('cms') AND user_id = auth.uid()
  AND COALESCE(user_email, '') = COALESCE(
    (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()), auth.jwt() ->> 'email', '')
  AND action NOT IN ('staff_access_updated', 'staff_access_provisioned', 'order.tracking_updated')
);

COMMIT;
NOTIFY pgrst, 'reload schema';
