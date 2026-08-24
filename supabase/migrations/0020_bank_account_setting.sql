-- 0020: info rekening bank untuk halaman konfirmasi pesanan publik.
-- Sumber kebenaran = site_settings key 'bank_account', dibaca via
-- getBankAccount() (lib/public-data.ts). Admin mengisi lewat form
-- /admin/integrasi; jika masih kosong, OrderConfirmationClient
-- menampilkan pesan fallback ("Info rekening akan dikonfirmasi oleh
-- tim kami via WhatsApp").

-- 1) Insert key 'bank_account' dengan nilai kosong (placeholder).
insert into public.site_settings (key, value) values
  ('bank_account', '{"bankName":"","accountNumber":"","accountHolder":""}'::jsonb)
on conflict (key) do nothing;

-- 2) Perketat settings_public_select: drop + create (bukan ALTER,
--    untuk konsistensi & menghindari dependency pada kondisi awal policy).
--    Key yang diizinkan baca publik: recruitment, compro, whatsapp,
--    bank_account. Tanpa TO clause = TO public = semua role (sama
--    seperti policy asli dari 0001).
drop policy if exists "settings_public_select" on public.site_settings;
create policy "settings_public_select" on public.site_settings
  for select using (key in ('recruitment', 'compro', 'whatsapp', 'bank_account'));
