-- Staff access management. PREPARED ONLY; do not apply without review.
BEGIN;

-- Reviewed production baseline: audit_log owner=postgres, RLS=true,
-- FORCE RLS=false; postgres has BYPASSRLS. RPC audit writes intentionally
-- bypass the browser INSERT policy. Fail rather than assume that ownership.
DO $$
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_roles r ON r.oid = c.relowner
    WHERE c.oid = 'public.audit_log'::regclass AND c.relrowsecurity
      AND r.rolname = 'postgres'
      AND (NOT c.relforcerowsecurity OR r.rolbypassrls OR r.rolsuper)
  ) THEN
    RAISE EXCEPTION '0062 memerlukan role postgres dan owner audit dengan bypass RLS yang terverifikasi.';
  END IF;
END;
$$;

-- Preserve ordinary application audits and the existing actor checks.
-- Even a Super Admin browser session cannot directly fabricate RPC events.
ALTER POLICY audit_staff_insert ON public.audit_log WITH CHECK (
  public.has_cms_capability('cms') AND user_id = auth.uid()
  AND COALESCE(user_email, '') = COALESCE(
    (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()),
    auth.jwt() ->> 'email', ''
  )
  AND action NOT IN ('staff_access_updated', 'staff_access_provisioned')
);

-- Phase 1 defines updated_at NOT NULL but has no profile version trigger.
-- Keep microsecond precision and strictly advance even within one transaction
-- or when an older nullable installation has a NULL version.
CREATE FUNCTION public.advance_staff_access_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.updated_at := GREATEST(pg_catalog.clock_timestamp(),
      COALESCE(OLD.updated_at + interval '1 microsecond', pg_catalog.clock_timestamp()));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.advance_staff_access_version() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER profiles_access_version BEFORE UPDATE OF role, is_active ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.advance_staff_access_version();

CREATE FUNCTION public.lookup_staff_candidate(p_email text)
RETURNS TABLE (id uuid, full_name text, email text, role text, is_active boolean, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501';
  END IF;
  IF p_email IS NULL OR length(btrim(p_email)) NOT BETWEEN 3 AND 254 THEN
    RAISE EXCEPTION 'Email tidak valid.' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT p.id, p.full_name, u.email::text, p.role, p.is_active, p.updated_at
    FROM auth.users u JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = lower(btrim(p_email)) AND p.role = 'customer' AND p.is_active
      AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.clock_timestamp())
    ORDER BY p.id LIMIT 2;
END;
$$;

CREATE FUNCTION public.manage_staff_access(
  p_target_user_id uuid, p_role text, p_is_active boolean,
  p_expected_updated_at timestamptz, p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_after public.profiles%ROWTYPE;
  v_active_super_count bigint;
BEGIN
  -- Cheap precheck prevents unauthorized callers from contending on the lock.
  IF v_actor_id IS NULL OR NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id IS NULL OR p_role IS NULL
    OR p_role NOT IN ('super_admin','admin','staff','editor')
    OR p_is_active IS NULL OR p_expected_updated_at IS NULL
    OR length(COALESCE(p_reason,'')) > 500 THEN
    RAISE EXCEPTION 'Data akses staf tidak valid.' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('aka-staff-access-v1', 0));
  PERFORM p.id FROM public.profiles p WHERE p.id IN (v_actor_id, p_target_user_id)
    ORDER BY p.id FOR UPDATE;
  SELECT * INTO v_actor FROM public.profiles WHERE id = v_actor_id;
  IF NOT FOUND OR v_actor.role <> 'super_admin' OR NOT v_actor.is_active THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Akun tidak ditemukan.' USING ERRCODE = 'P0061'; END IF;
  IF v_target.role NOT IN ('super_admin','admin','staff','editor') THEN
    RAISE EXCEPTION 'Target bukan akun CMS.' USING ERRCODE = 'P0062';
  END IF;
  IF v_target.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Data akses sudah berubah. Muat ulang daftar.' USING ERRCODE = 'P0063';
  END IF;
  IF v_target.role = p_role AND v_target.is_active = p_is_active THEN
    RETURN jsonb_build_object('changed',false,'id',v_target.id,'role',v_target.role,
      'is_active',v_target.is_active,'updated_at',v_target.updated_at);
  END IF;
  SELECT count(*) INTO v_active_super_count FROM public.profiles WHERE role = 'super_admin' AND is_active;
  IF v_target.role = 'super_admin' AND v_target.is_active
    AND (p_role <> 'super_admin' OR NOT p_is_active) AND v_active_super_count <= 1 THEN
    RAISE EXCEPTION 'Minimal satu Super Admin aktif harus tersedia.' USING ERRCODE = 'P0064';
  END IF;
  UPDATE public.profiles SET role = p_role, is_active = p_is_active
    WHERE id = p_target_user_id RETURNING * INTO v_after;
  INSERT INTO public.audit_log (user_id,user_email,action,entity_type,entity_id,details)
  VALUES (v_actor_id,COALESCE(v_actor.email,''),'staff_access_updated','profile',v_target.id::text,
    jsonb_build_object('actor_id',v_actor_id,'actor_email',v_actor.email,
      'target_id',v_target.id,'target_email',v_target.email,
      'old_role',v_target.role,'new_role',v_after.role,
      'old_is_active',v_target.is_active,'new_is_active',v_after.is_active,
      'reason',NULLIF(btrim(p_reason),''),'timestamp',pg_catalog.clock_timestamp()));
  RETURN jsonb_build_object('changed',true,'id',v_after.id,'role',v_after.role,
    'is_active',v_after.is_active,'updated_at',v_after.updated_at);
END;
$$;

CREATE FUNCTION public.provision_staff_access(
  p_target_user_id uuid, p_role text, p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor public.profiles%ROWTYPE;
  v_target public.profiles%ROWTYPE;
  v_after public.profiles%ROWTYPE;
  v_target_email text;
  v_banned_until timestamptz;
  v_deleted_at timestamptz;
BEGIN
  IF v_actor_id IS NULL OR NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501';
  END IF;
  IF p_target_user_id IS NULL OR p_role IS NULL
    OR p_role NOT IN ('super_admin','admin','staff','editor')
    OR length(COALESCE(p_reason,'')) > 500 THEN
    RAISE EXCEPTION 'Data akses staf tidak valid.' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('aka-staff-access-v1', 0));
  PERFORM p.id FROM public.profiles p WHERE p.id IN (v_actor_id,p_target_user_id)
    ORDER BY p.id FOR UPDATE;
  SELECT * INTO v_actor FROM public.profiles WHERE id = v_actor_id;
  IF NOT FOUND OR v_actor.role <> 'super_admin' OR NOT v_actor.is_active THEN
    RAISE EXCEPTION 'Anda tidak memiliki akses.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Akun tidak ditemukan.' USING ERRCODE = 'P0061'; END IF;
  IF v_target.role <> 'customer' OR NOT v_target.is_active THEN
    RAISE EXCEPTION 'Target harus akun customer aktif yang belum menjadi staf.' USING ERRCODE = 'P0062';
  END IF;
  -- Lock and recheck Auth state independently of the earlier candidate lookup.
  -- SHARE prevents ban/soft-delete/credential-row deletion during this mutation.
  SELECT u.email, u.banned_until, u.deleted_at
    INTO v_target_email, v_banned_until, v_deleted_at
    FROM auth.users u WHERE u.id = p_target_user_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Akun Auth tidak ditemukan.' USING ERRCODE = 'P0061'; END IF;
  IF v_deleted_at IS NOT NULL
    OR (v_banned_until IS NOT NULL AND v_banned_until > pg_catalog.clock_timestamp()) THEN
    RAISE EXCEPTION 'Akun Auth telah dihapus atau sedang diblokir.' USING ERRCODE = 'P0065';
  END IF;
  UPDATE public.profiles SET role = p_role WHERE id = p_target_user_id RETURNING * INTO v_after;
  INSERT INTO public.audit_log (user_id,user_email,action,entity_type,entity_id,details)
  VALUES (v_actor_id,COALESCE(v_actor.email,''),'staff_access_provisioned','profile',v_target.id::text,
    jsonb_build_object('actor_id',v_actor_id,'actor_email',v_actor.email,
      'target_id',v_target.id,'target_email',v_target_email,
      'old_role',v_target.role,'new_role',v_after.role,
      'old_is_active',v_target.is_active,'new_is_active',v_after.is_active,
      'reason',NULLIF(btrim(p_reason),''),'timestamp',pg_catalog.clock_timestamp()));
  RETURN jsonb_build_object('changed',true,'id',v_after.id,'role',v_after.role,
    'is_active',v_after.is_active,'updated_at',v_after.updated_at);
END;
$$;

ALTER FUNCTION public.lookup_staff_candidate(text) OWNER TO postgres;
ALTER FUNCTION public.manage_staff_access(uuid,text,boolean,timestamptz,text) OWNER TO postgres;
ALTER FUNCTION public.provision_staff_access(uuid,text,text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.lookup_staff_candidate(text),
  public.manage_staff_access(uuid,text,boolean,timestamptz,text),
  public.provision_staff_access(uuid,text,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lookup_staff_candidate(text),
  public.manage_staff_access(uuid,text,boolean,timestamptz,text),
  public.provision_staff_access(uuid,text,text) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
