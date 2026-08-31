-- =============================================================================
-- Autentik CMS - Fix orders.status CHECK constraint
-- Adds 'processing' to the allowed status values.
-- The original constraint (0002_store_orders.sql) only allowed:
--   pending, paid, shipped, completed, cancelled
-- Zod schema (ORDER_STATUSES) also includes 'processing', so the DB must match.
-- ============================================================================

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IS NULL OR status IN (
    'pending', 'processing', 'paid', 'shipped', 'completed', 'cancelled'
  ));
