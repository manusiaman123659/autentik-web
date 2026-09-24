-- 0051_variant_aware_cancel_order.sql
-- Restore cancelled order stock to the same inventory source used at checkout.

BEGIN;

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
  v_item record;
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

COMMIT;

NOTIFY pgrst, 'reload schema';
