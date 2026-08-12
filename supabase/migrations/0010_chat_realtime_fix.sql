-- =============================================================================
-- Autentik CMS - Fix realtime chat & reload skema PostgREST (Chat widget / CS handoff)
-- Apply after 0009_chat_hardening.sql in the Supabase SQL editor.
-- 1) Tambahkan chat_conversations ke publication supabase_realtime agar
--    perubahan status percakapan (UPDATE) juga live di halaman admin.
--    (chat_messages sudah masuk sejak 0008; Postgres Changes butuh tabel
--    terdaftar di publication supaya event INSERT/UPDATE terkirim.)
-- 2) NOTIFY pgrst, 'reload schema' -> memaksa PostgREST memperbarui cache
--    skema, mis. kolom broadcast_token (0009) atau tabel chat_messages yang
--    belum dikenal cache PostgREST (gejala: query aplikasi ke chat_messages
--    gagal diam-diam walau RLS sehat).
-- Idempoten: penambahan ke publication memakai cek pg_publication_tables
-- (pola 0008); NOTIFY aman dijalankan berulang.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Realtime: publish chat_conversations untuk update status yang live
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_conversations'
  ) then
    alter publication supabase_realtime add table public.chat_conversations;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2) Muat ulang cache skema PostgREST
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';