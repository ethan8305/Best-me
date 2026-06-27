-- Best me — initial schema.
-- Every table is row-level-security scoped to the owning user. Times that are
-- "minutes from midnight" live in the app/scheduler; persisted timestamps are
-- timestamptz and dates are `date`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type category as enum ('work', 'movement', 'family', 'alone', 'rest');
create type priority as enum ('low', 'medium', 'high');
create type block_status as enum ('planned', 'done', 'skipped');
create type block_source as enum ('ai', 'manual', 'calendar');

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  timezone text not null default 'UTC',
  onboarding_summary text,
  -- Awake window + peak energy windows, minutes from midnight.
  day_window jsonb not null default '{"start": 420, "end": 1380}',
  peak_energy_windows jsonb not null default '[]',
  -- Wellness prefs: { quotas: {category: minutes}, nonNegotiables: [category] }.
  wellness jsonb not null default '{}',
  -- Learned per-category estimate multipliers, e.g. {"work": 1.2}.
  estimation_factors jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category category not null,
  priority priority not null default 'medium',
  target_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index goals_user_idx on goals (user_id);

-- ---------------------------------------------------------------------------
-- projects  (deadline-driven work that feeds the scheduler)
-- ---------------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references goals (id) on delete set null,
  title text not null,
  category category not null default 'work',
  deadline date not null,
  estimated_effort_minutes integer not null default 0,
  completed_minutes integer not null default 0,
  priority priority not null default 'medium',
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index projects_user_idx on projects (user_id);

-- ---------------------------------------------------------------------------
-- daily_checkins  (the quick morning questionnaire)
-- ---------------------------------------------------------------------------
create table daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  energy smallint not null,
  mood smallint not null,
  hours_available_minutes integer not null,
  desired_categories category[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- day_plans + blocks
-- ---------------------------------------------------------------------------
create table day_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  summary text,                 -- Claude-generated narrative
  status text not null default 'draft',
  generated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table blocks (
  id uuid primary key default gen_random_uuid(),
  day_plan_id uuid not null references day_plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category category not null,
  start_minute integer not null,    -- minutes from midnight
  end_minute integer not null,
  estimated_minutes integer not null,
  actual_minutes integer,
  source block_source not null default 'ai',
  status block_status not null default 'planned',
  goal_id uuid references goals (id) on delete set null,
  project_id uuid references projects (id) on delete set null,
  calendar_event_id text,
  fixed boolean not null default false,
  created_at timestamptz not null default now()
);
create index blocks_plan_idx on blocks (day_plan_id);

-- ---------------------------------------------------------------------------
-- reflections  (evening check-in; drives estimate learning + streak)
-- ---------------------------------------------------------------------------
create table reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  mood smallint not null,
  energy smallint not null,
  block_ratings jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- streaks  (1:1 with user)
-- ---------------------------------------------------------------------------
create table streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current integer not null default 0,
  longest integer not null default 0,
  last_qualified_date date,
  freezes_available integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-only access on every table.
-- ---------------------------------------------------------------------------
alter table profiles        enable row level security;
alter table goals           enable row level security;
alter table projects        enable row level security;
alter table daily_checkins  enable row level security;
alter table day_plans       enable row level security;
alter table blocks          enable row level security;
alter table reflections     enable row level security;
alter table streaks         enable row level security;

-- profiles + streaks key on `id` / `user_id` = auth.uid().
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own streak" on streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The rest share a uniform user_id policy.
create policy "own rows" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on daily_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on day_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- On signup, create an empty profile + streak row.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into streaks (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
