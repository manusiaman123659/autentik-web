-- =============================================================================
-- Autentik CMS - AI chat rate limit (Phase: AI chatbot / Gemini)
-- Apply after 0006_fulfillment_type.sql in the Supabase SQL editor.
-- Pembatasan pemakaian /api/chat per session browser (anon):
--   - cookie httpOnly `autentik-chat-session` di-generate server-side di route.
--   - hitungan disimpan di ai_chat_sessions, window 60 menit, max 15 pesan.
--   - RLS ON tanpa policy: anon TIDAK boleh akses tabel langsung,
--     hanya lewat RPC security definer (semangat 0005: tanpa langsung).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabel hitungan per session
-- ---------------------------------------------------------------------------
create table if not exists public.ai_chat_sessions (
  session_id       text primary key,
  message_count    integer      not null default 0,
  window_started_at timestamptz not null default now()
);

alter table public.ai_chat_sessions enable row level security;
-- (tidak ada policy: seluruh akses data lewat fungsi security definer di bawah)

-- ---------------------------------------------------------------------------
-- 2) RPC: cek + catat satu pesan chat dalam window berjalan.
--    Returns:
--      true  -> diizinkan (pesan dicatat / window di-reset)
--      false -> sudah melebihi batas → JANGAN panggil Gemini
-- ---------------------------------------------------------------------------
create or replace function public.track_chat_message(
  p_session_id     text,
  p_window_minutes int  default 60,
  p_max            int  default 15
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_chat_sessions;
begin
  if p_session_id is null or trim(p_session_id) = '' then
    raise exception 'Session ID wajib ada.';
  end if;

  select * into v_row
    from public.ai_chat_sessions
    where session_id = p_session_id
    for update;

  -- sesi pertama kali
  if v_row.session_id is null then
    insert into public.ai_chat_sessions (session_id, message_count, window_started_at)
    values (p_session_id, 1, now());
    return true;
  end if;

  -- window sudah lewat → reset, diizinkan
  if now() - v_row.window_started_at >= make_interval(mins => p_window_minutes) then
    update public.ai_chat_sessions
       set message_count     = 1,
           window_started_at = now()
     where session_id = p_session_id;
    return true;
  end if;

  -- sudah capai batas di window berjalan
  if v_row.message_count >= p_max then
    return false;
  end if;

  update public.ai_chat_sessions
     set message_count = message_count + 1
   where session_id = p_session_id;

  return true;
end;
$$;

grant execute on function public.track_chat_message(text, int, int) to anon, authenticated;