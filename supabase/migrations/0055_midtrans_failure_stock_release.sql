-- 0055_midtrans_failure_stock_release.sql
-- Atomically cancel stored Midtrans orders and restore their inventory when a
-- terminal payment failure arrives. Pending/abandoned timeout remains separate.

BEGIN;

-- Internal only. Callers must lock the order row and verify an eligible
-- pending/processing -> cancelled transition before invoking this helper.
CREATE OR REPLACE FUNCTION public.restore_order_inventory_internal(
  p_order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_item record;
BEGIN
  FOR v_item IN
    SELECT id, product_id, variant_id, variant_label, quantity
      FROM public.order_items
     WHERE order_id = p_order_id
     ORDER BY product_id NULLS FIRST, variant_id NULLS FIRST, id
  LOOP
    IF v_item.product_id IS NULL THEN
      RAISE EXCEPTION 'Referensi produk pada item pesanan tidak tersedia.';
    END IF;

    IF v_item.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
         SET stock = stock + v_item.quantity
       WHERE id = v_item.variant_id
         AND product_id = v_item.product_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Referensi varian pada item pesanan tidak valid.';
      END IF;
    ELSIF v_item.variant_label IS NOT NULL THEN
      RAISE EXCEPTION 'Atribusi varian pada item pesanan tidak tersedia.';
    ELSE
      UPDATE public.products
         SET stock = stock + v_item.quantity
       WHERE id = v_item.product_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Referensi produk pada item pesanan tidak valid.';
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_order_inventory_internal(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id uuid,
  p_cancel_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order record;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Hanya staf yang dapat membatalkan pesanan.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ID pesanan wajib diisi.';
  END IF;

  SELECT id, status
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan atau sudah diarsipkan.';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN false;
  END IF;

  IF v_order.status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Pesanan dengan status saat ini tidak dapat dibatalkan.';
  END IF;

  PERFORM public.restore_order_inventory_internal(p_order_id);

  UPDATE public.orders
     SET status = 'cancelled',
         cancel_reason = COALESCE(p_cancel_reason, cancel_reason)
   WHERE id = p_order_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_order(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid, text)
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
  SELECT id, status, payment_status, payment_method
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
    -- Stored payment_method is authoritative. Legacy transfer/COD orders may
    -- carry Midtrans references and must never enter automatic stock release.
    IF v_order.payment_method <> 'midtrans'
       OR v_order.payment_method IS NULL THEN
      IF v_order.payment_status <> 'failed' THEN
        UPDATE public.orders
           SET payment_status = 'failed',
               updated_at = now()
         WHERE id = v_order.id;
      END IF;
      RETURN true;
    END IF;

    IF v_order.status IN ('shipped', 'completed') THEN
      RAISE EXCEPTION 'Kegagalan pembayaran Midtrans diterima untuk pesanan yang sudah masuk fulfillment terminal.'
        USING ERRCODE = '23514';
    END IF;

    IF v_order.status IN ('pending', 'processing') THEN
      PERFORM public.restore_order_inventory_internal(v_order.id);

      UPDATE public.orders
         SET payment_status = 'failed',
             status = 'cancelled',
             updated_at = now()
       WHERE id = v_order.id;
      RETURN true;
    END IF;

    IF v_order.status = 'cancelled' THEN
      IF v_order.payment_status <> 'failed' THEN
        UPDATE public.orders
           SET payment_status = 'failed',
               updated_at = now()
         WHERE id = v_order.id;
      END IF;
      RETURN true;
    END IF;

    RAISE EXCEPTION 'Status fulfillment pesanan tidak valid untuk kegagalan pembayaran Midtrans.'
      USING ERRCODE = '23514';
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_midtrans_notification(text, text, text, timestamptz, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_midtrans_notification(text, text, text, timestamptz, text)
  TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
