-- Best me — security hardening.
--
-- 1. Force RLS so even the table owner / a leaked privileged connection is
--    subject to row policies.
-- 2. Strip the anon role's access entirely: every app read/write happens as an
--    authenticated user, so unauthenticated keys should reach nothing.
-- 3. ai_usage: per-user daily counter backing the Edge Function rate limiter.

-- ---------------------------------------------------------------------------
-- 1. Force row level security (RLS was enabled in 0001; force closes the
--    owner/bypass gap).
-- ---------------------------------------------------------------------------
alter table profiles       force row level security;
alter table goals          force row level security;
alter table projects       force row level security;
alter table daily_checkins force row level security;
alter table day_plans      force row level security;
alter table blocks         force row level security;
alter table reflections    force row level security;
alter table streaks        force row level security;

-- ---------------------------------------------------------------------------
-- 2. Lock out anon; grant only what authenticated users need. (RLS still
--    scopes every row on top of these table-level grants.)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

grant select, insert, update, delete
  on profiles, goals, projects, daily_checkins, day_plans, blocks, reflections, streaks
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. ai_usage — one row per user per day, incremented by the Edge Functions
--    via increment_ai_usage() under the service role. Users may read their own
--    usage (e.g. to show "N AI calls left today") but never write it.
-- ---------------------------------------------------------------------------
create table ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table ai_usage enable row level security;
alter table ai_usage force row level security;

create policy "read own usage" on ai_usage
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies for users: only the service role writes.

grant select on ai_usage to authenticated;

-- Atomic upsert-and-increment; returns the new count for today.
create or replace function increment_ai_usage(p_user_id uuid, p_day date)
returns integer
language sql
security definer set search_path = public
as $$
  insert into ai_usage (user_id, day, count, updated_at)
  values (p_user_id, p_day, 1, now())
  on conflict (user_id, day)
  do update set count = ai_usage.count + 1, updated_at = now()
  returning count;
$$;

-- Only the service role (which bypasses RLS but not grants) may call it.
revoke all on function increment_ai_usage(uuid, date) from public, anon, authenticated;
grant execute on function increment_ai_usage(uuid, date) to service_role;
