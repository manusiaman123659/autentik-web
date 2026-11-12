-- Stage 0C: server-only customer password recovery with atomic single-winner claim.
-- Raw recovery tokens are never stored; only a SHA-256/HMAC digest is persisted.
--
-- Lifecycle:
--   issued -> claimed -> consumed
--   issued -> claimed -> failed
--   issued -> failed (definitive delivery failure)
--   issued -> expired
--   claimed stale (30 min) -> expired
-- Ambiguous delivery timeouts never reopen or reactivate a token.
--
-- Retention: terminal states (consumed, failed, expired) are retained for audit.
-- There is no delete RPC or direct mutation grant. A future cleanup job may delete
-- only terminal rows older than 30 days, in a separate reviewed migration/job.

create table if not exists public.customer_password_recovery (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_digest text not null,
  state text not null default 'issued',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  consumed_at timestamptz,
  failure_code text,
  constraint customer_password_recovery_token_digest_unique unique (token_digest),
  constraint customer_password_recovery_state_check
    check (state in ('issued', 'claimed', 'consumed', 'failed', 'expired')),
  constraint customer_password_recovery_digest_check
    check (token_digest ~ '^[0-9a-f]{64}$'),
  constraint customer_password_recovery_lifecycle_check check (
    (state = 'issued' and claimed_at is null and consumed_at is null and failure_code is null)
    or (state = 'claimed' and claimed_at is not null and consumed_at is null and failure_code is null)
    or (state = 'consumed' and claimed_at is not null and consumed_at is not null and failure_code is null)
    or (
      state = 'failed'
      and consumed_at is null
      and failure_code is not null
      and pg_catalog.length(pg_catalog.btrim(failure_code)) between 1 and 100
    )
    or (state = 'expired' and consumed_at is null and failure_code is null)
  ),
  constraint customer_password_recovery_updated_at_check
    check (updated_at >= created_at)
);

create unique index if not exists customer_password_recovery_one_active_per_user
  on public.customer_password_recovery (user_id)
  where state in ('issued', 'claimed');

drop trigger if exists set_customer_password_recovery_updated_at
  on public.customer_password_recovery;

create trigger set_customer_password_recovery_updated_at
  before update on public.customer_password_recovery
  for each row execute function public.set_updated_at();

alter table public.customer_password_recovery enable row level security;

revoke all on table public.customer_password_recovery from public;
revoke all on table public.customer_password_recovery from anon;
revoke all on table public.customer_password_recovery from authenticated;
revoke all on table public.customer_password_recovery from service_role;
grant select on table public.customer_password_recovery to service_role;

comment on table public.customer_password_recovery is
  'Customer password recovery attempts. Raw tokens are never stored. Terminal rows are retained for audit; cleanup must only target terminal rows older than 30 days.';

create or replace function public.issue_customer_password_recovery(
  p_email text,
  p_token_digest text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_user_id uuid;
  v_recovery_id uuid;
  v_expires_at timestamptz;
  v_total_count bigint;
  v_active_customer_count bigint;
  v_staff_count bigint;
begin
  if p_email is null or pg_catalog.btrim(p_email) = '' then
    return null;
  end if;
  if p_token_digest is null or p_token_digest !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  if p_expires_at is null or p_expires_at <= pg_catalog.now() then
    return null;
  end if;

  v_email := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_expires_at := least(p_expires_at, pg_catalog.now() + interval '15 minutes');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('customer_password_recovery:' || v_email, 0::bigint)
  );

  select
    count(*),
    count(*) filter (
      where p.role = 'customer'
        and p.is_active is true
        and u.deleted_at is null
        and (u.banned_until is null or u.banned_until <= pg_catalog.now())
    ),
    count(*) filter (where p.role in ('super_admin', 'admin', 'staff', 'editor'))
    into v_total_count, v_active_customer_count, v_staff_count
  from auth.users u
  left join public.profiles p on p.id = u.id
  where pg_catalog.lower(u.email) = v_email;

  if v_total_count <> 1
    or v_active_customer_count <> 1
    or v_staff_count <> 0 then
    return null;
  end if;

  begin
    select u.id
      into strict v_user_id
    from auth.users u
    where pg_catalog.lower(u.email) = v_email;
  exception
    when no_data_found or too_many_rows then
      return null;
  end;

  if exists (
    select 1
    from public.customer_password_recovery r
    where r.user_id = v_user_id
      and r.state = 'claimed'
      and (r.claimed_at is null or r.claimed_at > pg_catalog.now() - interval '30 minutes')
  ) then
    return null;
  end if;

  if exists (
    select 1
    from public.customer_password_recovery r
    where r.user_id = v_user_id
      and r.state = 'issued'
      and r.expires_at > pg_catalog.now()
      and r.created_at > pg_catalog.now() - interval '60 seconds'
  ) then
    return null;
  end if;

  if exists (
    select 1
    from public.customer_password_recovery r
    where r.token_digest = p_token_digest
      and r.state in ('issued', 'claimed')
      and not (r.state = 'issued' and r.expires_at <= pg_catalog.now())
  ) then
    return null;
  end if;

  begin
    update public.customer_password_recovery
    set state = 'expired',
        updated_at = pg_catalog.now()
    where user_id = v_user_id
      and (
        state = 'issued'
        or (
          state = 'claimed'
          and claimed_at is not null
          and claimed_at <= pg_catalog.now() - interval '30 minutes'
        )
      );

    insert into public.customer_password_recovery (
      user_id,
      token_digest,
      state,
      expires_at
    ) values (
      v_user_id,
      p_token_digest,
      'issued',
      v_expires_at
    )
    returning id into v_recovery_id;
  exception
    when unique_violation then
      return null;
  end;

  return v_recovery_id;
end;
$$;

create or replace function public.claim_customer_password_recovery(
  p_token_digest text
)
returns table (
  recovery_id uuid,
  user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_user_id uuid;
  v_state text;
  v_expires_at timestamptz;
  v_claimed_at timestamptz;
  v_active_user_id uuid;
begin
  if p_token_digest is null or p_token_digest !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  select r.id, r.user_id, r.state, r.expires_at, r.claimed_at
    into v_id, v_user_id, v_state, v_expires_at, v_claimed_at
  from public.customer_password_recovery r
  where r.token_digest = p_token_digest
  for update;

  if v_id is null then
    return;
  end if;

  if v_state = 'issued' and v_expires_at <= pg_catalog.now() then
    update public.customer_password_recovery
    set state = 'expired',
        updated_at = pg_catalog.now()
    where id = v_id
      and state = 'issued';
    return;
  end if;

  if v_state = 'claimed'
    and v_claimed_at is not null
    and v_claimed_at <= pg_catalog.now() - interval '30 minutes' then
    update public.customer_password_recovery
    set state = 'expired',
        updated_at = pg_catalog.now()
    where id = v_id
      and state = 'claimed';
    return;
  end if;

  select p.id
    into v_active_user_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.id = v_user_id
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= pg_catalog.now())
    and p.role = 'customer'
    and p.is_active is true;

  if v_active_user_id is null then
    return;
  end if;

  if v_state <> 'issued' then
    return;
  end if;

  update public.customer_password_recovery r
  set state = 'claimed',
      claimed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where r.id = v_id
    and r.state = 'issued'
  returning r.id, r.user_id into v_id, v_user_id;

  if v_id is null then
    return;
  end if;

  return query select v_id, v_user_id;
end;
$$;

create or replace function public.fail_customer_password_recovery_delivery(
  p_recovery_id uuid,
  p_failure_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_failure_code text;
  v_updated boolean := false;
begin
  if p_recovery_id is null then
    return false;
  end if;
  if p_failure_code is null then
    return false;
  end if;

  v_failure_code := pg_catalog.left(pg_catalog.btrim(p_failure_code), 100);
  if v_failure_code = '' then
    return false;
  end if;

  update public.customer_password_recovery
  set state = 'failed',
      failure_code = v_failure_code,
      updated_at = pg_catalog.now()
  where id = p_recovery_id
    and state = 'issued'
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

create or replace function public.finish_customer_password_recovery(
  p_recovery_id uuid,
  p_outcome text,
  p_failure_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_outcome text;
  v_user_id uuid;
  v_state text;
  v_claimed_at timestamptz;
  v_failure_code text;
  v_updated boolean := false;
begin
  if p_recovery_id is null then
    return false;
  end if;
  if p_outcome is null or pg_catalog.btrim(p_outcome) = '' then
    return false;
  end if;

  v_outcome := pg_catalog.lower(pg_catalog.btrim(p_outcome));
  if v_outcome not in ('consumed', 'failed') then
    return false;
  end if;

  v_failure_code := case
    when p_failure_code is null then null
    else pg_catalog.left(pg_catalog.btrim(p_failure_code), 100)
  end;

  if v_outcome = 'failed' and (v_failure_code is null or v_failure_code = '') then
    return false;
  end if;

  select r.user_id, r.state, r.claimed_at
    into v_user_id, v_state, v_claimed_at
  from public.customer_password_recovery r
  where r.id = p_recovery_id
  for update;

  if v_user_id is null then
    return false;
  end if;

  if v_state <> 'claimed' then
    return false;
  end if;

  if v_claimed_at is null
    or v_claimed_at <= pg_catalog.now() - interval '30 minutes' then
    update public.customer_password_recovery
    set state = 'expired',
        updated_at = pg_catalog.now()
    where id = p_recovery_id
      and state = 'claimed';
    return false;
  end if;

  if v_outcome = 'consumed' then
    update public.customer_password_recovery
    set state = 'consumed',
        consumed_at = pg_catalog.now(),
        failure_code = null,
        updated_at = pg_catalog.now()
    where id = p_recovery_id
      and state = 'claimed'
    returning true into v_updated;
  else
    update public.customer_password_recovery
    set state = 'failed',
        failure_code = coalesce(nullif(v_failure_code, ''), 'reset_failed'),
        updated_at = pg_catalog.now()
    where id = p_recovery_id
      and state = 'claimed'
    returning true into v_updated;
  end if;

  return coalesce(v_updated, false);
end;
$$;

revoke execute on function public.issue_customer_password_recovery(text, text, timestamptz) from public;
revoke execute on function public.claim_customer_password_recovery(text) from public;
revoke execute on function public.fail_customer_password_recovery_delivery(uuid, text) from public;
revoke execute on function public.finish_customer_password_recovery(uuid, text, text) from public;
revoke execute on function public.issue_customer_password_recovery(text, text, timestamptz) from anon;
revoke execute on function public.claim_customer_password_recovery(text) from anon;
revoke execute on function public.fail_customer_password_recovery_delivery(uuid, text) from anon;
revoke execute on function public.finish_customer_password_recovery(uuid, text, text) from anon;
revoke execute on function public.issue_customer_password_recovery(text, text, timestamptz) from authenticated;
revoke execute on function public.claim_customer_password_recovery(text) from authenticated;
revoke execute on function public.fail_customer_password_recovery_delivery(uuid, text) from authenticated;
revoke execute on function public.finish_customer_password_recovery(uuid, text, text) from authenticated;

grant execute on function public.issue_customer_password_recovery(text, text, timestamptz) to service_role;
grant execute on function public.claim_customer_password_recovery(text) to service_role;
grant execute on function public.fail_customer_password_recovery_delivery(uuid, text) to service_role;
grant execute on function public.finish_customer_password_recovery(uuid, text, text) to service_role;

notify pgrst, 'reload schema';
