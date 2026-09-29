-- 0059_midtrans_initialization_recovery.sql
-- Serialize Midtrans Snap initialization per order and make definitive
-- pre-provider failure compensation atomic and idempotent.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN midtrans_init_state text NOT NULL DEFAULT 'idle',
  ADD COLUMN midtrans_init_claim_id uuid,
  ADD COLUMN midtrans_init_claimed_at timestamptz,
  ADD COLUMN midtrans_init_reason text;

-- A missing legacy reference does not prove that Snap never created a token.
-- Quarantine those orders rather than allowing an automatic second CREATE.
UPDATE public.orders
   SET midtrans_init_state = CASE
         WHEN midtrans_order_id = order_code
           AND midtrans_redirect_url IS NOT NULL
           AND char_length(midtrans_redirect_url) <= 2048
           AND midtrans_redirect_url ~ '^https://app([.]sandbox)?[.]midtrans[.]com/snap/'
           AND midtrans_redirect_url !~ '[#[:cntrl:]]'
            THEN 'ready'
         ELSE 'unknown'
       END,
       midtrans_init_reason = CASE
         WHEN midtrans_order_id = order_code
           AND midtrans_redirect_url IS NOT NULL
           AND char_length(midtrans_redirect_url) <= 2048
           AND midtrans_redirect_url ~ '^https://app([.]sandbox)?[.]midtrans[.]com/snap/'
           AND midtrans_redirect_url !~ '[#[:cntrl:]]'
            THEN NULL
         ELSE 'legacy_unverified'
       END
 WHERE payment_method = 'midtrans';

ALTER TABLE public.orders
  ADD CONSTRAINT orders_midtrans_init_state_check
    CHECK (midtrans_init_state IN (
      'idle', 'initializing', 'unknown', 'ready', 'compensated'
    )),
  ADD CONSTRAINT orders_midtrans_init_reason_check
    CHECK (
      midtrans_init_reason IS NULL
      OR midtrans_init_reason IN (
        'legacy_unverified',
        'transport_unknown',
        'provider_unpersisted',
        'server_interrupted',
        'local_preflight',
        'amount_invalid',
        'provider_rejected'
      )
    ),
  ADD CONSTRAINT orders_midtrans_init_claim_pair_check
    CHECK (
      (midtrans_init_claim_id IS NULL AND midtrans_init_claimed_at IS NULL)
      OR
      (midtrans_init_claim_id IS NOT NULL AND midtrans_init_claimed_at IS NOT NULL)
    ),
  ADD CONSTRAINT orders_midtrans_init_initializing_check
    CHECK (
      midtrans_init_state <> 'initializing'
      OR (
        midtrans_init_claim_id IS NOT NULL
        AND midtrans_init_claimed_at IS NOT NULL
        AND midtrans_init_reason IS NULL
      )
    ),
  ADD CONSTRAINT orders_midtrans_init_unknown_check
    CHECK (
      midtrans_init_state <> 'unknown'
      OR (
        midtrans_init_reason IS NOT NULL
        AND (
          midtrans_init_reason IS NOT DISTINCT FROM 'legacy_unverified'
          OR (
            midtrans_init_reason IN (
              'transport_unknown',
              'provider_unpersisted',
              'server_interrupted'
            )
            AND midtrans_init_claim_id IS NOT NULL
            AND midtrans_init_claimed_at IS NOT NULL
          )
        )
      )
    ),
  ADD CONSTRAINT orders_midtrans_init_ready_check
    CHECK (
      midtrans_init_state <> 'ready'
      OR (
        payment_method IS NOT DISTINCT FROM 'midtrans'
        AND midtrans_order_id IS NOT DISTINCT FROM order_code
        AND midtrans_redirect_url IS NOT NULL
        AND char_length(midtrans_redirect_url) <= 2048
        AND midtrans_redirect_url ~ '^https://app([.]sandbox)?[.]midtrans[.]com/snap/'
        AND midtrans_redirect_url !~ '[#[:cntrl:]]'
        AND midtrans_init_reason IS NULL
      )
    ),
  ADD CONSTRAINT orders_midtrans_init_compensated_check
    CHECK (
      midtrans_init_state <> 'compensated'
      OR (
        payment_method IS NOT DISTINCT FROM 'midtrans'
        AND status IS NOT DISTINCT FROM 'cancelled'
        AND midtrans_init_claim_id IS NOT NULL
        AND midtrans_order_id IS NULL
        AND midtrans_redirect_url IS NULL
        AND midtrans_init_reason IS NOT NULL
        AND midtrans_init_reason IN (
          'local_preflight', 'amount_invalid', 'provider_rejected'
        )
      )
    );

-- Do not let fulfillment, payment, or archival updates race an unresolved
-- provider CREATE. A recovery operation must leave the hold state atomically.
CREATE FUNCTION public.protect_midtrans_initialization_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.midtrans_init_state IN ('initializing', 'unknown')
     AND NEW.midtrans_init_state IN ('initializing', 'unknown')
     AND (
       NEW.status IS DISTINCT FROM OLD.status
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     ) THEN
    RAISE EXCEPTION 'Pesanan dengan inisialisasi Midtrans yang belum terselesaikan harus direkonsiliasi terlebih dahulu.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_midtrans_initialization_hold()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER orders_protect_midtrans_initialization_hold
  BEFORE UPDATE OF status, payment_status, payment_method, deleted_at, midtrans_init_state
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_midtrans_initialization_hold();

-- The application has used soft_delete_order since migration 0022. Disable
-- the obsolete hard-delete RPC so unresolved legacy rows cannot bypass the
-- UPDATE hold trigger above.
REVOKE EXECUTE ON FUNCTION public.delete_order(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.claim_midtrans_initialization(
  p_order_code text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_claim_id uuid;
BEGIN
  IF p_user_id IS NULL
     OR p_order_code IS NULL
     OR btrim(p_order_code) = '' THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE order_code = p_order_code
   FOR UPDATE;

  IF NOT FOUND
     OR v_order.user_id IS DISTINCT FROM p_user_id
     OR v_order.deleted_at IS NOT NULL
     OR v_order.payment_method IS DISTINCT FROM 'midtrans'
     OR v_order.payment_status IS DISTINCT FROM 'pending'
     OR v_order.status IS DISTINCT FROM 'pending' THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  IF v_order.midtrans_init_state = 'ready'
     AND v_order.midtrans_order_id = v_order.order_code
     AND v_order.midtrans_redirect_url IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'ready');
  END IF;

  IF v_order.midtrans_init_state = 'initializing' THEN
    RETURN jsonb_build_object('outcome', 'in_progress');
  END IF;

  IF v_order.midtrans_init_state <> 'idle'
     OR v_order.midtrans_init_claim_id IS NOT NULL
     OR v_order.midtrans_order_id IS NOT NULL
     OR v_order.midtrans_redirect_url IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'needs_review');
  END IF;

  v_claim_id := pg_catalog.gen_random_uuid();

  UPDATE public.orders
     SET midtrans_init_state = 'initializing',
         midtrans_init_claim_id = v_claim_id,
         midtrans_init_claimed_at = clock_timestamp(),
         midtrans_init_reason = NULL
   WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'outcome', 'claimed',
    'claim_id', v_claim_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_midtrans_initialization(text, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_midtrans_initialization(text, uuid)
  TO service_role;

CREATE FUNCTION public.finalize_midtrans_initialization(
  p_order_code text,
  p_user_id uuid,
  p_claim_id uuid,
  p_redirect_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_url text := nullif(btrim(p_redirect_url), '');
BEGIN
  IF p_user_id IS NULL
     OR p_claim_id IS NULL
     OR p_order_code IS NULL
     OR btrim(p_order_code) = ''
     OR v_url IS NULL
     OR char_length(v_url) > 2048
     OR v_url !~ '^https://app([.]sandbox)?[.]midtrans[.]com/snap/'
     OR v_url ~ '[#[:cntrl:]]' THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE order_code = p_order_code
   FOR UPDATE;

  IF NOT FOUND
     OR v_order.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  IF v_order.midtrans_init_claim_id IS DISTINCT FROM p_claim_id THEN
    RETURN jsonb_build_object('outcome', 'claim_mismatch');
  END IF;

  IF v_order.midtrans_init_state = 'ready'
     AND v_order.midtrans_order_id = v_order.order_code
     AND v_order.midtrans_redirect_url = v_url THEN
    RETURN jsonb_build_object('outcome', 'already_finalized');
  END IF;

  IF v_order.deleted_at IS NOT NULL
     OR v_order.payment_method IS DISTINCT FROM 'midtrans'
     OR v_order.payment_status IS DISTINCT FROM 'pending'
     OR v_order.status IS DISTINCT FROM 'pending'
     OR v_order.midtrans_init_state NOT IN ('initializing', 'unknown')
     OR v_order.midtrans_order_id IS NOT NULL
     OR v_order.midtrans_redirect_url IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  UPDATE public.orders
     SET midtrans_order_id = v_order.order_code,
         midtrans_redirect_url = v_url,
         midtrans_init_state = 'ready',
         midtrans_init_reason = NULL
   WHERE id = v_order.id;

  RETURN jsonb_build_object('outcome', 'finalized');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_midtrans_initialization(
  text, uuid, uuid, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_midtrans_initialization(
  text, uuid, uuid, text
) TO service_role;

CREATE FUNCTION public.mark_midtrans_initialization_unknown(
  p_order_code text,
  p_user_id uuid,
  p_claim_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF p_user_id IS NULL
     OR p_claim_id IS NULL
     OR p_order_code IS NULL
     OR btrim(p_order_code) = ''
     OR p_reason IS NULL
     OR p_reason NOT IN (
       'transport_unknown', 'provider_unpersisted', 'server_interrupted'
     ) THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE order_code = p_order_code
   FOR UPDATE;

  IF NOT FOUND
     OR v_order.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  IF v_order.midtrans_init_claim_id IS DISTINCT FROM p_claim_id THEN
    RETURN jsonb_build_object('outcome', 'claim_mismatch');
  END IF;

  IF v_order.midtrans_init_state = 'ready' THEN
    RETURN jsonb_build_object('outcome', 'already_finalized');
  END IF;

  IF v_order.deleted_at IS NOT NULL
     OR v_order.payment_method IS DISTINCT FROM 'midtrans'
     OR v_order.payment_status IS DISTINCT FROM 'pending'
     OR v_order.status IS DISTINCT FROM 'pending'
     OR v_order.midtrans_init_state NOT IN ('initializing', 'unknown') THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  IF v_order.midtrans_init_state = 'unknown' THEN
    RETURN jsonb_build_object('outcome', 'already_unknown');
  END IF;

  UPDATE public.orders
     SET midtrans_init_state = 'unknown',
         midtrans_init_reason = p_reason
   WHERE id = v_order.id;

  RETURN jsonb_build_object('outcome', 'marked_unknown');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_midtrans_initialization_unknown(
  text, uuid, uuid, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_midtrans_initialization_unknown(
  text, uuid, uuid, text
) TO service_role;

CREATE FUNCTION public.compensate_midtrans_initialization(
  p_order_code text,
  p_user_id uuid,
  p_claim_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF p_user_id IS NULL
     OR p_claim_id IS NULL
     OR p_order_code IS NULL
     OR btrim(p_order_code) = ''
     OR p_reason IS NULL
     OR p_reason NOT IN (
       'local_preflight', 'amount_invalid', 'provider_rejected'
     ) THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE order_code = p_order_code
   FOR UPDATE;

  IF NOT FOUND
     OR v_order.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  IF v_order.midtrans_init_claim_id IS DISTINCT FROM p_claim_id THEN
    RETURN jsonb_build_object('outcome', 'claim_mismatch');
  END IF;

  IF v_order.midtrans_init_state = 'compensated'
     AND v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('outcome', 'already_released');
  END IF;

  IF v_order.deleted_at IS NOT NULL
     OR v_order.payment_method IS DISTINCT FROM 'midtrans'
     OR v_order.payment_status IS DISTINCT FROM 'pending'
     OR v_order.status IS DISTINCT FROM 'pending'
     OR v_order.midtrans_init_state IS DISTINCT FROM 'initializing'
     OR v_order.midtrans_order_id IS NOT NULL
     OR v_order.midtrans_redirect_url IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'ineligible');
  END IF;

  PERFORM public.restore_order_inventory_internal(v_order.id);

  UPDATE public.orders
     SET status = 'cancelled',
         payment_status = 'failed',
         midtrans_init_state = 'compensated',
         midtrans_init_reason = p_reason,
         cancel_reason = 'Inisialisasi pembayaran gagal'
   WHERE id = v_order.id;

  RETURN jsonb_build_object('outcome', 'released');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compensate_midtrans_initialization(
  text, uuid, uuid, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compensate_midtrans_initialization(
  text, uuid, uuid, text
) TO service_role;

COMMENT ON COLUMN public.orders.midtrans_init_state IS
  'Lifecycle of the single guarded Midtrans Snap initialization attempt.';
COMMENT ON COLUMN public.orders.midtrans_init_claim_id IS
  'Server-generated claim that owns finalize, unknown, or compensation transitions.';

COMMIT;

NOTIFY pgrst, 'reload schema';
