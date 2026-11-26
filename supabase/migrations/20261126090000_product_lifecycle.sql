-- =============================================================================
-- Product Lifecycle (Soft Delete 2-Tahap: ACTIVE -> ARCHIVED -> TRASHED)
-- Berlaku seragam untuk Produk B2B (b2b_system) & Komponen (sparepart).
--
-- State invariant:
--   ACTIVE   : deleted_at IS NULL     AND trashed_at IS NULL
--   ARCHIVED : deleted_at IS NOT NULL AND trashed_at IS NULL
--   TRASHED  : deleted_at IS NOT NULL AND trashed_at IS NOT NULL
--
-- Hak akses (RBAC):
--   - archive, trash, restore_to_draft : admin, super_admin
--   - restore_to_archive (dari Sampah) : super_admin ONLY
--   - physical DELETE pada products    : diblokir permanen (ON DELETE RESTRICT + trigger)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Preflight checks
-- ---------------------------------------------------------------------------
DO $preflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.products'::regclass
      AND attname = 'id'
      AND atttypid = 'text'::regtype
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Prasyarat public.products.id bertipe text tidak terpenuhi.';
  END IF;

  IF to_regprocedure('public.has_cms_capability(text)') IS NULL THEN
    RAISE EXCEPTION 'Prasyarat public.has_cms_capability(text) (migration 0061) belum tersedia.';
  END IF;
END;
$preflight$;

-- ---------------------------------------------------------------------------
-- 2. Kolom, Constraint, dan Index Lifecycle pada public.products & audit_log
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lifecycle_version integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_lifecycle_version_nonnegative,
  ADD CONSTRAINT products_lifecycle_version_nonnegative
    CHECK (lifecycle_version >= 0);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_lifecycle_state_consistent,
  ADD CONSTRAINT products_lifecycle_state_consistent
    CHECK (trashed_at IS NULL OR deleted_at IS NOT NULL);

CREATE INDEX IF NOT EXISTS products_lifecycle_listing
  ON public.products (product_type, trashed_at, deleted_at, id);

CREATE UNIQUE INDEX IF NOT EXISTS product_lifecycle_request_unique
  ON public.audit_log ((details ->> 'request_id'))
  WHERE starts_with(action, 'product.lifecycle.');

-- ---------------------------------------------------------------------------
-- 3. Private Helper Schema untuk Proteksi RLS Anak (tidak diekspos Data API)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS product_lifecycle_private;
REVOKE ALL ON SCHEMA product_lifecycle_private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA product_lifecycle_private TO anon, authenticated;

CREATE OR REPLACE FUNCTION product_lifecycle_private.product_parent_publicly_visible(
  p_product_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $parent_vis$
  SELECT EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = p_product_id
      AND p.deleted_at IS NULL
      AND p.trashed_at IS NULL
      AND p.status = 'published'
      AND p.is_active = true
      AND (
        p.product_type = 'b2b_system'
        OR (p.product_type = 'sparepart' AND p.is_store_visible = true)
      )
  );
$parent_vis$;

REVOKE ALL ON FUNCTION product_lifecycle_private.product_parent_publicly_visible(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION product_lifecycle_private.product_parent_publicly_visible(text)
  TO anon, authenticated;

-- Restrictive SELECT policy agar publik tidak pernah melihat produk/child yang diarsipkan atau di sampah.
DROP POLICY IF EXISTS products_public_lifecycle_visibility ON public.products;
CREATE POLICY products_public_lifecycle_visibility
  ON public.products
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (
    public.has_cms_capability('operations')
    OR (deleted_at IS NULL AND trashed_at IS NULL)
  );

DROP POLICY IF EXISTS product_hotspots_lifecycle_visibility ON public.product_hotspots;
CREATE POLICY product_hotspots_lifecycle_visibility
  ON public.product_hotspots
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (
    public.has_cms_capability('operations')
    OR product_lifecycle_private.product_parent_publicly_visible(product_id)
  );

DROP POLICY IF EXISTS product_photo_hotspots_lifecycle_visibility ON public.product_photo_hotspots;
CREATE POLICY product_photo_hotspots_lifecycle_visibility
  ON public.product_photo_hotspots
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (
    public.has_cms_capability('operations')
    OR product_lifecycle_private.product_parent_publicly_visible(product_id)
  );

DROP POLICY IF EXISTS product_variants_lifecycle_visibility ON public.product_variants;
CREATE POLICY product_variants_lifecycle_visibility
  ON public.product_variants
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (
    public.has_cms_capability('operations')
    OR product_lifecycle_private.product_parent_publicly_visible(product_id)
  );

-- ---------------------------------------------------------------------------
-- 4. Trigger Guard pada public.products dan public.audit_log
--    Catatan: UPDATE non-lifecycle (misal stock pada cancel_order / edit form)
--    tetap diizinkan agar tidak mengganggu checkout, stok, atau restock order.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_product_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $guard$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Penghapusan permanen produk tidak tersedia. Gunakan alur arsip dan sampah.'
      USING ERRCODE = '0A000';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.product_type IS DISTINCT FROM OLD.product_type
      OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Identitas dan tipe produk tidak dapat diubah melalui UPDATE.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NOT NULL
      OR NEW.trashed_at IS NOT NULL
      OR NEW.lifecycle_version <> 0 THEN
      RAISE EXCEPTION 'Produk baru harus dimulai pada status ACTIVE dengan lifecycle_version 0.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    OR NEW.trashed_at IS DISTINCT FROM OLD.trashed_at
    OR NEW.lifecycle_version IS DISTINCT FROM OLD.lifecycle_version THEN

    IF current_user <> 'postgres'
      OR pg_catalog.current_setting('app.product_lifecycle_rpc', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'Gunakan RPC transition_product_lifecycle untuk mengubah status lifecycle produk.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.lifecycle_version <> OLD.lifecycle_version + 1 THEN
      RAISE EXCEPTION 'Kenaikan versi lifecycle tidak valid.'
        USING ERRCODE = '22023';
    END IF;

    IF OLD.deleted_at IS NULL AND OLD.trashed_at IS NULL
      AND NEW.deleted_at IS NOT NULL AND NEW.trashed_at IS NULL THEN
      NULL; -- ACTIVE -> ARCHIVED
    ELSIF OLD.deleted_at IS NOT NULL AND OLD.trashed_at IS NULL
      AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
      AND NEW.trashed_at IS NOT NULL
      AND NEW.status = 'draft' AND NEW.is_active = false THEN
      NULL; -- ARCHIVED -> TRASHED
    ELSIF OLD.deleted_at IS NOT NULL AND OLD.trashed_at IS NOT NULL
      AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at
      AND NEW.trashed_at IS NULL THEN
      NULL; -- TRASHED -> ARCHIVED
    ELSIF OLD.deleted_at IS NOT NULL AND OLD.trashed_at IS NULL
      AND NEW.deleted_at IS NULL AND NEW.trashed_at IS NULL
      AND NEW.status = 'draft' AND NEW.is_active = false THEN
      NULL; -- ARCHIVED -> ACTIVE (draf nonaktif)
    ELSE
      RAISE EXCEPTION 'Transisi lifecycle produk tidak valid.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$guard$;

REVOKE ALL ON FUNCTION public.guard_product_lifecycle()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_b2b_product_lifecycle ON public.products;
DROP TRIGGER IF EXISTS guard_product_lifecycle ON public.products;
CREATE TRIGGER guard_product_lifecycle
  BEFORE INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_product_lifecycle();

CREATE OR REPLACE FUNCTION public.guard_product_lifecycle_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $audit_guard$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF starts_with(OLD.action, 'product.lifecycle.') THEN
      RAISE EXCEPTION 'Audit lifecycle produk tidak dapat diubah atau dihapus.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    IF starts_with(NEW.action, 'product.lifecycle.') THEN
      IF TG_OP <> 'INSERT'
        OR current_user <> 'postgres'
        OR pg_catalog.current_setting('app.product_lifecycle_rpc', true) IS DISTINCT FROM '1' THEN
        RAISE EXCEPTION 'Audit lifecycle produk hanya boleh dibuat oleh RPC atomik.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$audit_guard$;

REVOKE ALL ON FUNCTION public.guard_product_lifecycle_audit()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_b2b_lifecycle_audit ON public.audit_log;
DROP TRIGGER IF EXISTS guard_product_lifecycle_audit ON public.audit_log;
CREATE TRIGGER guard_product_lifecycle_audit
  BEFORE INSERT OR UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_product_lifecycle_audit();

-- ---------------------------------------------------------------------------
-- 5. RPC Atomik Berversi: public.transition_product_lifecycle
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_product_lifecycle(
  p_product_id text,
  p_action text,
  p_expected_version integer,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $lifecycle$
DECLARE
  v_actor uuid := auth.uid();
  v_profile record;
  v_product record;
  v_replay record;
  v_from text;
  v_to text;
  v_audit_rows integer;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Akses lifecycle produk ditolak.' USING ERRCODE = '42501';
  END IF;

  SELECT id, email, role, is_active
    INTO v_profile
    FROM public.profiles
    WHERE id = v_actor;

  IF NOT FOUND
    OR v_profile.is_active IS DISTINCT FROM true
    OR v_profile.role IS NULL
    OR v_profile.role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Akses lifecycle produk ditolak.' USING ERRCODE = '42501';
  END IF;

  IF p_action IS NULL
    OR p_action NOT IN ('archive', 'trash', 'restore_to_archive', 'restore_to_draft') THEN
    RAISE EXCEPTION 'Operasi tidak didukung. Penghapusan permanen tidak tersedia.'
      USING ERRCODE = '0A000';
  END IF;

  -- Pemulihan dari Sampah khusus super_admin
  IF p_action = 'restore_to_archive' AND v_profile.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Hanya Super Admin yang dapat memulihkan produk dari Sampah.'
      USING ERRCODE = '42501';
  END IF;

  IF p_product_id IS NULL
    OR pg_catalog.length(p_product_id) NOT BETWEEN 1 AND 200
    OR p_product_id <> pg_catalog.btrim(p_product_id)
    OR p_request_id IS NULL
    OR p_expected_version IS NULL
    OR p_expected_version < 0
    OR p_expected_version > 2147483646 THEN
    RAISE EXCEPTION 'ID produk, versi, atau ID permintaan tidak valid.'
      USING ERRCODE = '22023';
  END IF;

  SELECT id, slug, product_type, status, is_active, is_store_visible, deleted_at, trashed_at, lifecycle_version
    INTO v_product
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan atau tidak dapat diakses.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_product.product_type NOT IN ('b2b_system', 'sparepart') THEN
    RAISE EXCEPTION 'Tipe produk tidak didukung untuk aksi lifecycle.'
      USING ERRCODE = '22023';
  END IF;

  v_from := CASE
    WHEN v_product.deleted_at IS NULL THEN 'ACTIVE'
    WHEN v_product.trashed_at IS NULL THEN 'ARCHIVED'
    ELSE 'TRASHED'
  END;

  -- Idempotency replay check
  SELECT user_id, entity_id, action, details
    INTO v_replay
    FROM public.audit_log
    WHERE starts_with(action, 'product.lifecycle.')
      AND details ->> 'request_id' = p_request_id::text;

  IF FOUND THEN
    IF v_replay.user_id IS DISTINCT FROM v_actor
      OR v_replay.entity_id IS DISTINCT FROM p_product_id
      OR v_replay.action IS DISTINCT FROM ('product.lifecycle.' || p_action)
      OR (v_replay.details ->> 'from_version')::integer IS DISTINCT FROM p_expected_version THEN
      RAISE EXCEPTION 'ID permintaan sudah dipakai untuk operasi lain.'
        USING ERRCODE = '40001';
    END IF;

    RETURN jsonb_build_object(
      'product_id', v_product.id,
      'product_type', v_product.product_type,
      'slug', v_product.slug,
      'state', v_from,
      'lifecycle_version', v_product.lifecycle_version,
      'status', v_product.status,
      'is_active', v_product.is_active,
      'is_store_visible', v_product.is_store_visible,
      'applied', false,
      'request_id', p_request_id,
      'action', p_action
    );
  END IF;

  IF v_product.lifecycle_version <> p_expected_version THEN
    RAISE EXCEPTION 'Versi lifecycle sudah berubah; muat ulang.'
      USING ERRCODE = '40001';
  END IF;

  CASE p_action
    WHEN 'archive' THEN
      IF v_from <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Hanya produk ACTIVE yang dapat diarsipkan.' USING ERRCODE = '22023';
      END IF;
      v_to := 'ARCHIVED';
    WHEN 'trash' THEN
      IF v_from <> 'ARCHIVED' THEN
        RAISE EXCEPTION 'Hanya produk yang sudah diarsipkan yang dapat dipindahkan ke Sampah.' USING ERRCODE = '22023';
      END IF;
      v_to := 'TRASHED';
    WHEN 'restore_to_archive' THEN
      IF v_from <> 'TRASHED' THEN
        RAISE EXCEPTION 'Hanya produk di Sampah yang dapat dipulihkan ke Arsip.' USING ERRCODE = '22023';
      END IF;
      v_to := 'ARCHIVED';
    WHEN 'restore_to_draft' THEN
      IF v_from <> 'ARCHIVED' THEN
        RAISE EXCEPTION 'Hanya produk di Arsip yang dapat dipulihkan sebagai draf.' USING ERRCODE = '22023';
      END IF;
      v_to := 'ACTIVE';
  END CASE;

  PERFORM pg_catalog.set_config('app.product_lifecycle_rpc', '1', true);

  UPDATE public.products AS p
    SET
      deleted_at = CASE
        WHEN p_action = 'archive' THEN statement_timestamp()
        WHEN p_action = 'restore_to_draft' THEN NULL
        ELSE p.deleted_at
      END,
      trashed_at = CASE
        WHEN p_action = 'trash' THEN statement_timestamp()
        ELSE NULL
      END,
      status = CASE
        WHEN p_action IN ('trash', 'restore_to_draft') THEN 'draft'
        ELSE p.status
      END,
      is_active = CASE
        WHEN p_action IN ('trash', 'restore_to_draft') THEN false
        ELSE p.is_active
      END,
      is_store_visible = CASE
        WHEN p_action = 'trash' AND p.product_type = 'sparepart' THEN false
        ELSE p.is_store_visible
      END,
      lifecycle_version = p.lifecycle_version + 1,
      updated_at = statement_timestamp()
    WHERE p.id = p_product_id
    RETURNING id, slug, product_type, status, is_active, is_store_visible, deleted_at, trashed_at, lifecycle_version
      INTO v_product;

  IF NOT FOUND THEN
    PERFORM pg_catalog.set_config('app.product_lifecycle_rpc', '0', true);
    RAISE EXCEPTION 'Produk berubah atau akses tidak lagi tersedia.' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (
      v_actor,
      COALESCE(v_profile.email, ''),
      'product.lifecycle.' || p_action,
      'product',
      p_product_id,
      jsonb_build_object(
        'request_id', p_request_id,
        'product_type', v_product.product_type,
        'from_state', v_from,
        'to_state', v_to,
        'from_version', p_expected_version,
        'to_version', v_product.lifecycle_version
      )
    );

  GET DIAGNOSTICS v_audit_rows = ROW_COUNT;
  PERFORM pg_catalog.set_config('app.product_lifecycle_rpc', '0', true);

  IF v_audit_rows <> 1 THEN
    RAISE EXCEPTION 'Audit lifecycle wajib tersimpan; seluruh perubahan dibatalkan.'
      USING ERRCODE = '23514';
  END IF;

  RETURN jsonb_build_object(
    'product_id', v_product.id,
    'product_type', v_product.product_type,
    'slug', v_product.slug,
    'state', v_to,
    'lifecycle_version', v_product.lifecycle_version,
    'status', v_product.status,
    'is_active', v_product.is_active,
    'is_store_visible', v_product.is_store_visible,
    'applied', true,
    'request_id', p_request_id,
    'action', p_action
  );
EXCEPTION WHEN unique_violation THEN
  PERFORM pg_catalog.set_config('app.product_lifecycle_rpc', '0', true);
  RAISE EXCEPTION 'ID permintaan sudah dipakai; muat ulang.' USING ERRCODE = '40001';
END;
$lifecycle$;

REVOKE ALL ON FUNCTION public.transition_product_lifecycle(text, text, integer, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_product_lifecycle(text, text, integer, uuid)
  TO authenticated;

-- Hardening tambahan: pastikan DELETE, TRUNCATE, dan TRIGGER tidak diberikan ke role aplikasi.
REVOKE DELETE, TRUNCATE, TRIGGER ON public.products FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE, TRIGGER ON public.audit_log FROM PUBLIC, anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
