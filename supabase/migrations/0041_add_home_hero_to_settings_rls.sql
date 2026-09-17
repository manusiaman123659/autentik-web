-- Tambah 'home_hero' ke allowlist RLS policy site_settings public select.
-- Hero slides dibaca publik (server-side di page.tsx) untuk menentukan
-- produk unggulan yang ditampilkan di homepage.
DROP POLICY IF EXISTS "settings_public_select" ON public.site_settings;
CREATE POLICY "settings_public_select" ON public.site_settings
  FOR SELECT USING (
    key IN ('recruitment', 'compro', 'whatsapp', 'bank_account', 'home_hero')
  );
