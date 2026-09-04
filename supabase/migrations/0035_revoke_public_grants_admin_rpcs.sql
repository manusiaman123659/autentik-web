-- Migration 0035: REVOKE EXECUTE dari PUBLIC/anon untuk admin-only RPCs
-- Alasan: PostgreSQL default grant EXECUTE ke PUBLIC; perlu REVOKE eksplisit
-- Defense-in-depth: is_staff() guard ada, tapi grant juga harus ketat

-- 1. upsert_product_variants (0034)
revoke execute on function public.upsert_product_variants(text, jsonb) from public;
revoke execute on function public.upsert_product_variants(text, jsonb) from anon;

-- 2. cancel_order (0018)
revoke execute on function public.cancel_order(uuid, text) from public;
revoke execute on function public.cancel_order(uuid, text) from anon;

-- 3. delete_order (0019)
revoke execute on function public.delete_order(uuid) from public;
revoke execute on function public.delete_order(uuid) from anon;

-- Reload skema PostgREST
notify pgrst, 'reload schema';
