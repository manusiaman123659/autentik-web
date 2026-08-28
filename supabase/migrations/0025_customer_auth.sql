-- 0025_customer_auth.sql
-- Tambah role 'customer' ke CHECK constraint profiles.role
-- untuk mendukung autentikasi customer pada alur checkout store.

-- 1. Extend CHECK constraint: tambah 'customer'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'editor', 'viewer', 'customer'));

-- 2. Catatan: handle_new_user() trigger (dari migration 0015) sudah otomatis
-- membuat row profiles dengan role='viewer' saat signup. Register action
-- akan UPDATE role dari 'viewer' ke 'customer' setelah signUp berhasil.
-- Tidak perlu ubah trigger atau buat RLS policy baru.

-- 3. Tidak ada perubahan RLS policy:
--    - profiles_staff_select: hanya return row jika is_staff() = true (admin/editor)
--      → customer (role='customer') TIDAK terlihat dari admin akses-staff page
--    - profiles_self_select: customer bisa baca profile sendiri (via auth.uid())
--      → sudah cukup untuk auto-fill checkout form
