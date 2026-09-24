-- 0054_financial_reconciliation.sql
-- Record externally completed refunds atomically and protect unresolved payment
-- reconciliation from webhook regressions and premature order archival.

BEGIN;

CREATE OR REPLACE FUNCTION public.record_manual_order_refund(
  p_order_id uuid,
  p_reference text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_note text := NULLIF(BTRIM(p_note), '');
  v_reference text := NULLIF(BTRIM(p_reference), '');
  v_order record;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Hanya staf yang dapat mencatat pengembalian dana.';
  END IF;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Identitas staf tidak tersedia.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ID pesanan wajib diisi.';
  END IF;

  IF v_note IS NULL AND v_reference IS NULL THEN
    RAISE EXCEPTION 'Referensi atau catatan pengembalian dana wajib diisi.';
  END IF;

  IF CHAR_LENGTH(COALESCE(v_reference, '')) > 120 THEN
    RAISE EXCEPTION 'Referensi pengembalian dana maksimal 120 karakter.';
  END IF;

  IF CHAR_LENGTH(COALESCE(v_note, '')) > 500 THEN
    RAISE EXCEPTION 'Catatan pengembalian dana maksimal 500 karakter.';
  END IF;

  SELECT id, order_code, status, payment_status, deleted_at
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan.';
  END IF;

  IF v_order.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pesanan yang sudah diarsipkan tidak dapat direkonsiliasi.';
  END IF;

  IF v_order.status = 'cancelled' AND v_order.payment_status = 'refunded' THEN
    RETURN false;
  END IF;

  IF v_order.status <> 'cancelled' OR v_order.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Hanya pesanan dibatalkan dengan pembayaran berhasil yang dapat direkonsiliasi.';
  END IF;

  UPDATE public.orders
     SET payment_status = 'refunded'
   WHERE id = v_order.id;

  SELECT COALESCE(email, '')
    INTO v_actor_email
    FROM public.profiles
   WHERE id = v_actor_id;

  INSERT INTO public.audit_log (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_actor_id,
    COALESCE(v_actor_email, ''),
    'payment.manual_refund_recorded',
    'order',
    v_order.id::text,
    jsonb_build_object(
      'order_code', v_order.order_code,
      'reference', v_reference,
      'note', v_note,
      'previous_payment_status', 'paid',
      'new_payment_status', 'refunded',
      'timestamp', now()
    )
  );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_manual_order_refund(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_manual_order_refund(uuid, text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_midtrans_notification(
  p_order_code text,
  p_midtrans_status text,
  p_payment_method text,
  p_paid_at timestamptz,
  p_midtrans_payment_type text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT id, status, payment_status
    INTO v_order
    FROM public.orders
   WHERE order_code = p_order_code
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_order.payment_status IN ('paid', 'refunded') THEN
    RETURN true;
  END IF;

  IF p_midtrans_status IN ('capture', 'settlement') THEN
    UPDATE public.orders
       SET payment_status = 'paid',
           status = CASE
                      WHEN v_order.status = 'pending' THEN 'processing'
                      ELSE v_order.status
                    END,
           payment_method = COALESCE(p_payment_method, 'midtrans'),
           paid_at = p_paid_at,
           midtrans_payment_type = COALESCE(p_midtrans_payment_type, midtrans_payment_type),
           updated_at = now()
     WHERE id = v_order.id;
    RETURN true;
  END IF;

  IF p_midtrans_status IN ('deny', 'cancel', 'expire', 'failure') THEN
    UPDATE public.orders
       SET payment_status = 'failed',
           updated_at = now()
     WHERE id = v_order.id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_midtrans_notification(text, text, text, timestamptz, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_midtrans_notification(text, text, text, timestamptz, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.soft_delete_order(
  p_order_id text,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_order_id uuid;
  v_order record;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Hanya staf yang dapat mengarsipkan pesanan.';
  END IF;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Identitas staf tidak tersedia.';
  END IF;

  IF p_admin_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'Identitas staf tidak valid.';
  END IF;

  IF p_order_id IS NULL OR BTRIM(p_order_id) = '' THEN
    RAISE EXCEPTION 'ID pesanan wajib diisi.';
  END IF;

  BEGIN
    v_order_id := BTRIM(p_order_id)::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Format ID pesanan tidak valid.';
  END;

  SELECT
    id,
    status,
    payment_status,
    payment_method,
    midtrans_order_id,
    midtrans_redirect_url,
    deleted_at
    INTO v_order
    FROM public.orders
   WHERE id = v_order_id
   FOR UPDATE;

  IF NOT FOUND OR v_order.deleted_at IS NOT NULL THEN
    RETURN false;
  END IF;

  IF v_order.status = 'cancelled' AND v_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Rekonsiliasi pembayaran harus diselesaikan sebelum pesanan diarsipkan.';
  END IF;

  IF v_order.status = 'cancelled'
     AND (
       v_order.payment_method = 'midtrans'
       OR v_order.midtrans_order_id IS NOT NULL
       OR v_order.midtrans_redirect_url IS NOT NULL
     )
     AND v_order.payment_status IN ('pending', 'failed') THEN
    RAISE EXCEPTION 'Pesanan Midtrans yang masih berpotensi menerima pembayaran tidak dapat diarsipkan.';
  END IF;

  UPDATE public.orders
     SET deleted_at = now()
   WHERE id = v_order.id;

  SELECT COALESCE(email, '')
    INTO v_actor_email
    FROM public.profiles
   WHERE id = v_actor_id;

  INSERT INTO public.audit_log (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_actor_id,
    COALESCE(v_actor_email, ''),
    'SOFT_DELETE',
    'orders',
    v_order.id::text,
    jsonb_build_object('reason', p_reason, 'timestamp', now())
  );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.soft_delete_order(text, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_order(text, uuid, text)
  TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
