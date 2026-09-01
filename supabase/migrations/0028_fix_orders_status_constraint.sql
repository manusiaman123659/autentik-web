-- =============================================================================
-- Autentik CMS - Fix orders.status CHECK constraint
-- Removes redundant 'paid' (handled by payment_status column).
-- Adds 'processing' for the Midtrans webhook flow.
-- Final allowed values: pending, processing, shipped, completed, cancelled
-- ============================================================================

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IS NULL OR status IN (
    'pending', 'processing', 'shipped', 'completed', 'cancelled'
  ));
