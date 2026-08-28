-- =============================================================================
-- Autentik CMS - Xendit Invoice Payment Integration (Phase: payment gateway)
-- Apply after 0023_rfq_rate_limit.sql in the Supabase SQL editor.
-- Adds invoice tracking columns to orders + webhook handler RPC.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- orders: add Xendit tracking columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS xendit_invoice_id text,
  ADD COLUMN IF NOT EXISTS xendit_invoice_url text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_xendit_invoice ON public.orders (xendit_invoice_id)
  WHERE xendit_invoice_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- handle_xendit_webhook: called by /api/webhooks/xendit via service_role
-- Idempotent: if order is already paid, returns true without mutating.
-- SECURITY DEFINER + service_role GRANT = webhook bypasses RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_xendit_webhook(
  p_order_code      text,
  p_xendit_status   text,
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
  -- Lock the order row; skip if not found
  SELECT id, status, payment_status
    INTO v_order
    FROM public.orders
   WHERE order_code = p_order_code
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Idempotent guard: already paid/settled → no-op
  IF v_order.payment_status = 'paid' THEN
    RETURN true;
  END IF;

  -- Only act on successful payments
  IF p_xendit_status IN ('PAID', 'SETTLED') THEN
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

  -- Pending / other statuses → log but don't mutate
  RETURN false;
end;
$$;

-- Webhook runs as service_role (bypasses RLS); no public grant needed.
GRANT EXECUTE ON FUNCTION public.handle_xendit_webhook(text, text, text, timestamptz) TO service_role;
