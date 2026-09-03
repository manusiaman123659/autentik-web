-- 0030_add_midtrans_payment_type.sql
-- Tambah kolom midtrans_payment_type untuk payment type asli dari Midtrans
-- dan perbaiki RPC handle_midtrans_notification (DROP + CREATE dengan signature baru).

-- 1. Tambah kolom midtrans_payment_type
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS midtrans_payment_type text;

CREATE INDEX IF NOT EXISTS idx_orders_midtrans_payment_type
  ON public.orders (midtrans_payment_type)
  WHERE midtrans_payment_type IS NOT NULL;

-- 2. DROP fungsi lama (4 params) — WAJIB sebelum CREATE versi baru
--    PostgreSQL identifikasi fungsi = nama + signature. Tanpa DROP,
--    CREATE OR REPLACE akan bukan mengganti tapi menambah overload baru.
DROP FUNCTION IF EXISTS public.handle_midtrans_notification(text, text, text, timestamptz);

-- 3. CREATE versi baru (5 params) — dengan p_midtrans_payment_type
CREATE OR REPLACE FUNCTION public.handle_midtrans_notification(
  p_order_code            text,
  p_midtrans_status       text,
  p_payment_method        text,
  p_paid_at               timestamptz,
  p_midtrans_payment_type text DEFAULT NULL
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
           payment_method = COALESCE(p_payment_method, 'midtrans'),
           paid_at        = p_paid_at,
           midtrans_payment_type = COALESCE(p_midtrans_payment_type, midtrans_payment_type),
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

-- 4. Grant HANYA versi baru (5 params) — tidak ada backward-compat
GRANT EXECUTE ON FUNCTION public.handle_midtrans_notification(text, text, text, timestamptz, text) TO service_role;
