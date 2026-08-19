-- 0016: satu nomor WhatsApp untuk semua konteks (CS & sales).
-- Sumber kebenaran nomor WA publik = site_settings key 'whatsapp', dibaca via
-- getWhatsAppNumber() (lib/public-data.ts). Menggantikan rencana awal
-- whatsapp_cs/whatsapp_sales yang tidak pernah dibuat.

-- 1) Simpan nomor resmi.
insert into public.site_settings (key, value) values
  ('whatsapp', '{"number":"6282137384029"}'::jsonb)
on conflict (key) do nothing;

-- 2) Perketat settings_public_select dari "semua baris" menjadi allowlist key
--    publik. Pembaca publik saat ini: recruitment (getRecruitmentUrl) dan
--    compro (halaman /about) — keduanya diverifikasi hanya membaca key tsb.
alter policy "settings_public_select" on public.site_settings
  using (key in ('recruitment', 'compro', 'whatsapp'));

-- 3) Bersihkan nomor dummy lama (6281234567890) di seed key 'contact' & 'socials'
--    supaya seluruh DB konsisten dengan nomor resmi.
update public.site_settings
set value = jsonb_set(
  jsonb_set(value, '{phone}', '"+62 821 3738 4029"'),
  '{waNumber}', '"6282137384029"'
)
where key = 'contact' and value ->> 'waNumber' = '6281234567890';

update public.site_settings
set value = (
  select jsonb_agg(
    case
      when elem ->> 'platform' = 'whatsapp'
        then jsonb_set(elem, '{href}', '"https://wa.me/6282137384029"')
      else elem
    end
  )
  from jsonb_array_elements(value) as elem
)
where key = 'socials' and value::text like '%6281234567890%';
