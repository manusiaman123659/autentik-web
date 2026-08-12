-- =============================================================================
-- Autentik CMS - Hardening chat CS (Phase: Chat widget / CS handoff)
-- Apply after 0008_chat_cs.sql in the Supabase SQL editor.
-- 1) Decouple channel Realtime broadcast dari id percakapan publik:
--    - kolom broadcast_token (uuid, gen_random_uuid()) di chat_conversations,
--      di-backfill per-baris untuk data lama.
--    - widget visitor subscribe channel `conversation:{broadcast_token}`;
--      URL /admin/chat/{id} tetap pakai id asli (ter-guard getAdminUser()).
-- 2) Rate-limit kirim pesan visitor: minimal 2 detik antar pesan per
--    percakapan (ditolak sebelum insert, memakai row terkunci for update).
-- Semua fungsi SECURITY DEFINER + set search_path = public (pola 0005-0008).
-- Catatan: start_chat_conversation berubah return type uuid -> json, jadi
-- DI-DROP dulu (CREATE OR REPLACE menolak perubahan return type), lalu GRANT
-- dieksplisitkan ulang dengan signature persis.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Kolom broadcast token (default per-baris; backfill otomatis utk data lama)
-- ---------------------------------------------------------------------------
alter table public.chat_conversations
  add column if not exists broadcast_token uuid not null default gen_random_uuid();

-- ---------------------------------------------------------------------------
-- 2) start_chat_conversation: return json {conversation_id, broadcast_token}
-- ---------------------------------------------------------------------------
drop function if exists public.start_chat_conversation(text);

create function public.start_chat_conversation(p_session_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.chat_conversations;
begin
  if p_session_id is null or trim(p_session_id) = '' then
    raise exception 'Session ID wajib ada.';
  end if;

  with inserted_rows as (
    insert into public.chat_conversations (session_id)
    values (p_session_id)
    on conflict (session_id) do update
      set last_message_at = chat_conversations.last_message_at
    returning *
  )
  select * into v_conv
    from inserted_rows;

  return json_build_object(
    'conversation_id', v_conv.id,
    'broadcast_token', v_conv.broadcast_token
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) get_chat_history: tambah broadcast_token (resolve tetap via session_id)
-- ---------------------------------------------------------------------------
create or replace function public.get_chat_history(p_session_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.chat_conversations;
  v_messages json;
begin
  if p_session_id is null or trim(p_session_id) = '' then
    return null;
  end if;

  select * into v_conv
    from public.chat_conversations
    where session_id = p_session_id;

  if v_conv.id is null then
    return null;
  end if;

  select coalesce(json_agg(m order by m.created_at asc), '[]'::json) into v_messages
    from (
      select id, conversation_id, sender_role, sender_name, body, created_at
      from public.chat_messages
      where conversation_id = v_conv.id
    ) m;

  return json_build_object(
    'conversation_id', v_conv.id,
    'status', v_conv.status,
    'broadcast_token', v_conv.broadcast_token,
    'messages', v_messages
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) send_chat_message: rate-limit 2 detik antar pesan (SEBELUM insert)
-- ---------------------------------------------------------------------------
create or replace function public.send_chat_message(p_session_id text, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.chat_conversations;
  v_msg public.chat_messages;
begin
  if p_session_id is null or trim(p_session_id) = '' then
    raise exception 'Session ID wajib ada.';
  end if;

  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'Pesan tidak boleh kosong.';
  end if;
  if char_length(p_body) > 1000 then
    raise exception 'Pesan maksimal 1000 karakter.';
  end if;

  select * into v_conv
    from public.chat_conversations
    where session_id = p_session_id
    for update;

  if v_conv.id is null then
    raise exception 'Percakapan tidak ditemukan.';
  end if;

  if now() - v_conv.last_message_at < make_interval(secs => 2) then
    raise exception 'Mohon tunggu sebentar sebelum mengirim pesan berikutnya.';
  end if;

  insert into public.chat_messages (conversation_id, sender_role, body)
  values (v_conv.id, 'visitor', trim(p_body))
  returning * into v_msg;

  update public.chat_conversations
     set last_message_at = now(),
         status = case when status = 'resolved' then 'open' else status end
   where id = v_conv.id;

  return json_build_object(
    'id', v_msg.id,
    'conversation_id', v_msg.conversation_id,
    'sender_role', v_msg.sender_role,
    'sender_name', v_msg.sender_name,
    'body', v_msg.body,
    'created_at', v_msg.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) GRANT ulang (signature persis; wajib setelah DROP pada start_chat_conversation)
-- ---------------------------------------------------------------------------
grant execute on function public.start_chat_conversation(text) to anon, authenticated;
grant execute on function public.get_chat_history(text) to anon, authenticated;
grant execute on function public.send_chat_message(text, text) to anon, authenticated;
