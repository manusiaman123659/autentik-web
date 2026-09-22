-- 0049_expand_order_payment_status.sql
-- Add the failed payment status used by the Midtrans webhook while preserving
-- the legacy unpaid value and all existing payment status behavior.

BEGIN;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (
    payment_status IN (
      'unpaid',
      'pending',
      'paid',
      'failed',
      'refunded'
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
