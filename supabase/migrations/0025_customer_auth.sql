-- 0025_customer_auth.sql
-- 1. Tambah role 'customer' ke CHECK constraint profiles.role
-- 2. Update trigger handle_new_user() default dari 'viewer' ke 'customer'
--    (role 'viewer' tidak dipakai di kode aplikasi, semua signup = customer)
-- 3. Backfill 3 profile customer yang sudah terlanjur signup dengan role='viewer'
-- 4. Catatan: tidak ada perubahan RLS policy

-- ============================================
-- STEP 1: Extend CHECK constraint — tambah 'customer'
-- ============================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'editor', 'viewer', 'customer'));

-- ============================================
-- STEP 2: Update trigger handle_new_user()
-- Ganti default role dari 'viewer' ke 'customer'
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data ->> 'full_name', ''), 'customer')
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;
  RETURN new;
END;
$$;

-- ============================================
-- STEP 3: Backfill profile customer yang sudah
-- terlanjur signup dengan role='viewer'
-- Semua 3 profile adalah customer publik (self-registration via /auth/register).
-- Staff selalu dipromote manual via SQL, tidak ada jalur lain yang create profile.
-- ============================================

UPDATE profiles
SET role = 'customer', updated_at = now()
WHERE role = 'viewer'
  AND id IN (
    '4f3beabb-8987-48f0-a8fe-d986b820e501',  -- msyauqi605@gmail.com (has_orders=true)
    '5665d42e-2464-4a65-ac7c-11ddef8e0ce7',  -- ilhamsetyo315@gmail.com (has_orders=false)
    '10dd3666-ef3d-4a9b-8376-d2ffe7699e85'   -- boywilliam@gmail.com (has_orders=true)
  );

-- ============================================
-- STEP 4: Verifikasi
-- ============================================

-- Cek trigger sudah benar:
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
-- Expected: 'customer' (bukan 'viewer')

-- Cek constraint sudah benar:
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass AND conname = 'profiles_role_check';
-- Expected: CHECK (role IN ('admin', 'editor', 'viewer', 'customer'))

-- Cek tidak ada lagi role='viewer':
SELECT count(*) FROM profiles WHERE role = 'viewer';
-- Expected: 0
