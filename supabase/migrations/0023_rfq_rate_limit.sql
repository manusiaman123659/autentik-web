-- 0023_rfq_rate_limit.sql
-- Rate limit untuk RFQ publik (anti-spam).
-- Mengikuti pola 0007_chat_rate_limit: session/cookie based, bukan IP.

-- ---------------------------------------------------------------------------
-- 1) Tabel hitungan per session
-- ---------------------------------------------------------------------------
create table if not exists public.rfq_rate_limits (
  session_id        text primary key,
  submission_count  integer      not null default 0,
  window_started_at timestamptz not null default now()
);

alter table public.rfq_rate_limits enable row level security;
-- Tidak ada policy: seluruh akses data lewat fungsi security definer

-- ---------------------------------------------------------------------------
-- 2) RPC: cek + catat satu submission RFQ dalam window berjalan.
--    Returns:
--      true  -> diizinkan (submission dicatat / window di-reset)
--      false -> sudah melebihi batas → JANGAN proses insert
-- ---------------------------------------------------------------------------
create or replace function public.track_rfq_submission(
  p_session_id     text,
  p_window_minutes int  default 60,
  p_max            int  default 3
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rfq_rate_limits;
begin
  if p_session_id is null or trim(p_session_id) = '' then
    raise exception 'Session ID wajib ada.';
  end if;

  select * into v_row
    from public.rfq_rate_limits
    where session_id = p_session_id
    for update;

  -- sesi pertama kali
  if v_row.session_id is null then
    insert into public.rfq_rate_limits (session_id, submission_count, window_started_at)
    values (p_session_id, 1, now());
    return true;
  end if;

  -- window sudah lewat → reset, diizinkan
  if now() - v_row.window_started_at >= make_interval(mins => p_window_minutes) then
    update public.rfq_rate_limits
       set submission_count  = 1,
           window_started_at = now()
     where session_id = p_session_id;
    return true;
  end if;

  -- sudah capai batas di window berjalan
  if v_row.submission_count >= p_max then
    return false;
  end if;

  update public.rfq_rate_limits
     set submission_count = submission_count + 1
   where session_id = p_session_id;

  return true;
end;
$$;

grant execute on function public.track_rfq_submission(text, int, int) to anon, authenticated;
