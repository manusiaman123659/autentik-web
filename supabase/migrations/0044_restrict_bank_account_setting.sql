-- 0044: Batasi rekening bank sebagai data kompatibilitas transfer legacy.
-- Customer hanya menerima rekening melalui loader server setelah autentikasi,
-- verifikasi kepemilikan order, dan payment_method = 'transfer'.

BEGIN;

DROP POLICY IF EXISTS "settings_public_select"
ON public.site_settings;

CREATE POLICY "settings_public_select"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (
  key IN (
    'recruitment',
    'compro',
    'whatsapp',
    'home_hero'
  )
);

COMMIT;

NOTIFY pgrst, 'reload schema';