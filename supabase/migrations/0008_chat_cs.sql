-- =============================================================================
-- Autentik CMS - Live chat dengan CS (Phase: Chat widget / CS handoff)
-- Apply after 0007_chat_rate_limit.sql in the Supabase SQL editor.
-- Tujuan:
--   - "inbox" chat CS memakai Supabase milik sendiri (chat_conversations +
--     chat_messages) menggantikan tautan eksternal Tawk.to.
--   - Visitor anonim TIDAK boleh akses tabel langsung (semangat 0005/0007),
--     hanya lewat RPC security definer: start, history, send.
--   - Staf akses langsung via RLS is_staff() (tabel).
--   - Realtime: chat_messages masuk ke publication supabase_realtime untuk
--     feed live di halaman admin. Balasan staf dikirim ke visitor lewat
--     channel broadcast `conversation:{id}` (visitor anon tak punya SELECT).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabel percakapan & pesan
-- ---------------------------------------------------------------------------
create table if not exists public.chat_conversations (
  id             uuid primary key default gen_random_uuid(),
  session_id     text        not null unique,
  visitor_name   text,
  status         text        not null default 'open'
                 check (status in ('open', 'resolved')),
  last_read_at   timestamptz,
  last_message_at timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.chat_conversations(id) on delete cascade,
  sender_role     text        not null check (sender_role in ('visitor', 'staff')),
  sender_name     text,
  body            text        not null check (char_length(body) between 1 and 1000),
  created_at      timestamptz not null default now()
);

create index if not exists chat_messages_conversation_idx
  on public.chat_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- 2) RLS: hanya staf yang bisa baca/tulis langsung; anon tanpa policy
-- ---------------------------------------------------------------------------
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "chat_conversations_staff_select" on public.chat_conversations
  for select using (public.is_staff());
create policy "chat_conversations_staff_all" on public.chat_conversations
  for all using (public.is_staff());

create policy "chat_messages_staff_select" on public.chat_messages
  for select using (public.is_staff());
create policy "chat_messages_staff_all" on public.chat_messages
  for all using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 3) Realtime: publish chat_messages untuk feed admin yang live
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4) RPC security definer untuk visitor (tanpa akses DB langsung)
-- ---------------------------------------------------------------------------
-- 4a) Ambil/buat percakapan untuk sebuah session visitor.
--     Return: id percakapan (uuid).
create or replace function public.start_chat_conversation(p_session_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_session_id is null or trim(p_session_id) = '' then
    raise exception 'Session ID wajib ada.';
  end if;

  insert into public.chat_conversations (session_id)
  values (p_session_id)
  on conflict (session_id) do update
    set last_message_at = chat_conversations.last_message_at
  returning id into v_id;

  return v_id;
end;
$$;

-- 4b) Riwayat percakapan milik session visitor.
--     Return: json { conversation_id, status, messages: [...] }.
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
    'messages', v_messages
  );
end;
$$;

-- 4c) Visitor mengirim pesan baru.
--     Return: json pesan yang tersimpan.
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

grant execute on function public.start_chat_conversation(text) to anon, authenticated;
grant execute on function public.get_chat_history(text) to anon, authenticated;
grant execute on function public.send_chat_message(text, text) to anon, authenticated;
