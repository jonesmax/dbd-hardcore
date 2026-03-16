-- Normalized schema: proper tables instead of single jsonb.
-- Run this first. If you have existing data in public.sessions, run migrate-from-sessions.sql next.
--
-- To avoid "email not confirmed": in Dashboard go to Authentication → Providers → Email,
-- scroll down and turn OFF "Confirm email". If the option is missing, run
-- supabase/confirm-email-users.sql once to confirm existing users.

-- 1. User state (balance, timestamps)
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_balance int not null default 12,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  won_at timestamptz
);

-- 2. User settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_by_kills jsonb not null default '{"0":-4,"1":-1,"2":0,"3":4,"4":6}',
  token_by_gens jsonb not null default '{"0":-1,"1":0,"2":1,"3":1,"4":2,"5":3}',
  lock_threshold smallint not null default 2 check (lock_threshold in (1, 2)),
  tier_base_costs jsonb not null default '{"S+":12,"S":10,"A":8,"B":6,"C":5,"Special/New":8}',
  killer_tier_overrides jsonb not null default '{}',
  win_target_balance int not null default 500,
  win_by_unlock_all boolean not null default true
);

-- 3. Per-user killer state (one row per user per killer)
create table if not exists public.user_killers (
  user_id uuid not null references auth.users(id) on delete cascade,
  killer_id text not null,
  name text not null,
  tier text not null,
  base_cost int not null,
  current_cost int not null,
  status text not null check (status in ('Locked', 'Unlocked', 'Dead')),
  matches_played int not null default 0,
  total_kills int not null default 0,
  loss_count int not null default 0,
  primary key (user_id, killer_id)
);

-- 4. Match history (one row per match)
create table if not exists public.match_history (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  killer_id text not null,
  killer_name text not null,
  kills smallint not null,
  result text not null check (result in ('Win', 'Neutral', 'Loss')),
  tokens_earned int not null,
  gens_standing smallint,
  killer_locked_after boolean not null,
  "timestamp" timestamptz not null,
  balance_after int not null
);

create index if not exists match_history_user_timestamp on public.match_history (user_id, "timestamp" desc);

-- 5. User profile (optional display name; unique across users)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique
);
create unique index if not exists user_profiles_username_lower on public.user_profiles (lower(username)) where username is not null;

-- 6. Session log (unlock + dead only; timeline uses match_history + session_log)
create table if not exists public.session_log (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('unlock', 'dead')),
  payload jsonb not null,
  "timestamp" timestamptz not null,
  balance_after int not null
);

create index if not exists session_log_user_timestamp on public.session_log (user_id, "timestamp" desc);

-- RLS
alter table public.user_state enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_killers enable row level security;
alter table public.match_history enable row level security;
alter table public.user_profiles enable row level security;
alter table public.session_log enable row level security;

drop policy if exists "user_state_rw" on public.user_state;
drop policy if exists "user_settings_rw" on public.user_settings;
drop policy if exists "user_killers_rw" on public.user_killers;
drop policy if exists "match_history_rw" on public.match_history;
drop policy if exists "user_profiles_select" on public.user_profiles;
drop policy if exists "user_profiles_insert" on public.user_profiles;
drop policy if exists "user_profiles_update" on public.user_profiles;
drop policy if exists "session_log_rw" on public.session_log;

create policy "user_state_rw" on public.user_state for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings_rw" on public.user_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_killers_rw" on public.user_killers for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "match_history_rw" on public.match_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_profiles_select" on public.user_profiles for select to authenticated using (true);
create policy "user_profiles_insert" on public.user_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "user_profiles_update" on public.user_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "session_log_rw" on public.session_log for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
