-- 0053_order_status_transition_integrity.sql
-- Make order fulfillment transitions RPC-only for API roles and enforce the
-- transition matrix at the database boundary.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Status pesanan yang sudah diarsipkan tidak dapat diubah.'
      USING ERRCODE = '23514';
  END IF;

  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('processing', 'cancelled'))
    OR (OLD.status = 'processing' AND NEW.status IN ('shipped', 'cancelled'))
    OR (OLD.status = 'shipped' AND NEW.status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Transisi status pesanan tidak diizinkan: % ke %.', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_order_status_transition()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS orders_enforce_status_transition ON public.orders;
CREATE TRIGGER orders_enforce_status_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_transition();

CREATE OR REPLACE FUNCTION public.update_order_fulfillment(
  p_order_id uuid,
  p_status text,
  p_tracking_courier text,
  p_tracking_number text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order record;
  v_tracking_courier text := NULLIF(BTRIM(p_tracking_courier), '');
  v_tracking_number text := NULLIF(BTRIM(p_tracking_number), '');
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Hanya staf yang dapat memperbarui fulfillment pesanan.';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ID pesanan wajib diisi.';
  END IF;

  IF p_status = 'cancelled' THEN
    RAISE EXCEPTION 'Pembatalan pesanan harus dilakukan melalui cancel_order.';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('pending', 'processing', 'shipped', 'completed') THEN
    RAISE EXCEPTION 'Status fulfillment pesanan tidak valid.';
  END IF;

  SELECT id, status, deleted_at
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_order.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pesanan yang sudah diarsipkan tidak dapat diperbarui.';
  END IF;

  IF NOT (
    CASE v_order.status
      WHEN 'pending' THEN p_status IN ('pending', 'processing')
      WHEN 'processing' THEN p_status IN ('processing', 'shipped')
      WHEN 'shipped' THEN p_status IN ('shipped', 'completed')
      WHEN 'completed' THEN p_status = 'completed'
      ELSE false
    END
  ) THEN
    RAISE EXCEPTION 'Perubahan status fulfillment pesanan tidak diizinkan.';
  END IF;

  IF p_status = 'shipped' AND v_tracking_number IS NULL THEN
    RAISE EXCEPTION 'Nomor resi wajib diisi saat status Dikirim.';
  END IF;

  UPDATE public.orders
     SET status = p_status,
         tracking_courier = v_tracking_courier,
         tracking_number = v_tracking_number
   WHERE id = v_order.id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_fulfillment(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_fulfillment(uuid, text, text, text)
  TO authenticated, service_role;

-- These archive RPCs already enforce is_staff() internally. Restrict direct
-- invocation to trusted authenticated staff sessions and service_role.
REVOKE EXECUTE ON FUNCTION public.soft_delete_order(text, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.soft_delete_order(text, uuid, text)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.restore_order(text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_order(text, uuid)
  TO authenticated, service_role;

-- API roles are read-only on the table. All mutations use narrowly-scoped
-- SECURITY DEFINER functions; service_role and the table owner remain trusted.
REVOKE ALL PRIVILEGES ON TABLE public.orders
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.orders
  TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.orders
  TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
