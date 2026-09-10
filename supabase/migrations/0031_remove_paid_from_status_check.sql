-- =============================================================================
-- Autentik CMS - Fix orders.status CHECK constraint (data + schema)
-- 
-- Context: Migration 0028 was written but never applied in production.
-- One order (ORD-20260831-2702) has status='paid' which violates the
-- intended constraint. This migration fixes the data first, then applies
-- the constraint change.
--
-- Final allowed values: pending, processing, shipped, completed, cancelled
-- 'paid' is handled by payment_status column, not orders.status.
-- =============================================================================

-- Step 1: Fix the one affected order
UPDATE public.orders
SET status = 'processing', updated_at = now()
WHERE order_code = 'ORD-20260831-2702'
  AND status = 'paid';

-- Step 2: Verify no rows with status='paid' remain (guard)
DO $$
BEGIN
  IF (SELECT count(*) FROM public.orders WHERE status = 'paid') > 0 THEN
    RAISE EXCEPTION 'Masih ada baris orders.status=''paid''. Migrasi dibatalkan, review data dulu.';
  END IF;
END $$;

-- Step 3: Replace CHECK constraint (drop old, add new without 'paid')
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IS NULL OR status IN (
    'pending', 'processing', 'shipped', 'completed', 'cancelled'
  ));

-- Step 4: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
