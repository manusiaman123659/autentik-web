-- =============================================================================
-- Autentik CMS - Midtrans Snap Migration (replaces Xendit integration)
-- Apply after 0023_rfq_rate_limit.sql in the Supabase SQL editor.
-- Adds Midtrans payment columns + webhook handler RPC.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================================

-- Add columns (safe: skip if already exist)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS midtrans_order_id text,
  ADD COLUMN IF NOT EXISTS midtrans_redirect_url text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_midtrans_order ON public.orders (midtrans_order_id)
  WHERE midtrans_order_id IS NOT NULL;

-- Drop old Xendit functions if they exist
DROP FUNCTION IF EXISTS public.handle_xendit_webhook(text, text, text, timestamptz);

-- Create Midtrans notification handler
CREATE OR REPLACE FUNCTION public.handle_midtrans_notification(
  p_order_code      text,
  p_midtrans_status text,
  p_payment_method  text,
  p_paid_at         timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  SELECT id, status, payment_status
    INTO v_order
    FROM public.orders
   WHERE order_code = p_order_code
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN true;
  END IF;

  IF p_midtrans_status IN ('capture', 'settlement') THEN
    UPDATE public.orders
       SET payment_status = 'paid',
           status         = CASE
                              WHEN v_order.status = 'pending' THEN 'processing'
                              ELSE v_order.status
                            END,
           payment_method = COALESCE(p_payment_method, 'transfer'),
           paid_at        = p_paid_at,
           updated_at     = now()
     WHERE id = v_order.id;
    RETURN true;
  END IF;

  IF p_midtrans_status IN ('deny', 'cancel', 'expire', 'failure') THEN
    UPDATE public.orders
       SET payment_status = 'failed',
           updated_at     = now()
     WHERE id = v_order.id;
    RETURN true;
  END IF;

  RETURN false;
end;
$$;

GRANT EXECUTE ON FUNCTION public.handle_midtrans_notification(text, text, text, timestamptz) TO service_role;
