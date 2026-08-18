-- 0015: akun baru tidak lagi otomatis staf — default role 'viewer' (non-privileged).
-- Sebelumnya trigger handle_new_user() meng-insert role 'editor' saat signup, sehingga
-- pendaftar publik langsung punya akses staf. Diterapkan manual di DB dan diverifikasi
-- runtime: role='viewer', is_active=true, is_staff()=false untuk akun baru.
-- REVOKE execute handle_new_user() dari public/anon/authenticated sengaja ditunda
-- (defense-in-depth) — menyusul di migration terpisah (kandidat: gabung task WA 0016).

alter table public.profiles
  drop constraint if exists profiles_role_check,
  add constraint profiles_role_check check (role in ('admin', 'editor', 'viewer'));

alter table public.profiles
  alter column role set default 'viewer';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'viewer')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;