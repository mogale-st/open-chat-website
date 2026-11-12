create table if not exists public.application_rate_limit_attempts (
  id bigint generated always as identity primary key,
  client_key text not null check (client_key ~ '^[0-9a-f]{64}$'),
  attempted_at timestamptz not null default clock_timestamp()
);

create index if not exists application_rate_limit_attempts_client_time_idx
  on public.application_rate_limit_attempts (client_key, attempted_at);
create index if not exists application_rate_limit_attempts_time_idx
  on public.application_rate_limit_attempts (attempted_at);

alter table public.application_rate_limit_attempts enable row level security;
revoke all on table public.application_rate_limit_attempts from anon, authenticated;
grant all on table public.application_rate_limit_attempts to service_role;

create or replace function public.consume_application_rate_limit(
  p_client_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request_time timestamptz;
  recent_count integer;
begin
  if p_client_key is null
    or p_client_key !~ '^[0-9a-f]{64}$'
    or p_limit is null
    or p_limit < 1
    or p_limit > 100
    or p_window_seconds is null
    or p_window_seconds < 60
    or p_window_seconds > 86400
  then
    raise exception 'Invalid application rate limit parameters.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_client_key, 0));
  request_time := clock_timestamp();

  delete from public.application_rate_limit_attempts
  where client_key = p_client_key
    and attempted_at < request_time - make_interval(secs => p_window_seconds);

  select count(*) into recent_count
  from public.application_rate_limit_attempts
  where client_key = p_client_key
    and attempted_at >= request_time - make_interval(secs => p_window_seconds);

  if recent_count >= p_limit then return false; end if;

  insert into public.application_rate_limit_attempts (client_key, attempted_at)
  values (p_client_key, request_time);
  return true;
end;
$$;

revoke all on function public.consume_application_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_application_rate_limit(text, integer, integer)
  to service_role;
