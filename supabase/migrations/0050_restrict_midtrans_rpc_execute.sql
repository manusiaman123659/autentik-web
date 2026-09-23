-- 0050_restrict_midtrans_rpc_execute.sql
-- Batasi eksekusi webhook payment RPC hanya untuk service_role.
-- Tidak mengubah definisi fungsi atau data pesanan.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.handle_midtrans_notification(
  text, text, text, timestamptz, text
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.handle_midtrans_notification(
  text, text, text, timestamptz, text
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_midtrans_notification(
  text, text, text, timestamptz, text
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.handle_midtrans_notification(
  text, text, text, timestamptz, text
) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
