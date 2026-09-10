-- =============================================================================
-- Autentik CMS - Grant Hardening untuk product_hotspots + product_variants
--
-- Root cause: Supabase platform default memberikan GRANT ALL ke
-- anon/authenticated untuk semua tabel baru di schema public.
-- REVOKE dari PUBLIC tidak cukup karena grant langsung ke role anon/
-- authenticated, bukan lewat PUBLIC.
--
-- Fix: REVOKE langsung dari anon/authenticated pada kedua tabel,
-- lalu GRANT hanya SELECT. Konsisten dengan pola migration 0035
-- (REVOKE admin RPCs dari PUBLIC/anon).
--
-- Status sebelum fix:
--   - product_hotspots (0036): anon/authenticated punya ALL (INSERT/UPDATE/DELETE/TRUNCATE/SELECT)
--   - product_variants (0032): anon/authenticated punya ALL (INSERT/UPDATE/DELETE/TRUNCATE/SELECT)
--   - RLS sudah benar dan menahan write ilegal — tidak ada gap keamanan aktif
--
-- Status sesudah fix:
--   - Kedua tabel: anon/authenticated hanya punya SELECT
--   - service_role tetap ALL (admin CRUD via server actions)
--   - RLS tetap jadi penyaring row-level
-- =============================================================================

-- 1. product_hotspots (dari migration 0036)
REVOKE ALL ON public.product_hotspots FROM anon;
REVOKE ALL ON public.product_hotspots FROM authenticated;
GRANT SELECT ON public.product_hotspots TO anon, authenticated;
GRANT ALL ON public.product_hotspots TO service_role;

-- 2. product_variants (dari migration 0032)
REVOKE ALL ON public.product_variants FROM anon;
REVOKE ALL ON public.product_variants FROM authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT ALL ON public.product_variants TO service_role;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
