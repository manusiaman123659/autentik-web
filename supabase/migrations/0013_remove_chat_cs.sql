-- Autentik CMS - Hapus sistem live chat CS custom (digantikan link WhatsApp)
-- Apply after 0012_product_model_3d.sql in the Supabase SQL editor.
--
-- Fitur "Chat dengan CS" (chat_conversations + chat_messages + 3 RPC +
-- realtime dari 0008-0010) dihapus dari aplikasi. Live chat kini tidak ada;
-- semua kanal bantuan digantikan link WhatsApp ke +62 821-3738-4029.
--
-- Chatbot AI (Gemini) TETAP dipakai: jangan sentuh ai_chat_sessions dan
-- fungsi track_chat_message (migrasi 0007) yang menjadi rate-limit /api/chat.

-- 1) Drop RPC (urutan bebas; fungsinya tidak bergantung satu sama lain)
drop function if exists public.send_chat_message(text, text);
drop function if exists public.get_chat_history(text);
drop function if exists public.start_chat_conversation(text);

-- 2) Keluarkan tabel chat dari publication supabase_realtime (eksplisit;
--    sebenarnya otomatis ikut terhapus saat tabel di-drop, tapi dieksplisitkan)
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in ('chat_conversations', 'chat_messages')
  ) then
    alter publication supabase_realtime
      drop table public.chat_messages, public.chat_conversations;
  end if;
end $$;

-- 3) Drop tabel (chat_messages lebih dulu karena FK ke chat_conversations;
--    RLS policy ikut terhapus otomatis)
drop table if exists public.chat_messages;
drop table if exists public.chat_conversations;

-- 4) Reload cache skema PostgREST
notify pgrst, 'reload schema';
