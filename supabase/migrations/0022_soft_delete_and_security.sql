-- =============================================================================
-- 0022 Soft-Delete & Security Enhancement
-- =============================================================================
-- Adds soft-delete columns to key tables, replaces hard-delete RPC with
-- soft-delete, and adds a restore RPC for undoing soft-deletes.
-- =============================================================================

-- ─── 1. Soft-Delete Columns ──────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

ALTER TABLE public.quotation_requests
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

ALTER TABLE public.careers
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- ─── 2. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);

-- ─── 3. Soft-Delete Order RPC ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.soft_delete_order(
  p_order_id text,
  p_admin_id uuid,
  p_reason text DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: only staff
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Soft-delete: set deleted_at if not already deleted
  UPDATE public.orders
  SET deleted_at = now()
  WHERE id = p_order_id AND deleted_at IS NULL;

  IF NOT found THEN
    RETURN false;
  END IF;

  -- Record in audit_log for accounting/tax history
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
  SELECT
    p_admin_id,
    COALESCE((SELECT email FROM public.profiles WHERE id = p_admin_id), ''),
    'SOFT_DELETE',
    'orders',
    p_order_id,
    jsonb_build_object('reason', p_reason, 'timestamp', now());

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_order(text, uuid, text) TO authenticated;

-- ─── 4. Restore Order RPC ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.restore_order(
  p_order_id text,
  p_admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: only staff
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Restore: clear deleted_at
  UPDATE public.orders
  SET deleted_at = NULL
  WHERE id = p_order_id AND deleted_at IS NOT NULL;

  IF NOT found THEN
    RETURN false;
  END IF;

  -- Record in audit_log
  INSERT INTO public.audit_log (user_id, user_email, action, entity_type, entity_id, details)
  SELECT
    p_admin_id,
    COALESCE((SELECT email FROM public.profiles WHERE id = p_admin_id), ''),
    'RESTORE',
    'orders',
    p_order_id,
    jsonb_build_object('timestamp', now());

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_order(text, uuid) TO authenticated;

-- ─── 5. RLS Policy Updates ───────────────────────────────────────────────────
-- Update SELECT policies on orders and products to exclude soft-deleted rows.
-- This ensures anon/public queries automatically filter out archived records.

-- Orders: drop existing select policy, recreate with deleted_at check
DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      is_staff()
      OR created_by = auth.uid()
    )
  );

-- Products: drop existing select policy, recreate with deleted_at check
DROP POLICY IF EXISTS products_select_published ON public.products;
CREATE POLICY products_select_published ON public.products
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      is_staff()
      OR (is_active = true)
    )
  );
